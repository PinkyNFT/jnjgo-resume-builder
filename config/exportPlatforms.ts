/**
 * Export Platform Definitions
 *
 * Each platform has specific formatting requirements for resume content.
 * These configs drive the export template engine.
 *
 * Spec reference: Section 3.1 of Addendum v1.0
 */

// ─── Variant (Short / Standard / Long) ────────────────────
export type ExportVariant = 'short' | 'standard' | 'long';

export interface VariantRules {
    maxCharsPerSection: number;    // overall char budget for this variant
    bulletLimit: number;           // max bullets per responsibility list
    tone: 'concise' | 'standard' | 'detailed';
    includeOptionalSections: boolean; // whether to include non-required sections
}

/** Default rules per variant — platforms override where needed */
export const DEFAULT_VARIANT_RULES: Record<ExportVariant, VariantRules> = {
    short: {
        maxCharsPerSection: 500,
        bulletLimit: 3,
        tone: 'concise',
        includeOptionalSections: false,
    },
    standard: {
        maxCharsPerSection: 1500,
        bulletLimit: 6,
        tone: 'standard',
        includeOptionalSections: true,
    },
    long: {
        maxCharsPerSection: 3000,
        bulletLimit: 10,
        tone: 'detailed',
        includeOptionalSections: true,
    },
};

// ─── Link injection policy ─────────────────────────────────
export type LinkInjectionPolicy = 'optional' | 'default_on' | 'default_off';

// ─── Template category (per spec 3.1.4) ────────────────────
export type TemplateCategory = 'agency' | 'profile' | 'it_specialized';

export type PlatformId =
    | 'bizreach'
    | 'linkedin';

export interface PlatformSection {
    key: string;
    heading: string;        // The heading text used on the platform
    maxLength?: number;      // Character limit (if applicable)
    required: boolean;
}

export interface PlatformConfig {
    id: PlatformId;
    nameKey: string;         // i18n key for display name
    descriptionKey: string;  // i18n key for short description
    url: string;             // Platform URL
    locale: 'ja' | 'en' | 'both';   // Primary locale
    maxSummaryLength: number;
    sections: PlatformSection[];
    /** Sections order — also defines the output order */
    sectionsOrder: string[];
    /** Whether the platform expects reverse-chronological order */
    reverseChronological: boolean;
    /** Icon color (tailwind) */
    color: string;
    /** Display category tag */
    category: 'executive' | 'engineer' | 'general' | 'freelance';
    /** Internal template category (A/B/C per spec 3.1.4) */
    templateCategory: TemplateCategory;
    /** Link injection policy per spec 3.1.3 */
    linkInjectionPolicy: LinkInjectionPolicy;
    /** Optional per-variant rule overrides */
    variantOverrides?: Partial<Record<ExportVariant, Partial<VariantRules>>>;
}

export const PLATFORM_CONFIGS: Record<PlatformId, PlatformConfig> = {
    bizreach: {
        id: 'bizreach',
        nameKey: 'platformBizReach',
        descriptionKey: 'platformBizReachDesc',
        url: 'https://www.bizreach.jp',
        locale: 'ja',
        maxSummaryLength: 2000,
        reverseChronological: true,
        color: 'bg-blue-600',
        category: 'executive',
        templateCategory: 'agency',
        linkInjectionPolicy: 'optional',
        sectionsOrder: ['summary', 'work', 'skills', 'education'],
        sections: [
            { key: 'summary', heading: '職務要約', maxLength: 2000, required: true },
            { key: 'work', heading: '職務経歴', required: true },
            { key: 'skills', heading: 'スキル・資格', required: true },
            { key: 'education', heading: '学歴', required: false },
        ],
        variantOverrides: {
            short: { maxCharsPerSection: 400, bulletLimit: 2 },
        },
    },
    linkedin: {
        id: 'linkedin',
        nameKey: 'platformLinkedIn',
        descriptionKey: 'platformLinkedInDesc',
        url: 'https://www.linkedin.com',
        locale: 'en',
        maxSummaryLength: 2600,
        reverseChronological: true,
        color: 'bg-sky-700',
        category: 'general',
        templateCategory: 'profile',
        linkInjectionPolicy: 'default_on',
        sectionsOrder: ['headline', 'about', 'experience', 'skills', 'education'],
        sections: [
            { key: 'headline', heading: 'Headline', maxLength: 220, required: true },
            { key: 'about', heading: 'About', maxLength: 2600, required: true },
            { key: 'experience', heading: 'Experience', required: true },
            { key: 'skills', heading: 'Skills', required: true },
            { key: 'education', heading: 'Education', required: false },
        ],
    },
};

export const PLATFORM_LIST: PlatformId[] = [
    'bizreach',
    'linkedin',
];

/** Group platforms by category for display */
export const PLATFORM_CATEGORIES = {
    executive: ['bizreach'] as PlatformId[],
    general: ['linkedin'] as PlatformId[],
};

/** Internal template categories per spec 3.1.4 (shared template logic) */
export const TEMPLATE_CATEGORIES: Record<TemplateCategory, PlatformId[]> = {
    agency: ['bizreach'],       // A: Agency-like
    profile: ['linkedin'],      // B: Profile-like
    it_specialized: [],         // C: IT-specialized (none currently)
};

/** Variant labels for display */
export const VARIANT_LIST: ExportVariant[] = ['short', 'standard', 'long'];

/** Get resolved rules for a platform + variant */
export function getVariantRules(platformId: PlatformId, variant: ExportVariant): VariantRules {
    const config = PLATFORM_CONFIGS[platformId];
    const base = { ...DEFAULT_VARIANT_RULES[variant] };
    const overrides = config?.variantOverrides?.[variant];
    if (overrides) {
        return { ...base, ...overrides };
    }
    return base;
}
