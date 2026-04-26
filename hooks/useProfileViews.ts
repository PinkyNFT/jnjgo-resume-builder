'use client';

import { useQuery } from '@tanstack/react-query';

export interface ProfileViewsData {
    totalViews: number;
    anonymousCount: number;
    uniqueRecruiters: number;
    viewers: Array<{
        recruiterId: string;
        recruiterName: string | null;
        viewedAt: number;
        totalViews: number;
    }>;
}

export const PROFILE_VIEWS_KEY = ['profileViews'] as const;

export function useProfileViews(enabled: boolean) {
    return useQuery<ProfileViewsData | null>({
        queryKey: PROFILE_VIEWS_KEY,
        queryFn: async () => {
            const res = await fetch('/api/candidate/profile-views');
            if (!res.ok) return null;
            return res.json() as Promise<ProfileViewsData | null>;
        },
        enabled,
        // Profile view analytics can be slightly stale — refresh every 2 min
        staleTime: 2 * 60 * 1000,
    });
}
