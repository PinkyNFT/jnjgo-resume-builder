/**
 * Retry wrapper for Google Gemini API calls.
 * Handles transient failures (rate limits, overload, network) with exponential backoff.
 * Retries up to MAX_RETRIES times before propagating the error.
 */

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

export async function callWithRetry<T>(fn: () => Promise<T>, context = 'gemini'): Promise<T> {
    let lastError: unknown;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            if (!isRetryable(error) || attempt === MAX_RETRIES - 1) break;

            const jitter = Math.floor(Math.random() * 500);
            const backoff = BASE_DELAY_MS * Math.pow(2, attempt) + jitter;
            console.warn(`[${context}] Attempt ${attempt + 1} failed, retrying in ${backoff}ms:`, error instanceof Error ? error.message : error);
            await delay(backoff);
        }
    }

    console.error(`[${context}] All ${MAX_RETRIES} attempts exhausted`);
    throw lastError;
}
