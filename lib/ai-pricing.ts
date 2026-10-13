/**
 * Approximate Gemini API pricing, USD per 1M tokens.
 * Sourced from https://ai.google.dev/gemini-api/docs/pricing (checked 2026-09-01).
 * Preview-model prices change without notice — treat these as directional for
 * unit-economics tracking, not as a substitute for the actual GCP invoice.
 */
interface ModelPricing {
    inputPerMillion: number;
    outputPerMillion: number;
}

const PRICING: Record<string, ModelPricing> = {
    'gemini-3-flash-preview': { inputPerMillion: 0.50, outputPerMillion: 3.00 },
    // Interview follow-ups (config/interview.ts). Google Cloud global-endpoint
    // rate, checked 2026-10-13; `gemini-3.5-flash` now routes to this model.
    'gemini-3.6-flash': { inputPerMillion: 1.50, outputPerMillion: 7.50 },
    'gemini-2.5-pro-preview-06-05': { inputPerMillion: 1.25, outputPerMillion: 10.00 },
    // Image output is billed as token-equivalents (~1290 tokens/image) at the
    // output rate — using the real usageMetadata token counts here is more
    // accurate than assuming exactly one image per call.
    'gemini-2.5-flash-image': { inputPerMillion: 0.30, outputPerMillion: 30.00 },
    // Shut down 2026-06-01 — no longer callable. Kept only so any historical
    // log rows from before the shutdown still price out correctly.
    'gemini-2.0-flash': { inputPerMillion: 0.10, outputPerMillion: 0.40 },
    // Free tier only — Google publishes no paid-tier rate for Gemma 3.
    'gemma-3-12b-it': { inputPerMillion: 0, outputPerMillion: 0 },
};

/**
 * Estimates USD cost for one Gemini call. Returns null for a model with no
 * known pricing (e.g. a new admin-selected model) rather than silently
 * guessing — callers should store null distinctly from a real $0 cost.
 */
export function estimateCostUsd(model: string, inputTokens: number, outputTokens: number): number | null {
    const pricing = PRICING[model];
    if (!pricing) return null;
    return (inputTokens / 1_000_000) * pricing.inputPerMillion + (outputTokens / 1_000_000) * pricing.outputPerMillion;
}
