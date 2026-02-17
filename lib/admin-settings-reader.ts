import { GEMINI_MODEL } from '@/config/models';
import { connectToDatabase } from '@/lib/mongodb';
import { getCachedSetting, getCachedPrompt } from '@/lib/admin-models';
import { getDefaultPromptBySlug, DEFAULT_PROMPT_TEMPLATES, DefaultPromptTemplate } from '@/lib/prompt-defaults';

/**
 * Reads AI model configuration from admin settings with cached fallback.
 * Uses the in-memory cache layer from admin-models, so this is safe to call
 * on every API request without hammering MongoDB.
 * 
 * Falls back to hardcoded defaults if settings haven't been configured yet.
 */
export async function getAdminAIConfig(): Promise<{
    model: string;
    temperature: number;
}> {
    try {
        await connectToDatabase();

        const [model, temperature] = await Promise.all([
            getCachedSetting<string>('gemini_model'),
            getCachedSetting<number>('ai_temperature'),
        ]);

        return {
            model: model || GEMINI_MODEL,
            temperature: temperature ?? 0.7,
        };
    } catch {
        // If DB is unreachable, fall back to hardcoded defaults silently
        return {
            model: GEMINI_MODEL,
            temperature: 0.7,
        };
    }
}

/**
 * Reads a single admin setting with a typed default fallback.
 */
export async function getAdminSetting<T>(key: string, defaultValue: T): Promise<T> {
    try {
        await connectToDatabase();
        const value = await getCachedSetting<T>(key);
        return value ?? defaultValue;
    } catch {
        return defaultValue;
    }
}

/**
 * Reads a prompt template from the admin DB (cached for 5 min).
 * Falls back to the hardcoded default from prompt-defaults.ts if DB has no active entry.
 * 
 * @param slug - The prompt slug (e.g. 'system_instruction', 'analyze_import', etc.)
 * @param locale - 'en' or 'ja'
 * @returns The prompt content string, or null if slug is unknown
 */
export async function getAdminPromptContent(slug: string, locale: string = 'en'): Promise<string | null> {
    try {
        await connectToDatabase();
        const doc = await getCachedPrompt(slug);
        if (doc) {
            return locale === 'ja' ? doc.contentJa : doc.contentEn;
        }
    } catch {
        // DB unreachable — fall through to hardcoded default
    }

    // Fallback to hardcoded defaults
    const defaultPrompt = getDefaultPromptBySlug(slug);
    if (!defaultPrompt) return null;
    return locale === 'ja' ? defaultPrompt.contentJa : defaultPrompt.contentEn;
}

// ===== COMPARISON / OVERRIDE HELPERS =====

export interface PromptComparisonResult {
    slug: string;
    name: string;
    description: string;
    /** The base default content from prompt-defaults.ts */
    baseEn: string;
    baseJa: string;
    /** The currently active content (DB override or base if no override) */
    currentEn: string;
    currentJa: string;
    /** Whether a DB override exists for this prompt */
    hasOverride: boolean;
    /** Whether the current content differs from the base for English */
    isModifiedEn: boolean;
    /** Whether the current content differs from the base for Japanese */
    isModifiedJa: boolean;
    /** DB metadata (if override exists) */
    version?: number;
    updatedBy?: string;
    updatedAt?: string;
    isActive?: boolean;
}

/**
 * Returns a comparison view of all prompts: base defaults vs. current DB overrides.
 * Used by the admin dashboard to show what has been customized.
 */
export async function getPromptComparisons(): Promise<PromptComparisonResult[]> {
    const { PromptTemplateModel } = await import('@/lib/admin-models');

    await connectToDatabase();
    const dbPrompts = await PromptTemplateModel.find({}).lean();
    const dbBySlug = new Map(dbPrompts.map(p => [p.slug, p]));

    return DEFAULT_PROMPT_TEMPLATES.map((base: DefaultPromptTemplate) => {
        const dbDoc = dbBySlug.get(base.slug);

        const currentEn = dbDoc?.isActive !== false ? (dbDoc?.contentEn ?? base.contentEn) : base.contentEn;
        const currentJa = dbDoc?.isActive !== false ? (dbDoc?.contentJa ?? base.contentJa) : base.contentJa;

        return {
            slug: base.slug,
            name: dbDoc?.name ?? base.name,
            description: dbDoc?.description ?? base.description,
            baseEn: base.contentEn,
            baseJa: base.contentJa,
            currentEn,
            currentJa,
            hasOverride: !!dbDoc,
            isModifiedEn: !!dbDoc && normalizeWhitespace(dbDoc.contentEn) !== normalizeWhitespace(base.contentEn),
            isModifiedJa: !!dbDoc && normalizeWhitespace(dbDoc.contentJa) !== normalizeWhitespace(base.contentJa),
            version: dbDoc?.version,
            updatedBy: dbDoc?.updatedBy,
            updatedAt: dbDoc?.updatedAt?.toISOString?.() ?? (dbDoc?.updatedAt as unknown as string),
            isActive: dbDoc?.isActive,
        };
    });
}

/** Normalize whitespace for reliable comparison */
function normalizeWhitespace(s: string): string {
    return s.replace(/\s+/g, ' ').trim();
}
