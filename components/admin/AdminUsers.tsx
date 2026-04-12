'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
    Loader2, Search, Shield, ShieldOff, Users as UsersIcon,
    ChevronLeft, ChevronRight, FileText, MapPin, Mail,
    UserCheck, Briefcase, X, CheckCircle2, XCircle,
    Clock, Building2, Globe, Phone, AlertTriangle, Eye,
    Filter, Sparkles
} from 'lucide-react';
import { ConfirmDialog } from '../ui/ConfirmDialog';

interface UserData {
    userId: string;
    fullName: string;
    email: string;
    location: string;
    createdAt: string;
    updatedAt: string;
    duplicateCount?: number;
    projectStats?: {
        count: number;
        completed: number;
        lastActivity: number;
    };
    isAdmin: boolean;
    adminRole?: string;
    userRole?: 'candidate' | 'recruiter' | 'pending_recruiter' | null;
    recruiterProfile?: {
        companyName: string;
        jobTitle: string;
        recruiterType?: string;
        industry?: string;
        companyWebsite?: string;
        companySize?: string;
        phone?: string;
    };
}

interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

/* ─── Review Modal ─────────────────────────────────────── */

function RecruiterReviewModal({
    user,
    onClose,
    onApprove,
    onReject,
    loading,
}: {
    user: UserData;
    onClose: () => void;
    onApprove: () => void;
    onReject: () => void;
    loading: boolean;
}) {
    const profile = user.recruiterProfile;
    const isPending = user.userRole === 'pending_recruiter';
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const originalStyle = window.getComputedStyle(document.body).overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = originalStyle;
        };
    }, []);

    if (!mounted) return null;

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-5 bg-slate-900/60 backdrop-blur-sm animate-[fade-in_0.2s_ease-out]">
            {/* Modal Container */}
            <div className="relative w-full max-w-xl bg-white rounded-2xl border border-slate-200 shadow-xl flex flex-col max-h-[90vh] sm:max-h-[85vh] animate-[scale-in_0.3s_cubic-bezier(0.16,1,0.3,1)]">

                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isPending ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
                            {isPending ? <Clock className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900 leading-tight">
                                {isPending ? 'Recruiter Application Review' : 'Recruiter Profile Details'}
                            </h2>
                            <p className="text-xs text-slate-500 mt-0.5">
                                {isPending ? 'Review the submitted details before making a decision.' : 'Detailed information about this recruiter and their company.'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-700 rounded-lg transition-colors shrink-0"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Scrollable Body */}
                <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">

                    {/* User Intro Section */}
                    <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-lg font-bold shrink-0">
                            {(user.fullName || user.email)?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div className="flex-1 min-w-0 pt-0.5">
                            <h3 className="text-base font-bold text-slate-900 truncate">
                                {user.fullName || 'No Name Provided'}
                            </h3>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-1">
                                <span className="flex items-center gap-1.5 text-sm text-slate-600">
                                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                                    {user.email}
                                </span>
                                {isPending && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-700 text-[11px] font-bold w-fit">
                                        <Clock className="w-3 h-3" />
                                        Pending
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Company Information Grid */}
                    <div>
                        <div className="flex items-center gap-2 mb-4 px-1">
                            <Building2 className="w-5 h-5 text-indigo-500" />
                            <h4 className="text-sm font-bold text-slate-900 uppercase tracking-widest">
                                Company Information
                            </h4>
                        </div>

                        {profile ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {/* Details Card */}
                                <div className="p-3.5 rounded-xl bg-slate-50/50 border border-slate-200">
                                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Company</span>
                                    <span className="block text-sm font-bold text-slate-900">{profile.companyName || '—'}</span>
                                </div>

                                <div className="p-3.5 rounded-xl bg-slate-50/50 border border-slate-200">
                                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Position</span>
                                    <span className="block text-sm font-bold text-slate-900">{profile.jobTitle || '—'}</span>
                                </div>

                                <div className="p-3.5 rounded-xl bg-slate-50/50 border border-slate-200">
                                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Recruiter Type</span>
                                    {profile.recruiterType ? (
                                        <span className={`inline-flex items-center text-xs font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${profile.recruiterType === 'in_house'
                                            ? 'bg-blue-50 text-blue-600 border border-blue-200'
                                            : 'bg-amber-50 text-amber-600 border border-amber-200'
                                            }`}>
                                            {profile.recruiterType === 'in_house' ? 'In-House' : 'Agency'}
                                        </span>
                                    ) : (
                                        <span className="text-sm font-bold text-slate-400">—</span>
                                    )}
                                </div>

                                <div className="p-3.5 rounded-xl bg-slate-50/50 border border-slate-200">
                                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Industry</span>
                                    <span className="block text-sm font-bold text-slate-700">{profile.industry || '—'}</span>
                                </div>

                                <div className="p-3.5 rounded-xl bg-slate-50/50 border border-slate-200">
                                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Company Size</span>
                                    <span className="block text-sm font-bold text-slate-700 capitalize">{profile.companySize || '—'}</span>
                                </div>

                                {/* Links/Contacts span full width if needed */}
                                {(profile.companyWebsite || profile.phone) && (
                                    <div className="col-span-1 sm:col-span-2 flex flex-wrap gap-2.5 mt-1">
                                        {profile.companyWebsite && (
                                            <a
                                                href={profile.companyWebsite}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs border border-slate-200 transition-colors"
                                            >
                                                <Globe className="w-3.5 h-3.5 text-slate-400" />
                                                Visit Website
                                            </a>
                                        )}
                                        {profile.phone && (
                                            <div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white text-slate-700 font-semibold text-xs border border-slate-200">
                                                <Phone className="w-3.5 h-3.5 text-slate-400" />
                                                {profile.phone}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center p-8 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                                <AlertTriangle className="w-10 h-10 text-slate-300 mb-3" />
                                <p className="text-slate-500 font-medium">No company details have been submitted yet.</p>
                            </div>
                        )}

                        {/* Footer Meta */}
                        <div className="mt-8 flex items-center justify-end gap-2 text-xs text-slate-400 px-1">
                            <Sparkles className="w-3.5 h-3.5" />
                            Registered {user.createdAt && !isNaN(new Date(user.createdAt).getTime())
                                ? new Date(user.createdAt).toLocaleDateString('en-US', {
                                    year: 'numeric', month: 'long', day: 'numeric',
                                })
                                : 'Recently'}
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-5 border-t border-slate-100 bg-slate-50/80 rounded-b-2xl shrink-0 flex items-center justify-end gap-3">
                    {isPending ? (
                        <>
                            <button
                                onClick={onReject}
                                disabled={loading}
                                className="px-5 py-2.5 rounded-lg border border-red-200 bg-white text-red-600 text-sm font-bold hover:bg-red-50 hover:border-red-300 transition-all disabled:opacity-50 flex items-center gap-2"
                            >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                                Reject
                            </button>
                            <button
                                onClick={onApprove}
                                disabled={loading}
                                className="px-5 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition-all disabled:opacity-50 flex items-center gap-2"
                            >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                Approve Recruiter
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={onClose}
                            className="px-5 py-2.5 rounded-lg bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition-all"
                        >
                            Close
                        </button>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}

/* ─── Success Toast ──────────────────────────────────── */

function ActionToast({ message, type, onDismiss }: { message: string; type: 'success' | 'error'; onDismiss: () => void }) {
    useEffect(() => {
        const t = setTimeout(onDismiss, 4000);
        return () => clearTimeout(t);
    }, [onDismiss]);

    return (
        <div className={`fixed bottom-6 right-6 z-[60] max-w-sm animate-[slide-up_0.3s_ease-out] ${type === 'success'
            ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200/40'
            : 'bg-red-600 text-white shadow-lg shadow-red-200/40'
            } px-5 py-3.5 rounded-xl flex items-center gap-3`}
        >
            {type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 shrink-0" />
            ) : (
                <XCircle className="w-5 h-5 shrink-0" />
            )}
            <span className="text-sm font-semibold">{message}</span>
            <button
                onClick={onDismiss}
                className="ml-auto p-1 opacity-70 hover:opacity-100 transition-opacity"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );
}

/* ─── Main Component ────────────────────────────────── */

export function AdminUsers({ adminRole }: { adminRole: string }) {
    const [users, setUsers] = useState<UserData[]>([]);
    const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
    const [filterPending, setFilterPending] = useState(false);

    // Modal state
    const [reviewUser, setReviewUser] = useState<UserData | null>(null);
    const [modalLoading, setModalLoading] = useState(false);

    // Toast state
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    // Confirm dialog state
    const [pendingConfirm, setPendingConfirm] = useState<{ message: string; onConfirm: () => void } | null>(null);

    const isSuperAdmin = adminRole === 'super_admin';

    const pendingCount = users.filter(u => u.userRole === 'pending_recruiter').length;
    const displayedUsers = filterPending
        ? users.filter(u => u.userRole === 'pending_recruiter')
        : users;

    const fetchUsers = useCallback(async (page = 1, searchQuery = '') => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page: String(page), limit: '20' });
            if (searchQuery) params.set('search', searchQuery);
            const res = await fetch(`/api/admin/users?${params}`);
            if (!res.ok) throw new Error('Failed to fetch');
            const data = await res.json();
            setUsers(data.users);
            setPagination(data.pagination);
        } catch {
            setUsers([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchUsers(); }, [fetchUsers]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setSearch(searchInput);
        fetchUsers(1, searchInput);
    };

    const handleAdminAction = (user: UserData, action: 'grant_admin' | 'revoke_admin' | 'grant_super_admin') => {
        setPendingConfirm({
            message: `Are you sure you want to ${action.replace(/_/g, ' ')} for ${user.email}?`,
            onConfirm: async () => {
                setPendingConfirm(null);
                setActionLoading(prev => ({ ...prev, [user.userId]: true }));
                try {
                    const res = await fetch('/api/admin/users', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userId: user.userId, email: user.email, name: user.fullName, action })
                    });
                    if (!res.ok) {
                        const err = await res.json();
                        throw new Error(err.error || 'Failed');
                    }
                    fetchUsers(pagination.page, search);
                    setToast({ message: `Admin role updated for ${user.fullName || user.email}`, type: 'success' });
                } catch (err: any) {
                    setToast({ message: err.message || 'Failed to update user', type: 'error' });
                } finally {
                    setActionLoading(prev => ({ ...prev, [user.userId]: false }));
                }
            },
        });
    };

    const handleUserRoleChange = (user: UserData, newRole: 'candidate' | 'recruiter' | 'pending_recruiter') => {
        if (user.userRole === newRole) return;
        setPendingConfirm({
            message: `Change ${user.email}'s role to "${newRole}"?`,
            onConfirm: async () => {
                setPendingConfirm(null);
                setActionLoading(prev => ({ ...prev, [`role_${user.userId}`]: true }));
                try {
                    const res = await fetch('/api/admin/users', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userId: user.userId, email: user.email, name: user.fullName, action: 'change_user_role', role: newRole })
                    });
                    if (!res.ok) {
                        const err = await res.json();
                        throw new Error(err.error || 'Failed');
                    }
                    fetchUsers(pagination.page, search);
                    setToast({ message: `Role updated to ${newRole} for ${user.fullName || user.email}`, type: 'success' });
                } catch (err: any) {
                    setToast({ message: err.message || 'Failed to change user role', type: 'error' });
                } finally {
                    setActionLoading(prev => ({ ...prev, [`role_${user.userId}`]: false }));
                }
            },
        });
    };

    const handleModalApprove = async () => {
        if (!reviewUser) return;
        setModalLoading(true);
        try {
            const res = await fetch('/api/admin/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: reviewUser.userId,
                    email: reviewUser.email,
                    name: reviewUser.fullName,
                    action: 'change_user_role',
                    role: 'recruiter'
                })
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed');
            }
            setToast({ message: `${reviewUser.fullName || reviewUser.email} has been approved as a recruiter!`, type: 'success' });
            setReviewUser(null);
            fetchUsers(pagination.page, search);
        } catch (err: any) {
            setToast({ message: err.message || 'Failed to approve', type: 'error' });
        } finally {
            setModalLoading(false);
        }
    };

    const handleModalReject = () => {
        if (!reviewUser) return;
        setPendingConfirm({
            message: `Reject ${reviewUser.fullName || reviewUser.email}'s recruiter application? Their role will be reset to candidate.`,
            onConfirm: async () => {
                setPendingConfirm(null);
                setModalLoading(true);
                try {
                    const res = await fetch('/api/admin/users', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userId: reviewUser.userId, email: reviewUser.email, name: reviewUser.fullName, action: 'change_user_role', role: 'candidate' })
                    });
                    if (!res.ok) {
                        const err = await res.json();
                        throw new Error(err.error || 'Failed');
                    }
                    setToast({ message: `${reviewUser.fullName || reviewUser.email}'s application has been rejected.`, type: 'success' });
                    setReviewUser(null);
                    fetchUsers(pagination.page, search);
                } catch (err: any) {
                    setToast({ message: err.message || 'Failed to reject', type: 'error' });
                } finally {
                    setModalLoading(false);
                }
            },
        });
    };

    const getRoleBadge = (user: UserData) => {
        if (!user.userRole) return <span className="text-xs text-slate-400">Not set</span>;

        const config = {
            recruiter: { label: 'Recruiter', icon: Briefcase, class: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
            pending_recruiter: { label: 'Pending', icon: Clock, class: 'bg-amber-50 text-amber-700 border-amber-200' },
            candidate: { label: 'Candidate', icon: UserCheck, class: 'bg-blue-50 text-blue-700 border-blue-200' },
        }[user.userRole];

        if (!config) return <span className="text-xs text-slate-400">{user.userRole}</span>;

        const Icon = config.icon;
        return (
            <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border ${config.class}`}>
                <Icon className={`w-3 h-3 ${user.userRole === 'pending_recruiter' ? 'animate-spin' : ''}`} />
                {config.label}
            </span>
        );
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-bold text-slate-900">User Management</h2>
                    <p className="text-sm text-slate-600 mt-1">
                        View registered users, their project activity, and manage admin roles.
                        {!isSuperAdmin && <span className="text-amber-600 ml-1">(Super Admin required for role changes)</span>}
                    </p>
                </div>
            </div>

            {/* Pending Approvals Banner */}
            {pendingCount > 0 && (
                <div className="relative overflow-hidden bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 rounded-xl border-2 border-amber-200 p-4 flex items-center justify-between animate-[fade-in_0.3s_ease-out]">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_right,rgba(251,191,36,0.1),transparent_60%)]" />
                    <div className="relative flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center border border-amber-200">
                            <Clock className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-amber-900">
                                {pendingCount} recruiter {pendingCount === 1 ? 'application' : 'applications'} awaiting review
                            </p>
                            <p className="text-xs text-amber-600/80 mt-0.5">
                                Click on a pending user to review their details and approve or reject.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setFilterPending(!filterPending)}
                        className={`relative inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg border transition-all ${filterPending
                            ? 'bg-amber-600 text-white border-amber-600 shadow-lg shadow-amber-200/40'
                            : 'bg-white text-amber-700 border-amber-300 hover:bg-amber-100'
                            }`}
                    >
                        <Filter className="w-3.5 h-3.5" />
                        {filterPending ? 'Show All' : 'Show Pending Only'}
                    </button>
                </div>
            )}

            {/* Search */}
            <form onSubmit={handleSearch} className="flex gap-2">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                        type="text"
                        value={searchInput}
                        onChange={e => setSearchInput(e.target.value)}
                        placeholder="Search by name or email..."
                        className="w-full pl-10 pr-4 py-2.5 text-sm text-slate-800 border border-slate-400 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                </div>
                <button
                    type="submit"
                    className="px-4 py-2.5 text-sm font-medium bg-slate-900 text-white rounded-xl hover:bg-indigo-600 transition-colors"
                >
                    Search
                </button>
            </form>

            {/* User list */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                </div>
            ) : displayedUsers.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
                    <UsersIcon className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                    <p className="text-slate-600">
                        {filterPending
                            ? 'No pending applications right now'
                            : search
                                ? 'No users match your search'
                                : 'No registered users yet'}
                    </p>
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-200 bg-slate-50">
                                    <th className="text-left text-xs font-semibold text-slate-600 uppercase tracking-wide px-6 py-3">User</th>
                                    <th className="text-left text-xs font-semibold text-slate-600 uppercase tracking-wide px-6 py-3">Location</th>
                                    <th className="text-center text-xs font-semibold text-slate-600 uppercase tracking-wide px-6 py-3">Projects</th>
                                    <th className="text-center text-xs font-semibold text-slate-600 uppercase tracking-wide px-6 py-3">Completed</th>
                                    <th className="text-center text-xs font-semibold text-slate-600 uppercase tracking-wide px-6 py-3">User Role</th>
                                    <th className="text-center text-xs font-semibold text-slate-600 uppercase tracking-wide px-6 py-3">Admin</th>
                                    {isSuperAdmin && (
                                        <th className="text-right text-xs font-semibold text-slate-600 uppercase tracking-wide px-6 py-3">Actions</th>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {displayedUsers.map(user => {
                                    const isPendingRecruiter = user.userRole === 'pending_recruiter';
                                    return (
                                        <tr
                                            key={user.userId}
                                            className={`transition-colors group ${isPendingRecruiter
                                                ? 'bg-amber-50/40 hover:bg-amber-50/70 border-l-4 border-l-amber-400'
                                                : 'hover:bg-slate-50'
                                                } ${(isPendingRecruiter || user.userRole === 'recruiter') ? 'cursor-pointer' : ''
                                                }`}
                                            onClick={() => {
                                                if (isPendingRecruiter || user.userRole === 'recruiter') {
                                                    setReviewUser(user);
                                                }
                                            }}
                                        >
                                            <td className="px-6 py-4">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-sm font-medium text-slate-900">{user.fullName || '—'}</p>
                                                        {isPendingRecruiter && (
                                                            <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded animate-pulse">
                                                                REVIEW
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-slate-600 flex items-center gap-1 mt-0.5">
                                                        <Mail className="w-3 h-3" />
                                                        {user.email}
                                                    </p>
                                                    {user.recruiterProfile && (
                                                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                                            <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                                                                {user.recruiterProfile.jobTitle}
                                                            </span>
                                                            <span className="text-[11px] text-slate-400">
                                                                at {user.recruiterProfile.companyName}
                                                            </span>
                                                            {user.recruiterProfile.recruiterType && (
                                                                <span className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full ${user.recruiterProfile.recruiterType === 'in_house'
                                                                    ? 'bg-blue-50 text-blue-600 border border-blue-200'
                                                                    : 'bg-amber-50 text-amber-600 border border-amber-200'
                                                                    }`}>
                                                                    {user.recruiterProfile.recruiterType === 'in_house' ? 'In-House' : 'Agency'}
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm text-slate-600 flex items-center gap-1">
                                                    <MapPin className="w-3.5 h-3.5 text-slate-500" />
                                                    {user.location || '—'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="inline-flex items-center gap-1 text-sm text-slate-700">
                                                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                                                    {user.projectStats?.count || 0}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="text-sm text-slate-700">{user.projectStats?.completed || 0}</span>
                                            </td>
                                            <td className="px-6 py-4 text-center" onClick={e => e.stopPropagation()}>
                                                {actionLoading[`role_${user.userId}`] ? (
                                                    <Loader2 className="w-4 h-4 animate-spin text-slate-400 mx-auto" />
                                                ) : isPendingRecruiter ? (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setReviewUser(user); }}
                                                        className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3 py-1.5 rounded-lg transition-all"
                                                    >
                                                        <Eye className="w-3 h-3" />
                                                        Review
                                                    </button>
                                                ) : isSuperAdmin ? (
                                                    <select
                                                        value={user.userRole || ''}
                                                        onChange={e => {
                                                            const val = e.target.value as 'candidate' | 'recruiter' | 'pending_recruiter';
                                                            if (val) handleUserRoleChange(user, val);
                                                        }}
                                                        className="text-xs font-medium px-2 py-1 rounded-lg border border-slate-300 bg-white text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer"
                                                    >
                                                        <option value="">Not set</option>
                                                        <option value="candidate">Candidate</option>
                                                        <option value="pending_recruiter">Pending Recruiter</option>
                                                        <option value="recruiter">Recruiter</option>
                                                    </select>
                                                ) : (
                                                    getRoleBadge(user)
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {user.isAdmin ? (
                                                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${user.adminRole === 'super_admin'
                                                        ? 'bg-purple-100 text-purple-700'
                                                        : 'bg-indigo-100 text-indigo-700'
                                                        }`}>
                                                        <Shield className="w-3 h-3" />
                                                        {user.adminRole === 'super_admin' ? 'Super Admin' : 'Admin'}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-slate-400">—</span>
                                                )}
                                            </td>
                                            {isSuperAdmin && (
                                                <td className="px-6 py-4 text-right" onClick={e => e.stopPropagation()}>
                                                    {actionLoading[user.userId] ? (
                                                        <Loader2 className="w-4 h-4 animate-spin text-slate-400 ml-auto" />
                                                    ) : user.isAdmin ? (
                                                        <button
                                                            onClick={() => handleAdminAction(user, 'revoke_admin')}
                                                            className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:bg-red-50 px-2.5 py-1.5 rounded-lg transition-colors"
                                                        >
                                                            <ShieldOff className="w-3.5 h-3.5" />
                                                            Revoke Admin
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleAdminAction(user, 'grant_admin')}
                                                            className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50 px-2.5 py-1.5 rounded-lg transition-colors"
                                                        >
                                                            <Shield className="w-3.5 h-3.5" />
                                                            Make Admin
                                                        </button>
                                                    )}
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {pagination.totalPages > 1 && (
                        <div className="border-t border-slate-200 px-6 py-3 flex items-center justify-between bg-slate-50">
                            <p className="text-xs text-slate-600">
                                Showing {((pagination.page - 1) * pagination.limit) + 1}-{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                            </p>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => fetchUsers(pagination.page - 1, search)}
                                    disabled={pagination.page <= 1}
                                    className="p-1.5 rounded-lg hover:bg-slate-200 disabled:opacity-30 transition-colors"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <span className="text-xs text-slate-600 px-2">
                                    Page {pagination.page} of {pagination.totalPages}
                                </span>
                                <button
                                    onClick={() => fetchUsers(pagination.page + 1, search)}
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

            {/* Review Modal */}
            {reviewUser && (
                <RecruiterReviewModal
                    user={reviewUser}
                    onClose={() => setReviewUser(null)}
                    onApprove={handleModalApprove}
                    onReject={handleModalReject}
                    loading={modalLoading}
                />
            )}

            {/* Toast */}
            {toast && (
                <ActionToast
                    message={toast.message}
                    type={toast.type}
                    onDismiss={() => setToast(null)}
                />
            )}

            {/* Confirm dialog */}
            <ConfirmDialog
                isOpen={pendingConfirm !== null}
                title="Confirm action"
                message={pendingConfirm?.message ?? ''}
                confirmLabel="Confirm"
                cancelLabel="Cancel"
                variant="warning"
                onConfirm={() => pendingConfirm?.onConfirm()}
                onCancel={() => setPendingConfirm(null)}
            />
        </div>
    );
}
