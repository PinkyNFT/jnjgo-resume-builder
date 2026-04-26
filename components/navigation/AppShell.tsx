'use client';

import React from 'react';
import AppNavbar from './AppNavbar';

/**
 * Wrapper that provides the shared AppNavbar for server-rendered pages.
 * Admin status is read directly from the session JWT — no extra API call needed.
 */
export default function AppShell({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
            <AppNavbar />
            <main className="pb-20 md:pb-0">
                {children}
            </main>
        </div>
    );
}
