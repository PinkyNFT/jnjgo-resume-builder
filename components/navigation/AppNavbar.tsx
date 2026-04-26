'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import LanguageSwitcher from '../LanguageSwitcher';
import {
    LayoutDashboard,
    UserCircle,
    Shield,
    LogOut,
    ChevronDown,
    X,
    Sparkles,
    MessageSquare,
    FlaskConical,
} from 'lucide-react';

interface AppNavbarProps {
    minimal?: boolean;
}

const NAV_ITEMS = [
    { href: '/dashboard', labelKey: 'dashboard', icon: LayoutDashboard },
    { href: '/profile/private', labelKey: 'profile', icon: UserCircle },
] as const;

export default function AppNavbar({ minimal = false }: AppNavbarProps) {
    const { data: session, status } = useSession();
    const locale = useLocale();
    const pathname = usePathname();
    const t = useTranslations('Nav');
    const tBeta = useTranslations('BetaBanner');
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const userMenuRef = useRef<HTMLDivElement>(null);
    const [betaBannerDismissed, setBetaBannerDismissed] = useState(true);
    const [avatarError, setAvatarError] = useState(false);

    // Admin status comes directly from the JWT — no extra API call needed
    const isAdmin = session?.user?.isAdmin ?? false;

    // Unread message count — React Query deduplicates and caches across all navbar instances
    const { data: messagesData } = useQuery({
        queryKey: ['unreadMessages'],
        queryFn: async () => {
            const res = await fetch('/api/candidate/messages?page=1&limit=1');
            return res.ok ? res.json() : { unreadCount: 0 };
        },
        enabled: status === 'authenticated',
        staleTime: 60 * 1000,
    });
    const unreadMessages = messagesData?.unreadCount ?? 0;

    useEffect(() => {
        setBetaBannerDismissed(localStorage.getItem('beta-banner-dismissed') === '1');
    }, []);

    const dismissBetaBanner = () => {
        localStorage.setItem('beta-banner-dismissed', '1');
        setBetaBannerDismissed(true);
    };

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
                setUserMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        setUserMenuOpen(false);
    }, [pathname]);

    const isActive = (href: string) => {
        const localePath = `/${locale}${href}`;
        return pathname === localePath || pathname.startsWith(localePath + '/');
    };

    const getLocalizedHref = (href: string) => `/${locale}${href}`;

    return (
        <>
            {!betaBannerDismissed && (
                <div className="sticky top-0 z-50 bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-center gap-3 text-xs sm:text-sm text-amber-800">
                    <FlaskConical className="w-4 h-4 shrink-0 text-amber-500" />
                    <span>{tBeta('text')}</span>
                    <button
                        onClick={dismissBetaBanner}
                        className="ml-2 p-0.5 rounded hover:bg-amber-200 transition-colors shrink-0"
                        aria-label={tBeta('dismiss')}
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}

            <nav className="sticky top-0 z-50 glass border-b border-slate-200/60 shadow-sm shadow-slate-100/50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6">
                    <div className="flex h-16 items-center justify-between">

                        {/* Left: Logo + desktop nav links */}
                        <div className="flex items-center gap-8">
                            <Link href={getLocalizedHref('/dashboard')} className="group flex items-center gap-2 shrink-0">
                                <span className="text-2xl drop-shadow-sm transition-transform duration-300 group-hover:scale-110 inline-block">🚀</span>
                                <div className="flex flex-col">
                                    <span className="font-black text-slate-800 tracking-tight text-base sm:text-lg leading-tight">
                                        JNJGO Resume
                                    </span>
                                    <span className="hidden sm:block text-[10px] font-medium text-slate-400 tracking-wide leading-none">
                                        AI Resume Builder
                                    </span>
                                </div>
                            </Link>

                            {/* Desktop nav links */}
                            {!minimal && (
                                <div className="hidden md:flex items-center gap-1">
                                    {NAV_ITEMS.map((item) => {
                                        const active = isActive(item.href);
                                        return (
                                            <Link
                                                key={item.href}
                                                href={getLocalizedHref(item.href)}
                                                className={`relative inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                                                    active
                                                        ? 'bg-indigo-50 text-indigo-700 shadow-sm shadow-indigo-100/50'
                                                        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                                                }`}
                                            >
                                                <item.icon className={`w-4 h-4 transition-transform duration-200 ${active ? 'scale-110' : ''}`} />
                                                {t(item.labelKey)}
                                                {active && (
                                                    <span className="absolute -bottom-3.25 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-indigo-600 rounded-full" />
                                                )}
                                            </Link>
                                        );
                                    })}

                                    {/* Messages */}
                                    {(() => {
                                        const active = isActive('/messages');
                                        return (
                                            <Link
                                                href={getLocalizedHref('/messages')}
                                                className={`relative inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                                                    active ? 'bg-indigo-50 text-indigo-700 shadow-sm shadow-indigo-100/50' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                                                }`}
                                            >
                                                <div className="relative">
                                                    <MessageSquare className={`w-4 h-4 transition-transform duration-200 ${active ? 'scale-110' : ''}`} />
                                                    {unreadMessages > 0 && (
                                                        <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                                                            {unreadMessages > 9 ? '9+' : unreadMessages}
                                                        </span>
                                                    )}
                                                </div>
                                                Messages
                                                {active && (
                                                    <span className="absolute -bottom-3.25 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-indigo-600 rounded-full" />
                                                )}
                                            </Link>
                                        );
                                    })()}

                                    {isAdmin && (
                                        <Link
                                            href={getLocalizedHref('/admin')}
                                            className={`relative inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                                                isActive('/admin')
                                                    ? 'bg-indigo-50 text-indigo-700 shadow-sm shadow-indigo-100/50'
                                                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                                            }`}
                                        >
                                            <Shield className={`w-4 h-4 transition-transform duration-200 ${isActive('/admin') ? 'scale-110' : ''}`} />
                                            {t('admin')}
                                            {isActive('/admin') && (
                                                <span className="absolute -bottom-3.25 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-indigo-600 rounded-full" />
                                            )}
                                        </Link>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Right: Language (desktop only) + user */}
                        <div className="flex items-center gap-2 sm:gap-3">
                            {/* Language switcher — desktop only, mobile is inside user dropdown */}
                            <div className="hidden md:flex">
                                <LanguageSwitcher />
                            </div>

                            {/* User menu */}
                            {status === 'loading' ? (
                                <div className="w-9 h-9 rounded-full skeleton" />
                            ) : session?.user ? (
                                <div className="relative" ref={userMenuRef}>
                                    <button
                                        onClick={() => setUserMenuOpen(!userMenuOpen)}
                                        className={`flex items-center gap-2 pl-1.5 pr-2.5 py-1.5 rounded-2xl border transition-all duration-200 active:scale-95 ${
                                            userMenuOpen
                                                ? 'bg-slate-100 border-slate-300 ring-2 ring-slate-200'
                                                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                        }`}
                                    >
                                        {session.user.image && !avatarError ? (
                                            <img
                                                src={session.user.image}
                                                alt={session.user.name || 'User'}
                                                referrerPolicy="no-referrer"
                                                onError={() => setAvatarError(true)}
                                                className="w-7 h-7 rounded-full ring-2 ring-white shadow-sm"
                                            />
                                        ) : (
                                            <div className="w-7 h-7 rounded-full bg-linear-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                                                {(session.user.name || session.user.email || 'U').charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                        <span className="text-sm font-semibold text-slate-700 max-w-24 truncate hidden xs:block">
                                            {(session.user.name || '').split(' ')[0]}
                                        </span>
                                        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${userMenuOpen ? 'rotate-180' : ''}`} />
                                    </button>

                                    {userMenuOpen && (
                                        <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl shadow-slate-200/60 border border-slate-100 py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                            {/* User info */}
                                            <div className="px-4 py-3 border-b border-slate-100">
                                                <div className="flex items-center gap-3">
                                                    {session.user.image && !avatarError ? (
                                                        <img src={session.user.image} alt="" referrerPolicy="no-referrer" onError={() => setAvatarError(true)} className="w-10 h-10 rounded-full shadow-sm" />
                                                    ) : (
                                                        <div className="w-10 h-10 rounded-full bg-linear-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold shadow-sm">
                                                            {(session.user.name || session.user.email || 'U').charAt(0).toUpperCase()}
                                                        </div>
                                                    )}
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-bold text-slate-900 truncate">{session.user.name}</p>
                                                        <p className="text-xs text-slate-400 truncate">{session.user.email}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Nav links — shown on mobile since bottom bar is the primary nav,
                                                also shown on desktop for convenience */}
                                            <div className="px-2 py-2 space-y-0.5">
                                                {NAV_ITEMS.map((item) => (
                                                    <Link
                                                        key={item.href}
                                                        href={getLocalizedHref(item.href)}
                                                        onClick={() => setUserMenuOpen(false)}
                                                        className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-150 ${
                                                            isActive(item.href) ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                                        }`}
                                                    >
                                                        <item.icon className="w-4 h-4" />
                                                        {t(item.labelKey)}
                                                    </Link>
                                                ))}
                                                <Link
                                                    href={getLocalizedHref('/messages')}
                                                    onClick={() => setUserMenuOpen(false)}
                                                    className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-150 ${
                                                        isActive('/messages') ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                                    }`}
                                                >
                                                    <div className="relative w-4 h-4">
                                                        <MessageSquare className="w-4 h-4" />
                                                        {unreadMessages > 0 && (
                                                            <span className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-red-500 text-white text-[7px] font-bold rounded-full flex items-center justify-center">
                                                                {unreadMessages > 9 ? '9+' : unreadMessages}
                                                            </span>
                                                        )}
                                                    </div>
                                                    Messages
                                                    {unreadMessages > 0 && (
                                                        <span className="ml-auto text-[10px] font-bold text-red-500">{unreadMessages} new</span>
                                                    )}
                                                </Link>
                                                {isAdmin && (
                                                    <Link
                                                        href={getLocalizedHref('/admin')}
                                                        onClick={() => setUserMenuOpen(false)}
                                                        className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-150 ${
                                                            isActive('/admin') ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                                        }`}
                                                    >
                                                        <Shield className="w-4 h-4" />
                                                        {t('admin')}
                                                    </Link>
                                                )}
                                            </div>

                                            {/* Language switcher — visible on mobile inside dropdown */}
                                            <div className="md:hidden border-t border-slate-100 px-4 py-3">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">Language</p>
                                                <LanguageSwitcher compact />
                                            </div>

                                            {/* Sign out */}
                                            <div className="border-t border-slate-100 px-2 pt-1 pb-1">
                                                <button
                                                    onClick={() => { setUserMenuOpen(false); signOut({ callbackUrl: '/' }); }}
                                                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 rounded-lg transition-all duration-150"
                                                >
                                                    <LogOut className="w-4 h-4" />
                                                    {t('signOut')}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    {/* Language toggle for unauthenticated users on mobile */}
                                    <div className="md:hidden">
                                        <LanguageSwitcher />
                                    </div>
                                    <Link
                                        href={getLocalizedHref('/auth/signin')}
                                        className="group inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-xl hover:bg-indigo-600 transition-all duration-200 shadow-sm hover:shadow-lg hover:shadow-indigo-500/20 hover:-translate-y-0.5"
                                    >
                                        <Sparkles className="w-3.5 h-3.5" />
                                        {t('signIn')}
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </nav>

            {/* Mobile bottom nav — primary navigation on small screens */}
            {!minimal && (
                <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-slate-200/60 safe-area-pb shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.05)]">
                    <div className="flex items-center justify-around px-2 py-1.5">
                        {NAV_ITEMS.map((item) => {
                            const active = isActive(item.href);
                            return (
                                <Link
                                    key={item.href}
                                    href={getLocalizedHref(item.href)}
                                    className={`flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl text-[11px] font-semibold transition-all duration-200 min-w-16 active:scale-95 ${
                                        active ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
                                    }`}
                                >
                                    <item.icon className={`w-5 h-5 transition-all duration-200 ${active ? 'text-indigo-600 scale-110' : ''}`} />
                                    <span>{t(item.labelKey)}</span>
                                    {active && <span className="w-1 h-1 rounded-full bg-indigo-600 mt-0.5" />}
                                </Link>
                            );
                        })}

                        {/* Messages */}
                        {(() => {
                            const active = isActive('/messages');
                            return (
                                <Link
                                    href={getLocalizedHref('/messages')}
                                    className={`flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl text-[11px] font-semibold transition-all duration-200 min-w-16 active:scale-95 ${
                                        active ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
                                    }`}
                                >
                                    <div className="relative">
                                        <MessageSquare className={`w-5 h-5 transition-all duration-200 ${active ? 'text-indigo-600 scale-110' : ''}`} />
                                        {unreadMessages > 0 && (
                                            <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                                                {unreadMessages > 9 ? '9+' : unreadMessages}
                                            </span>
                                        )}
                                    </div>
                                    <span>Messages</span>
                                    {active && !unreadMessages && <span className="w-1 h-1 rounded-full bg-indigo-600 mt-0.5" />}
                                </Link>
                            );
                        })()}

                        {isAdmin && (
                            <Link
                                href={getLocalizedHref('/admin')}
                                className={`flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl text-[11px] font-semibold transition-all duration-200 min-w-16 active:scale-95 ${
                                    isActive('/admin') ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
                                }`}
                            >
                                <Shield className={`w-5 h-5 transition-all duration-200 ${isActive('/admin') ? 'text-indigo-600 scale-110' : ''}`} />
                                <span>{t('admin')}</span>
                                {isActive('/admin') && <span className="w-1 h-1 rounded-full bg-indigo-600 mt-0.5" />}
                            </Link>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
