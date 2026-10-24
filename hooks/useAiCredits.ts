/**
 * Today's shared beta AI credits (app/api/ai/credits). Refreshes every minute,
 * on window focus, and right after any AI action (see hooks/useGemini.ts).
 */

import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';

export interface AiCredits {
    limit: number;
    used: number;
    remaining: number;
    resetAt: string;
    exhausted: boolean;
}

export const AI_CREDITS_KEY = ['ai-credits'] as const;

export function useAiCredits() {
    const { status } = useSession();
    return useQuery<AiCredits>({
        queryKey: AI_CREDITS_KEY,
        queryFn: async () => {
            const res = await fetch('/api/ai/credits', { cache: 'no-store' });
            if (!res.ok) throw new Error(`credits ${res.status}`);
            return res.json();
        },
        enabled: status === 'authenticated',
        staleTime: 15_000,
        refetchInterval: 60_000,
        refetchOnWindowFocus: true,
        retry: false,
    });
}

/** "4:00 PM" and whole hours until the reset, in the viewer's time zone. */
export function formatCreditReset(resetAt: string, locale: string, now: number = Date.now()): { time: string; hours: number } {
    const at = new Date(resetAt);
    return {
        time: new Intl.DateTimeFormat(locale === 'ja' ? 'ja-JP' : 'en-US', { hour: 'numeric', minute: '2-digit' }).format(at),
        hours: Math.max(1, Math.ceil((at.getTime() - now) / 3_600_000)),
    };
}
