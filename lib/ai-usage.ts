import { NextRequest } from 'next/server';
import { connectToDatabase } from './mongodb';
import { AiUsageEventModel } from './models';
import { estimateCostUsd } from './ai-pricing';

/** Shape-compatible with @google/genai's GenerateContentResponse.usageMetadata. */
interface GeminiUsageMetadata {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    thoughtsTokenCount?: number;
    totalTokenCount?: number;
}

export interface GeminiResponseLike {
    usageMetadata?: GeminiUsageMetadata;
}

interface LogAiUsageParams {
    /** Call-site identifier, e.g. 'chat/sendMessage', 'analyze/evaluateResume'. */
    route: string;
    model: string;
    userId?: string | null;
    /** Used only to derive a fallback IP for calls with no authenticated user. */
    request?: NextRequest;
    response?: GeminiResponseLike;
    success: boolean;
    errorMessage?: string;
}

function getClientIp(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for');
    return forwarded?.split(',')[0]?.trim() || 'unknown';
}

/**
 * Records one Gemini call's token usage and estimated cost, keyed by user
 * when available. Fire-and-forget: never awaited by callers, never throws,
 * so a logging hiccup can't affect the AI response the user is waiting on.
 */
export function logAiUsage(params: LogAiUsageParams): void {
    void persist(params).catch((err) => {
        console.error('[ai-usage] failed to log usage:', err);
    });
}

async function persist(params: LogAiUsageParams): Promise<void> {
    const usage = params.response?.usageMetadata;
    const inputTokens = usage?.promptTokenCount ?? 0;
    const outputTokens = (usage?.candidatesTokenCount ?? 0) + (usage?.thoughtsTokenCount ?? 0);
    const totalTokens = usage?.totalTokenCount ?? (inputTokens + outputTokens);
    const estimatedCostUsd = estimateCostUsd(params.model, inputTokens, outputTokens);

    await connectToDatabase();
    await AiUsageEventModel.create({
        userId: params.userId || null,
        ip: params.request ? getClientIp(params.request) : undefined,
        route: params.route,
        model: params.model,
        inputTokens,
        outputTokens,
        totalTokens,
        estimatedCostUsd,
        success: params.success,
        errorMessage: params.errorMessage?.slice(0, 500),
    });
}
