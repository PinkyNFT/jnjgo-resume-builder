/**
 * Why resume generation stopped, in the terms the generating screen explains:
 * beta credits used up (come back at the reset time), the AI briefly busy
 * (try again in a minute), or anything else.
 */
export interface GenerationError {
    kind: 'credits' | 'busy' | 'failed';
    message: string;
    /** For 'credits': when the shared pool refills (ISO). */
    resetAt?: string;
    /** When it happened (ms), for the "try again in 42s" countdown. */
    at: number;
}

/** Turns a thrown generation error (AiRequestError from useParseResume) into what the screen shows. */
export function toGenerationError(error: unknown, fallback: string, at: number = Date.now()): GenerationError {
    const e = error as { code?: string; status?: number; message?: string; resetAt?: string } | null;
    if (e?.code === 'AI_BETA_LIMIT') return { kind: 'credits', message: e.message || fallback, resetAt: e.resetAt, at };
    if (e?.status === 429) return { kind: 'busy', message: e.message || fallback, at };
    return { kind: 'failed', message: e?.message || fallback, at };
}

/** "3 h 20 min" / "3時間20分" from now until `resetAt`. */
export function waitText(resetAt: string, locale: string, now: number = Date.now()): string {
    const minutes = Math.max(1, Math.ceil((new Date(resetAt).getTime() - now) / 60_000));
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (locale === 'ja') return h ? `${h}時間${m ? `${m}分` : ''}` : `${m}分`;
    return h ? `${h} h${m ? ` ${m} min` : ''}` : `${m} min`;
}
