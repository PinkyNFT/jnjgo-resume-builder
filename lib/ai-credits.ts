/**
 * Beta AI credits: one shared daily pool for the whole app (decided 24 Oct 2026).
 *
 * The beta runs on Gemini's free tier, which caps requests per project per
 * model per day and resets at midnight Pacific time. Google doesn't report how
 * much is left, so we count our own successful calls (aiUsageEvents) against
 * an admin-set limit, and when Google answers with its daily-quota error we
 * mark the pool empty until the reset. 1 credit = 1 AI request.
 */

import mongoose from 'mongoose';
import { connectToDatabase } from './mongodb';
import { AiUsageEventModel } from './models';
import { getAdminSetting } from './admin-settings-reader';
import { BetaLimitError } from './ai-errors';
import { BETA_DAILY_AI_CREDITS } from '@/config/models';

/** Gemini's free-tier quotas reset at midnight in this time zone. */
const QUOTA_TZ = 'America/Los_Angeles';
const CACHE_MS = 10_000;

export interface AiCreditStatus {
    limit: number;
    used: number;
    remaining: number;
    /** ISO time of the next reset. */
    resetAt: string;
    exhausted: boolean;
}

/** How far `tz` is ahead of UTC at `date`, in ms (PDT → -7h). */
function tzOffsetMs(date: Date, tz: string): number {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
    }).formatToParts(date);
    const get = (type: string) => Number(parts.find(p => p.type === type)?.value);
    const wall = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
    return wall - Math.floor(date.getTime() / 1000) * 1000;
}

/** Start of the current quota day (midnight Pacific), as an instant. */
export function quotaDayStart(now: Date = new Date()): Date {
    const offset = tzOffsetMs(now, QUOTA_TZ);
    const wall = new Date(now.getTime() + offset);
    const midnight = Date.UTC(wall.getUTCFullYear(), wall.getUTCMonth(), wall.getUTCDate());
    // On a daylight-saving change the offset at midnight differs from now's.
    const atMidnight = tzOffsetMs(new Date(midnight - offset), QUOTA_TZ);
    return new Date(midnight - atMidnight);
}

/** When the pool refills next (the following Pacific midnight). */
export function nextQuotaReset(now: Date = new Date()): Date {
    // +26h always lands inside the next day, even on a 23h or 25h day.
    return quotaDayStart(new Date(quotaDayStart(now).getTime() + 26 * 3_600_000));
}

/** "2026-10-24": the Pacific date of the current quota day. */
export function quotaDayKey(now: Date = new Date()): string {
    const offset = tzOffsetMs(now, QUOTA_TZ);
    return new Date(now.getTime() + offset).toISOString().slice(0, 10);
}

/** Pure: what the meter shows for a limit, a count and Google's verdict. */
export function creditStatus(limit: number, used: number, googleSaidEmpty: boolean, now: Date = new Date()): AiCreditStatus {
    const safeLimit = Math.max(0, Math.floor(limit));
    const remaining = googleSaidEmpty ? 0 : Math.max(0, safeLimit - used);
    return {
        limit: safeLimit,
        used: safeLimit - remaining,
        remaining,
        resetAt: nextQuotaReset(now).toISOString(),
        exhausted: remaining === 0,
    };
}

interface QuotaState {
    _id: string;
    exhaustedDay?: string;
    at?: Date;
}

const stateCollection = () => mongoose.connection.db!.collection<QuotaState>('aiQuotaState');

let cache: { at: number; status: AiCreditStatus } | null = null;

/** Today's shared pool (cached for a few seconds per server instance). */
export async function getAiCreditStatus(): Promise<AiCreditStatus> {
    if (cache && Date.now() - cache.at < CACHE_MS) return cache.status;
    await connectToDatabase();
    const now = new Date();
    const [limit, used, state] = await Promise.all([
        getAdminSetting<number>('ai_daily_credit_limit', BETA_DAILY_AI_CREDITS),
        AiUsageEventModel.countDocuments({ createdAt: { $gte: quotaDayStart(now) }, success: true }),
        stateCollection().findOne({ _id: 'daily' }),
    ]);
    const status = creditStatus(Number(limit) || BETA_DAILY_AI_CREDITS, used, state?.exhaustedDay === quotaDayKey(now), now);
    cache = { at: Date.now(), status };
    return status;
}

/**
 * Throws BetaLimitError when the pool is empty. Fails open if the count can't
 * be read: Google's own daily-quota error still stops us in that case.
 */
export async function assertAiCreditAvailable(): Promise<void> {
    let status: AiCreditStatus;
    try {
        status = await getAiCreditStatus();
    } catch (error) {
        console.error('[ai-credits] could not read the credit pool:', error);
        return;
    }
    if (status.exhausted) throw new BetaLimitError(status.resetAt);
}

/** Google says today's quota is gone: show the pool as empty until the reset. */
export async function markAiPoolExhausted(): Promise<void> {
    try {
        await connectToDatabase();
        await stateCollection().updateOne(
            { _id: 'daily' },
            { $set: { exhaustedDay: quotaDayKey(), at: new Date() } },
            { upsert: true }
        );
    } catch (error) {
        console.error('[ai-credits] could not record the exhausted pool:', error);
    } finally {
        cache = null;
    }
}

/** Called after each successful AI call so the meter isn't a few seconds behind. */
export function invalidateAiCreditCache(): void {
    cache = null;
}
