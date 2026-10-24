/**
 * Beta AI credits: quota day boundaries (midnight Pacific, incl. DST), pool
 * status, and how "out of credits" errors are classified and reported.
 * Run with: npm test
 */

jest.mock('../mongodb', () => ({ connectToDatabase: jest.fn() }));
jest.mock('../models', () => ({ AiUsageEventModel: {} }));
jest.mock('../admin-settings-reader', () => ({ getAdminSetting: jest.fn() }));

import { creditStatus, nextQuotaReset, quotaDayKey, quotaDayStart } from '../ai-credits';
import { aiErrorPayload, BetaLimitError, classifyAiError, isDailyQuotaError } from '../ai-errors';

describe('quota day (midnight Pacific)', () => {
    it('starts at 07:00 UTC in summer time', () => {
        const now = new Date('2026-10-24T17:14:00Z'); // 10:14 PDT
        expect(quotaDayStart(now).toISOString()).toBe('2026-10-24T07:00:00.000Z');
        expect(nextQuotaReset(now).toISOString()).toBe('2026-10-25T07:00:00.000Z');
        expect(quotaDayKey(now)).toBe('2026-10-24');
    });

    it('starts at 08:00 UTC in winter time, and uses the Pacific date', () => {
        const now = new Date('2026-12-01T03:00:00Z'); // 30 Nov, 19:00 PST
        expect(quotaDayStart(now).toISOString()).toBe('2026-11-30T08:00:00.000Z');
        expect(quotaDayKey(now)).toBe('2026-11-30');
        expect(nextQuotaReset(now).toISOString()).toBe('2026-12-01T08:00:00.000Z');
    });

    it('handles the 25-hour day when clocks fall back', () => {
        const now = new Date('2026-11-01T20:00:00Z'); // 1 Nov, 12:00 PST
        expect(quotaDayStart(now).toISOString()).toBe('2026-11-01T07:00:00.000Z');
        expect(nextQuotaReset(now).toISOString()).toBe('2026-11-02T08:00:00.000Z');
    });

    it('handles the 23-hour day when clocks spring forward', () => {
        const now = new Date('2027-03-14T20:00:00Z'); // 14 Mar, 13:00 PDT
        expect(quotaDayStart(now).toISOString()).toBe('2027-03-14T08:00:00.000Z');
        expect(nextQuotaReset(now).toISOString()).toBe('2027-03-15T07:00:00.000Z');
    });

    it('resets just after midnight Pacific, not before', () => {
        expect(quotaDayKey(new Date('2026-10-25T06:59:59Z'))).toBe('2026-10-24');
        expect(quotaDayKey(new Date('2026-10-25T07:00:00Z'))).toBe('2026-10-25');
    });
});

describe('pool status', () => {
    const now = new Date('2026-10-24T17:00:00Z');
    it('counts down from the limit', () => {
        expect(creditStatus(500, 120, false, now)).toMatchObject({ limit: 500, used: 120, remaining: 380, exhausted: false, resetAt: '2026-10-25T07:00:00.000Z' });
    });
    it('is empty at or over the limit', () => {
        expect(creditStatus(500, 500, false, now)).toMatchObject({ remaining: 0, used: 500, exhausted: true });
        expect(creditStatus(500, 612, false, now)).toMatchObject({ remaining: 0, used: 500, exhausted: true });
    });
    it("trusts Google when it says today's quota is gone", () => {
        expect(creditStatus(500, 10, true, now)).toMatchObject({ remaining: 0, exhausted: true });
    });
});

describe('out-of-credit errors', () => {
    const apiError = (quotaId: string) => Object.assign(new Error(
        `{"error":{"code":429,"message":"You exceeded your current quota.","status":"RESOURCE_EXHAUSTED","details":[{"@type":"type.googleapis.com/google.rpc.QuotaFailure","violations":[{"quotaId":"${quotaId}"}]}]}}`
    ), { status: 429 });

    it("recognises Google's daily free-tier cap, not the per-minute one", () => {
        expect(isDailyQuotaError(apiError('GenerateRequestsPerDayPerProjectPerModel-FreeTier'))).toBe(true);
        expect(isDailyQuotaError(apiError('GenerateRequestsPerMinutePerProjectPerModel-FreeTier'))).toBe(false);
        expect(classifyAiError(apiError('GenerateRequestsPerDayPerProjectPerModel-FreeTier'))).toBe('betaLimit');
        expect(classifyAiError(apiError('GenerateRequestsPerMinutePerProjectPerModel-FreeTier'))).toBe('quota');
    });

    it('reports an empty pool as 429 AI_BETA_LIMIT with the reset time', () => {
        const { body, status } = aiErrorPayload(new BetaLimitError('2026-10-25T07:00:00.000Z'), 'ja');
        expect(status).toBe(429);
        expect(body.code).toBe('AI_BETA_LIMIT');
        expect(body).toMatchObject({ resetAt: '2026-10-25T07:00:00.000Z' });
        expect(body.error).toContain('ベータ版AIクレジット');
    });
});
