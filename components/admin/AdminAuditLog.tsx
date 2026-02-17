'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, Shield, ChevronLeft, ChevronRight, Filter, Clock, User, Settings, FileText } from 'lucide-react';

interface AuditLog {
    _id: string;
    userId: string;
    userEmail: string;
    action: string;
    resource: string;
    details: Record<string, unknown>;
    ipAddress?: string;
    createdAt: string;
}

interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

const ACTION_ICONS: Record<string, { icon: React.ElementType; color: string }> = {
    'settings': { icon: Settings, color: 'bg-blue-100 text-blue-600' },
    'prompt': { icon: FileText, color: 'bg-purple-100 text-purple-600' },
    'user': { icon: User, color: 'bg-green-100 text-green-600' },
};

function getActionDisplay(action: string) {
    const prefix = action.split('.')[0];
    return ACTION_ICONS[prefix] || { icon: Shield, color: 'bg-slate-100 text-slate-600' };
}

export function AdminAuditLog() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 30, total: 0, totalPages: 0 });
    const [loading, setLoading] = useState(true);
    const [actionFilter, setActionFilter] = useState('');

    const fetchLogs = useCallback(async (page = 1, action = '') => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page: String(page), limit: '30' });
            if (action) params.set('action', action);
            const res = await fetch(`/api/admin/audit?${params}`);
            if (!res.ok) throw new Error('Failed to fetch');
            const data = await res.json();
            setLogs(data.logs);
            setPagination(data.pagination);
        } catch {
            setLogs([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchLogs(); }, [fetchLogs]);

    const handleFilter = (action: string) => {
        setActionFilter(action);
        fetchLogs(1, action);
    };

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
    };

    const formatDetails = (details: Record<string, unknown>) => {
        if (!details || Object.keys(details).length === 0) return null;
        return Object.entries(details)
            .filter(([, v]) => v !== undefined && v !== null)
            .map(([key, value]) => {
                const display = typeof value === 'object' ? JSON.stringify(value) : String(value);
                return `${key}: ${display.length > 60 ? display.slice(0, 60) + '...' : display}`;
            })
            .join(' | ');
    };

    const filters = [
        { label: 'All', value: '' },
        { label: 'Settings', value: 'settings' },
        { label: 'Prompts', value: 'prompt' },
        { label: 'Users', value: 'user' },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-lg font-bold text-slate-900">Audit Log</h2>
                <p className="text-sm text-slate-600 mt-1">
                    Track all admin actions. Logs are automatically purged after 90 days.
                </p>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-500" />
                {filters.map(f => (
                    <button
                        key={f.value}
                        onClick={() => handleFilter(f.value)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${actionFilter === f.value
                            ? 'bg-indigo-600 text-white'
                            : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {/* Log list */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                </div>
            ) : logs.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
                    <Shield className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                    <p className="text-slate-600">No audit logs found</p>
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div className="divide-y divide-slate-200">
                        {logs.map(log => {
                            const actionDisplay = getActionDisplay(log.action);
                            const ActionIcon = actionDisplay.icon;
                            const detailsStr = formatDetails(log.details);
                            return (
                                <div key={log._id} className="px-6 py-4 flex items-start gap-4 hover:bg-slate-50 transition-colors">
                                    <div className={`w-9 h-9 rounded-lg ${actionDisplay.color} flex items-center justify-center shrink-0 mt-0.5`}>
                                        <ActionIcon className="w-4 h-4" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-baseline gap-2 flex-wrap">
                                            <span className="text-sm font-medium text-slate-900">{log.action}</span>
                                            <span className="text-xs text-slate-500 font-mono">{log.resource}</span>
                                        </div>
                                        <p className="text-xs text-slate-600 mt-0.5">
                                            by {log.userEmail}
                                            {log.ipAddress && <span className="ml-2 text-slate-500">IP: {log.ipAddress}</span>}
                                        </p>
                                        {detailsStr && (
                                            <p className="text-xs text-slate-500 mt-1 truncate">{detailsStr}</p>
                                        )}
                                    </div>
                                    <div className="text-xs text-slate-500 flex items-center gap-1 shrink-0 whitespace-nowrap">
                                        <Clock className="w-3.5 h-3.5" />
                                        {formatDate(log.createdAt)}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Pagination */}
                    {pagination.totalPages > 1 && (
                        <div className="border-t border-slate-200 px-6 py-3 flex items-center justify-between bg-slate-50">
                            <p className="text-xs text-slate-600">
                                Showing {((pagination.page - 1) * pagination.limit) + 1}-{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                            </p>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => fetchLogs(pagination.page - 1, actionFilter)}
                                    disabled={pagination.page <= 1}
                                    className="p-1.5 rounded-lg hover:bg-slate-200 disabled:opacity-30 transition-colors"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <span className="text-xs text-slate-600 px-2">
                                    Page {pagination.page} of {pagination.totalPages}
                                </span>
                                <button
                                    onClick={() => fetchLogs(pagination.page + 1, actionFilter)}
                                    disabled={pagination.page >= pagination.totalPages}
                                    className="p-1.5 rounded-lg hover:bg-slate-200 disabled:opacity-30 transition-colors"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
