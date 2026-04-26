'use client';

import { useQuery } from '@tanstack/react-query';

export const PUBLIC_SLUG_KEY = ['publicSlug'] as const;

export function usePublicSlug(enabled: boolean) {
    return useQuery<string | null>({
        queryKey: PUBLIC_SLUG_KEY,
        queryFn: async () => {
            const res = await fetch('/api/profile/public/slug');
            if (!res.ok) return null;
            const data = await res.json();
            return (data.slug as string | null) ?? null;
        },
        enabled,
    });
}
