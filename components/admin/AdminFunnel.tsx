'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    Loader2, TrendingUp, TrendingDown, ArrowRight, Copy, Eye, UserPlus, Send, Bookmark,
    BarChart3, RefreshCw, Globe, Linkedin, Building2
} from 'lucide-react';

interface FunnelMetrics {
    exports: {
        total: number;
        withLink: number;
        last7d: number;
        last30d: number;
    };
    pageViews: {
        total: number;
        authenticated: number;
        uniqueRecruiters: number;
        last7d: number;
        last30d: number;
    };
    recruiters: {
        total: number;
        approved: number;
        pending: number;
    };
    actions: {
        scouts: number;
        saves: number;
    };
    conversionRates: {
        exportToClickRate: number;
        clickToViewRate: number;
        viewToSignupRate: number;
        signupToScoutRate: number;
    };
    platformBreakdown: Array<{
        platform: string;
        total: number;
        withLink: number;
        linkRate: number;
    }>;
    funnelTimeline: Array<{
        date: string;
        exports: number;
        exportsWithLink: number;
        pageViews: number;
        scouts: number;
    }>;
}

const PLATFORM_META: Record<string, { label: string; icon: typeof Globe; color: string; bg: string }> = {
    bizreach: { label: 'BizReach', icon: Building2, color: 'text-blue-600', bg: 'bg-blue-50' },
    linkedin: { label: 'LinkedIn', icon: Linkedin, color: 'text-sky-600', bg: 'bg-sky-50' },
    default: { label: 'Other', icon: Globe, color: 'text-slate-600', bg: 'bg-slate-50' },
};

export default function AdminFunnel() {
    const [metrics, setMetrics] = useState<FunnelMetrics | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchMetrics = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/admin/stats');
            if (!res.ok) throw new Error('Failed to fetch funnel metrics');
            const data = await res.json();
            setMetrics(data.funnelMetrics);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchMetrics();
    }, [fetchMetrics]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
                <p className="text-red-600 mb-4">{error}</p>
                <button
                    onClick={fetchMetrics}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                    <RefreshCw className="w-4 h-4" /> Retry
                </button>
            </div>
        );
    }

    if (!metrics) return null;

    const funnelStages = [
        {
            label: 'Resume Exports',
            value: metrics.exports.total,
            subLabel: `${metrics.exports.last7d} last 7d`,
            icon: Copy,
            color: 'bg-blue-50 text-blue-600',
            border: 'border-blue-100',
        },
        {
            label: 'With Link',
            value: metrics.exports.withLink,
            subLabel: `${metrics.conversionRates.exportToClickRate}% include link`,
            icon: TrendingUp,
            color: 'bg-indigo-50 text-indigo-600',
            border: 'border-indigo-100',
        },
        {
            label: 'Page Views',
            value: metrics.pageViews.total,
            subLabel: `${metrics.pageViews.last7d} last 7d`,
            icon: Eye,
            color: 'bg-purple-50 text-purple-600',
            border: 'border-purple-100',
        },
        {
            label: 'Recruiter Signups',
            value: metrics.recruiters.total,
            subLabel: `${metrics.recruiters.approved} approved`,
            icon: UserPlus,
            color: 'bg-emerald-50 text-emerald-600',
            border: 'border-emerald-100',
        },
        {
            label: 'Scout Actions',
            value: metrics.actions.scouts,
            subLabel: `${metrics.actions.saves} saves`,
            icon: Send,
            color: 'bg-amber-50 text-amber-600',
            border: 'border-amber-100',
        },
    ];

    // Calculate max values for timeline chart
    const maxExports = Math.max(...metrics.funnelTimeline.map(d => d.exports), 1);
    const maxPageViews = Math.max(...metrics.funnelTimeline.map(d => d.pageViews), 1);
    const maxScouts = Math.max(...metrics.funnelTimeline.map(d => d.scouts), 1);

    return (
        <div className="space-y-8">
            {/* Funnel Visualization */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">Conversion Funnel</h3>
                        <p className="text-sm text-slate-500 mt-1">Growth loop performance metrics</p>
                    </div>
                    <button
                        onClick={fetchMetrics}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                    >
                        <RefreshCw className="w-3.5 h-3.5" /> Refresh
                    </button>
                </div>

                {/* Horizontal Funnel */}
                <div className="flex items-stretch gap-2 overflow-x-auto pb-2">
                    {funnelStages.map((stage, i) => (
                        <div key={stage.label} className="flex items-center">
                            <div className={`bg-white rounded-xl border ${stage.border} p-4 min-w-[140px] flex-shrink-0`}>
                                <div className={`w-10 h-10 rounded-xl ${stage.color} flex items-center justify-center mb-3`}>
                                    <stage.icon className="w-5 h-5" />
                                </div>
                                <div className="text-2xl font-black text-slate-900 tabular-nums">
                                    {stage.value.toLocaleString()}
                                </div>
                                <div className="text-xs font-medium text-slate-600 mt-1">{stage.label}</div>
                                <div className="text-[10px] text-slate-400 mt-0.5">{stage.subLabel}</div>
                            </div>
                            {i < funnelStages.length - 1 && (
                                <div className="flex flex-col items-center px-2 text-slate-300">
                                    <ArrowRight className="w-5 h-5" />
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Conversion Rate Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100">
                    {[
                        { label: 'Export → Link', rate: metrics.conversionRates.exportToClickRate, good: 30 },
                        { label: 'Link → View', rate: metrics.conversionRates.clickToViewRate, good: 50 },
                        { label: 'View → Signup', rate: metrics.conversionRates.viewToSignupRate, good: 10 },
                        { label: 'Signup → Scout', rate: metrics.conversionRates.signupToScoutRate, good: 20 },
                    ].map((conv) => {
                        const isGood = conv.rate >= conv.good;
                        return (
                            <div key={conv.label} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isGood ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                                    {isGood ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                                </div>
                                <div>
                                    <div className="text-lg font-bold text-slate-900">{conv.rate}%</div>
                                    <div className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">{conv.label}</div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Timeline Chart */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
                <div className="flex items-center gap-3 mb-6">
                    <BarChart3 className="w-5 h-5 text-indigo-600" />
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">30-Day Trend</h3>
                        <p className="text-sm text-slate-500">Daily funnel activity</p>
                    </div>
                </div>

                {/* Legend */}
                <div className="flex flex-wrap gap-4 mb-4 text-xs">
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-blue-500" />
                        <span className="text-slate-600">Exports</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-purple-500" />
                        <span className="text-slate-600">Page Views</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-amber-500" />
                        <span className="text-slate-600">Scouts</span>
                    </div>
                </div>

                {/* Chart */}
                <div className="relative h-48 flex items-stretch gap-[2px]">
                    {metrics.funnelTimeline.map((day, i) => {
                        const exportHeight = (day.exports / maxExports) * 100;
                        const pageViewHeight = (day.pageViews / maxPageViews) * 100;
                        const scoutHeight = (day.scouts / maxScouts) * 100;
                        const isWeekend = new Date(day.date).getDay() % 6 === 0;

                        return (
                            <div
                                key={day.date}
                                className={`flex-1 flex flex-col items-center gap-0.5 group relative ${isWeekend ? 'opacity-60' : ''}`}
                            >
                                {/* Tooltip */}
                                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                    <div className="bg-slate-900 text-white text-[10px] px-2 py-1.5 rounded-lg whitespace-nowrap shadow-lg">
                                        <div className="font-medium mb-1">{day.date}</div>
                                        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-400" />{day.exports} exports</div>
                                        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-purple-400" />{day.pageViews} views</div>
                                        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-400" />{day.scouts} scouts</div>
                                    </div>
                                </div>

                                {/* Bars */}
                                <div className="flex-1 w-full flex items-end gap-[1px]">
                                    <div
                                        className="flex-1 bg-blue-500 rounded-t-sm transition-all hover:bg-blue-600"
                                        style={{ height: `${Math.max(exportHeight, 2)}%` }}
                                    />
                                    <div
                                        className="flex-1 bg-purple-500 rounded-t-sm transition-all hover:bg-purple-600"
                                        style={{ height: `${Math.max(pageViewHeight, 2)}%` }}
                                    />
                                    <div
                                        className="flex-1 bg-amber-500 rounded-t-sm transition-all hover:bg-amber-600"
                                        style={{ height: `${Math.max(scoutHeight, 2)}%` }}
                                    />
                                </div>

                                {/* X-axis labels (every 7 days) */}
                                {i % 7 === 0 && (
                                    <div className="text-[9px] text-slate-400 mt-1 whitespace-nowrap">
                                        {day.date.slice(5)}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Platform Breakdown */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
                <div className="flex items-center gap-3 mb-6">
                    <Globe className="w-5 h-5 text-indigo-600" />
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">Platform Breakdown</h3>
                        <p className="text-sm text-slate-500">Export performance by platform</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {metrics.platformBreakdown.map((platform) => {
                        const meta = PLATFORM_META[platform.platform] || PLATFORM_META.default;
                        const PlatformIcon = meta.icon;
                        const maxTotal = Math.max(...metrics.platformBreakdown.map(p => p.total), 1);
                        const barWidth = (platform.total / maxTotal) * 100;

                        return (
                            <div key={platform.platform} className={`rounded-xl border ${meta.bg.replace('bg-', 'border-').replace('50', '200')} p-4`}>
                                <div className="flex items-center gap-3 mb-3">
                                    <div className={`w-10 h-10 rounded-xl ${meta.bg} flex items-center justify-center`}>
                                        <PlatformIcon className={`w-5 h-5 ${meta.color}`} />
                                    </div>
                                    <div>
                                        <div className="text-sm font-bold text-slate-900">{meta.label}</div>
                                        <div className="text-xs text-slate-500">{platform.platform}</div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-slate-600">Total Exports</span>
                                        <span className="font-bold text-slate-900">{platform.total.toLocaleString()}</span>
                                    </div>
                                    <div className="bg-slate-100 rounded-full h-2 overflow-hidden">
                                        <div
                                            className={`h-full rounded-full ${meta.bg.replace('50', '500')}`}
                                            style={{ width: `${barWidth}%` }}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-slate-500">With Link</span>
                                        <span className="font-medium text-slate-700">
                                            {platform.withLink.toLocaleString()} ({platform.linkRate}%)
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Unique Recruiters', value: metrics.pageViews.uniqueRecruiters, icon: UserPlus, color: 'bg-emerald-50 text-emerald-600', border: 'border-emerald-100' },
                    { label: 'Pending Recruiters', value: metrics.recruiters.pending, icon: Loader2, color: 'bg-amber-50 text-amber-600', border: 'border-amber-100' },
                    { label: 'Auth Page Views', value: metrics.pageViews.authenticated, icon: Eye, color: 'bg-purple-50 text-purple-600', border: 'border-purple-100' },
                    { label: 'Saved Candidates', value: metrics.actions.saves, icon: Bookmark, color: 'bg-pink-50 text-pink-600', border: 'border-pink-100' },
                ].map((stat) => (
                    <div key={stat.label} className={`bg-white rounded-xl border ${stat.border} p-5`}>
                        <div className={`w-10 h-10 rounded-xl ${stat.color} flex items-center justify-center mb-3`}>
                            <stat.icon className="w-5 h-5" />
                        </div>
                        <div className="text-2xl font-black text-slate-900 tabular-nums">{stat.value.toLocaleString()}</div>
                        <div className="text-xs font-medium text-slate-600 uppercase tracking-wide mt-1">{stat.label}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}
