import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Modality } from '@google/genai';
import { auth } from '@/lib/auth';
import { applyRateLimitDB, RATE_LIMITS } from '@/lib/rate-limit';
import { callWithRetry } from '@/lib/gemini-client';
import { GEMINI_IMAGE_MODEL, PHOTO_ENHANCE_ENABLED } from '@/config/models';
import { getProfessionalHeadshotPrompt } from '@/lib/prompts';

// The @google/genai SDK is native-friendly; keep this on the Node.js runtime.
export const runtime = 'nodejs';
// Image generation can take longer than a normal completion — allow headroom.
export const maxDuration = 60;

// 5MB cap on the input image (mirrors app/api/extract-file/route.ts).
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
    console.error('GEMINI_API_KEY environment variable is not set');
}

// Localized error messages, mirroring the inline-t() pattern in other routes.
const ERRORS = {
    config: { en: 'Server configuration error: API key not configured', ja: 'サーバー構成エラー：APIキーが設定されていません' },
    noImage: { en: 'No image provided', ja: '画像がありません' },
    invalidType: { en: 'Unsupported image type. Please use JPEG, PNG, or WebP.', ja: '対応していない画像形式です。JPEG、PNG、またはWebPを使用してください。' },
    tooLarge: { en: 'Image too large. Maximum size is 5MB.', ja: '画像サイズが大きすぎます。最大5MBまでです。' },
    noResult: { en: 'Could not generate a professional photo. Please try again, or use a clearer, front-facing photo.', ja: 'プロ用写真を生成できませんでした。もう一度お試しいただくか、正面を向いた鮮明な写真をご利用ください。' },
    generic: { en: 'Failed to generate photo', ja: '写真の生成に失敗しました' },
} as const;

export async function POST(request: NextRequest) {
    let locale: 'en' | 'ja' = 'en';
    const t = (key: keyof typeof ERRORS) => ERRORS[key][locale];

    // The AI headshot feature is off for beta (see config/models.ts); refuse
    // before any work so the image model can't be called while it's hidden.
    if (!PHOTO_ENHANCE_ENABLED) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    try {
        // Auth gate (same pattern as the PDF export route).
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Rate limit — this is an expensive AI call.
        const limited = await applyRateLimitDB(request, 'generate-photo', RATE_LIMITS.ai);
        if (limited) return limited;

        if (!API_KEY) {
            return NextResponse.json({ error: t('config') }, { status: 500 });
        }

        const body = await request.json();
        locale = body?.locale === 'ja' ? 'ja' : 'en';
        const mimeType: string = body?.mimeType || 'image/jpeg';
        let image: string = body?.image || '';

        if (!image || typeof image !== 'string') {
            return NextResponse.json({ error: t('noImage') }, { status: 400 });
        }

        // Accept either a raw base64 string or a full data URL; normalize to raw base64.
        const dataUrlMatch = image.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.*)$/);
        const resolvedMime = dataUrlMatch ? dataUrlMatch[1] : mimeType;
        if (dataUrlMatch) image = dataUrlMatch[2];

        if (!ALLOWED_MIME.has(resolvedMime)) {
            return NextResponse.json({ error: t('invalidType') }, { status: 415 });
        }

        // Approximate decoded byte size from base64 length (4 chars ≈ 3 bytes).
        const approxBytes = Math.floor((image.length * 3) / 4);
        if (approxBytes > MAX_IMAGE_BYTES) {
            return NextResponse.json({ error: t('tooLarge') }, { status: 413 });
        }

        const ai = new GoogleGenAI({ apiKey: API_KEY });

        const response = await callWithRetry(() => ai.models.generateContent({
            model: GEMINI_IMAGE_MODEL,
            contents: [{
                role: 'user',
                parts: [
                    { inlineData: { mimeType: resolvedMime, data: image } },
                    { text: getProfessionalHeadshotPrompt() },
                ],
            }],
            config: {
                // Image models can interleave text + image; allow both for maximum
                // compatibility. We only read the image part below, and a text-only
                // response (e.g. a refusal) falls through to the 422 "retry" path.
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        }), 'generate-photo', { route: 'generate-photo', model: GEMINI_IMAGE_MODEL, userId: session.user.id, request });

        // Find the first inline image part in the response.
        const parts = response.candidates?.[0]?.content?.parts ?? [];
        const imagePart = parts.find(p => p.inlineData?.data);

        if (!imagePart?.inlineData?.data) {
            // Model returned no image (e.g. safety block or empty output) — let the client retry.
            console.warn('generate-photo: no image part in response', {
                finishReason: response.candidates?.[0]?.finishReason,
                promptFeedback: (response as unknown as { promptFeedback?: unknown }).promptFeedback,
            });
            return NextResponse.json({ error: t('noResult') }, { status: 422 });
        }

        const outMime = imagePart.inlineData.mimeType || 'image/png';
        const dataUrl = `data:${outMime};base64,${imagePart.inlineData.data}`;

        return NextResponse.json({ image: dataUrl });
    } catch (error) {
        console.error('Generate photo API error:', error);
        return NextResponse.json(
            { error: t('generic'), details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
