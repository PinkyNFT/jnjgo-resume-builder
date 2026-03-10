'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import {
    Search, Building2, Users, ExternalLink, Settings, LogOut,
    Loader2, ChevronDown, Sparkles, Shield, Eye, TrendingUp,
    Zap, ArrowRight, UserCircle, Bell, BookmarkCheck, BarChart3,
    MapPin, DollarSign, Briefcase, Globe, Clock, ChevronLeft, ChevronRight, FileText
} from 'lucide-react';
import LanguageSwitcher from '../../../../components/LanguageSwitcher';
import { RecruiterProfile } from '../../../../types';

const ORIENTATION_META: Record<string, { label: string; icon: typeof Zap; color: string; bg: string }> = {
    'tech-driven': { label: 'Tech / Specialist', icon: Zap, color: 'text-blue-600', bg: 'bg-blue-50' },
    'business-driven': { label: 'Business / Strategy', icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    'management-driven': { label: 'Management / Lead', icon: Briefcase, color: 'text-violet-600', bg: 'bg-violet-50' },
    'balanced': { label: 'Balanced / Hybrid', icon: Globe, color: 'text-amber-600', bg: 'bg-amber-50' },
};

const INTENT_META: Record<string, { label: string; badge: string; color: string }> = {
    'now': { label: 'Actively looking', badge: 'Now', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
    'within_3_months': { label: 'Within 3 months', badge: '3m', color: 'text-blue-700 bg-blue-50 border-blue-200' },
    'open_to_offers': { label: 'Open to offers', badge: 'Passive', color: 'text-slate-700 bg-slate-100 border-slate-200' },
};

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

export default function RecruiterDashboardPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const locale = useLocale();
    const [profile, setProfile] = useState<RecruiterProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [userMenuOpen, setUserMenuOpen] = useState(false);

    const [isAdmin, setIsAdmin] = useState(false);

    // Candidate browsing state
    const [candidates, setCandidates] = useState<CandidateCard[]>([]);
    const [candidatesLoading, setCandidatesLoading] = useState(true);
    const [candidateSearch, setCandidateSearch] = useState('');
    const [candidateSearchInput, setCandidateSearchInput] = useState('');
    const [candidatePagination, setCandidatePagination] = useState({ page: 1, limit: 12, total: 0, totalPages: 0 });

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

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/auth/signin');
            return;
        }

        if (status === 'authenticated') {
            // Check role
            // Check role - only fully approved recruiters can access dashboard
            if (session?.user?.role !== 'recruiter') {
                if (session?.user?.role === 'pending_recruiter') {
                    router.push('/auth/pending-approval');
                } else {
                    router.push('/dashboard');
                }
                return;
            }

            // Check admin status
            fetch('/api/admin/check')
                .then(res => res.json())
                .then(data => setIsAdmin(data.isAdmin === true))
                .catch(() => { });

            // Load recruiter profile
            fetch('/api/recruiter/profile')
                .then(res => res.json())
                .then(data => {
                    if (data && !data.error) {
                        setProfile(data);
                    }
                    // If no profile, redirect to onboarding
                    if (!data || data.error || !data.onboardingCompleted) {
                        router.push('/recruiter/onboarding');
                        return;
                    }
                    setIsLoading(false);
                    // Load candidates after profile is ready
                    fetchCandidates();
                })
                .catch(() => setIsLoading(false));
        }
    }, [status, session, router, fetchCandidates]);

    const handleCandidateSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setCandidateSearch(candidateSearchInput);
        fetchCandidates(1, candidateSearchInput);
    };

    const formatSalaryShort = (val?: number) =>
        val ? `¥${(val / 10000).toLocaleString()}万` : null;

    if (status === 'loading' || isLoading) {
        return (
            <div className="min-h-screen bg-slate-50">
                {/* Skeleton navbar */}
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
                                    <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider -mt-0.5">Recruiter</span>
                                </div>
                            </Link>

                            <div className="hidden md:flex items-center gap-1">
                                <Link
                                    href={`/${locale}/recruiter/dashboard`}
                                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold bg-emerald-50 text-emerald-700 shadow-sm shadow-emerald-100/50"
                                >
                                    <BarChart3 className="w-4 h-4" />
                                    Dashboard
                                </Link>
                                {isAdmin && (
                                    <Link
                                        href={`/${locale}/admin`}
                                        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-all duration-200"
                                    >
                                        <Shield className="w-4 h-4" />
                                        Admin
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
                                    className={`flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl transition-all duration-200 ${userMenuOpen ? 'bg-slate-100 ring-2 ring-slate-200' : 'hover:bg-slate-50'
                                        }`}
                                >
                                    {session?.user?.image ? (
                                        <img
                                            src={session.user.image}
                                            alt={session.user.name || ''}
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
                                                    <img src={session.user.image} alt="" className="w-10 h-10 rounded-full shadow-sm" />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-full bg-linear-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white font-bold shadow-sm">
                                                        {(session?.user?.name || 'R').charAt(0).toUpperCase()}
                                                    </div>
                                                )}
                                                <div className="min-w-0">
                                                    <p className="text-sm font-bold text-slate-900 truncate">{session?.user?.name}</p>
                                                    <p className="text-xs text-slate-400 truncate">{session?.user?.email}</p>
                                                    <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
                                                        <Search className="w-2.5 h-2.5" /> Recruiter
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
                                                    Admin Dashboard
                                                </Link>
                                            )}
                                            <button
                                                onClick={() => { setUserMenuOpen(false); signOut({ callbackUrl: '/' }); }}
                                                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 rounded-lg transition-all duration-150"
                                            >
                                                <LogOut className="w-4 h-4" />
                                                Sign Out
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
                                    <Shield className="w-3 h-3" /> Recruiter Dashboard
                                </span>
                            </div>
                            <h1 className="text-2xl md:text-3xl font-bold text-white">
                                Welcome back{session?.user?.name ? `, ${session.user.name.split(' ')[0]}` : ''} 👋
                            </h1>
                            <p className="text-slate-400 text-sm">
                                {profile?.companyName} · {profile?.jobTitle}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        { label: 'Profiles Viewed', value: '—', icon: Eye, color: 'bg-blue-50 text-blue-600', border: 'border-blue-100' },
                        { label: 'Saved Candidates', value: '—', icon: BookmarkCheck, color: 'bg-emerald-50 text-emerald-600', border: 'border-emerald-100' },
                        { label: 'Active Candidates', value: '—', icon: Users, color: 'bg-violet-50 text-violet-600', border: 'border-violet-100' },
                        { label: 'Response Rate', value: '—', icon: TrendingUp, color: 'bg-amber-50 text-amber-600', border: 'border-amber-100' },
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
                    <h2 className="text-lg font-bold text-slate-800">Getting Started</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* Discover Candidates */}
                        <div className="group bg-white rounded-2xl border border-slate-200/80 p-6 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
                            <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center mb-4 group-hover:bg-emerald-100 transition-colors">
                                <Search className="w-6 h-6 text-emerald-600" />
                            </div>
                            <h3 className="font-bold text-slate-900 mb-2">Browse Candidate Profiles</h3>
                            <p className="text-sm text-slate-500 leading-relaxed mb-4">
                                Access verified candidate profiles shared via JNJGO links. View salary expectations, career intent, and deal-breakers.
                            </p>
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                                <Sparkles className="w-3.5 h-3.5" />
                                Candidates share their profiles via unique links
                            </div>
                        </div>

                        {/* How it works */}
                        <div className="group bg-white rounded-2xl border border-slate-200/80 p-6 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
                            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mb-4 group-hover:bg-blue-100 transition-colors">
                                <Zap className="w-6 h-6 text-blue-600" />
                            </div>
                            <h3 className="font-bold text-slate-900 mb-2">How It Works</h3>
                            <p className="text-sm text-slate-500 leading-relaxed mb-4">
                                Candidates build AI-powered resumes and publish private profiles. When they share their JNJGO link, you can access their full details.
                            </p>
                            <div className="space-y-2 text-xs text-slate-500">
                                <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600">1</div>
                                    Candidate shares their /c/[slug] link
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600">2</div>
                                    Sign in as recruiter to unlock details
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600">3</div>
                                    View salary, intent & preferences
                                </div>
                            </div>
                        </div>

                        {/* Your Profile Card */}
                        <div className="group bg-white rounded-2xl border border-slate-200/80 p-6 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
                            <div className="w-12 h-12 rounded-xl bg-violet-50 flex items-center justify-center mb-4 group-hover:bg-violet-100 transition-colors">
                                <Building2 className="w-6 h-6 text-violet-600" />
                            </div>
                            <h3 className="font-bold text-slate-900 mb-2">Your Company Profile</h3>
                            <div className="space-y-3 text-sm">
                                <div className="flex items-center justify-between py-1.5 border-b border-slate-50">
                                    <span className="text-slate-500">Company</span>
                                    <span className="font-semibold text-slate-800">{profile?.companyName || '—'}</span>
                                </div>
                                <div className="flex items-center justify-between py-1.5 border-b border-slate-50">
                                    <span className="text-slate-500">Title</span>
                                    <span className="font-semibold text-slate-800">{profile?.jobTitle || '—'}</span>
                                </div>
                                {profile?.industry && (
                                    <div className="flex items-center justify-between py-1.5 border-b border-slate-50">
                                        <span className="text-slate-500">Industry</span>
                                        <span className="font-semibold text-slate-800">{profile.industry}</span>
                                    </div>
                                )}
                                {profile?.companySize && (
                                    <div className="flex items-center justify-between py-1.5">
                                        <span className="text-slate-500">Size</span>
                                        <span className="font-semibold text-slate-800 capitalize">{profile.companySize}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Candidate Profiles Browser ── */}
                <div className="space-y-5">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div>
                            <h2 className="text-lg font-bold text-slate-800">Candidate Profiles</h2>
                            <p className="text-sm text-slate-500 mt-0.5">Browse published candidate profiles</p>
                        </div>
                        <form onSubmit={handleCandidateSearch} className="flex gap-2 w-full sm:w-auto">
                            <div className="relative flex-1 sm:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    value={candidateSearchInput}
                                    onChange={e => setCandidateSearchInput(e.target.value)}
                                    placeholder="Search by name, role, skills..."
                                    className="w-full pl-10 pr-4 py-2.5 text-sm text-slate-800 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                                />
                            </div>
                            <button
                                type="submit"
                                className="px-4 py-2.5 text-sm font-medium bg-slate-900 text-white rounded-xl hover:bg-emerald-600 transition-colors shrink-0"
                            >
                                Search
                            </button>
                        </form>
                    </div>

                    {candidatesLoading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                        </div>
                    ) : candidates.length === 0 ? (
                        <div className="bg-white rounded-2xl border border-slate-200/80 p-8 text-center">
                            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <Users className="w-8 h-8 text-slate-300" />
                            </div>
                            <h3 className="font-bold text-slate-700 mb-1">
                                {candidateSearch ? 'No matching candidates' : 'No published profiles yet'}
                            </h3>
                            <p className="text-sm text-slate-400 max-w-sm mx-auto leading-relaxed">
                                {candidateSearch
                                    ? 'Try adjusting your search terms.'
                                    : 'When candidates publish their profiles on JNJGO, they will appear here for you to browse.'}
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
                                        <div
                                            key={candidate.userId}
                                            className="group bg-white rounded-2xl border border-slate-200/80 overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
                                        >
                                            <div className="p-5">
                                                {/* Header */}
                                                <div className="flex items-start justify-between mb-3">
                                                    <div className="min-w-0 flex-1">
                                                        <h3 className="font-bold text-slate-900 text-sm truncate">
                                                            {candidate.fullName || 'Anonymous Candidate'}
                                                        </h3>
                                                        {candidate.highlightedResume?.currentRole && (
                                                            <p className="text-xs text-slate-500 mt-0.5 truncate">
                                                                {candidate.highlightedResume.currentRole}
                                                            </p>
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

                                                {/* AI Summary */}
                                                {candidate.aiObjectiveReview && (
                                                    <p className="text-xs text-slate-600 leading-relaxed mb-3 line-clamp-2">
                                                        {candidate.aiObjectiveReview}
                                                    </p>
                                                )}

                                                {/* Resume highlight — skills */}
                                                {candidate.highlightedResume?.skills && candidate.highlightedResume.skills.length > 0 && (
                                                    <div className="flex flex-wrap gap-1 mb-3">
                                                        {candidate.highlightedResume.skills.slice(0, 5).map((skill, i) => (
                                                            <span key={i} className="text-[10px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                                                                {skill}
                                                            </span>
                                                        ))}
                                                        {candidate.highlightedResume.skills.length > 5 && (
                                                            <span className="text-[10px] text-slate-400 px-1">
                                                                +{candidate.highlightedResume.skills.length - 5}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Desired roles */}
                                                {candidate.desiredRoles.length > 0 && (
                                                    <div className="flex flex-wrap gap-1 mb-3">
                                                        {candidate.desiredRoles.slice(0, 3).map((r, i) => (
                                                            <span key={i} className="text-[10px] font-medium bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-md border border-indigo-100">
                                                                {r.role}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Salary range */}
                                                {(salaryMin || salaryMax) && (
                                                    <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-3">
                                                        <DollarSign className="w-3 h-3 text-green-500" />
                                                        <span className="font-medium text-slate-700">
                                                            {salaryMin && salaryMax
                                                                ? `${salaryMin} ~ ${salaryMax}`
                                                                : salaryMin || salaryMax}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Footer */}
                                            {candidate.slug && (
                                                <div className="border-t border-slate-100 px-5 py-3 bg-slate-50/50">
                                                    <Link
                                                        href={`/c/${candidate.slug}`}
                                                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
                                                    >
                                                        <Eye className="w-3.5 h-3.5" />
                                                        View Full Profile
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
                                        Showing {((candidatePagination.page - 1) * candidatePagination.limit) + 1}-{Math.min(candidatePagination.page * candidatePagination.limit, candidatePagination.total)} of {candidatePagination.total}
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
                                            Page {candidatePagination.page} of {candidatePagination.totalPages}
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
                    )}
                </div>
            </div>
        </div>
    );
}
