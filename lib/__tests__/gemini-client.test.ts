/**
 * callWithRetry and the beta credit pool: an empty pool stops the call before
 * it reaches Google, and Google's daily-quota error empties the pool instead
 * of being retried. Run with: npm test
 */

jest.mock('@sentry/nextjs', () => ({ captureException: jest.fn() }));
jest.mock('../ai-usage', () => ({ logAiUsage: jest.fn() }));
jest.mock('../ai-credits', () => ({
    assertAiCreditAvailable: jest.fn(),
    invalidateAiCreditCache: jest.fn(),
    markAiPoolExhausted: jest.fn(),
    nextQuotaReset: () => new Date('2026-10-25T07:00:00.000Z'),
}));

import * as Sentry from '@sentry/nextjs';
import * as credits from '../ai-credits';
import { BetaLimitError } from '../ai-errors';
import { callWithRetry, isCompleteJson } from '../gemini-client';

const tracking = { route: 'test', model: 'gemini-3.1-flash-lite' };

beforeEach(() => jest.clearAllMocks());

it('does not call the model when the pool is empty', async () => {
    (credits.assertAiCreditAvailable as jest.Mock).mockRejectedValueOnce(new BetaLimitError('2026-10-25T07:00:00.000Z'));
    const fn = jest.fn();
    await expect(callWithRetry(fn, 'test', tracking)).rejects.toBeInstanceOf(BetaLimitError);
    expect(fn).not.toHaveBeenCalled();
});

it("empties the pool on Google's daily-quota error, without retrying", async () => {
    const daily = Object.assign(new Error('429 RESOURCE_EXHAUSTED quotaId: GenerateRequestsPerDayPerProjectPerModel-FreeTier'), { status: 429 });
    const fn = jest.fn().mockRejectedValue(daily);
    await expect(callWithRetry(fn, 'test', tracking)).rejects.toBeInstanceOf(BetaLimitError);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(credits.markAiPoolExhausted).toHaveBeenCalledTimes(1);
    expect(Sentry.captureException).not.toHaveBeenCalled();
});

it('refreshes the meter after a successful call', async () => {
    const fn = jest.fn().mockResolvedValue({ text: '{}' });
    await callWithRetry(fn, 'test', tracking);
    expect(credits.invalidateAiCreditCache).toHaveBeenCalled();
});

it('spots JSON cut off by a looping model', () => {
    expect(isCompleteJson('{"a":1}')).toBe(true);
    expect(isCompleteJson('{"a":"aaaaaaa')).toBe(false);
    expect(isCompleteJson(undefined)).toBe(false);
});
