/**
 * User-facing messages for AI (Gemini) failures, shared by the AI API routes and
 * the client hooks that call them. Kept inline (like app/api/extract-file) so the
 * client can use them without pulling the full message catalogs into its bundle.
 */

export type AiErrorKind = 'quota' | 'rateLimit' | 'timeout' | 'unavailable' | 'config' | 'unknown';

const MESSAGES: Record<AiErrorKind, { en: string; ja: string }> = {
    quota: {
        en: 'The AI service is busy right now (usage limit reached). Please wait a minute and try again.',
        ja: 'AIサービスが混み合っています（利用上限に達しました）。1分ほど待ってから、もう一度お試しください。',
    },
    rateLimit: {
        en: 'Too many requests. Please wait a moment and try again.',
        ja: 'リクエストが多すぎます。少し待ってから、もう一度お試しください。',
    },
    timeout: {
        en: 'The AI service took too long to respond. Please try again.',
        ja: 'AIサービスの応答がタイムアウトしました。もう一度お試しください。',
    },
    unavailable: {
        en: 'The AI service is temporarily unavailable. Please try again in a few minutes.',
        ja: 'AIサービスが一時的に利用できません。数分後にもう一度お試しください。',
    },
    config: {
        en: 'The AI service is unavailable due to a server configuration issue. Please contact support.',
        ja: 'サーバー設定の問題により、AIサービスを利用できません。サポートまでお問い合わせください。',
    },
    unknown: {
        en: 'Something went wrong while contacting the AI service. Please try again.',
        ja: 'AIサービスとの通信中にエラーが発生しました。もう一度お試しください。',
    },
};

// 503 is deliberately avoided: app/providers.tsx shows a generic "servers
// unavailable" toast for every 503, which would duplicate these messages.
const STATUS: Record<AiErrorKind, number> = {
    quota: 429,
    rateLimit: 429,
    timeout: 504,
    unavailable: 502,
    config: 502,
    unknown: 500,
};

export function aiErrorMessage(kind: AiErrorKind, locale?: string): string {
    return MESSAGES[kind][locale === 'ja' ? 'ja' : 'en'];
}

/**
 * Classify an error thrown by the Gemini SDK (ApiError carries a numeric
 * `status`; its message embeds the API's JSON error) or by the network layer.
 */
export function classifyAiError(error: unknown): AiErrorKind {
    const rawStatus = (error as { status?: unknown } | null)?.status;
    const status = typeof rawStatus === 'number' ? rawStatus : undefined;
    const msg = (error instanceof Error ? `${error.name} ${error.message}` : String(error ?? '')).toLowerCase();

    if (status === 429 || /resource_exhausted|quota|rate.?limit|too many requests/.test(msg)) return 'quota';
    // Invalid key = 400 API_KEY_INVALID; disabled billing / no access = 403 PERMISSION_DENIED.
    if (status === 401 || status === 403 || /api.?key|permission_denied|unauthenticated|billing/.test(msg)) return 'config';
    if (status === 408 || status === 504 || /deadline|timed out|timeout|etimedout|econnreset|socket hang up|aborterror/.test(msg)) return 'timeout';
    if ((status !== undefined && status >= 500) || /unavailable|overloaded|fetch failed|network/.test(msg)) return 'unavailable';
    return 'unknown';
}

/** JSON body + HTTP status for an AI route's error response. */
export function aiErrorPayload(error: unknown, locale?: string, kind: AiErrorKind = classifyAiError(error)) {
    return {
        body: { error: aiErrorMessage(kind, locale), code: `AI_${kind.toUpperCase()}` },
        status: STATUS[kind],
    };
}

function kindFromStatus(status: number): AiErrorKind {
    if (status === 429) return 'rateLimit';
    if (status === 408 || status === 504) return 'timeout';
    if (status === 502 || status === 503) return 'unavailable';
    return 'unknown';
}

/**
 * Turn a failed AI API response into a user-facing message. Uses the server's
 * message when it is one of ours (code AI_*), otherwise a localized message
 * based on the status — this also covers non-JSON bodies such as a platform
 * timeout page, which would otherwise surface as a JSON SyntaxError.
 */
export async function readAiErrorMessage(res: Response, locale?: string): Promise<string> {
    const body = (await res.json().catch(() => null)) as { error?: unknown; code?: unknown } | null;
    if (body && typeof body.error === 'string' && typeof body.code === 'string' && body.code.startsWith('AI_')) {
        return body.error;
    }
    return aiErrorMessage(kindFromStatus(res.status), locale);
}
