'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SessionProvider } from 'next-auth/react';
import { useState, useEffect, PropsWithChildren } from 'react';
import { toast } from '../lib/toast';

/**
 * React Query Provider for the application
 * Configures intelligent request management, caching, and deduplication
 */
export function Providers({ children }: PropsWithChildren) {
    useEffect(() => {
        const originalFetch = window.fetch;
        let lastWarnAt = 0;

        window.fetch = async (...args) => {
            const res = await originalFetch(...args);
            if (res.status === 503) {
                const now = Date.now();
                if (now - lastWarnAt > 30_000) {
                    lastWarnAt = now;
                    // Providers is also used outside the next-intl provider (app/c), so pick by <html lang>.
                    toast.warning(document.documentElement.lang === 'ja'
                        ? 'サーバーが一時的に利用できません。しばらくしてから、もう一度お試しください。'
                        : 'Our servers are temporarily unavailable. Please try again in a moment.', 8000);
                }
            }
            return res;
        };

        return () => { window.fetch = originalFetch; };
    }, []);

    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        // Prevents automatic refetching on window focus
                        refetchOnWindowFocus: false,
                        // Prevents automatic refetching on reconnect
                        refetchOnReconnect: false,
                        // Don't retry by default (we have custom retry logic)
                        retry: false,
                        // Keep data fresh for 5 minutes
                        staleTime: 5 * 60 * 1000,
                        // Cache data for 10 minutes
                        gcTime: 10 * 60 * 1000,
                    },
                    mutations: {
                        // Mutations (chat messages) get 2 retries with exponential backoff
                        retry: (failureCount, error: any) => {
                            // Don't retry on client errors (4xx)
                            if (error?.status >= 400 && error?.status < 500) {
                                return false;
                            }
                            // Retry up to 2 times for server errors
                            return failureCount < 2;
                        },
                        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
                    },
                },
            })
    );

    return (
        <SessionProvider refetchOnWindowFocus={false}>
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        </SessionProvider>
    );
}
