'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Loader2, Sparkles, CheckCircle2, AlertCircle, XCircle,
    DollarSign, Briefcase, Ban, CalendarCheck, FileText, Globe,
    Zap, Target, TrendingUp, Eye, Link2, Copy, Check, ExternalLink, Save, Trash2, Users, Clock,
} from 'lucide-react';
import { signOut } from 'next-auth/react';
import { CandidatePrivateProfile } from '../../types';

/* ─── Constants ──────────────────────────────────────────── */

const ORIENTATION_OPTIONS = [
    { value: 'tech-driven', label: 'Tech / Specialist', description: 'Deep technical focus', icon: Zap, color: 'bg-blue-600' },
    { value: 'business-driven', label: 'Business / Strategy', description: 'Growth & strategy', icon: TrendingUp, color: 'bg-emerald-600' },
    { value: 'management-driven', label: 'Management / Lead', description: 'Team & delivery', icon: Briefcase, color: 'bg-violet-600' },
    { value: 'balanced', label: 'Balanced / Hybrid', description: 'Cross-functional', icon: Globe, color: 'bg-amber-600' },
] as const;

const INTENT_OPTIONS = [
    { value: 'now', label: 'Actively looking', badge: 'Now', description: 'Ready for interviews', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
    { value: 'within_3_months', label: 'Within 3 months', badge: '3m', description: 'Planning to move soon', color: 'text-blue-700 bg-blue-50 border-blue-200' },
    { value: 'open_to_offers', label: 'Open to offers', badge: 'Passive', description: 'Right offer only', color: 'text-slate-700 bg-slate-50 border-slate-200' },
] as const;

/* ─── Animation variants ─────────────────────────────────── */

const fadeSlideUp = {
    hidden: { opacity: 0, y: 12 },
    visible: (i: number) => ({
        opacity: 1,
        y: 0,
        transition: { delay: i * 0.05, duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] },
    }),
};

/* ─── Section Card ───────────────────────────────────────── */

function SectionCard({
    title,
    icon: Icon,
    children,
    badge,
    index = 0,
}: {
    title: string;
    icon: React.ElementType;
    children: React.ReactNode;
    badge?: string;
    index?: number;
}) {
    return (
        <motion.section
            custom={index}
            variants={fadeSlideUp}
            initial="hidden"
            animate="visible"
            className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300"
        >
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-slate-600" />
                </div>
                <h2 className="font-semibold text-slate-900 text-sm tracking-tight">{title}</h2>
                {badge && (
                    <span className="ml-auto text-[10px] font-bold text-indigo-600 uppercase tracking-wider bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
                        {badge}
                    </span>
                )}
            </div>
            <div className="p-5">{children}</div>
        </motion.section>
    );
}

/* ─── Input wrapper ──────────────────────────────────────── */

function InputField({
    label,
    hint,
    children,
}: {
    label?: string;
    hint?: string;
    children: React.ReactNode;
}) {
    return (
        <div className="space-y-1.5">
            {label && <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">{label}</label>}
            {children}
            {hint && <p className="text-xs text-slate-500 mt-1.5">{hint}</p>}
        </div>
    );
}

/* ─── Main Component ─────────────────────────────────────── */

export default function PrivateProfileEditor() {
    const [profile, setProfile] = useState<Partial<CandidatePrivateProfile> | null>(null);
    const [publicSlug, setPublicSlug] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [copied, setCopied] = useState(false);
    const [projects, setProjects] = useState<Array<{ id: string; title: string; status: string }>>([]);
    const [projectsLoading, setProjectsLoading] = useState(false);
    const initialProfileRef = useRef<string | null>(null);

    const [profileViews, setProfileViews] = useState<{
        totalViews: number;
        anonymousCount: number;
        uniqueRecruiters: number;
        viewers: Array<{ recruiterId: string; recruiterName: string | null; viewedAt: number; totalViews: number }>;
    } | null>(null);

    /* ── Dirty-state tracking ── */
    const isDirty = useMemo(() => {
        if (!profile || initialProfileRef.current === null) return false;
        return JSON.stringify(profile) !== initialProfileRef.current;
    }, [profile]);

    /* ── Data loading ── */

    const loadProfile = useCallback(async () => {
        try {
            const res = await fetch('/api/profile/private');
            if (res.ok) {
                const data = await res.json();
                setProfile(data || null);
                initialProfileRef.current = JSON.stringify(data || null);
            }
        } catch (e) {
            console.error(e);
            setError('Failed to load profile');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadProfile();
    }, [loadProfile]);

    // Load user's projects for highlighted resume selector
    useEffect(() => {
        setProjectsLoading(true);
        fetch('/api/projects')
            .then(r => r.json())
            .then(data => {
                // Only show completed/generated projects that have resume data
                const eligibleProjects = (data.projects || []).filter(
                    (p: any) => (p.status === 'completed' || p.status === 'generated') && p.data?.fullName
                );
                setProjects(eligibleProjects.map((p: any) => ({ id: p.id, title: p.title, status: p.status })));
            })
            .catch(() => setProjects([]))
            .finally(() => setProjectsLoading(false));
    }, []);

    useEffect(() => {
        if (profile?.status === 'published') {
            fetch('/api/profile/public/slug')
                .then((r) => r.json())
                .then((d) => setPublicSlug(d.slug || null))
                .catch(() => { /* ignore */ });
        } else {
            setPublicSlug(null);
        }
    }, [profile?.status]);

    useEffect(() => {
        if (profile?.status === 'published') {
            fetch('/api/candidate/profile-views')
                .then(r => r.ok ? r.json() : null)
                .then(data => { if (data) setProfileViews(data); })
                .catch(() => { /* non-critical */ });
        }
    }, [profile?.status]);

    /* ── Actions ── */

    const handleGenerateDraft = async () => {
        setIsGenerating(true);
        setError('');
        setSuccessMessage('');
        try {
            const res = await fetch('/api/profile/private/generate', { method: 'POST' });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to generate profile');
            }
            const data = await res.json();
            setProfile(data);
            initialProfileRef.current = JSON.stringify(data);
            setSuccessMessage('Draft created. Review and publish when ready.');
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Something went wrong');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSave = async (status: 'draft' | 'published') => {
        if (!profile) return;
        setIsSaving(true);
        setError('');
        setSuccessMessage('');
        try {
            const res = await fetch('/api/profile/private', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...profile, status }),
            });
            if (!res.ok) throw new Error('Failed to save');
            const data = await res.json();
            setProfile(data);
            initialProfileRef.current = JSON.stringify(data);
            setSuccessMessage(
                status === 'published'
                    ? 'Profile is live — recruiters can now see it from your link.'
                    : 'Draft saved.'
            );
        } catch {
            setError('Could not save. Try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleCopyLink = () => {
        const url = typeof window !== 'undefined'
            ? `${window.location.origin}/c/${publicSlug}`
            : `/c/${publicSlug}`;
        navigator.clipboard.writeText(url);
        setCopied(true);
        setSuccessMessage('Link copied to clipboard');
        setTimeout(() => {
            setCopied(false);
            setSuccessMessage('');
        }, 2500);
    };

    const handleDeleteAccount = async () => {
        if (deleteConfirmText !== 'DELETE') return;
        setIsDeleting(true);
        try {
            const res = await fetch('/api/account/delete', { method: 'DELETE' });
            if (!res.ok) throw new Error('Deletion failed');
            await signOut({ callbackUrl: '/' });
        } catch {
            setError('Failed to delete account. Please try again or contact support.');
            setIsDeleting(false);
            setShowDeleteModal(false);
        }
    };

    const formatSalary = (val: number | undefined) =>
        val ? (val / 10000).toLocaleString() + '万円' : '';

    const updateProfile = (patch: Partial<CandidatePrivateProfile>) =>
        setProfile((prev) => ({ ...prev, ...patch }));

    /* ─── Loading State ─────────────────────────────────── */

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-28 gap-5">
                <div className="relative">
                    <div className="w-12 h-12 rounded-full border-[3px] border-slate-200" />
                    <div className="w-12 h-12 rounded-full border-[3px] border-transparent border-t-indigo-500 absolute inset-0 animate-[spinner_0.8s_linear_infinite]" />
                </div>
                <p className="text-sm font-medium text-slate-500 animate-pulse-soft">Loading profile…</p>
            </div>
        );
    }

    /* ─── Empty State ───────────────────────────────────── */

    if (!profile && !isGenerating) {
        return (
            <motion.div
                className="space-y-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
                {/* Header */}
                <div className="space-y-3">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.1 }}
                        className="inline-flex items-center gap-2 rounded-full bg-indigo-600 text-white px-3.5 py-1.5 text-xs font-bold tracking-wide"
                    >
                        <Sparkles className="w-3.5 h-3.5" />
                        AI-powered
                    </motion.div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                        Recruiter-only profile
                    </h1>
                    <p className="text-slate-600 text-base max-w-xl leading-relaxed">
                        Share intent, salary range, and deal-breakers only with recruiters who open your JNJGO link. You control what&apos;s visible.
                    </p>
                </div>

                {/* CTA Card */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white rounded-2xl border border-slate-200/80 p-10 sm:p-14 text-center"
                >
                    <motion.div
                        animate={{ y: [0, -4, 0] }}
                        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                        className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto mb-6"
                    >
                        <Sparkles className="w-8 h-8 text-indigo-500" />
                    </motion.div>

                    <h2 className="text-xl font-bold text-slate-900 mb-2">
                        Create your recruiter profile
                    </h2>
                    <p className="text-slate-500 text-sm max-w-md mx-auto mb-8 leading-relaxed">
                        AI will suggest fields from your resume and interview. You edit and publish when you&apos;re ready.
                    </p>

                    <motion.button
                        type="button"
                        onClick={handleGenerateDraft}
                        whileHover={{ y: -2, boxShadow: '0 12px 30px -8px rgba(99,102,241,0.3)' }}
                        whileTap={{ y: 0 }}
                        className="inline-flex items-center gap-2.5 px-7 py-3.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-colors"
                    >
                        <Sparkles className="w-4 h-4" />
                        Generate draft with AI
                    </motion.button>

                    <p className="mt-5 text-xs text-slate-400 font-medium">
                        Requires at least one completed resume project
                    </p>
                </motion.div>
            </motion.div>
        );
    }

    /* ─── Generating State ──────────────────────────────── */

    if (isGenerating) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-2xl border border-slate-200/80 p-12 sm:p-16 text-center"
            >
                <div className="relative mx-auto mb-6 w-14 h-14">
                    <div className="w-14 h-14 rounded-full border-[3px] border-indigo-100" />
                    <div className="w-14 h-14 rounded-full border-[3px] border-transparent border-t-indigo-500 absolute inset-0 animate-[spinner_0.8s_linear_infinite]" />
                    <Sparkles className="w-5 h-5 text-indigo-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
                <h2 className="text-lg font-bold text-slate-900 mb-2">
                    Building your profile
                </h2>
                <p className="text-slate-500 text-sm">
                    Analyzing your resume and interview history…
                </p>
                <div className="mt-6 flex justify-center gap-1.5">
                    {[0, 1, 2].map((i) => (
                        <motion.div
                            key={i}
                            className="w-2 h-2 rounded-full bg-indigo-400"
                            animate={{ opacity: [0.3, 1, 0.3] }}
                            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                        />
                    ))}
                </div>
            </motion.div>
        );
    }

    /* ─── Editor (profile exists) ───────────────────────── */

    const isPublished = profile?.status === 'published';

    return (
        <div className="space-y-5 pb-28">
            {/* Page header */}
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
            >
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                        Recruiter-only profile
                    </h1>
                    <p className="mt-1 text-slate-600 text-sm max-w-xl">
                        Only recruiters who open your JNJGO link can see this. You control visibility.
                    </p>
                </div>
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.15 }}
                    className="flex items-center gap-2 shrink-0"
                >
                    {isPublished && publicSlug && (
                        <a
                            href={`/c/${publicSlug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 px-3.5 py-1.5 rounded-full hover:bg-indigo-100 transition-colors"
                        >
                            <ExternalLink className="w-3 h-3" />
                            Preview
                        </a>
                    )}
                    {isPublished ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3.5 py-1.5 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-soft" />
                            Live
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 bg-slate-100 border border-slate-200 px-3.5 py-1.5 rounded-full">
                            <FileText className="w-3 h-3" />
                            Draft
                        </span>
                    )}
                </motion.div>
            </motion.div>

            {/* Alerts */}
            <AnimatePresence mode="wait">
                {error && (
                    <motion.div
                        key="error"
                        initial={{ opacity: 0, y: -8, height: 0 }}
                        animate={{ opacity: 1, y: 0, height: 'auto' }}
                        exit={{ opacity: 0, y: -8, height: 0 }}
                        role="alert"
                        className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm overflow-hidden"
                    >
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span className="flex-1 font-medium">{error}</span>
                        <button type="button" onClick={() => setError('')} className="text-red-400 hover:text-red-600 transition-colors" aria-label="Dismiss">
                            <XCircle className="w-4 h-4" />
                        </button>
                    </motion.div>
                )}
                {successMessage && (
                    <motion.div
                        key="success"
                        initial={{ opacity: 0, y: -8, height: 0 }}
                        animate={{ opacity: 1, y: 0, height: 'auto' }}
                        exit={{ opacity: 0, y: -8, height: 0 }}
                        role="status"
                        className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm overflow-hidden"
                    >
                        <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                        <span className="flex-1 font-medium">{successMessage}</span>
                        <button type="button" onClick={() => setSuccessMessage('')} className="text-emerald-400 hover:text-emerald-600 transition-colors" aria-label="Dismiss">
                            <XCircle className="w-4 h-4" />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Sections */}
            <div className="space-y-4 stagger-children">

                {/* ── Recruiter Link ── */}
                {isPublished && publicSlug && (
                    <SectionCard title="Your recruiter link" icon={Link2} index={0}>
                        <p className="text-slate-600 text-sm mb-3">
                            Add this URL to your exported resume so recruiters can see your preferences.
                        </p>
                        <div className="flex items-center gap-2">
                            <code className="flex-1 px-4 py-2.5 bg-slate-50 rounded-lg text-sm text-slate-800 font-mono truncate border border-slate-200">
                                {typeof window !== 'undefined' ? `${window.location.origin}/c/${publicSlug}` : `/c/${publicSlug}`}
                            </code>
                            <motion.button
                                type="button"
                                onClick={handleCopyLink}
                                whileTap={{ scale: 0.95 }}
                                className="shrink-0 px-4 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-colors inline-flex items-center gap-2"
                            >
                                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                                {copied ? 'Copied' : 'Copy'}
                            </motion.button>
                        </div>
                    </SectionCard>
                )}

                {/* ── Highlighted Resume (top) ── */}
                <SectionCard title="Highlighted resume" icon={FileText} badge="Recommended" index={1}>
                    <div className="space-y-3">
                        <p className="text-xs text-slate-500 leading-relaxed">
                            Attach a completed resume so recruiters can see your skills and career summary at a glance.
                        </p>
                        {projectsLoading ? (
                            <div className="flex items-center gap-2 py-3">
                                <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                                <span className="text-xs text-slate-500">Loading your resumes…</span>
                            </div>
                        ) : projects.length === 0 ? (
                            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-center">
                                <p className="text-xs text-slate-500">No completed resumes available. Complete a resume project first to attach it here.</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <select
                                    value={profile!.highlightedProjectId || ''}
                                    onChange={(e) => updateProfile({ highlightedProjectId: e.target.value || null })}
                                    className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 text-sm text-slate-900 focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100 transition-all duration-200 bg-white"
                                >
                                    <option value="">None — don&apos;t show a resume</option>
                                    {projects.map(p => (
                                        <option key={p.id} value={p.id}>
                                            {p.title} ({p.status})
                                        </option>
                                    ))}
                                </select>
                                {profile!.highlightedProjectId && (
                                    <motion.p
                                        initial={{ opacity: 0, y: -4 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="text-xs text-emerald-600 font-medium flex items-center gap-1.5"
                                    >
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        Resume will be visible to recruiters browsing your profile
                                    </motion.p>
                                )}
                            </div>
                        )}
                    </div>
                </SectionCard>

                {/* ── Career Orientation ── */}
                <SectionCard title="Career orientation" icon={Target} index={2}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {ORIENTATION_OPTIONS.map((opt) => {
                            const active = profile!.orientation === opt.value;
                            return (
                                <motion.button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => updateProfile({ orientation: opt.value })}
                                    whileHover={{ scale: 1.01 }}
                                    whileTap={{ scale: 0.98 }}
                                    className={`flex items-center gap-3 p-3.5 rounded-xl border-2 text-left transition-all duration-200 ${active
                                        ? 'border-indigo-500 bg-indigo-50/50 shadow-sm'
                                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                                        }`}
                                >
                                    <div className={`w-10 h-10 rounded-xl ${opt.color} flex items-center justify-center shrink-0 shadow-sm`}>
                                        <opt.icon className="w-5 h-5 text-white" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <span className="font-semibold text-slate-900 text-sm block">{opt.label}</span>
                                        <span className="text-xs text-slate-500">{opt.description}</span>
                                    </div>
                                    {active && (
                                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                                            <CheckCircle2 className="w-5 h-5 text-indigo-500 shrink-0" />
                                        </motion.div>
                                    )}
                                </motion.button>
                            );
                        })}
                    </div>
                </SectionCard>

                {/* ── Job Change Intent ── */}
                <SectionCard title="Job change intent" icon={TrendingUp} index={3}>
                    <div className="flex flex-col sm:flex-row gap-3">
                        {INTENT_OPTIONS.map((opt) => {
                            const active = profile!.jobChangeIntent === opt.value;
                            return (
                                <motion.button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => updateProfile({ jobChangeIntent: opt.value as CandidatePrivateProfile['jobChangeIntent'] })}
                                    whileHover={{ scale: 1.01 }}
                                    whileTap={{ scale: 0.98 }}
                                    className={`flex-1 px-4 py-3.5 rounded-xl border-2 text-left transition-all duration-200 ${active
                                        ? 'border-indigo-500 bg-indigo-50/50 shadow-sm'
                                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                                        }`}
                                >
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${active ? 'text-indigo-700 bg-indigo-100 border-indigo-200' : opt.color}`}>
                                            {opt.badge}
                                        </span>
                                        {active && (
                                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                                                <CheckCircle2 className="w-4 h-4 text-indigo-500" />
                                            </motion.div>
                                        )}
                                    </div>
                                    <span className="font-semibold text-slate-900 text-sm block">{opt.label}</span>
                                    <span className="text-xs text-slate-500">{opt.description}</span>
                                </motion.button>
                            );
                        })}
                    </div>
                </SectionCard>

                {/* ── AI Objective Review ── */}
                <SectionCard title="Objective summary" icon={Sparkles} badge="Recruiter sees this" index={4}>
                    <InputField hint="2–3 sentences on your strengths and what you're looking for.">
                        <textarea
                            value={profile!.aiObjectiveReview || ''}
                            onChange={(e) => updateProfile({ aiObjectiveReview: e.target.value })}
                            rows={4}
                            placeholder="e.g. Full-stack engineer with 8 years of experience in SaaS products. Looking for a senior role at a product-led company."
                            className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100 resize-none transition-all duration-200"
                        />
                    </InputField>
                </SectionCard>

                {/* ── Salary Expectations ── */}
                <SectionCard title="Salary expectations (JPY)" icon={DollarSign} index={5}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <InputField label="Minimum">
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-medium">¥</span>
                                <input
                                    type="number"
                                    value={profile!.desiredSalary?.minimum ?? ''}
                                    onChange={(e) =>
                                        updateProfile({
                                            desiredSalary: { ...profile!.desiredSalary, minimum: Number(e.target.value) || undefined },
                                        })
                                    }
                                    placeholder="8,000,000"
                                    className="w-full pl-8 pr-4 py-3 rounded-xl border-2 border-slate-200 text-sm text-slate-900 font-medium placeholder:text-slate-400 focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100 transition-all duration-200"
                                />
                            </div>
                            {profile!.desiredSalary?.minimum ? (
                                <p className="mt-1.5 text-xs font-medium text-slate-500">{formatSalary(profile!.desiredSalary.minimum)}</p>
                            ) : null}
                        </InputField>
                        <InputField label="Target">
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-medium">¥</span>
                                <input
                                    type="number"
                                    value={profile!.desiredSalary?.target ?? ''}
                                    onChange={(e) =>
                                        updateProfile({
                                            desiredSalary: { ...profile!.desiredSalary, target: Number(e.target.value) || undefined },
                                        })
                                    }
                                    placeholder="10,000,000"
                                    className="w-full pl-8 pr-4 py-3 rounded-xl border-2 border-slate-200 text-sm text-slate-900 font-medium placeholder:text-slate-400 focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100 transition-all duration-200"
                                />
                            </div>
                            {profile!.desiredSalary?.target ? (
                                <p className="mt-1.5 text-xs font-medium text-slate-500">{formatSalary(profile!.desiredSalary.target)}</p>
                            ) : null}
                        </InputField>
                    </div>
                </SectionCard>

                {/* ── Deal Breakers ── */}
                <SectionCard title="Deal breakers" icon={Ban} index={6}>
                    {(profile!.dealBreakers?.filter(Boolean).length ?? 0) > 0 ? (
                        <div className="flex flex-wrap gap-2 mb-3">
                            {profile!.dealBreakers!.map((db, i) =>
                                db.trim() ? (
                                    <motion.span
                                        key={`${db}-${i}`}
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="inline-flex items-center gap-1.5 bg-red-50 text-red-700 px-3 py-1.5 rounded-lg text-xs font-semibold border border-red-200"
                                    >
                                        {db.trim()}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const next = [...(profile!.dealBreakers || [])];
                                                next.splice(i, 1);
                                                updateProfile({ dealBreakers: next });
                                            }}
                                            className="text-red-400 hover:text-red-600 transition-colors -mr-0.5"
                                            aria-label="Remove"
                                        >
                                            <XCircle className="w-3.5 h-3.5" />
                                        </button>
                                    </motion.span>
                                ) : null
                            )}
                        </div>
                    ) : null}
                    <InputField hint="Comma-separated. Helps recruiters quickly filter fit.">
                        <input
                            type="text"
                            value={profile!.dealBreakers?.join(', ') || ''}
                            onChange={(e) =>
                                updateProfile({
                                    dealBreakers: e.target.value.split(',').map((s) => s.trim()),
                                })
                            }
                            placeholder="e.g. Legacy tech, no equity, no remote"
                            className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100 transition-all duration-200"
                        />
                    </InputField>
                </SectionCard>

                {/* ── Interview Availability ── */}
                <SectionCard title="Interview availability" icon={CalendarCheck} index={7}>
                    <InputField hint="When are you generally available for interviews?">
                        <input
                            type="text"
                            value={profile!.interviewAvailability || ''}
                            onChange={(e) => updateProfile({ interviewAvailability: e.target.value })}
                            placeholder="e.g. Weekday evenings after 18:00, weekends"
                            className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100 transition-all duration-200"
                        />
                    </InputField>
                </SectionCard>

                {/* ── Working Conditions ── */}
                <SectionCard title="Working conditions" icon={Globe} index={8}>
                    <InputField hint="Remote, hybrid, office-based, location preferences.">
                        <input
                            type="text"
                            value={profile!.workingConditions || ''}
                            onChange={(e) => updateProfile({ workingConditions: e.target.value })}
                            placeholder="e.g. Remote preferred, hybrid OK, Tokyo area"
                            className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100 transition-all duration-200"
                        />
                    </InputField>
                </SectionCard>

                {/* ── Profile Views ── */}
                {isPublished && profileViews && profileViews.totalViews > 0 && (
                    <SectionCard title="Who viewed your profile" icon={Users} index={9}>
                        <div className="space-y-4">
                            <div className="flex items-center gap-6">
                                <div className="text-center">
                                    <p className="text-2xl font-black text-slate-900">{profileViews.totalViews}</p>
                                    <p className="text-xs text-slate-500 mt-0.5">Total views</p>
                                </div>
                                <div className="w-px h-10 bg-slate-200" />
                                <div className="text-center">
                                    <p className="text-2xl font-black text-indigo-600">{profileViews.uniqueRecruiters}</p>
                                    <p className="text-xs text-slate-500 mt-0.5">Identified recruiters</p>
                                </div>
                                {profileViews.anonymousCount > 0 && (
                                    <>
                                        <div className="w-px h-10 bg-slate-200" />
                                        <div className="text-center">
                                            <p className="text-2xl font-black text-slate-400">{profileViews.anonymousCount}</p>
                                            <p className="text-xs text-slate-500 mt-0.5">Anonymous</p>
                                        </div>
                                    </>
                                )}
                            </div>

                            {profileViews.viewers.length > 0 ? (
                                <div className="space-y-2 mt-1">
                                    {profileViews.viewers.map((v) => {
                                        const initials = v.recruiterName
                                            ? v.recruiterName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
                                            : '?';
                                        const relativeTime = (() => {
                                            const diff = Date.now() - v.viewedAt;
                                            if (diff < 60_000) return 'just now';
                                            if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
                                            if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
                                            return `${Math.floor(diff / 86_400_000)}d ago`;
                                        })();
                                        return (
                                            <motion.div
                                                key={v.recruiterId}
                                                initial={{ opacity: 0, x: -8 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100"
                                            >
                                                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                                                    <span className="text-xs font-bold text-indigo-600">{initials}</span>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold text-slate-800 truncate">
                                                        {v.recruiterName || 'Recruiter'}
                                                    </p>
                                                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                                        <Clock className="w-3 h-3" />
                                                        {relativeTime}
                                                        {v.totalViews > 1 && (
                                                            <span className="ml-1 text-indigo-500 font-medium">· {v.totalViews}×</span>
                                                        )}
                                                    </p>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="text-xs text-slate-500">
                                    No identified recruiter views yet. Views are attributed once a recruiter signs in.
                                </p>
                            )}
                        </div>
                    </SectionCard>
                )}

                {/* ── Visibility ── */}
                <SectionCard title="Visibility" icon={Eye} index={isPublished && profileViews ? 10 : 9}>
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <p className="font-semibold text-slate-900 text-sm">Show to recruiters via your link</p>
                            <p className="text-xs text-slate-500 mt-0.5">Only visible when status is Live</p>
                        </div>
                        <motion.button
                            type="button"
                            role="switch"
                            aria-checked={profile!.visibilityFlags?.isRecruiterOnly !== false}
                            onClick={() =>
                                updateProfile({
                                    visibilityFlags: {
                                        ...profile!.visibilityFlags,
                                        isRecruiterOnly: !(profile!.visibilityFlags?.isRecruiterOnly ?? true),
                                    },
                                })
                            }
                            whileTap={{ scale: 0.9 }}
                            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-200 shrink-0 ${profile!.visibilityFlags?.isRecruiterOnly !== false ? 'bg-indigo-600' : 'bg-slate-300'
                                }`}
                        >
                            <motion.span
                                layout
                                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm ${profile!.visibilityFlags?.isRecruiterOnly !== false ? 'translate-x-6' : 'translate-x-1'
                                    }`}
                            />
                        </motion.button>
                    </div>
                </SectionCard>

            </div>

            {/* ── Danger Zone ── */}
            <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-6">
                <div className="border border-red-200 rounded-2xl p-6 bg-red-50/50">
                    <div className="flex items-start gap-3 mb-4">
                        <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Trash2 className="w-4 h-4 text-red-600" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-red-900">Danger Zone</h3>
                            <p className="text-xs text-red-700 mt-0.5">
                                Permanently delete your account and all associated data — resumes, projects, profile, and conversation history. This cannot be undone.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => { setShowDeleteModal(true); setDeleteConfirmText(''); }}
                        className="text-sm font-semibold text-red-700 border border-red-300 bg-white hover:bg-red-50 px-4 py-2 rounded-lg transition-colors"
                    >
                        Delete my account
                    </button>
                </div>
            </div>

            {/* ── Delete Confirmation Modal ── */}
            <AnimatePresence>
                {showDeleteModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
                        onClick={(e) => { if (e.target === e.currentTarget) setShowDeleteModal(false); }}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md"
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                                    <Trash2 className="w-5 h-5 text-red-600" />
                                </div>
                                <div>
                                    <h2 className="text-base font-bold text-slate-900">Delete account</h2>
                                    <p className="text-xs text-slate-500">This action is permanent and cannot be reversed.</p>
                                </div>
                            </div>
                            <p className="text-sm text-slate-600 mb-4">
                                All your resumes, projects, candidate profile, and conversation history will be permanently deleted. Type <strong className="font-mono">DELETE</strong> to confirm.
                            </p>
                            <input
                                type="text"
                                value={deleteConfirmText}
                                onChange={(e) => setDeleteConfirmText(e.target.value)}
                                placeholder="Type DELETE to confirm"
                                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-red-400 mb-4"
                            />
                            <div className="flex gap-3 justify-end">
                                <button
                                    type="button"
                                    onClick={() => setShowDeleteModal(false)}
                                    disabled={isDeleting}
                                    className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleDeleteAccount}
                                    disabled={deleteConfirmText !== 'DELETE' || isDeleting}
                                    className="px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors disabled:opacity-40 inline-flex items-center gap-2"
                                >
                                    {isDeleting && <Loader2 className="w-4 h-4 animate-spin" />}
                                    {isDeleting ? 'Deleting…' : 'Delete my account'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Sticky Action Bar ── */}
            <motion.div
                initial={{ y: 100 }}
                animate={{ y: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="fixed bottom-0 left-0 right-0 z-10 bg-white/95 backdrop-blur-xl border-t border-slate-200 px-4 py-4 safe-area-pb"
            >
                <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-3 order-2 sm:order-1">
                        <motion.button
                            type="button"
                            onClick={handleGenerateDraft}
                            disabled={isGenerating}
                            whileHover={{ x: -2 }}
                            whileTap={{ scale: 0.97 }}
                            className="text-sm font-semibold text-slate-500 hover:text-indigo-600 flex items-center gap-2 transition-colors disabled:opacity-40"
                        >
                            <Sparkles className="w-4 h-4" />
                            Regenerate with AI
                        </motion.button>
                        {!isDirty && !isSaving && (
                            <motion.span
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="text-xs font-medium text-slate-400 flex items-center gap-1"
                            >
                                <CheckCircle2 className="w-3 h-3" />
                                Saved
                            </motion.span>
                        )}
                        {isDirty && (
                            <motion.span
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="text-xs font-medium text-amber-600 flex items-center gap-1"
                            >
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                Unsaved changes
                            </motion.span>
                        )}
                    </div>
                    <div className="flex gap-3 order-1 sm:order-2">
                        {isPublished && (
                            <motion.button
                                type="button"
                                onClick={() => handleSave('draft')}
                                disabled={isSaving}
                                whileHover={{ y: -1 }}
                                whileTap={{ scale: 0.97 }}
                                className="px-5 py-2.5 text-sm font-bold text-slate-700 bg-white border-2 border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 disabled:opacity-40 transition-colors"
                            >
                                Unpublish
                            </motion.button>
                        )}
                        <motion.button
                            type="button"
                            onClick={() => handleSave(isPublished ? 'published' : isDirty ? 'draft' : 'published')}
                            disabled={isSaving || (!isDirty && isPublished)}
                            whileHover={!isSaving && (isDirty || !isPublished) ? { y: -1, boxShadow: '0 8px 25px -5px rgba(99,102,241,0.25)' } : {}}
                            whileTap={!isSaving && (isDirty || !isPublished) ? { scale: 0.97 } : {}}
                            className={`px-6 py-2.5 text-sm font-bold rounded-xl inline-flex items-center justify-center gap-2 transition-all ${!isDirty && isPublished
                                    ? 'text-slate-400 bg-slate-100 border-2 border-slate-200 cursor-default'
                                    : 'text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40'
                                }`}
                        >
                            {isSaving ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : !isDirty && isPublished ? (
                                <CheckCircle2 className="w-4 h-4" />
                            ) : (
                                <Save className="w-4 h-4" />
                            )}
                            {isSaving
                                ? 'Saving…'
                                : !isDirty && isPublished
                                    ? 'Up to date'
                                    : isDirty && isPublished
                                        ? 'Save changes'
                                        : isPublished
                                            ? 'Save changes'
                                            : 'Publish'}
                        </motion.button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
