'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import AppNavbar from './AppNavbar';

/**
 * Wrapper that provides the shared AppNavbar + admin check for server-rendered pages.
 * Use this in server components where you can't directly use the client navbar.
 */
export default function AppShell({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (session?.user) {
      fetch('/api/admin/check')
        .then(res => res.json())
        .then(data => setIsAdmin(data.isAdmin))
        .catch(() => {});
    }
  }, [session]);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <AppNavbar isAdmin={isAdmin} />
      <main className="pb-20 md:pb-0">
        {children}
      </main>
    </div>
  );
}
