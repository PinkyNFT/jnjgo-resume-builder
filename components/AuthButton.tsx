'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import { LayoutDashboard, LogOut, ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

export function AuthButton() {
    const t = useTranslations('Nav');
    const { data: session, status } = useSession();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (status === 'loading') {
        return (
            <div className="flex items-center gap-2 px-3 py-2">
                <div className="w-8 h-8 rounded-full bg-slate-200 animate-pulse"></div>
                <div className="w-16 h-3 bg-slate-200 rounded animate-pulse hidden sm:block"></div>
            </div>
        );
    }

    if (session?.user) {
        return (
            <div className="relative" ref={dropdownRef}>
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-slate-100 transition-colors"
                >
                    {session.user.image ? (
                        <img
                            src={session.user.image}
                            alt={session.user.name || 'User'}
                            className="w-8 h-8 rounded-full ring-2 ring-slate-100"
                        />
                    ) : (
                        <div className="w-8 h-8 rounded-full bg-linear-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-sm font-bold">
                            {(session.user.name || session.user.email || 'U').charAt(0).toUpperCase()}
                        </div>
                    )}
                    <span className="text-sm font-medium text-slate-700 hidden sm:block max-w-30 truncate">
                        {session.user.name || session.user.email}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-slate-400 hidden sm:block transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown */}
                {isOpen && (
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                        {/* User info */}
                        <div className="px-4 py-3 border-b border-slate-100">
                            <div className="flex items-center gap-3">
                                {session.user.image ? (
                                    <img
                                        src={session.user.image}
                                        alt={session.user.name || 'User'}
                                        className="w-10 h-10 rounded-full"
                                    />
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-linear-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold">
                                        {(session.user.name || session.user.email || 'U').charAt(0).toUpperCase()}
                                    </div>
                                )}
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-slate-900 truncate">{session.user.name}</p>
                                    <p className="text-xs text-slate-500 truncate">{session.user.email}</p>
                                </div>
                            </div>
                        </div>

                        {/* Dashboard + Sign out */}
                        <div className="px-2 pt-2 space-y-1">
                            <Link
                                href={session.user.role === 'recruiter' ? '/recruiter/dashboard' : session.user.role === 'pending_recruiter' ? '/auth/pending-approval' : '/dashboard'}
                                onClick={() => setIsOpen(false)}
                                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition-colors"
                            >
                                <LayoutDashboard className="w-4 h-4" />
                                {t('goToDashboard')}
                            </Link>
                            <button
                                onClick={() => { setIsOpen(false); signOut({ callbackUrl: '/' }); }}
                                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-700 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
                            >
                                <LogOut className="w-4 h-4" />
                                {t('signOut')}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <button
            onClick={() => signIn()}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-xl hover:bg-indigo-600 transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5"
        >
            {t('signIn')}
        </button>
    );
}
