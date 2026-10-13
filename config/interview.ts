// ── Interview mode: how the resume interview asks its questions ──
//
//   'scripted' (beta): the questions come from code (utils/interviewScript.ts),
//       role-specific and in the user's language, with no AI cost. The AI only
//       writes a follow-up question when an answer has no numbers or no reason,
//       at most MAX_AI_FOLLOWUPS times per interview.
//   'ai': the model asks every question and writes hints (pre-beta behaviour;
//       one AI call per answer, with the whole conversation re-sent each time).
//
// Drafts started under 'ai' keep the AI interviewer when resumed, so nobody is
// asked the same questions twice. See docs/AI_USAGE_PLAN.md.
export type InterviewMode = 'scripted' | 'ai';

export const INTERVIEW_MODE: InterviewMode = 'scripted';

/** AI follow-up questions per interview in 'scripted' mode. 0 = fully scripted (AI only at generation). */
export const MAX_AI_FOLLOWUPS: number = 3;

/**
 * Model for follow-ups, where the user is waiting mid-chat. Measured 13 Oct 2026
 * on the real prompt (~160 tokens in, ~25 out, no thinking): gemini-3.6-flash
 * 1.2–1.9 s; gemini-3-flash-preview 13–17 s with 503s; gemini-3.5-flash-lite
 * timing out under load. About $0.0004 per follow-up. null = the admin-selected model.
 */
export const FOLLOW_UP_MODEL: string | null = 'gemini-3.6-flash';

/** A follow-up that takes longer than this is skipped and the script moves on. */
export const FOLLOW_UP_TIMEOUT_MS = 10_000;
