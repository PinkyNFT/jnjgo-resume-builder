'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    Users, ArrowRight, Zap, TrendingUp, Briefcase, Globe, Clock,
    DollarSign, MapPin, Loader2, Search
} from 'lucide-react';

const ORIENTATION_META: Record<string, { label: string; icon: typeof Zap; color: string; bg: string }> = {
    'tech-driven': { label: 'Tech', icon: Zap, color: 'text-blue-600', bg: 'bg-blue-50' },
    'business-driven': { label: 'Business', icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    'management-driven': { label: 'Management', icon: Briefcase, color: 'text-violet-600', bg: 'bg-violet-50' },
    'balanced': { label: 'Balanced', icon: Globe, color: 'text-amber-600', bg: 'bg-amber-50' },
};

const INTENT_META: Record<string, { badge: string; color: string }> = {
    'now': { badge: 'Now', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
    'within_3_months': { badge: '3m', color: 'text-blue-700 bg-blue-50 border-blue-200' },
    'open_to_offers': { badge: 'Passive', color: 'text-slate-700 bg-slate-100 border-slate-200' },
};

interface SimilarCandidate {
    userId: string;
    fullName: string | null;
    orientation: string | null;
    jobChangeIntent: string | null;
    aiObjectiveReview: string | null;
    desiredSalary: { minimum?: number; target?: number } | null;
    desiredRoles: Array<{ role: string; priority: number }>;
    highlightedResume: {
        currentRole: string | null;
        skills: string[];
    } | null;
    slug: string | null;
    location: string | null;
}

interface SimilarCandidatesProps {
    currentSlug: string;
    orientation?: string;
    locale?: string;
}

export default function SimilarCandidates({ currentSlug, orientation, locale }: SimilarCandidatesProps) {
    const [candidates, setCandidates] = useState<SimilarCandidate[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSimilar = async () => {
            try {
                // Search for candidates with similar orientation if available
                const params = new URLSearchParams({ limit: '3' });
                if (orientation) params.set('search', orientation.replace('-', ' '));
                const res = await fetch(`/api/recruiter/candidates?${params}`);
                if (res.ok) {
                    const data = await res.json();
                    // Filter out the current candidate
                    const filtered = (data.candidates || [])
                        .filter((c: SimilarCandidate) => c.slug !== currentSlug)
                        .slice(0, 3);
                    setCandidates(filtered);
                }
            } catch {
                // silently fail
            } finally {
                setLoading(false);
            }
        };
        fetchSimilar();
    }, [currentSlug, orientation]);

    const formatSalaryShort = (val?: number) =>
        val ? `¥${(val / 10000).toLocaleString()}万` : null;

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
            </div>
        );
    }

    if (candidates.length === 0) return null;

    return (
        <div className="space-y-5">
            {/* Section Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                        <Users className="w-4 h-4 text-indigo-600" />
                    </div>
                    <h3 className="font-bold text-slate-900">Similar Candidates</h3>
                </div>
                <Link
                    href={locale ? `/${locale}/recruiter/dashboard` : '/recruiter/dashboard'}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
                >
                    Browse all
                    <ArrowRight className="w-3 h-3" />
                </Link>
            </div>

            {/* Candidate Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {candidates.map(candidate => {
                    const ori = ORIENTATION_META[candidate.orientation || ''];
                    const intent = INTENT_META[candidate.jobChangeIntent || ''];
                    const OrientationIcon = ori?.icon || Globe;
                    const salaryMin = formatSalaryShort(candidate.desiredSalary?.minimum);
                    const salaryTarget = formatSalaryShort(candidate.desiredSalary?.target);

                    return (
                        <Link
                            key={candidate.userId}
                            href={candidate.slug ? `/c/${candidate.slug}` : '#'}
                            className="group bg-white rounded-xl border border-slate-200/80 p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                        >
                            <div className="flex items-start justify-between mb-2">
                                <div className="min-w-0 flex-1">
                                    <h4 className="font-semibold text-slate-900 text-sm truncate">
                                        {candidate.fullName || 'Anonymous'}
                                    </h4>
                                    {candidate.highlightedResume?.currentRole && (
                                        <p className="text-[11px] text-slate-500 truncate mt-0.5">
                                            {candidate.highlightedResume.currentRole}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Badges */}
                            <div className="flex flex-wrap gap-1 mb-2">
                                {ori && (
                                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${ori.bg} ${ori.color}`}>
                                        <OrientationIcon className="w-2.5 h-2.5" />
                                        {ori.label}
                                    </span>
                                )}
                                {intent && (
                                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${intent.color}`}>
                                        <Clock className="w-2.5 h-2.5" />
                                        {intent.badge}
                                    </span>
                                )}
                            </div>

                            {/* AI Summary */}
                            {candidate.aiObjectiveReview && (
                                <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2 mb-2">
                                    {candidate.aiObjectiveReview}
                                </p>
                            )}

                            {/* Salary */}
                            {(salaryMin || salaryTarget) && (
                                <div className="flex items-center gap-1 text-[11px] text-slate-500">
                                    <DollarSign className="w-3 h-3 text-green-500" />
                                    <span className="font-medium text-slate-600">
                                        {salaryMin && salaryTarget
                                            ? `${salaryMin} ~ ${salaryTarget}`
                                            : salaryMin || salaryTarget}
                                    </span>
                                </div>
                            )}

                            {/* View link */}
                            <div className="mt-3 pt-2 border-t border-slate-100 flex items-center gap-1 text-[11px] font-semibold text-indigo-600 group-hover:text-indigo-700">
                                View Profile <ArrowRight className="w-3 h-3" />
                            </div>
                        </Link>
                    );
                })}
            </div>

            {/* Explore CTA */}
            <div className="bg-slate-50 rounded-xl border border-slate-200/60 p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <Search className="w-5 h-5 text-slate-400" />
                    <p className="text-sm text-slate-600">
                        Discover more candidates by skills, role, or salary range
                    </p>
                </div>
                <Link
                    href={locale ? `/${locale}/recruiter/dashboard` : '/recruiter/dashboard'}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold text-indigo-600 bg-white border border-indigo-200 rounded-xl hover:bg-indigo-50 transition-colors shrink-0"
                >
                    Start Search
                    <ArrowRight className="w-3.5 h-3.5" />
                </Link>
            </div>
        </div>
    );
}
