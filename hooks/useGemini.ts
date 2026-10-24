/**
 * React Query hooks for Gemini API interactions
 * Provides world-class request management with automatic deduplication, 
 * caching, and retry logic
 */

import { useMutation } from '@tanstack/react-query';
import { Message, ResumeData, RoleType, ImportData, EvaluationResult } from '../types';
import { readAiErrorMessage } from '../lib/ai-errors';

// The chat route only reads the name and email from initialData; never ship the base64 photo on every turn.
const withoutPhoto = (d?: ResumeData): ResumeData | undefined => (d ? { ...d, photo: undefined } : undefined);

interface SendMessageParams {
    message: string;
    history: Message[];
    roleType: RoleType;
    importData?: ImportData;
    initialData?: ResumeData;
    signal?: AbortSignal;
    locale?: string;
}

interface GenerateHintParams {
    history: Message[];
    roleType: RoleType;
    importData?: ImportData;
    initialData?: ResumeData;
    signal?: AbortSignal;
    locale?: string;
}

/**
 * Hook for sending chat messages with automatic deduplication
 * Multiple calls with the same parameters will be deduplicated
 */
export function useSendMessage() {
    return useMutation({
        mutationFn: async (params: SendMessageParams) => {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'sendMessage',
                    message: params.message,
                    history: params.history,
                    roleType: params.roleType,
                    importData: params.importData,
                    initialData: withoutPhoto(params.initialData),
                    locale: params.locale,
                }),
                signal: params.signal,
            });

            if (!response.ok) {
                throw new Error(await readAiErrorMessage(response, params.locale));
            }

            const data = await response.json();
            return { text: data.text, phase: data.phase, completedSections: data.completedSections, agentReady: data.agentReady };
        },
        // Retry configuration
        retry: (failureCount, error: unknown) => {
            const err = error as any;
            // Don't retry on 4xx errors
            if (err?.message?.includes('400') || err?.message?.includes('401')) {
                return false;
            }
            // Retry up to 2 times for 503/overloaded errors
            const is503 = err?.message?.includes('503') || err?.message?.includes('overloaded');
            return is503 && failureCount < 2;
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 4000),
    });
}

/**
 * Hook for generating hints with deduplication
 */
export function useGenerateHint() {
    return useMutation({
        mutationFn: async (params: GenerateHintParams) => {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'generateHint',
                    history: params.history,
                    roleType: params.roleType,
                    importData: params.importData,
                    initialData: withoutPhoto(params.initialData),
                    locale: params.locale,
                }),
                signal: params.signal,
            });

            if (!response.ok) {
                throw new Error(await readAiErrorMessage(response, params.locale));
            }

            const data = await response.json();
            return data.hint;
        },
        retry: 1,
        retryDelay: 1000,
    });
}

interface FollowUpParams {
    question: string;
    answer: string;
    context?: string;
    roleType: RoleType;
    locale?: string;
    signal?: AbortSignal;
}

/**
 * Scripted interview: one AI follow-up question for a thin answer (config/interview.ts).
 * Sends only that question and answer. Optional, so it never retries: the caller
 * moves on with the script if it fails.
 */
export function useFollowUp() {
    return useMutation({
        mutationFn: async (params: FollowUpParams): Promise<string> => {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'followUp',
                    question: params.question,
                    answer: params.answer,
                    context: params.context,
                    roleType: params.roleType,
                    locale: params.locale,
                }),
                signal: params.signal,
            });

            if (!response.ok) {
                throw new Error(await readAiErrorMessage(response, params.locale));
            }

            const data = await response.json();
            return typeof data.text === 'string' ? data.text : '';
        },
        retry: false,
    });
}

/**
 * Hook for parsing resume from chat history
 */
export function useParseResume() {
    return useMutation({
        mutationFn: async ({
            history,
            importData,
            locale,
        }: {
            history: Message[];
            importData?: ImportData;
            locale?: string;
        }) => {
            const response = await fetch('/api/parse', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ history, importData, locale }),
            });

            if (!response.ok) {
                throw new Error(await readAiErrorMessage(response, locale));
            }

            const result = await response.json();
            return result.data as ResumeData;
        },
        retry: 1,
        retryDelay: 2000,
    });
}

/**
 * Hook for evaluating resume quality
 */
export function useEvaluateResume() {
    return useMutation({
        mutationFn: async ({
            data,
            roleType,
            locale,
        }: {
            data: ResumeData;
            roleType: RoleType;
            locale?: string;
        }) => {
            const response = await fetch('/api/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'evaluateResume',
                    data,
                    roleType,
                    locale,
                }),
            });

            if (!response.ok) {
                throw new Error(await readAiErrorMessage(response, locale));
            }

            const result = await response.json();
            return result.data as EvaluationResult;
        },
        retry: 1,
        retryDelay: 2000,
    });
}
