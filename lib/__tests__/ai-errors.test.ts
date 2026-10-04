/**
 * Gemini error → user-facing message mapping (client issue #6).
 * Run with: npm test
 */

import { classifyAiError, aiErrorPayload, readAiErrorMessage, aiErrorMessage } from '../ai-errors';

// Shape of @google/genai's ApiError: Error with a numeric `status`, message = the API's JSON error.
const apiError = (status: number, body: object) =>
    Object.assign(new Error(JSON.stringify({ error: body })), { name: 'ApiError', status });

describe('classifyAiError', () => {
    it.each([
        ['quota (429 RESOURCE_EXHAUSTED)', apiError(429, { code: 429, message: 'You exceeded your current quota, please check your plan and billing details.', status: 'RESOURCE_EXHAUSTED' }), 'quota'],
        ['invalid key (400 API_KEY_INVALID)', apiError(400, { code: 400, message: 'API key not valid. Please pass a valid API key.', status: 'INVALID_ARGUMENT' }), 'config'],
        ['billing/access block (403)', apiError(403, { code: 403, message: 'Lightning dunning: billing account suspended', status: 'PERMISSION_DENIED' }), 'config'],
        ['overloaded (503)', apiError(503, { code: 503, message: 'The model is overloaded. Please try again later.', status: 'UNAVAILABLE' }), 'unavailable'],
        ['deadline (504)', apiError(504, { code: 504, message: 'Deadline expired before operation could complete.', status: 'DEADLINE_EXCEEDED' }), 'timeout'],
        ['network timeout', new Error('fetch failed: ETIMEDOUT'), 'timeout'],
        ['network failure', new TypeError('fetch failed'), 'unavailable'],
        ['bad JSON from model', new SyntaxError('Unexpected token } in JSON at position 10'), 'unknown'],
    ])('%s', (_label, error, kind) => {
        expect(classifyAiError(error)).toBe(kind);
    });
});

describe('aiErrorPayload', () => {
    it('returns a localized, user-friendly message and never leaks the raw API error', () => {
        const err = apiError(429, { code: 429, message: 'quota exceeded for project 970008138510', status: 'RESOURCE_EXHAUSTED' });
        const en = aiErrorPayload(err, 'en');
        const ja = aiErrorPayload(err, 'ja');
        expect(en).toEqual({ status: 429, body: { error: aiErrorMessage('quota', 'en'), code: 'AI_QUOTA' } });
        expect(ja.body.error).toBe(aiErrorMessage('quota', 'ja'));
        expect(JSON.stringify(en)).not.toContain('970008138510');
    });

    it('never uses 503 (that triggers the global "servers unavailable" toast)', () => {
        for (const err of [apiError(503, {}), apiError(403, {}), apiError(504, {}), new Error('x')]) {
            expect(aiErrorPayload(err).status).not.toBe(503);
        }
    });
});

describe('readAiErrorMessage', () => {
    const res = (status: number, body: string, type = 'application/json') =>
        new Response(body, { status, headers: { 'Content-Type': type } });

    it('uses our localized server message', async () => {
        const msg = aiErrorMessage('timeout', 'ja');
        expect(await readAiErrorMessage(res(504, JSON.stringify({ error: msg, code: 'AI_TIMEOUT' })), 'ja')).toBe(msg);
    });

    it('localizes the (English) rate-limiter 429', async () => {
        expect(await readAiErrorMessage(res(429, JSON.stringify({ error: 'Too many requests. Please try again later.' })), 'ja'))
            .toBe(aiErrorMessage('rateLimit', 'ja'));
    });

    it('handles a non-JSON platform error page instead of surfacing a SyntaxError', async () => {
        expect(await readAiErrorMessage(res(504, '<html>An error occurred with your deployment</html>', 'text/html'), 'en'))
            .toBe(aiErrorMessage('timeout', 'en'));
        expect(await readAiErrorMessage(res(500, 'Internal Server Error', 'text/plain'), 'en'))
            .toBe(aiErrorMessage('unknown', 'en'));
    });
});
