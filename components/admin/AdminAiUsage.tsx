'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, DollarSign, Zap, CheckCircle2, RefreshCw, Cpu } from 'lucide-react';

interface AiUsageData {
    totals: {
        calls: number;
        successCalls: number;
        successRate: number;
        inputTokens: number;
        outputTokens: number;
        estimatedCostUsd: number;
    };
    last7d: { calls: number; estimatedCostUsd: number };
    byRoute: Array<{ route: string; calls: number; successCalls: number; estimatedCostUsd: number }>;
    byModel: Array<{ model: string; calls: number; inputTokens: number; outputTokens: number; estimatedCostUsd: number }>;
    topUsers: Array<{ userId: string; name: string | null; email: string | null; calls: number; estimatedCostUsd: number }>;
    timeline: Array<{ date: string; calls: number; estimatedCostUsd: number }>;
}

function usd(n: number): string {
    return '$' + n.toFixed(n < 1 ? 4 : 2);
}

export default function AdminAiUsage() {
    const [data, setData] = useState<AiUsageData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/admin/ai-usage');
            if (!res.ok) throw new Error('Failed to fetch AI usage');
            setData(await res.json());
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="text-center py-20 space-y-4">
                <p className="text-red-500">{error}</p>
                <button onClick={fetchData} className="text-indigo-600 hover:underline">Retry</button>
            </div>
        );
    }

    const statCards = [
        { label: 'Est. Cost (All Time)', value: usd(data.totals.estimatedCostUsd), icon: DollarSign, color: 'bg-emerald-50 text-emerald-600', border: 'border-emerald-100' },
        { label: 'Est. Cost (7d)', value: usd(data.last7d.estimatedCostUsd), icon: DollarSign, color: 'bg-teal-50 text-teal-600', border: 'border-teal-100' },
        { label: 'Total AI Calls', value: data.totals.calls.toLocaleString(), icon: Zap, color: 'bg-indigo-50 text-indigo-600', border: 'border-indigo-100' },
        { label: 'Success Rate', value: data.totals.successRate + '%', icon: CheckCircle2, color: 'bg-blue-50 text-blue-600', border: 'border-blue-100' },
        { label: 'Cost / Call (avg)', value: data.totals.calls > 0 ? usd(data.totals.estimatedCostUsd / data.totals.calls) : '—', icon: Cpu, color: 'bg-amber-50 text-amber-600', border: 'border-amber-100' },
    ];

    const maxDailyCost = Math.max(...data.timeline.map(d => d.estimatedCostUsd), 0.0001);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-bold text-slate-900">AI Cost & Usage</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                        Estimates only — see lib/ai-pricing.ts. Verify against the actual GCP invoice before using these numbers to set prices.
                    </p>
                </div>
                <button
                    onClick={fetchData}
                    className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                </button>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                {statCards.map((card, i) => (
                    <div key={i} className={"bg-white rounded-xl border p-5 " + card.border}>
                        <div className={"w-10 h-10 rounded-xl flex items-center justify-center mb-3 " + card.color}>
                            <card.icon className="w-5 h-5" />
                        </div>
                        <div className="text-2xl font-black text-slate-900">{card.value}</div>
                        <div className="text-xs font-medium text-slate-600 uppercase tracking-wide mt-1">{card.label}</div>
                    </div>
                ))}
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="text-sm font-semibold text-slate-900 mb-4">Daily Cost (Last 30 Days)</h3>
                <div className="flex items-end gap-1 h-32">
                    {data.timeline.map((day) => {
                        const heightPct = Math.max((day.estimatedCostUsd / maxDailyCost) * 100, day.calls > 0 ? 4 : 1);
                        return (
                            <div key={day.date} className="flex-1 flex flex-col items-center justify-end gap-1 group relative">
                                <div
                                    className="w-full bg-indigo-500 rounded-t hover:bg-indigo-600 transition-colors"
                                    style={{ height: heightPct + '%' }}
                                />
                                <div className="hidden group-hover:block absolute bottom-full mb-1 px-2 py-1 bg-slate-900 text-white text-xs rounded whitespace-nowrap z-10">
                                    {day.date}: {usd(day.estimatedCostUsd)} ({day.calls} calls)
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <h3 className="text-sm font-semibold text-slate-900 mb-4">Cost by Route (30d)</h3>
                    {data.byRoute.length === 0 ? (
                        <p className="text-sm text-slate-500 py-8 text-center">No AI calls in the last 30 days</p>
                    ) : (
                        <div className="space-y-3">
                            {data.byRoute.map((r) => {
                                const failRate = r.calls > 0 ? Math.round(((r.calls - r.successCalls) / r.calls) * 100) : 0;
                                return (
                                    <div key={r.route} className="flex items-center justify-between text-sm">
                                        <div className="min-w-0">
                                            <span className="text-slate-700 font-mono text-xs">{r.route}</span>
                                            {failRate > 0 && <span className="ml-2 text-xs text-red-500">{failRate}% failed</span>}
                                        </div>
                                        <div className="flex items-center gap-3 shrink-0">
                                            <span className="text-slate-500">{r.calls} calls</span>
                                            <span className="text-slate-900 font-semibold w-16 text-right">{usd(r.estimatedCostUsd)}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <h3 className="text-sm font-semibold text-slate-900 mb-4">Cost by Model (30d)</h3>
                    {data.byModel.length === 0 ? (
                        <p className="text-sm text-slate-500 py-8 text-center">No AI calls in the last 30 days</p>
                    ) : (
                        <div className="space-y-3">
                            {data.byModel.map((m) => (
                                <div key={m.model} className="flex items-center justify-between text-sm">
                                    <span className="text-slate-700 font-mono text-xs truncate">{m.model}</span>
                                    <div className="flex items-center gap-3 shrink-0">
                                        <span className="text-slate-500">{m.calls} calls</span>
                                        <span className="text-slate-900 font-semibold w-16 text-right">{usd(m.estimatedCostUsd)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="text-sm font-semibold text-slate-900 mb-4">Top 10 Users by Cost (30d)</h3>
                {data.topUsers.length === 0 ? (
                    <p className="text-sm text-slate-500 py-8 text-center">No attributed usage in the last 30 days</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-xs text-slate-500 uppercase tracking-wide border-b border-slate-100">
                                    <th className="pb-2 font-medium">User</th>
                                    <th className="pb-2 font-medium text-right">Calls</th>
                                    <th className="pb-2 font-medium text-right">Est. Cost</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.topUsers.map((u) => (
                                    <tr key={u.userId} className="border-b border-slate-50 last:border-0">
                                        <td className="py-2">
                                            <div className="text-slate-900">{u.name || 'Unnamed'}</div>
                                            <div className="text-xs text-slate-500">{u.email || u.userId}</div>
                                        </td>
                                        <td className="py-2 text-right text-slate-600">{u.calls}</td>
                                        <td className="py-2 text-right font-semibold text-slate-900">{usd(u.estimatedCostUsd)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
