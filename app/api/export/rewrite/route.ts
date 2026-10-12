import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { GoogleGenAI } from '@google/genai';
import { EXPORT_REWRITE_ENABLED } from '@/config/models';
import { getAdminAIConfig } from '@/lib/admin-settings-reader';
import { logAiUsage } from '@/lib/ai-usage';
import { aiErrorPayload } from '@/lib/ai-errors';
import { AI_LIMITS, requireAiUser, tooLarge } from '@/lib/ai-guards';
import { applyRateLimitDB, RATE_LIMITS } from '@/lib/rate-limit';

const API_KEY = process.env.GEMINI_API_KEY;

/**
 * POST /api/export/rewrite
 *
 * AI-powered variant rewriting for export templates.
 * Takes the standard-variant text and rewrites it to match the requested tone/length.
 *
 * - short:  Condense to key facts, remove filler, keep structure (bullets, headings)
 * - long:   Expand with richer detail, elaborated achievements, context
 * - standard: Pass-through (no AI call needed, handled client-side)
 */
export async function POST(request: NextRequest) {
    // Off for beta (no live UI uses it). Returns before any work or AI cost.
    if (!EXPORT_REWRITE_ENABLED) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    try {
        const body = await request.json().catch(() => null);
        const { sections, variant, platformId, locale } = (body ?? {}) as {
            sections: { key: string; heading: string; content: string }[];
            variant: 'short' | 'long';
            platformId: string;
            locale: 'ja' | 'en' | 'both';
        };

        // Signed-in users only, rate-limited, size-capped (was open to anyone, unlimited).
        const userId = await requireAiUser(locale);
        if (userId instanceof NextResponse) return userId;
        const limited = await applyRateLimitDB(request, 'export-rewrite', RATE_LIMITS.ai, userId);
        if (limited) return limited;

        if (!API_KEY) {
            const { body: errBody, status } = aiErrorPayload(null, locale, 'config');
            return NextResponse.json(errBody, { status });
        }

        if (!sections?.length || !variant || !platformId) {
            return NextResponse.json(
                { error: 'Missing required fields: sections, variant, platformId' },
                { status: 400 }
            );
        }
        const totalChars = sections.reduce((n, s) => n + String(s?.content ?? '').length + String(s?.heading ?? '').length, 0);
        if (sections.length > 40 || totalChars > AI_LIMITS.rewriteChars) return tooLarge(locale);

        // Standard variant doesn't need AI rewriting
        if (variant === 'standard' as string) {
            return NextResponse.json({ sections });
        }

        const ai = new GoogleGenAI({ apiKey: API_KEY });
        const aiConfig = await getAdminAIConfig();
        const model = aiConfig.model;

        const isJapanese = locale === 'ja' || locale === 'both';

        // Build the rewrite prompt
        const systemPrompt = isJapanese
            ? buildJapaneseSystemPrompt(variant)
            : buildEnglishSystemPrompt(variant);

        const sectionsText = sections
            .map(s => `=== ${s.heading} (key: ${s.key}) ===\n${s.content}`)
            .join('\n\n---\n\n');

        const userPrompt = isJapanese
            ? `以下の職務経歴書セクションを${variant === 'short' ? '簡潔に要約' : '詳細に展開'}してください。\n各セクションは === ヘッダー (key: キー) === の形式です。\n同じ形式で出力してください。\n\n${sectionsText}`
            : `Rewrite the following resume sections in a ${variant === 'short' ? 'concise, condensed' : 'detailed, expanded'} style.\nEach section starts with === Header (key: key_name) ===.\nReturn in the same format.\n\n${sectionsText}`;

        let response;
        try {
            response = await ai.models.generateContent({
                model,
                contents: userPrompt,
                config: {
                    systemInstruction: systemPrompt,
                    temperature: variant === 'short' ? 0.3 : 0.5,
                },
            });
        } catch (err) {
            logAiUsage({
                route: 'export/rewrite', model, userId, request, success: false,
                errorMessage: err instanceof Error ? err.message : String(err),
            });
            Sentry.captureException(err, { tags: { aiRoute: 'export/rewrite', aiModel: model } });
            throw err;
        }
        logAiUsage({ route: 'export/rewrite', model, userId, request, response, success: true });

        const responseText = response.text || '';

        // Parse the AI response back into sections
        const rewrittenSections = parseSectionsFromResponse(responseText, sections);

        return NextResponse.json({ sections: rewrittenSections });
    } catch (error) {
        console.error('Export rewrite API error:', error);
        return NextResponse.json(
            { error: 'Failed to rewrite export content', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}

function buildJapaneseSystemPrompt(variant: 'short' | 'long'): string {
    if (variant === 'short') {
        return `あなたは職務経歴書の編集者です。以下のルールに従って簡潔版を作成してください：

【簡潔版ルール】
- 各セクションを元の50-60%の長さに凝縮する
- 数値実績・具体的成果は必ず残す（例：売上30%増、チーム5名）
- 冗長な修飾語や前置きを削除
- 箇条書きは最も重要な3項目に絞る
- 見出し構造（【】や■）は維持する
- 事実ベースの客観的な表現を維持
- 「～に従事」「～を担当」など短い表現を使用
- 出力は必ず同じセクション形式（=== ヘッダー (key: キー) ===）で返す`;
    }
    return `あなたは職務経歴書の編集者です。以下のルールに従って詳細版を作成してください：

【詳細版ルール】
- 各セクションを元の130-150%の長さに展開する
- 既存の数値実績はそのまま残し、背景・文脈を追加
- 各職務経歴に成果のインパクトや背景を補足
- 使用技術・ツールの具体的な活用方法を追記
- プロジェクト規模、チーム構成、担当範囲を詳述
- 見出し構造（【】や■）は維持する
- 事実ベースの客観的な表現を維持（自画自賛しない）
- 新しい情報を捏造せず、既存情報の詳細化に留める
- 出力は必ず同じセクション形式（=== ヘッダー (key: キー) ===）で返す`;
}

function buildEnglishSystemPrompt(variant: 'short' | 'long'): string {
    if (variant === 'short') {
        return `You are a professional resume editor. Rewrite sections following these rules:

SHORT VARIANT RULES:
- Condense each section to 50-60% of original length
- Preserve all quantified achievements (e.g., "30% revenue increase", "team of 5")
- Remove filler words, redundant modifiers, and verbose phrasing
- Limit bullet points to the 3 most impactful items per section
- Preserve heading structure (##, ■, etc.)
- Maintain objective, fact-based tone
- Use action verbs and concise phrasing
- Return in the same section format (=== Header (key: key_name) ===)`;
    }
    return `You are a professional resume editor. Rewrite sections following these rules:

LONG VARIANT RULES:
- Expand each section to 130-150% of original length
- Keep existing metrics and add context/impact for each
- Add detail about project scope, team size, and responsibilities
- Elaborate on technologies used and how they were applied
- Include challenges overcome and methodologies employed
- Preserve heading structure (##, ■, etc.)
- Maintain objective, fact-based tone (no self-aggrandizing)
- Do NOT fabricate new information — only expand what's already there
- Return in the same section format (=== Header (key: key_name) ===)`;
}

/**
 * Parse AI response back into section objects.
 * Falls back gracefully: if parsing fails, returns original sections with AI text as-is.
 */
function parseSectionsFromResponse(
    responseText: string,
    originalSections: { key: string; heading: string; content: string }[],
): { key: string; heading: string; content: string }[] {
    const result: { key: string; heading: string; content: string }[] = [];

    // Try to parse sections by === Header (key: xxx) === pattern
    const sectionRegex = /===\s*(.+?)\s*\(key:\s*(\w+)\)\s*===\s*\n([\s\S]*?)(?=\n===\s|$)/g;
    let match;
    const parsed = new Map<string, string>();

    while ((match = sectionRegex.exec(responseText)) !== null) {
        const key = match[2].trim();
        const content = match[3].trim();
        parsed.set(key, content);
    }

    for (const orig of originalSections) {
        const rewritten = parsed.get(orig.key);
        if (rewritten && rewritten.length > 10) {
            result.push({
                key: orig.key,
                heading: orig.heading,
                content: rewritten,
            });
        } else {
            // Fallback: use original content
            result.push(orig);
        }
    }

    // If nothing was parsed at all and there's substantial AI text,
    // put it all in the first section
    if (parsed.size === 0 && responseText.trim().length > 50 && originalSections.length === 1) {
        result[0] = {
            ...originalSections[0],
            content: responseText.trim(),
        };
    }

    return result;
}
