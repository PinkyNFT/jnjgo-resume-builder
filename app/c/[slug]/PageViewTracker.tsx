'use client';

import { useEffect } from 'react';

interface PageViewTrackerProps {
    slug: string;
}

const ANON_ID_KEY = 'jnjgo_anon_id';

function getAnonymousId(): string {
    let id = localStorage.getItem(ANON_ID_KEY);
    if (!id) {
        id = crypto.randomUUID().replace(/-/g, '').slice(0, 32);
        localStorage.setItem(ANON_ID_KEY, id);
    }
    return id;
}

export default function PageViewTracker({ slug }: PageViewTrackerProps) {
    useEffect(() => {
        // Deduplicate: one tracking call per slug per browser session
        const dedupeKey = `jnjgo_pv_${slug}`;
        if (sessionStorage.getItem(dedupeKey)) return;
        sessionStorage.setItem(dedupeKey, '1');

        try {
            const params = new URLSearchParams(window.location.search);
            const payload = JSON.stringify({
                anonymousId: getAnonymousId(),
                candidatePageSlug: slug,
                source: {
                    ref: params.get('ref') || undefined,
                    site: params.get('site') || undefined,
                    utm_campaign: params.get('utm_campaign') || undefined,
                    utm_medium: params.get('utm_medium') || undefined,
                },
            });

            // Use sendBeacon for reliable delivery — survives page navigation
            // Falls back to fetch for older browsers
            const url = '/api/recruiter/page-views';
            const sent = navigator.sendBeacon?.(
                url,
                new Blob([payload], { type: 'application/json' })
            );

            if (!sent) {
                // Fallback: fire-and-forget fetch with keepalive
                fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: payload,
                    keepalive: true,
                }).catch(() => {});
            }
        } catch {
            // Tracking is best-effort, fail silently
        }
    }, [slug]);

    return null;
}
