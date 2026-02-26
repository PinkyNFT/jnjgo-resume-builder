'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, Search, Shield, ShieldOff, Users as UsersIcon, ChevronLeft, ChevronRight, FileText, MapPin, Mail, UserCheck, Briefcase } from 'lucide-react';

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
    userRole?: 'candidate' | 'recruiter' | null;
}

interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

export function AdminUsers({ adminRole }: { adminRole: string }) {
    const [users, setUsers] = useState<UserData[]>([]);
    const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

    const isSuperAdmin = adminRole === 'super_admin';

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

    const handleAdminAction = async (user: UserData, action: 'grant_admin' | 'revoke_admin' | 'grant_super_admin') => {
        if (!confirm(`Are you sure you want to ${action.replace('_', ' ')} for ${user.email}?`)) return;

        setActionLoading(prev => ({ ...prev, [user.userId]: true }));
        try {
            const res = await fetch('/api/admin/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user.userId,
                    email: user.email,
                    name: user.fullName,
                    action
                })
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed');
            }
            // Refresh user list
            fetchUsers(pagination.page, search);
        } catch (err: any) {
            alert(err.message || 'Failed to update user');
        } finally {
            setActionLoading(prev => ({ ...prev, [user.userId]: false }));
        }
    };

    const handleUserRoleChange = async (user: UserData, newRole: 'candidate' | 'recruiter') => {
        if (user.userRole === newRole) return;
        if (!confirm(`Change ${user.email}'s role to ${newRole}?`)) return;

        setActionLoading(prev => ({ ...prev, [`role_${user.userId}`]: true }));
        try {
            const res = await fetch('/api/admin/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user.userId,
                    email: user.email,
                    name: user.fullName,
                    action: 'change_user_role',
                    role: newRole
                })
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed');
            }
            fetchUsers(pagination.page, search);
        } catch (err: any) {
            alert(err.message || 'Failed to change user role');
        } finally {
            setActionLoading(prev => ({ ...prev, [`role_${user.userId}`]: false }));
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-bold text-slate-900">User Management</h2>
                    <p className="text-sm text-slate-600 mt-1">
                        View registered users, their project activity, and manage admin roles.
                        {!isSuperAdmin && <span className="text-amber-600 ml-1">(Super Admin required for role changes)</span>}
                    </p>
                </div>
            </div>

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
            ) : users.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
                    <UsersIcon className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                    <p className="text-slate-600">{search ? 'No users match your search' : 'No registered users yet'}</p>
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
                                {users.map(user => (
                                    <tr key={user.userId} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div>
                                                <p className="text-sm font-medium text-slate-900">{user.fullName || '—'}</p>
                                                <p className="text-xs text-slate-600 flex items-center gap-1 mt-0.5">
                                                    <Mail className="w-3 h-3" />
                                                    {user.email}
                                                </p>
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
                                        <td className="px-6 py-4 text-center">
                                            {actionLoading[`role_${user.userId}`] ? (
                                                <Loader2 className="w-4 h-4 animate-spin text-slate-400 mx-auto" />
                                            ) : isSuperAdmin ? (
                                                <select
                                                    value={user.userRole || ''}
                                                    onChange={e => {
                                                        const val = e.target.value as 'candidate' | 'recruiter';
                                                        if (val) handleUserRoleChange(user, val);
                                                    }}
                                                    className="text-xs font-medium px-2 py-1 rounded-lg border border-slate-300 bg-white text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer"
                                                >
                                                    <option value="">Not set</option>
                                                    <option value="candidate">Candidate</option>
                                                    <option value="recruiter">Recruiter</option>
                                                </select>
                                            ) : (
                                                user.userRole ? (
                                                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${user.userRole === 'recruiter'
                                                            ? 'bg-emerald-100 text-emerald-700'
                                                            : 'bg-blue-100 text-blue-700'
                                                        }`}>
                                                        {user.userRole === 'recruiter' ? (
                                                            <Briefcase className="w-3 h-3" />
                                                        ) : (
                                                            <UserCheck className="w-3 h-3" />
                                                        )}
                                                        {user.userRole === 'recruiter' ? 'Recruiter' : 'Candidate'}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-slate-400">Not set</span>
                                                )
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
                                            <td className="px-6 py-4 text-right">
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
                                ))}
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
        </div>
    );
}
