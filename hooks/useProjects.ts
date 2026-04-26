'use client';

import { useQuery } from '@tanstack/react-query';

export interface ProjectOption {
    id: string;
    title: string;
    status: string;
}

export const PROJECTS_KEY = ['projects'] as const;

export function useProjects() {
    return useQuery<ProjectOption[]>({
        queryKey: PROJECTS_KEY,
        queryFn: async () => {
            const res = await fetch('/api/projects');
            if (!res.ok) return [] as ProjectOption[];
            const data = await res.json();
            return (data.projects ?? [])
                .filter((p: any) => (p.status === 'completed' || p.status === 'generated') && p.data?.fullName)
                .map((p: any): ProjectOption => ({ id: p.id, title: p.title, status: p.status }));
        },
        // Projects change infrequently — serve from cache between navigations
        staleTime: 2 * 60 * 1000,
    });
}
