'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
    Settings, FileText, Users, Shield, BarChart3,
    ArrowLeft, Loader2, AlertTriangle, RefreshCw, TrendingUp, DollarSign
} from 'lucide-react';
import dynamic from 'next/dynamic';
import AppShell from '@/components/navigation/AppShell';
import { AdminSkeleton } from '@/components/navigation/Skeletons';

// Tab components are only needed one at a time — load each on first activation.
const tabLoader = () => (
  <div className="flex items-center justify-center py-24">
    <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
  </div>
);

const AdminOverview  = dynamic(() => import('@/components/admin/AdminOverview').then(m => ({ default: m.AdminOverview })),   { ssr: false, loading: tabLoader });
const AdminFunnel    = dynamic(() => import('@/components/admin/AdminFunnel'),                                                { ssr: false, loading: tabLoader });
const AdminAiUsage   = dynamic(() => import('@/components/admin/AdminAiUsage'),                                               { ssr: false, loading: tabLoader });
const AdminPrompts   = dynamic(() => import('@/components/admin/AdminPrompts').then(m => ({ default: m.AdminPrompts })),     { ssr: false, loading: tabLoader });
const AdminSettings  = dynamic(() => import('@/components/admin/AdminSettings').then(m => ({ default: m.AdminSettings })),   { ssr: false, loading: tabLoader });
const AdminUsers     = dynamic(() => import('@/components/admin/AdminUsers').then(m => ({ default: m.AdminUsers })),         { ssr: false, loading: tabLoader });
const AdminAuditLog  = dynamic(() => import('@/components/admin/AdminAuditLog').then(m => ({ default: m.AdminAuditLog })),   { ssr: false, loading: tabLoader });

type AdminTab = 'overview' | 'funnel' | 'ai-usage' | 'settings' | 'prompts' | 'users' | 'audit';

export default function AdminDashboardPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<AdminTab>('overview');

    // Admin status and role come directly from the JWT — no extra API call needed
    const isAdmin = session?.user?.isAdmin ?? false;
    const adminRole = session?.user?.adminRole ?? '';

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/auth/signin?callbackUrl=/admin');
        }
    }, [status, router]);

    if (status === 'loading') {
        return <AdminSkeleton />;
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
        { id: 'funnel', label: 'Funnel', icon: TrendingUp },
        { id: 'ai-usage', label: 'AI Usage', icon: DollarSign },
        { id: 'prompts', label: 'Prompts', icon: FileText },
        { id: 'settings', label: 'Settings', icon: Settings },
        { id: 'users', label: 'Users', icon: Users },
        { id: 'audit', label: 'Audit Log', icon: Shield },
    ];

    return (
        <AppShell>
            {/* Admin sub-header */}
            <div className="bg-white border-b border-slate-100">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <Shield className="w-5 h-5 text-indigo-600" />
                        Admin Dashboard
                    </h1>
                    <p className="text-xs text-slate-500 mt-0.5">
                        {session?.user?.email} &middot; <span className="capitalize">{adminRole.replace('_', ' ')}</span>
                    </p>
                </div>
            </div>

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
                {activeTab === 'funnel' && <AdminFunnel />}
                {activeTab === 'ai-usage' && <AdminAiUsage />}
                {activeTab === 'settings' && <AdminSettings />}
                {activeTab === 'prompts' && <AdminPrompts />}
                {activeTab === 'users' && <AdminUsers adminRole={adminRole} />}
                {activeTab === 'audit' && <AdminAuditLog />}
            </div>
        </AppShell>
    );
}
