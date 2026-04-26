'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import {
    Search, Building2, Users, LogOut,
    Loader2, ChevronDown, Sparkles, Shield, Eye, TrendingUp,
    Zap, ArrowRight, BookmarkCheck, BarChart3,
    MapPin, DollarSign, Briefcase, Globe, Clock, ChevronLeft, ChevronRight,
    MailOpen, User, MessageSquare, History
} from 'lucide-react';
import { toast } from '../../../../lib/toast';
import LanguageSwitcher from '../../../../components/LanguageSwitcher';
import { RecruiterProfile } from '../../../../types';

interface CandidateCard {
    userId: string;
    fullName: string | null;
    location: string | null;
    orientation: string | null;
    jobChangeIntent: string | null;
    aiObjectiveReview: string | null;
    desiredSalary: { minimum?: number; target?: number } | null;
    desiredRoles: Array<{ role: string; priority: number }>;
    highlightedResume: {
        currentRole: string | null;
        careerSummary: string | null;
        skills: string[];
    } | null;
    slug: string | null;
    updatedAt: number;
}

interface ContactRequest {
    id: string;
    candidatePageSlug: string;
    message: string;
    createdAt: number;
    unreadReplies: number;
}

interface ReplyMessage {
    id: string;
    message: string;
    isFromCandidate: boolean;
    createdAt: number;
}

export default function RecruiterDashboardPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const searchParams = useSearchParams();
    const locale = useLocale();
    const t = useTranslations('RecruiterDashboard');

    const [profile, setProfile] = useState<RecruiterProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    // Admin status comes from the JWT — no extra API call needed
    const isAdmin = session?.user?.isAdmin ?? false;

    // Candidate browsing state
    const [candidates, setCandidates] = useState<CandidateCard[]>([]);
    const [candidatesLoading, setCandidatesLoading] = useState(true);
    const [candidateSearch, setCandidateSearch] = useState('');
    const [candidateSearchInput, setCandidateSearchInput] = useState('');
    const [candidatePagination, setCandidatePagination] = useState({ page: 1, limit: 12, total: 0, totalPages: 0 });

    // Tabs
    const tabParam = searchParams.get('tab');
    const initialTab = tabParam === 'saved' ? 'saved' : tabParam === 'contacts' ? 'contacts' : tabParam === 'recently_viewed' ? 'recently_viewed' : 'browse';
    const [activeTab, setActiveTab] = useState<'browse' | 'saved' | 'contacts' | 'recently_viewed'>(initialTab);

    // Saved candidates state
    const [savedCandidates, setSavedCandidates] = useState<CandidateCard[]>([]);
    const [savedLoading, setSavedLoading] = useState(false);
    const [savedCount, setSavedCount] = useState(0);

    // Recruiter stats
    const [recruiterStats, setRecruiterStats] = useState<{ contactsSent: number; savedCount: number } | null>(null);
    const [profilesViewed, setProfilesViewed] = useState<number | null>(null);

    // Recently viewed state
    const [recentlyViewed, setRecentlyViewed] = useState<CandidateCard[]>([]);
    const [recentlyViewedLoading, setRecentlyViewedLoading] = useState(false);

    // Contacts state
    const [contacts, setContacts] = useState<ContactRequest[]>([]);
    const [contactsLoading, setContactsLoading] = useState(false);
    const [selectedContact, setSelectedContact] = useState<ContactRequest | null>(null);
    const [threadReplies, setThreadReplies] = useState<ReplyMessage[]>([]);
    const [threadLoading, setThreadLoading] = useState(false);
    const [replyText, setReplyText] = useState('');
    const [isReplying, setIsReplying] = useState(false);
    const [totalUnreadReplies, setTotalUnreadReplies] = useState(0);

    // Translated metadata (must be inside component to use t())
    const ORIENTATION_META: Record<string, { label: string; icon: typeof Zap; color: string; bg: string }> = {
        'tech-driven': { label: t('orientationTech'), icon: Zap, color: 'text-blue-600', bg: 'bg-blue-50' },
        'business-driven': { label: t('orientationBusiness'), icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        'management-driven': { label: t('orientationManagement'), icon: Briefcase, color: 'text-violet-600', bg: 'bg-violet-50' },
        'balanced': { label: t('orientationBalanced'), icon: Globe, color: 'text-amber-600', bg: 'bg-amber-50' },
    };

    const INTENT_META: Record<string, { label: string; badge: string; color: string }> = {
        'now': { label: t('intentNow'), badge: t('intentBadgeNow'), color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
        'within_3_months': { label: t('intent3Months'), badge: t('intentBadge3Months'), color: 'text-blue-700 bg-blue-50 border-blue-200' },
        'open_to_offers': { label: t('intentOpen'), badge: t('intentBadgeOpen'), color: 'text-slate-700 bg-slate-100 border-slate-200' },
    };

    const fetchCandidates = useCallback(async (page = 1, searchQuery = '') => {
        setCandidatesLoading(true);
        try {
            const params = new URLSearchParams({ page: String(page), limit: '12' });
            if (searchQuery) params.set('search', searchQuery);
            const res = await fetch(`/api/recruiter/candidates?${params}`);
            if (!res.ok) throw new Error('Failed to fetch');
            const data = await res.json();
            setCandidates(data.candidates || []);
            setCandidatePagination(data.pagination || { page: 1, limit: 12, total: 0, totalPages: 0 });
        } catch {
            setCandidates([]);
        } finally {
            setCandidatesLoading(false);
        }
    }, []);

    const fetchSavedCandidates = useCallback(async () => {
        setSavedLoading(true);
        try {
            const res = await fetch('/api/recruiter/actions?type=saved');
            if (!res.ok) throw new Error('Failed to fetch');
            const data = await res.json();
            const saved = data.candidates || [];
            setSavedCandidates(saved);
            setSavedCount(saved.length);
        } catch {
            setSavedCandidates([]);
        } finally {
            setSavedLoading(false);
        }
    }, []);

    const fetchRecentlyViewed = useCallback(async () => {
        setRecentlyViewedLoading(true);
        try {
            const res = await fetch('/api/recruiter/page-views?type=recent&limit=12');
            if (!res.ok) throw new Error('Failed to fetch');
            const data = await res.json();
            setRecentlyViewed(data.candidates || []);
        } catch {
            setRecentlyViewed([]);
        } finally {
            setRecentlyViewedLoading(false);
        }
    }, []);

    const fetchContacts = useCallback(async () => {
        setContactsLoading(true);
        try {
            const res = await fetch('/api/recruiter/actions?type=contacts');
            if (!res.ok) throw new Error('Failed to fetch');
            const data = await res.json();
            const contactsList = data.contacts || [];
            setContacts(contactsList);
            setTotalUnreadReplies(contactsList.reduce((sum: number, c: ContactRequest) => sum + c.unreadReplies, 0));
        } catch {
            setContacts([]);
        } finally {
            setContactsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/auth/signin');
            return;
        }

        if (status === 'authenticated') {
            if (session?.user?.role !== 'recruiter') {
                if (session?.user?.role === 'pending_recruiter') {
                    router.push('/auth/pending-approval');
                } else {
                    router.push('/dashboard');
                }
                return;
            }

            if (!sessionStorage.getItem('jnjgo_pv_claimed')) {
                const anonId = localStorage.getItem('jnjgo_anon_id');
                if (anonId) {
                    sessionStorage.setItem('jnjgo_pv_claimed', '1');
                    fetch('/api/recruiter/page-views', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ anonymousId: anonId }),
                    }).catch(() => { });
                }
            }

            fetch('/api/recruiter/profile')
                .then(res => res.json())
                .then(data => {
                    if (data && !data.error) {
                        setProfile(data);
                    }
                    if (!data || data.error || !data.onboardingCompleted) {
                        router.push('/recruiter/onboarding');
                        return;
                    }
                    setIsLoading(false);
                    fetchCandidates();
                    fetchSavedCandidates();
                    fetchContacts();
                    fetch('/api/recruiter/actions?type=stats')
                        .then(res => res.json())
                        .then(data => { if (!data.error) setRecruiterStats(data); })
                        .catch(() => { });
                    fetch('/api/recruiter/page-views')
                        .then(res => res.json())
                        .then(data => { if (!data.error) setProfilesViewed(data.profilesViewed ?? 0); })
                        .catch(() => { });
                })
                .catch(() => setIsLoading(false));
        }
    }, [status, session, router, fetchCandidates, fetchSavedCandidates, fetchContacts]);

    const handleCandidateSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setCandidateSearch(candidateSearchInput);
        fetchCandidates(1, candidateSearchInput);
    };

    const handleOpenContact = async (contact: ContactRequest) => {
        setSelectedContact(contact);
        setThreadReplies([]);
        setReplyText('');
        setThreadLoading(true);

        try {
            const res = await fetch(`/api/recruiter/actions?actionId=${contact.id}`);
            if (res.ok) {
                const data = await res.json();
                setThreadReplies(data.replies || []);
            }
        } catch {
            // fail silently
        } finally {
            setThreadLoading(false);
        }

        if (contact.unreadReplies > 0) {
            try {
                await fetch('/api/recruiter/actions', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ actionId: contact.id })
                });
                setContacts(prev => prev.map(c =>
                    c.id === contact.id ? { ...c, unreadReplies: 0 } : c
                ));
                setTotalUnreadReplies(prev => Math.max(0, prev - contact.unreadReplies));
            } catch {
                // fail silently
            }
        }
    };

    const handleSendReply = async () => {
        if (!selectedContact || !replyText.trim() || isReplying) return;
        setIsReplying(true);

        try {
            const res = await fetch('/api/recruiter/actions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    actionId: selectedContact.id,
                    message: replyText.trim(),
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to send reply');
            }

            const data = await res.json();
            setThreadReplies(prev => [...prev, data.reply]);
            setReplyText('');
        } catch (error: any) {
            toast.error(error.message || 'Failed to send reply.');
        } finally {
            setIsReplying(false);
        }
    };

    const formatSalaryShort = (val?: number) =>
        val ? `¥${(val / 10000).toLocaleString()}万` : null;

    if (status === 'loading' || isLoading) {
        return (
            <div className="min-h-screen bg-slate-50">
                <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 h-16" />
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
                    <div className="h-40 bg-white rounded-2xl animate-pulse border border-slate-100" />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-32 bg-white rounded-xl animate-pulse border border-slate-100" />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    const firstName = session?.user?.name?.split(' ')[0] || '';

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
            {/* Recruiter Navbar */}
            <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 shadow-sm shadow-slate-100/50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6">
                    <div className="flex h-16 items-center justify-between">
                        {/* Left */}
                        <div className="flex items-center gap-6">
                            <Link href={`/${locale}/recruiter/dashboard`} className="group flex items-center gap-2.5 shrink-0">
                                <span className="text-2xl group-hover:scale-110 transition-transform inline-block">🚀</span>
                                <div className="hidden sm:flex flex-col">
                                    <span className="font-black text-slate-800 tracking-tight text-lg leading-tight">JNJGO</span>
                                    <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider -mt-0.5">{t('recruiterBadge')}</span>
                                </div>
                            </Link>

                            <div className="hidden md:flex items-center gap-1">
                                <Link
                                    href={`/${locale}/recruiter/dashboard`}
                                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold bg-emerald-50 text-emerald-700 shadow-sm shadow-emerald-100/50"
                                >
                                    <BarChart3 className="w-4 h-4" />
                                    {t('dashboard')}
                                </Link>
                                <button
                                    onClick={() => { setActiveTab('contacts'); if (contacts.length === 0 && !contactsLoading) fetchContacts(); document.getElementById('recruiter-tabs')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
                                    className={`relative inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${activeTab === 'contacts' ? 'bg-emerald-50 text-emerald-700 shadow-sm shadow-emerald-100/50' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
                                >
                                    <div className="relative">
                                        <MessageSquare className="w-4 h-4" />
                                        {totalUnreadReplies > 0 && (
                                            <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                                                {totalUnreadReplies > 9 ? '9+' : totalUnreadReplies}
                                            </span>
                                        )}
                                    </div>
                                    {t('messages')}
                                </button>
                                {isAdmin && (
                                    <Link
                                        href={`/${locale}/admin`}
                                        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-all duration-200"
                                    >
                                        <Shield className="w-4 h-4" />
                                        {t('admin')}
                                    </Link>
                                )}
                            </div>
                        </div>

                        {/* Right */}
                        <div className="flex items-center gap-2 sm:gap-3">
                            <LanguageSwitcher />

                            {/* User menu */}
                            <div className="relative">
                                <button
                                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                                    className={`flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl transition-all duration-200 ${userMenuOpen ? 'bg-slate-100 ring-2 ring-slate-200' : 'hover:bg-slate-50'}`}
                                >
                                    {session?.user?.image ? (
                                        <img
                                            src={session.user.image}
                                            alt={session.user.name || ''}
                                            referrerPolicy="no-referrer"
                                            className="w-8 h-8 rounded-full ring-2 ring-white shadow-sm"
                                        />
                                    ) : (
                                        <div className="w-8 h-8 rounded-full bg-linear-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white text-sm font-bold shadow-sm">
                                            {(session?.user?.name || 'R').charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                    <ChevronDown className={`w-4 h-4 text-slate-400 hidden sm:block transition-transform duration-200 ${userMenuOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {userMenuOpen && (
                                    <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl shadow-slate-200/60 border border-slate-100 py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                        <div className="px-4 py-3 border-b border-slate-100">
                                            <div className="flex items-center gap-3">
                                                {session?.user?.image ? (
                                                    <img src={session.user.image} referrerPolicy="no-referrer" alt="" className="w-10 h-10 rounded-full shadow-sm" />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-full bg-linear-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white font-bold shadow-sm">
                                                        {(session?.user?.name || 'R').charAt(0).toUpperCase()}
                                                    </div>
                                                )}
                                                <div className="min-w-0">
                                                    <p className="text-sm font-bold text-slate-900 truncate">{session?.user?.name}</p>
                                                    <p className="text-xs text-slate-400 truncate">{session?.user?.email}</p>
                                                    <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
                                                        <Search className="w-2.5 h-2.5" /> {t('recruiterBadge')}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="border-t border-slate-100 px-2 pt-1 pb-1">
                                            {isAdmin && (
                                                <Link
                                                    href={`/${locale}/admin`}
                                                    onClick={() => setUserMenuOpen(false)}
                                                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition-all duration-150"
                                                >
                                                    <Shield className="w-4 h-4" />
                                                    {t('adminDashboard')}
                                                </Link>
                                            )}
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
                        </div>
                    </div>
                </div>
            </nav>

            {/* Main content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8 animate-in fade-in duration-500">

                {/* Welcome Banner */}
                <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-slate-900 via-emerald-950 to-slate-900 p-6 md:p-8">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-teal-500/10 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4" />
                    <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 uppercase tracking-wider bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                                    <Shield className="w-3 h-3" /> {t('dashboardBadge')}
                                </span>
                            </div>
                            <h1 className="text-2xl md:text-3xl font-bold text-white">
                                {firstName ? t('welcomeBack', { name: firstName }) : t('welcomeBackNoName')}
                            </h1>
                            <p className="text-slate-400 text-sm">
                                {profile?.companyName} · {profile?.jobTitle}
                                {profile?.recruiterType && (
                                    <span className={`ml-2 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${profile.recruiterType === 'in_house'
                                        ? 'bg-blue-500/15 text-blue-300 border border-blue-500/20'
                                        : 'bg-amber-500/15 text-amber-300 border border-amber-500/20'
                                        }`}>
                                        {profile.recruiterType === 'in_house' ? t('profileInHouse') : t('profileAgency')}
                                    </span>
                                )}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        { label: t('statProfilesViewed'), value: profilesViewed !== null ? String(profilesViewed) : '—', icon: Eye, color: 'bg-blue-50 text-blue-600', border: 'border-blue-100' },
                        { label: t('statSavedCandidates'), value: String(recruiterStats?.savedCount ?? savedCount ?? '—'), icon: BookmarkCheck, color: 'bg-emerald-50 text-emerald-600', border: 'border-emerald-100' },
                        { label: t('statActiveCandidates'), value: String(candidatePagination.total || '—'), icon: Users, color: 'bg-violet-50 text-violet-600', border: 'border-violet-100' },
                        { label: t('statScoutsSent'), value: String(recruiterStats?.contactsSent ?? '—'), icon: TrendingUp, color: 'bg-amber-50 text-amber-600', border: 'border-amber-100' },
                    ].map((stat, i) => (
                        <div key={i} className={`group bg-white rounded-xl border ${stat.border} p-5 flex items-center gap-4`}>
                            <div className={`w-11 h-11 rounded-xl ${stat.color} flex items-center justify-center shrink-0`}>
                                <stat.icon className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="text-2xl font-black text-slate-900 tabular-nums">{stat.value}</div>
                                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{stat.label}</div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Getting Started / Feature Cards */}
                <div className="space-y-5">
                    <h2 className="text-lg font-bold text-slate-800">{t('gettingStarted')}</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* Discover Candidates */}
                        <div className="group bg-white rounded-2xl border border-slate-200/80 p-6 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
                            <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center mb-4 group-hover:bg-emerald-100 transition-colors">
                                <Search className="w-6 h-6 text-emerald-600" />
                            </div>
                            <h3 className="font-bold text-slate-900 mb-2">{t('browseProfiles')}</h3>
                            <p className="text-sm text-slate-500 leading-relaxed mb-4">
                                {t('browseProfilesDesc')}
                            </p>
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                                <Sparkles className="w-3.5 h-3.5" />
                                {t('candidatesShareLink')}
                            </div>
                        </div>

                        {/* How it works */}
                        <div className="group bg-white rounded-2xl border border-slate-200/80 p-6 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
                            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mb-4 group-hover:bg-blue-100 transition-colors">
                                <Zap className="w-6 h-6 text-blue-600" />
                            </div>
                            <h3 className="font-bold text-slate-900 mb-2">{t('howItWorks')}</h3>
                            <p className="text-sm text-slate-500 leading-relaxed mb-4">
                                {t('browseProfilesDesc')}
                            </p>
                            <div className="space-y-2 text-xs text-slate-500">
                                {[t('howItWorksStep1'), t('howItWorksStep2'), t('howItWorksStep3')].map((step, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                        <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600">{i + 1}</div>
                                        {step}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Your Profile Card */}
                        <div className="group bg-white rounded-2xl border border-slate-200/80 p-6 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
                            <div className="w-12 h-12 rounded-xl bg-violet-50 flex items-center justify-center mb-4 group-hover:bg-violet-100 transition-colors">
                                <Building2 className="w-6 h-6 text-violet-600" />
                            </div>
                            <h3 className="font-bold text-slate-900 mb-2">{t('yourProfile')}</h3>
                            <div className="space-y-3 text-sm">
                                <div className="flex items-center justify-between py-1.5 border-b border-slate-50">
                                    <span className="text-slate-500">{t('profileCompany')}</span>
                                    <span className="font-semibold text-slate-800">{profile?.companyName || '—'}</span>
                                </div>
                                <div className="flex items-center justify-between py-1.5 border-b border-slate-50">
                                    <span className="text-slate-500">{t('profileTitle')}</span>
                                    <span className="font-semibold text-slate-800">{profile?.jobTitle || '—'}</span>
                                </div>
                                {profile?.recruiterType && (
                                    <div className="flex items-center justify-between py-1.5 border-b border-slate-50">
                                        <span className="text-slate-500">{t('profileType')}</span>
                                        <span className={`text-xs font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${profile.recruiterType === 'in_house'
                                            ? 'bg-blue-50 text-blue-600 border border-blue-200'
                                            : 'bg-amber-50 text-amber-600 border border-amber-200'
                                            }`}>
                                            {profile.recruiterType === 'in_house' ? t('profileInHouse') : t('profileAgency')}
                                        </span>
                                    </div>
                                )}
                                {profile?.industry && (
                                    <div className="flex items-center justify-between py-1.5 border-b border-slate-50">
                                        <span className="text-slate-500">{t('profileIndustry')}</span>
                                        <span className="font-semibold text-slate-800">{profile.industry}</span>
                                    </div>
                                )}
                                {profile?.companySize && (
                                    <div className="flex items-center justify-between py-1.5">
                                        <span className="text-slate-500">{t('profileSize')}</span>
                                        <span className="font-semibold text-slate-800 capitalize">{profile.companySize}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Candidate Profiles Browser ── */}
                <div id="recruiter-tabs" className="space-y-5 scroll-mt-20">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1 overflow-x-auto max-w-full scrollbar-none">
                            <button
                                onClick={() => setActiveTab('browse')}
                                className={`shrink-0 px-3 md:px-4 py-2 text-xs md:text-sm font-semibold rounded-lg transition-all ${activeTab === 'browse' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                {t('tabBrowse')}
                            </button>
                            <button
                                onClick={() => { setActiveTab('saved'); if (savedCandidates.length === 0 && !savedLoading) fetchSavedCandidates(); }}
                                className={`shrink-0 px-3 md:px-4 py-2 text-xs md:text-sm font-semibold rounded-lg transition-all flex items-center gap-1.5 ${activeTab === 'saved' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                <BookmarkCheck className="w-3.5 h-3.5" />
                                {t('tabSaved')}
                                {savedCount > 0 && (
                                    <span className="inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold bg-emerald-100 text-emerald-700 rounded-full">
                                        {savedCount}
                                    </span>
                                )}
                            </button>
                            <button
                                onClick={() => { setActiveTab('contacts'); if (contacts.length === 0 && !contactsLoading) fetchContacts(); }}
                                className={`shrink-0 px-3 md:px-4 py-2 text-xs md:text-sm font-semibold rounded-lg transition-all flex items-center gap-1.5 ${activeTab === 'contacts' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                <MailOpen className="w-3.5 h-3.5" />
                                {t('tabContacts')}
                                {contacts.reduce((sum, c) => sum + c.unreadReplies, 0) > 0 && (
                                    <span className="inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold bg-red-100 text-red-700 rounded-full">
                                        {contacts.reduce((sum, c) => sum + c.unreadReplies, 0)}
                                    </span>
                                )}
                            </button>
                            <button
                                onClick={() => { setActiveTab('recently_viewed'); if (recentlyViewed.length === 0 && !recentlyViewedLoading) fetchRecentlyViewed(); }}
                                className={`shrink-0 px-3 md:px-4 py-2 text-xs md:text-sm font-semibold rounded-lg transition-all flex items-center gap-1.5 ${activeTab === 'recently_viewed' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                <History className="w-3.5 h-3.5" />
                                {t('tabRecentlyViewed')}
                            </button>
                        </div>
                        {activeTab === 'browse' && (
                            <form onSubmit={handleCandidateSearch} className="flex gap-2 w-full sm:w-auto">
                                <div className="relative flex-1 sm:w-64">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="text"
                                        value={candidateSearchInput}
                                        onChange={e => setCandidateSearchInput(e.target.value)}
                                        placeholder={t('searchPlaceholder')}
                                        className="w-full pl-10 pr-4 py-2.5 text-sm text-slate-800 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    className="px-4 py-2.5 text-sm font-medium bg-slate-900 text-white rounded-xl hover:bg-emerald-600 transition-colors shrink-0"
                                >
                                    {t('search')}
                                </button>
                            </form>
                        )}
                    </div>

                    {/* Saved Candidates Tab */}
                    {activeTab === 'saved' && (
                        savedLoading ? (
                            <div className="flex items-center justify-center py-20">
                                <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                            </div>
                        ) : savedCandidates.length === 0 ? (
                            <div className="bg-white rounded-2xl border border-slate-200/80 p-8 text-center">
                                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                    <BookmarkCheck className="w-8 h-8 text-slate-300" />
                                </div>
                                <h3 className="font-bold text-slate-700 mb-1">{t('noSaved')}</h3>
                                <p className="text-sm text-slate-400 max-w-sm mx-auto leading-relaxed">{t('noSavedDesc')}</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {savedCandidates.map(candidate => {
                                    const orientation = ORIENTATION_META[candidate.orientation || ''];
                                    const intent = INTENT_META[candidate.jobChangeIntent || ''];
                                    const OrientationIcon = orientation?.icon || Globe;
                                    const salaryMin = formatSalaryShort(candidate.desiredSalary?.minimum);
                                    const salaryMax = formatSalaryShort(candidate.desiredSalary?.target);

                                    return (
                                        <div key={candidate.userId} className="group bg-white rounded-2xl border border-emerald-200/80 overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
                                            <div className="p-5">
                                                <div className="flex items-start justify-between mb-3">
                                                    <div className="min-w-0 flex-1">
                                                        <h3 className="font-bold text-slate-900 text-sm truncate">
                                                            {candidate.fullName || t('anonymousCandidate')}
                                                        </h3>
                                                        {candidate.highlightedResume?.currentRole && (
                                                            <p className="text-xs text-slate-500 mt-0.5 truncate">{candidate.highlightedResume.currentRole}</p>
                                                        )}
                                                    </div>
                                                    <BookmarkCheck className="w-4 h-4 text-emerald-600 shrink-0 ml-2" />
                                                </div>
                                                <div className="flex flex-wrap gap-1 mb-2">
                                                    {orientation && (
                                                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${orientation.bg} ${orientation.color}`}>
                                                            <OrientationIcon className="w-2.5 h-2.5" />{orientation.label}
                                                        </span>
                                                    )}
                                                    {intent && (
                                                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${intent.color}`}>
                                                            <Clock className="w-2.5 h-2.5" />{intent.badge}
                                                        </span>
                                                    )}
                                                </div>
                                                {candidate.aiObjectiveReview && (
                                                    <p className="text-xs text-slate-600 leading-relaxed mb-3 line-clamp-2">{candidate.aiObjectiveReview}</p>
                                                )}
                                                {(salaryMin || salaryMax) && (
                                                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                                        <DollarSign className="w-3 h-3 text-green-500" />
                                                        <span className="font-medium text-slate-700">
                                                            {salaryMin && salaryMax ? `${salaryMin} ~ ${salaryMax}` : salaryMin || salaryMax}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                            {candidate.slug && (
                                                <div className="border-t border-emerald-100 px-5 py-3 bg-emerald-50/30">
                                                    <Link href={`/c/${candidate.slug}`} className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors">
                                                        <Eye className="w-3.5 h-3.5" />
                                                        {t('viewFullProfile')}
                                                        <ArrowRight className="w-3 h-3" />
                                                    </Link>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )
                    )}

                    {/* Browse All Tab */}
                    {activeTab === 'browse' && (candidatesLoading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                        </div>
                    ) : candidates.length === 0 ? (
                        <div className="bg-white rounded-2xl border border-slate-200/80 p-8 text-center">
                            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <Users className="w-8 h-8 text-slate-300" />
                            </div>
                            <h3 className="font-bold text-slate-700 mb-1">
                                {candidateSearch ? t('noMatches') : t('noPublished')}
                            </h3>
                            <p className="text-sm text-slate-400 max-w-sm mx-auto leading-relaxed">
                                {candidateSearch ? t('noMatchesDesc') : t('noPublishedDesc')}
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {candidates.map(candidate => {
                                    const orientation = ORIENTATION_META[candidate.orientation || ''];
                                    const intent = INTENT_META[candidate.jobChangeIntent || ''];
                                    const OrientationIcon = orientation?.icon || Globe;
                                    const salaryMin = formatSalaryShort(candidate.desiredSalary?.minimum);
                                    const salaryMax = formatSalaryShort(candidate.desiredSalary?.target);

                                    return (
                                        <div key={candidate.userId} className="group bg-white rounded-2xl border border-slate-200/80 overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
                                            <div className="p-5">
                                                <div className="flex items-start justify-between mb-3">
                                                    <div className="min-w-0 flex-1">
                                                        <h3 className="font-bold text-slate-900 text-sm truncate">
                                                            {candidate.fullName || t('anonymousCandidate')}
                                                        </h3>
                                                        {candidate.highlightedResume?.currentRole && (
                                                            <p className="text-xs text-slate-500 mt-0.5 truncate">{candidate.highlightedResume.currentRole}</p>
                                                        )}
                                                        {candidate.location && (
                                                            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                                                                <MapPin className="w-3 h-3" />
                                                                {candidate.location}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
                                                        {orientation && (
                                                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${orientation.bg} ${orientation.color}`}>
                                                                <OrientationIcon className="w-2.5 h-2.5" />
                                                                {orientation.label}
                                                            </span>
                                                        )}
                                                        {intent && (
                                                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${intent.color}`}>
                                                                <Clock className="w-2.5 h-2.5" />
                                                                {intent.badge}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {candidate.aiObjectiveReview && (
                                                    <p className="text-xs text-slate-600 leading-relaxed mb-3 line-clamp-2">{candidate.aiObjectiveReview}</p>
                                                )}

                                                {candidate.highlightedResume?.skills && candidate.highlightedResume.skills.length > 0 && (
                                                    <div className="flex flex-wrap gap-1 mb-3">
                                                        {candidate.highlightedResume.skills.slice(0, 5).map((skill, i) => (
                                                            <span key={i} className="text-[10px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">{skill}</span>
                                                        ))}
                                                        {candidate.highlightedResume.skills.length > 5 && (
                                                            <span className="text-[10px] text-slate-400 px-1">+{candidate.highlightedResume.skills.length - 5}</span>
                                                        )}
                                                    </div>
                                                )}

                                                {candidate.desiredRoles.length > 0 && (
                                                    <div className="flex flex-wrap gap-1 mb-3">
                                                        {candidate.desiredRoles.slice(0, 3).map((r, i) => (
                                                            <span key={i} className="text-[10px] font-medium bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-md border border-indigo-100">{r.role}</span>
                                                        ))}
                                                    </div>
                                                )}

                                                {(salaryMin || salaryMax) && (
                                                    <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-3">
                                                        <DollarSign className="w-3 h-3 text-green-500" />
                                                        <span className="font-medium text-slate-700">
                                                            {salaryMin && salaryMax ? `${salaryMin} ~ ${salaryMax}` : salaryMin || salaryMax}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            {candidate.slug && (
                                                <div className="border-t border-slate-100 px-5 py-3 bg-slate-50/50">
                                                    <Link href={`/c/${candidate.slug}`} className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors">
                                                        <Eye className="w-3.5 h-3.5" />
                                                        {t('viewFullProfile')}
                                                        <ArrowRight className="w-3 h-3" />
                                                    </Link>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Pagination */}
                            {candidatePagination.totalPages > 1 && (
                                <div className="flex items-center justify-between pt-2">
                                    <p className="text-xs text-slate-500">
                                        {t('showing', {
                                            from: ((candidatePagination.page - 1) * candidatePagination.limit) + 1,
                                            to: Math.min(candidatePagination.page * candidatePagination.limit, candidatePagination.total),
                                            total: candidatePagination.total
                                        })}
                                    </p>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => fetchCandidates(candidatePagination.page - 1, candidateSearch)}
                                            disabled={candidatePagination.page <= 1}
                                            className="p-1.5 rounded-lg hover:bg-slate-200 disabled:opacity-30 transition-colors"
                                        >
                                            <ChevronLeft className="w-4 h-4" />
                                        </button>
                                        <span className="text-xs text-slate-600 px-2">
                                            {t('pageOf', { page: candidatePagination.page, total: candidatePagination.totalPages })}
                                        </span>
                                        <button
                                            onClick={() => fetchCandidates(candidatePagination.page + 1, candidateSearch)}
                                            disabled={candidatePagination.page >= candidatePagination.totalPages}
                                            className="p-1.5 rounded-lg hover:bg-slate-200 disabled:opacity-30 transition-colors"
                                        >
                                            <ChevronRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    ))}

                    {/* ── Sent Scouts & Replies Tab ── */}
                    {activeTab === 'contacts' && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-300">
                            <div className="md:col-span-1 space-y-2">
                                {contactsLoading ? (
                                    <div className="flex justify-center py-10">
                                        <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
                                    </div>
                                ) : contacts.length === 0 ? (
                                    <div className="text-center py-10 bg-white rounded-2xl border border-slate-200">
                                        <p className="text-sm text-slate-400">{t('noScouts')}</p>
                                    </div>
                                ) : (
                                    contacts.map(contact => (
                                        <button
                                            key={contact.id}
                                            onClick={() => handleOpenContact(contact)}
                                            className={`w-full text-left p-4 rounded-2xl border transition-all duration-200 ${selectedContact?.id === contact.id
                                                ? 'bg-emerald-50 border-emerald-200 shadow-sm'
                                                : 'bg-white border-slate-200 hover:border-slate-300'
                                                }`}
                                        >
                                            <div className="flex items-start justify-between mb-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-bold text-slate-800 truncate max-w-[140px]">
                                                        {contact.candidatePageSlug}
                                                    </span>
                                                    {contact.unreadReplies > 0 && (
                                                        <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                                                    )}
                                                </div>
                                                <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">
                                                    {new Date(contact.createdAt).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-500 truncate">
                                                {contact.message.slice(0, 70)}...
                                            </p>
                                        </button>
                                    ))
                                )}
                            </div>

                            {/* Thread View */}
                            <div className="md:col-span-2">
                                {selectedContact ? (
                                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[500px]">
                                        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                                                    <User className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-slate-900 text-sm">
                                                        {t('candidateLabel', { slug: selectedContact.candidatePageSlug })}
                                                    </h3>
                                                    <Link href={`/${locale}/c/${selectedContact.candidatePageSlug}`} className="text-[10px] text-emerald-600 hover:underline font-semibold flex items-center gap-1">
                                                        {t('viewProfile')} <ArrowRight className="w-3 h-3" />
                                                    </Link>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex-1 overflow-y-auto px-5 py-6 space-y-4">
                                            <div className="flex justify-end">
                                                <div className="max-w-[85%] bg-emerald-600 text-white rounded-2xl rounded-tr-sm px-4 py-3 text-sm shadow-sm">
                                                    <p className="whitespace-pre-wrap">{selectedContact.message}</p>
                                                    <span className="block text-[10px] mt-2 text-emerald-200 text-right">
                                                        {new Date(selectedContact.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                            </div>

                                            {threadLoading ? (
                                                <div className="flex justify-center py-4">
                                                    <Loader2 className="w-5 h-5 animate-spin text-slate-300" />
                                                </div>
                                            ) : (
                                                threadReplies.map(reply => (
                                                    <div key={reply.id} className={`flex ${reply.isFromCandidate ? 'justify-start' : 'justify-end'}`}>
                                                        <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm ${reply.isFromCandidate
                                                            ? 'bg-slate-100 text-slate-800 rounded-tl-sm'
                                                            : 'bg-emerald-600 text-white rounded-tr-sm'
                                                            }`}>
                                                            <p className="whitespace-pre-wrap">{reply.message}</p>
                                                            <span className={`block text-[10px] mt-2 ${reply.isFromCandidate ? 'text-slate-400' : 'text-emerald-200 text-right'}`}>
                                                                {new Date(reply.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>

                                        {/* Reply Composer */}
                                        <div className="px-4 py-3 border-t border-slate-100 bg-slate-50 relative">
                                            <textarea
                                                value={replyText}
                                                onChange={(e) => setReplyText(e.target.value)}
                                                placeholder={t('replyPlaceholder')}
                                                className="w-full h-[80px] bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none shadow-sm pb-10"
                                                maxLength={3000}
                                            />
                                            <div className="absolute bottom-5 right-6 flex items-center gap-3">
                                                <span className="text-[10px] font-medium text-slate-400">
                                                    {replyText.length}/3000
                                                </span>
                                                <button
                                                    onClick={handleSendReply}
                                                    disabled={isReplying || !replyText.trim()}
                                                    className="px-4 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md group flex items-center gap-1.5"
                                                >
                                                    {isReplying ? (
                                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                    ) : (
                                                        <>{t('send')} <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" /></>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm h-[500px] flex flex-col items-center justify-center text-center px-6">
                                        <MailOpen className="w-12 h-12 text-slate-200 mb-4" />
                                        <p className="text-sm font-medium text-slate-400">
                                            {t('selectContact')}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ── Recently Viewed Tab ── */}
                    {activeTab === 'recently_viewed' && (
                        recentlyViewedLoading ? (
                            <div className="flex items-center justify-center py-20">
                                <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                            </div>
                        ) : recentlyViewed.length === 0 ? (
                            <div className="bg-white rounded-2xl border border-slate-200/80 p-10 text-center">
                                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                    <History className="w-8 h-8 text-slate-300" />
                                </div>
                                <h3 className="font-bold text-slate-700 mb-1">{t('noViewed')}</h3>
                                <p className="text-sm text-slate-400 max-w-sm mx-auto leading-relaxed">
                                    {t('noViewedDesc')}
                                </p>
                                <button
                                    onClick={() => setActiveTab('browse')}
                                    className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors shadow-sm"
                                >
                                    <Search className="w-4 h-4" />
                                    {t('browseCandidates')}
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4 animate-in fade-in duration-300">
                                <p className="text-xs text-slate-400 font-medium">
                                    {t('recentlyViewedCount', { n: recentlyViewed.length })} · {t('sortedByRecent')}
                                </p>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {recentlyViewed.map(candidate => {
                                        const orientation = ORIENTATION_META[candidate.orientation || ''];
                                        const intent = INTENT_META[candidate.jobChangeIntent || ''];
                                        const OrientationIcon = orientation?.icon || Globe;
                                        const salaryMin = formatSalaryShort(candidate.desiredSalary?.minimum);
                                        const salaryMax = formatSalaryShort(candidate.desiredSalary?.target);
                                        const viewedAt = (candidate as any).viewedAt
                                            ? new Date((candidate as any).viewedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                                            : null;

                                        return (
                                            <div key={candidate.userId} className="group bg-white rounded-2xl border border-slate-200/80 overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
                                                <div className="p-5">
                                                    <div className="flex items-start justify-between mb-3">
                                                        <div className="min-w-0 flex-1">
                                                            <h3 className="font-bold text-slate-900 text-sm truncate">
                                                                {candidate.fullName || t('anonymousCandidate')}
                                                            </h3>
                                                            {candidate.highlightedResume?.currentRole && (
                                                                <p className="text-xs text-slate-500 mt-0.5 truncate">{candidate.highlightedResume.currentRole}</p>
                                                            )}
                                                            {candidate.location && (
                                                                <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                                                                    <MapPin className="w-3 h-3" />
                                                                    {candidate.location}
                                                                </p>
                                                            )}
                                                        </div>
                                                        <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
                                                            {orientation && (
                                                                <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${orientation.bg} ${orientation.color}`}>
                                                                    <OrientationIcon className="w-2.5 h-2.5" />
                                                                    {orientation.label}
                                                                </span>
                                                            )}
                                                            {intent && (
                                                                <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${intent.color}`}>
                                                                    <Clock className="w-2.5 h-2.5" />
                                                                    {intent.badge}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {candidate.aiObjectiveReview && (
                                                        <p className="text-xs text-slate-600 leading-relaxed mb-3 line-clamp-2">{candidate.aiObjectiveReview}</p>
                                                    )}

                                                    {candidate.highlightedResume?.skills && candidate.highlightedResume.skills.length > 0 && (
                                                        <div className="flex flex-wrap gap-1 mb-3">
                                                            {candidate.highlightedResume.skills.slice(0, 5).map((skill, i) => (
                                                                <span key={i} className="text-[10px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">{skill}</span>
                                                            ))}
                                                            {candidate.highlightedResume.skills.length > 5 && (
                                                                <span className="text-[10px] text-slate-400 px-1">+{candidate.highlightedResume.skills.length - 5}</span>
                                                            )}
                                                        </div>
                                                    )}

                                                    {(salaryMin || salaryMax) && (
                                                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                                            <DollarSign className="w-3 h-3 text-green-500" />
                                                            <span className="font-medium text-slate-700">
                                                                {salaryMin && salaryMax ? `${salaryMin} ~ ${salaryMax}` : salaryMin || salaryMax}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="border-t border-slate-100 px-5 py-3 bg-slate-50/50 flex items-center justify-between">
                                                    {candidate.slug ? (
                                                        <Link href={`/c/${candidate.slug}`} className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors">
                                                            <Eye className="w-3.5 h-3.5" />
                                                            {t('viewProfile')}
                                                            <ArrowRight className="w-3 h-3" />
                                                        </Link>
                                                    ) : (
                                                        <span className="text-xs text-slate-400">{t('profileUnavailable')}</span>
                                                    )}
                                                    {viewedAt && (
                                                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                                            <History className="w-3 h-3" />
                                                            {viewedAt}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )
                    )}
                </div>
            </div>
        </div>
    );
}
