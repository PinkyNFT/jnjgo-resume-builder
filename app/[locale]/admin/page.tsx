'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
    Settings, FileText, Users, Shield, BarChart3,
    ArrowLeft, Loader2, AlertTriangle, RefreshCw
} from 'lucide-react';
import { AdminOverview } from '@/components/admin/AdminOverview';
import { AdminSettings } from '@/components/admin/AdminSettings';
import { AdminPrompts } from '@/components/admin/AdminPrompts';
import { AdminUsers } from '@/components/admin/AdminUsers';
import { AdminAuditLog } from '@/components/admin/AdminAuditLog';

type AdminTab = 'overview' | 'settings' | 'prompts' | 'users' | 'audit';

export default function AdminDashboardPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<AdminTab>('overview');
    const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
    const [adminRole, setAdminRole] = useState<string>('');
    const [isBootstrapped, setIsBootstrapped] = useState(false);
    const [isAutoPromoted, setIsAutoPromoted] = useState(false);

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/auth/signin?callbackUrl=/admin');
            return;
        }

        if (status === 'authenticated') {
            fetch('/api/admin/check')
                .then(res => res.json())
                .then(data => {
                    setIsAdmin(data.isAdmin);
                    setAdminRole(data.role || '');
                    if (data.bootstrapped) setIsBootstrapped(true);
                    if (data.autoPromoted) setIsAutoPromoted(true);
                })
                .catch(() => setIsAdmin(false));
        }
    }, [status, router]);

    if (status === 'loading' || isAdmin === null) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="text-center space-y-4">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
                    <p className="text-slate-600">Verifying admin access...</p>
                </div>
            </div>
        );
    }

    if (!isAdmin) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="text-center space-y-4 max-w-md px-6">
                    <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto">
                        <AlertTriangle className="w-8 h-8 text-red-500" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900">Access Denied</h1>
                    <p className="text-slate-600">You don&apos;t have admin privileges. Contact a super admin to get access.</p>
                    <button
                        onClick={() => router.push('/dashboard')}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl hover:bg-indigo-600 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    const tabs: { id: AdminTab; label: string; icon: React.ElementType }[] = [
        { id: 'overview', label: 'Overview', icon: BarChart3 },
        { id: 'prompts', label: 'Prompts', icon: FileText },
        { id: 'settings', label: 'Settings', icon: Settings },
        { id: 'users', label: 'Users', icon: Users },
        { id: 'audit', label: 'Audit Log', icon: Shield },
    ];

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.push('/dashboard')}
                            className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-slate-700" />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                <Shield className="w-5 h-5 text-indigo-600" />
                                Admin Dashboard
                            </h1>
                            <p className="text-xs text-slate-600">
                                {session?.user?.email} &middot; <span className="capitalize">{adminRole.replace('_', ' ')}</span>
                            </p>
                        </div>
                    </div>
                </div>
            </header>

            {/* Bootstrap notification */}
            {(isBootstrapped || isAutoPromoted) && (
                <div className="max-w-7xl mx-auto px-6 mt-4">
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
                        <Shield className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
                        <div>
                            {isBootstrapped && (
                                <>
                                    <p className="text-sm font-medium text-green-800">
                                        You&apos;ve been automatically assigned as the first Super Admin.
                                    </p>
                                    <p className="text-xs text-green-600 mt-1">
                                        Default settings have been seeded. You can now manage all aspects of the application.
                                    </p>
                                </>
                            )}
                            {isAutoPromoted && !isBootstrapped && (
                                <>
                                    <p className="text-sm font-medium text-green-800">
                                        You&apos;ve been automatically promoted to Super Admin via ADMIN_EMAILS configuration.
                                    </p>
                                    <p className="text-xs text-green-600 mt-1">
                                        You now have full access to manage settings, prompts, users, and view audit logs.
                                    </p>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Tab Navigation */}
            <div className="max-w-7xl mx-auto px-6 mt-6">
                <div className="flex gap-1 bg-white rounded-xl border border-slate-200 p-1.5 overflow-x-auto">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === tab.id
                                    ? 'bg-indigo-600 text-white shadow-sm'
                                    : 'text-slate-600 hover:bg-slate-100'
                                }`}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tab Content */}
            <div className="max-w-7xl mx-auto px-6 py-6">
                {activeTab === 'overview' && <AdminOverview />}
                {activeTab === 'settings' && <AdminSettings />}
                {activeTab === 'prompts' && <AdminPrompts />}
                {activeTab === 'users' && <AdminUsers adminRole={adminRole} />}
                {activeTab === 'audit' && <AdminAuditLog />}
            </div>
        </div>
    );
}
