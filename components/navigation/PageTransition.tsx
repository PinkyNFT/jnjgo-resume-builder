'use client';

import React, { useEffect, useState, useRef } from 'react';
import { usePathname } from 'next/navigation';

/**
 * SPA-like page transition wrapper using CSS animations.
 *
 * We cannot use Framer Motion's AnimatePresence here because in Next.js App Router
 * the layout's children swap atomically on navigation — AnimatePresence tries to keep
 * the old children mounted for an exit animation while React has already replaced them
 * with the new page's component tree (different hook count → hooks violation).
 *
 * Instead we use a lightweight CSS approach: on every pathname change we briefly set
 * opacity to 0 and translate down, then animate back in via a CSS transition.
 */
export default function PageTransition({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [isVisible, setIsVisible] = useState(true);
    const isFirstRender = useRef(true);

    useEffect(() => {
        // Skip animation on first render (SSR hydration)
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        // Trigger enter animation on route change
        setIsVisible(false);
        const raf = requestAnimationFrame(() => {
            // Force a reflow so the browser acknowledges the invisible state,
            // then transition back to visible on the next frame.
            requestAnimationFrame(() => setIsVisible(true));
        });
        return () => cancelAnimationFrame(raf);
    }, [pathname]);

    return (
        <div
            style={{
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? 'translateY(0)' : 'translateY(6px)',
                transition: 'opacity 0.2s ease-out, transform 0.2s ease-out',
            }}
        >
            {children}
        </div>
    );
}
