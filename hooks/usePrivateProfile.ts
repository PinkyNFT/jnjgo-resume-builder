'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CandidatePrivateProfile } from '../types';

export const PRIVATE_PROFILE_KEY = ['privateProfile'] as const;

export function usePrivateProfile() {
    return useQuery<Partial<CandidatePrivateProfile> | null>({
        queryKey: PRIVATE_PROFILE_KEY,
        queryFn: async () => {
            const res = await fetch('/api/profile/private');
            if (!res.ok) return null;
            return res.json() as Promise<Partial<CandidatePrivateProfile> | null>;
        },
    });
}

export function useSavePrivateProfile() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (profile: Partial<CandidatePrivateProfile> & { status: 'draft' | 'published' }) => {
            const res = await fetch('/api/profile/private', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(profile),
            });
            if (!res.ok) throw new Error('Failed to save');
            return res.json() as Promise<Partial<CandidatePrivateProfile>>;
        },
        onSuccess: (data) => {
            // Push the saved data straight into the cache — no refetch needed
            queryClient.setQueryData(PRIVATE_PROFILE_KEY, data);
            // Bust dependent queries since status may have changed
            queryClient.invalidateQueries({ queryKey: ['publicSlug'] });
            queryClient.invalidateQueries({ queryKey: ['profileViews'] });
        },
    });
}
