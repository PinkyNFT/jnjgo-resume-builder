'use client';

import React from 'react';
import Link from 'next/link';
import { usePrivateProfile } from '../hooks/usePrivateProfile';
import {
    Briefcase, ArrowRight, Sparkles, Clock,
    DollarSign, MapPin, UserCircle, Zap, TrendingUp, Globe,
} from 'lucide-react';

/* ─── Types ──────────────────────────────────────────────── */

interface PrivateProfileSnippet {
    status?: 'draft' | 'published';
    orientation?: string;
    desiredRoles?: Array<{ role: string; priority: number }>;
    desiredSalary?: { minimum?: number; target?: number };
    workingConditions?: string;
}

/* ─── Orientation fallbacks ──────────────────────────────── */

const ORIENTATION_ROLE_DEFAULTS: Record<string, string[]> = {
    'tech-driven':        ['Backend Engineer',          'Software Engineer',        'Tech Lead'],
    'business-driven':   ['Business Development',       'Product Manager',          'Strategy Consultant'],
    'management-driven': ['Engineering Manager',        'VP of Engineering',        'CTO'],
    'balanced':          ['Full-Stack Engineer',        'Technical Product Manager','Solutions Architect'],
};

const ORIENTATION_META: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
    'tech-driven':        { label: 'Tech / Specialist',    icon: Zap,         color: 'text-blue-600',    bg: 'bg-blue-50' },
    'business-driven':   { label: 'Business / Strategy',  icon: TrendingUp,  color: 'text-emerald-600', bg: 'bg-emerald-50' },
    'management-driven': { label: 'Management / Lead',    icon: Briefcase,   color: 'text-violet-600',  bg: 'bg-violet-50' },
    'balanced':          { label: 'Balanced / Hybrid',    icon: Globe,       color: 'text-amber-600',   bg: 'bg-amber-50' },
};

/* ─── Helpers ────────────────────────────────────────────── */

function salaryLabel(profile: PrivateProfileSnippet): string | null {
    const min = profile.desiredSalary?.minimum;
    const target = profile.desiredSalary?.target;
    if (min && target) return `¥${(min / 10000).toLocaleString()}万〜¥${(target / 10000).toLocaleString()}万`;
    if (target)        return `〜¥${(target / 10000).toLocaleString()}万`;
    if (min)           return `¥${(min / 10000).toLocaleString()}万〜`;
    return null;
}

/* ─── Placeholder Job Card ───────────────────────────────── */

function PlaceholderJobCard({
    roleTitle,
    salary,
    conditions,
    orientationMeta,
}: {
    roleTitle: string;
    salary: string | null;
    conditions: string | null;
    orientationMeta: typeof ORIENTATION_META[string] | undefined;
}) {
    const OrientationIcon = orientationMeta?.icon || Briefcase;

    return (
        <div className="relative bg-white rounded-2xl border border-slate-200/80 p-5 flex flex-col gap-3 overflow-hidden group">

            {/* Coming Soon badge */}
            <div className="absolute top-3.5 right-3.5">
                <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    <Clock className="w-2.5 h-2.5" />
                    Soon
                </span>
            </div>

            {/* Role icon + title */}
            <div className="flex items-start gap-3 pr-12">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${orientationMeta?.bg || 'bg-slate-100'}`}>
                    <OrientationIcon className={`w-4 h-4 ${orientationMeta?.color || 'text-slate-500'}`} />
                </div>
                <div className="min-w-0">
                    <p className="font-bold text-slate-900 text-sm leading-snug">{roleTitle}</p>
                    {/* Skeleton for company */}
                    <div className="mt-1.5 h-2.5 bg-slate-100 rounded-full w-28" />
                </div>
            </div>

            {/* Meta chips */}
            <div className="flex flex-wrap gap-1.5">
                {orientationMeta && (
                    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${orientationMeta.bg} ${orientationMeta.color}`}>
                        <OrientationIcon className="w-2.5 h-2.5" />
                        {orientationMeta.label}
                    </span>
                )}
                {salary && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
                        <DollarSign className="w-2.5 h-2.5" />
                        {salary}
                    </span>
                )}
                {conditions && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                        <MapPin className="w-2.5 h-2.5" />
                        {conditions.length > 22 ? conditions.slice(0, 22) + '…' : conditions}
                    </span>
                )}
            </div>

            {/* Skeleton footer lines */}
            <div className="space-y-1.5 mt-auto pt-3 border-t border-slate-100">
                <div className="h-2 bg-slate-100 rounded-full w-full" />
                <div className="h-2 bg-slate-100 rounded-full w-3/4" />
            </div>
        </div>
    );
}

/* ─── Main Component ─────────────────────────────────────── */

export default function JobMatchingSection({ locale }: { locale: string }) {
    // Reads from React Query cache — zero extra network request when PrivateProfileEditor
    // is also mounted on the same page (same query key, shared cache)
    const { data: profile, isPending } = usePrivateProfile();

    if (isPending) return null;

    const isPublished = profile?.status === 'published';
    const orientationMeta = ORIENTATION_META[profile?.orientation || ''];

    /* ── No published profile → CTA ── */
    if (!profile || !isPublished) {
        return (
            <section className="space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
                            <Briefcase className="w-4 h-4 text-violet-600" />
                        </div>
                        <h2 className="text-lg font-bold text-slate-800">Job Recommendations</h2>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
                        <Clock className="w-3 h-3" />
                        Coming Soon
                    </span>
                </div>

                <div className="bg-white rounded-2xl border border-dashed border-violet-200 p-8 text-center">
                    <div className="w-14 h-14 bg-violet-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <UserCircle className="w-7 h-7 text-violet-500" />
                    </div>
                    <h3 className="font-bold text-slate-900 mb-2">Unlock personalised job recommendations</h3>
                    <p className="text-sm text-slate-500 max-w-sm mx-auto leading-relaxed mb-5">
                        Publish your recruiter profile with your desired roles, salary range, and working conditions — we&apos;ll match you with relevant opportunities as they become available.
                    </p>
                    <Link
                        href={`/${locale}/profile/private`}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-violet-600 text-white text-sm font-bold rounded-xl hover:bg-violet-700 transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5"
                    >
                        <Sparkles className="w-4 h-4" />
                        Set up your profile
                        <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                </div>
            </section>
        );
    }

    /* ── Published profile → personalised cards ── */

    const desiredRoles = (profile.desiredRoles || [])
        .filter(r => r.role?.trim())
        .slice(0, 3)
        .map(r => r.role.trim());

    const fallback = ORIENTATION_ROLE_DEFAULTS[profile.orientation || ''] || ORIENTATION_ROLE_DEFAULTS['balanced'];
    const roleLabels = desiredRoles.length > 0 ? desiredRoles : fallback.slice(0, 3);
    const salary = salaryLabel(profile);
    const conditions = profile.workingConditions?.trim() || null;

    return (
        <section className="space-y-4">
            {/* Section header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
                        <Briefcase className="w-4 h-4 text-violet-600" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">Job Recommendations</h2>
                        <p className="text-[11px] text-slate-500 mt-0.5">Based on your active profile</p>
                    </div>
                </div>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
                    <Clock className="w-3 h-3" />
                    Coming Soon
                </span>
            </div>

            {/* Profile criteria summary */}
            <div className="flex flex-wrap gap-2">
                {orientationMeta && (
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-full ${orientationMeta.bg} ${orientationMeta.color}`}>
                        <orientationMeta.icon className="w-3 h-3" />
                        {orientationMeta.label}
                    </span>
                )}
                {salary && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full">
                        <DollarSign className="w-3 h-3" />
                        {salary}
                    </span>
                )}
                {conditions && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 bg-white border border-slate-200 px-3 py-1 rounded-full">
                        <MapPin className="w-3 h-3" />
                        {conditions.length > 35 ? conditions.slice(0, 35) + '…' : conditions}
                    </span>
                )}
            </div>

            {/* Job cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {roleLabels.map((role, i) => (
                    <PlaceholderJobCard
                        key={i}
                        roleTitle={role}
                        salary={salary}
                        conditions={conditions}
                        orientationMeta={orientationMeta}
                    />
                ))}
            </div>

            {/* Explanation banner */}
            <div className="bg-linear-to-r from-violet-50 to-indigo-50 rounded-xl border border-violet-100 p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-violet-100 flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4 text-violet-600" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900">Job matching is on its way</p>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                        We&apos;re building a job board where companies post roles matched to profiles like yours. Keep your criteria up to date for the best results.
                    </p>
                </div>
                <Link
                    href={`/${locale}/profile/private`}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-violet-700 bg-white border border-violet-200 rounded-xl hover:bg-violet-50 transition-colors shrink-0"
                >
                    Update profile
                    <ArrowRight className="w-3 h-3" />
                </Link>
            </div>
        </section>
    );
}
