/**
 * Retry wrapper for Google Gemini API calls.
 * Handles transient failures (rate limits, overload, network) with exponential backoff.
 * Retries up to MAX_RETRIES times before propagating the error.
 */

import * as Sentry from '@sentry/nextjs';
import type { NextRequest } from 'next/server';
import { logAiUsage, type GeminiResponseLike } from './ai-usage';

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

// HTTP status codes and error messages that are safe to retry
const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);

function isRetryable(error: unknown): boolean {
    if (error instanceof Error) {
        const msg = error.message.toLowerCase();
        // Gemini SDK wraps HTTP errors in Error with status code in message
        if (RETRYABLE_STATUSES.has(Number(msg.match(/\b(\d{3})\b/)?.[1]))) return true;
        if (msg.includes('rate limit') || msg.includes('quota')) return true;
        if (msg.includes('overloaded') || msg.includes('unavailable')) return true;
        if (msg.includes('network') || msg.includes('econnreset') || msg.includes('timeout')) return true;
    }
    return false;
}

function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Optional cost/observability attribution for a callWithRetry() call. */
export interface UsageTrackingContext {
    /** Call-site identifier, e.g. 'chat/sendMessage', 'analyze/evaluateResume'. */
    route: string;
    model: string;
    userId?: string | null;
    /** Used only to derive a fallback IP for calls with no authenticated user. */
    request?: NextRequest;
}

export async function callWithRetry<T extends GeminiResponseLike>(
    fn: () => Promise<T>,
    context = 'gemini',
    tracking?: UsageTrackingContext
): Promise<T> {
    let lastError: unknown;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
            const result = await fn();
            if (tracking) {
                logAiUsage({ ...tracking, response: result, success: true });
            }
            return result;
        } catch (error) {
            lastError = error;
            const message = error instanceof Error ? error.message : String(error);

            // Non-retryable errors (e.g. 403 PERMISSION_DENIED) fail fast — retrying won't help.
            if (!isRetryable(error)) {
                console.error(`[${context}] Non-retryable error on attempt ${attempt + 1}/${MAX_RETRIES}:`, message);
                break;
            }

            // Retryable, but out of attempts.
            if (attempt === MAX_RETRIES - 1) {
                console.error(`[${context}] Failed after ${MAX_RETRIES} attempt(s):`, message);
                break;
            }

            const jitter = Math.floor(Math.random() * 500);
            const backoff = BASE_DELAY_MS * Math.pow(2, attempt) + jitter;
            console.warn(`[${context}] Attempt ${attempt + 1} failed, retrying in ${backoff}ms:`, message);
            await delay(backoff);
        }
    }

    if (tracking) {
        logAiUsage({
            ...tracking,
            success: false,
            errorMessage: lastError instanceof Error ? lastError.message : String(lastError),
        });
        Sentry.captureException(lastError, { tags: { aiRoute: tracking.route, aiModel: tracking.model } });
    }

    throw lastError;
}
