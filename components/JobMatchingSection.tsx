'use client';

import React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
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

// Message keys under JobMatching (placeholder role titles per orientation)
const ORIENTATION_ROLE_DEFAULTS: Record<string, string[]> = {
    'tech-driven':        ['roleBackendEngineer',       'roleSoftwareEngineer',     'roleTechLead'],
    'business-driven':   ['roleBusinessDevelopment',    'roleProductManager',       'roleStrategyConsultant'],
    'management-driven': ['roleEngineeringManager',     'roleVpEngineering',        'roleCto'],
    'balanced':          ['roleFullStackEngineer',      'roleTechnicalPm',          'roleSolutionsArchitect'],
};

// labelKey → PrivateProfile.<labelKey>
const ORIENTATION_META: Record<string, { labelKey: string; icon: React.ElementType; color: string; bg: string }> = {
    'tech-driven':        { labelKey: 'orientationTech',       icon: Zap,         color: 'text-blue-600',    bg: 'bg-blue-50' },
    'business-driven':   { labelKey: 'orientationBusiness',   icon: TrendingUp,  color: 'text-emerald-600', bg: 'bg-emerald-50' },
    'management-driven': { labelKey: 'orientationManagement', icon: Briefcase,   color: 'text-violet-600',  bg: 'bg-violet-50' },
    'balanced':          { labelKey: 'orientationBalanced',   icon: Globe,       color: 'text-amber-600',   bg: 'bg-amber-50' },
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
    const t = useTranslations('JobMatching');
    const tProfile = useTranslations('PrivateProfile');
    const OrientationIcon = orientationMeta?.icon || Briefcase;

    return (
        <div className="relative bg-white rounded-2xl border border-slate-200/80 p-5 flex flex-col gap-3 overflow-hidden group">

            {/* Coming Soon badge */}
            <div className="absolute top-3.5 right-3.5">
                <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    <Clock className="w-2.5 h-2.5" />
                    {t('soon')}
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
                        {tProfile(orientationMeta.labelKey)}
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
    const t = useTranslations('JobMatching');
    const tProfile = useTranslations('PrivateProfile');
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
                        <h2 className="text-lg font-bold text-slate-800">{t('title')}</h2>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
                        <Clock className="w-3 h-3" />
                        {t('comingSoon')}
                    </span>
                </div>

                <div className="bg-white rounded-2xl border border-dashed border-violet-200 p-8 text-center">
                    <div className="w-14 h-14 bg-violet-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <UserCircle className="w-7 h-7 text-violet-500" />
                    </div>
                    <h3 className="font-bold text-slate-900 mb-2">{t('unlockTitle')}</h3>
                    <p className="text-sm text-slate-500 max-w-sm mx-auto leading-relaxed mb-5">
                        {t('unlockDesc')}
                    </p>
                    <Link
                        href={`/${locale}/profile/private`}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-violet-600 text-white text-sm font-bold rounded-xl hover:bg-violet-700 transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5"
                    >
                        <Sparkles className="w-4 h-4" />
                        {t('setUpProfile')}
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
    const roleLabels = desiredRoles.length > 0 ? desiredRoles : fallback.slice(0, 3).map(key => t(key));
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
                        <h2 className="text-lg font-bold text-slate-800">{t('title')}</h2>
                        <p className="text-[11px] text-slate-500 mt-0.5">{t('basedOnProfile')}</p>
                    </div>
                </div>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
                    <Clock className="w-3 h-3" />
                    {t('comingSoon')}
                </span>
            </div>

            {/* Profile criteria summary */}
            <div className="flex flex-wrap gap-2">
                {orientationMeta && (
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-full ${orientationMeta.bg} ${orientationMeta.color}`}>
                        <orientationMeta.icon className="w-3 h-3" />
                        {tProfile(orientationMeta.labelKey)}
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
                    <p className="text-sm font-semibold text-slate-900">{t('onItsWay')}</p>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                        {t('onItsWayDesc')}
                    </p>
                </div>
                <Link
                    href={`/${locale}/profile/private`}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-violet-700 bg-white border border-violet-200 rounded-xl hover:bg-violet-50 transition-colors shrink-0"
                >
                    {t('updateProfile')}
                    <ArrowRight className="w-3 h-3" />
                </Link>
            </div>
        </section>
    );
}
