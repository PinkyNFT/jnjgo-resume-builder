'use client';

import React, { useState, useEffect } from 'react';
import { Users, FileText, BarChart3, TrendingUp, Loader2, RefreshCw } from 'lucide-react';

interface Stats {
    users: { total: number; admins: number };
    projects: { total: number; completed: number; draft: number; interviewing: number; avgScore: number };
    recentActivity: { _id: string; count: number }[];
    roleDistribution: Record<string, number>;
}

export function AdminOverview() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchStats = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await fetch('/api/admin/stats');
            if (!res.ok) throw new Error('Failed to fetch stats');
            const data = await res.json();
            setStats(data.stats);
        } catch (err) {
            setError('Failed to load statistics');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchStats(); }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
            </div>
        );
    }

    if (error || !stats) {
        return (
            <div className="text-center py-20 space-y-4">
                <p className="text-red-500">{error}</p>
                <button onClick={fetchStats} className="text-indigo-600 hover:underline">Retry</button>
            </div>
        );
    }

    const statCards = [
        { label: 'Total Users', value: stats.users.total, icon: Users, color: 'bg-blue-50 text-blue-600', border: 'border-blue-100' },
        { label: 'Admin Users', value: stats.users.admins, icon: Users, color: 'bg-purple-50 text-purple-600', border: 'border-purple-100' },
        { label: 'Total Projects', value: stats.projects.total, icon: FileText, color: 'bg-indigo-50 text-indigo-600', border: 'border-indigo-100' },
        { label: 'Completed', value: stats.projects.completed, icon: BarChart3, color: 'bg-green-50 text-green-600', border: 'border-green-100' },
        { label: 'In Progress', value: stats.projects.draft + stats.projects.interviewing, icon: TrendingUp, color: 'bg-amber-50 text-amber-600', border: 'border-amber-100' },
        { label: 'Avg Score', value: stats.projects.avgScore || '—', icon: BarChart3, color: 'bg-pink-50 text-pink-600', border: 'border-pink-100' },
    ];

    return (
        <div className="space-y-6">
            {/* Heading */}
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">System Overview</h2>
                <button
                    onClick={fetchStats}
                    className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                </button>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                {statCards.map((card, i) => (
                    <div key={i} className={`bg-white rounded-xl border ${card.border} p-5`}>
                        <div className={`w-10 h-10 rounded-xl ${card.color} flex items-center justify-center mb-3`}>
                            <card.icon className="w-5 h-5" />
                        </div>
                        <div className="text-2xl font-black text-slate-900">{card.value}</div>
                        <div className="text-xs font-medium text-slate-600 uppercase tracking-wide mt-1">{card.label}</div>
                    </div>
                ))}
            </div>

            {/* Activity Chart (simple bar representation) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <h3 className="text-sm font-semibold text-slate-900 mb-4">Projects Created (Last 7 Days)</h3>
                    {stats.recentActivity.length === 0 ? (
                        <p className="text-sm text-slate-500 py-8 text-center">No activity in the last 7 days</p>
                    ) : (
                        <div className="space-y-2">
                            {stats.recentActivity.map((day) => {
                                const maxCount = Math.max(...stats.recentActivity.map(d => d.count), 1);
                                const width = (day.count / maxCount) * 100;
                                return (
                                    <div key={day._id} className="flex items-center gap-3">
                                        <span className="text-xs text-slate-600 w-20 shrink-0">{day._id}</span>
                                        <div className="flex-1 bg-slate-100 rounded-full h-6 overflow-hidden">
                                            <div
                                                className="bg-indigo-500 h-full rounded-full flex items-center justify-end pr-2 transition-all"
                                                style={{ width: `${Math.max(width, 8)}%` }}
                                            >
                                                <span className="text-xs font-bold text-white">{day.count}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <h3 className="text-sm font-semibold text-slate-900 mb-4">Role Distribution</h3>
                    {Object.keys(stats.roleDistribution).length === 0 ? (
                        <p className="text-sm text-slate-500 py-8 text-center">No projects yet</p>
                    ) : (
                        <div className="space-y-3">
                            {Object.entries(stats.roleDistribution).map(([role, count]) => {
                                const total = Object.values(stats.roleDistribution).reduce((a, b) => a + b, 0);
                                const pct = Math.round((count / total) * 100);
                                const colors: Record<string, string> = {
                                    consultant: 'bg-blue-500',
                                    senior_engineer: 'bg-green-500',
                                    general: 'bg-amber-500'
                                };
                                return (
                                    <div key={role}>
                                        <div className="flex items-center justify-between text-sm mb-1">
                                            <span className="text-slate-700 capitalize">{role.replace('_', ' ')}</span>
                                            <span className="text-slate-600">{count} ({pct}%)</span>
                                        </div>
                                        <div className="bg-slate-100 rounded-full h-3 overflow-hidden">
                                            <div
                                                className={`${colors[role] || 'bg-indigo-500'} h-full rounded-full transition-all`}
                                                style={{ width: `${pct}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
