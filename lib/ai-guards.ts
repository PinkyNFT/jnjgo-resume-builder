import { NextResponse } from 'next/server';
import { aiErrorPayload } from '@/lib/ai-errors';
import type { Message, ResumeData } from '@/types';

/**
 * Guards shared by every route that calls Gemini. AI routes are never open to
 * anonymous callers (anyone could otherwise run up the Gemini bill), and every
 * payload is size-capped before it can reach a prompt.
 */

// Generous for a real interview (~25 turns of long answers), tiny for abuse.
export const AI_LIMITS = {
    messageChars: 4_000,       // one interview answer
    historyMessages: 120,      // messages in one interview transcript
    historyChars: 120_000,     // whole transcript
    importChars: 50_000,       // imported resume text (same cap as /api/extract-file)
    resumeJsonChars: 200_000,  // resume data sent for scoring, photo stripped
    rewriteChars: 40_000,      // export sections sent for rewriting
    followUpQuestionChars: 2_000, // the scripted question a follow-up builds on
    followUpContextChars: 500,    // "company, title" for that question
} as const;

/** The signed-in user's id, or a 401 response to return as-is. */
export async function requireAiUser(locale?: string): Promise<string | NextResponse> {
    // Imported lazily so the pure helpers below stay importable in unit tests.
    const { auth } = await import('@/lib/auth');
    const session = await auth().catch(() => null);
    const userId = session?.user?.id;
    if (userId) return userId;
    const { body, status } = aiErrorPayload(null, locale, 'auth');
    return NextResponse.json(body, { status });
}

/** 413 response for an over-limit payload. */
export function tooLarge(locale?: string): NextResponse {
    const { body, status } = aiErrorPayload(null, locale, 'tooLarge');
    return NextResponse.json(body, { status });
}

/**
 * Validates and normalises an interview transcript: only `role` and `text` are
 * kept (nothing else from the client reaches the model). Returns null when the
 * shape is wrong or the transcript is over the limits.
 */
export function cleanHistory(history: unknown): Pick<Message, 'role' | 'text'>[] | null {
    if (history == null) return [];
    if (!Array.isArray(history) || history.length > AI_LIMITS.historyMessages) return null;
    let total = 0;
    const out: Pick<Message, 'role' | 'text'>[] = [];
    for (const m of history) {
        if (!m || (m.role !== 'user' && m.role !== 'model') || typeof m.text !== 'string') return null;
        total += m.text.length;
        if (total > AI_LIMITS.historyChars) return null;
        out.push({ role: m.role, text: m.text });
    }
    return out;
}

/** True when a string is present and within `max` characters. */
export function withinChars(value: unknown, max: number): value is string {
    return typeof value === 'string' && value.length <= max;
}

/**
 * Resume data as compact JSON for a prompt. Drops fields that carry no meaning
 * for the model; the photo alone is a base64 data URL worth 38k–77k tokens.
 */
export function resumeForPrompt(data: ResumeData | Partial<ResumeData> | null | undefined): string {
    if (!data) return '{}';
    // Mongoose documents must be converted first; spreading one copies its internals.
    const plain = typeof (data as { toObject?: () => unknown }).toObject === 'function'
        ? (data as { toObject: () => ResumeData }).toObject()
        : data;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { photo, ...rest } = plain as ResumeData;
    return JSON.stringify(rest);
}
