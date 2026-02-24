import React from 'react';

/**
 * Reusable skeleton building blocks for loading states.
 * Provides the visual structure of content before it loads.
 */

export function SkeletonBox({ className = '' }: { className?: string }) {
    return <div className={`animate-pulse bg-slate-200/70 rounded-xl ${className}`} />;
}

export function SkeletonText({ lines = 1, className = '' }: { lines?: number; className?: string }) {
    return (
        <div className={`space-y-2 ${className}`}>
            {Array.from({ length: lines }).map((_, i) => (
                <div
                    key={i}
                    className="animate-pulse bg-slate-200/70 rounded-md h-3.5"
                    style={{ width: i === lines - 1 && lines > 1 ? '60%' : '100%' }}
                />
            ))}
        </div>
    );
}

/** Navbar skeleton — matches AppNavbar dimensions */
export function NavbarSkeleton() {
    return (
        <nav className="sticky top-0 z-50 glass border-b border-slate-200/60 shadow-sm shadow-slate-100/50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6">
                <div className="flex h-16 items-center justify-between">
                    {/* Logo */}
                    <div className="flex items-center gap-8">
                        <div className="flex items-center gap-2.5">
                            <SkeletonBox className="w-8 h-8 rounded-lg" />
                            <SkeletonBox className="w-28 h-5 rounded-md hidden sm:block" />
                        </div>
                        {/* Nav links */}
                        <div className="hidden md:flex items-center gap-1">
                            <SkeletonBox className="w-24 h-9 rounded-lg" />
                            <SkeletonBox className="w-20 h-9 rounded-lg" />
                        </div>
                    </div>
                    {/* Right side */}
                    <div className="flex items-center gap-3">
                        <SkeletonBox className="w-9 h-9 rounded-lg" />
                        <SkeletonBox className="w-9 h-9 rounded-full" />
                    </div>
                </div>
            </div>
        </nav>
    );
}

/** Dashboard page skeleton — matches the full dashboard layout */
export function DashboardSkeleton() {
    return (
        <div className="min-h-screen bg-slate-50">
            <NavbarSkeleton />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-24 md:pb-20">
                <div className="py-8 space-y-8">
                    {/* Welcome banner skeleton */}
                    <div className="rounded-2xl bg-slate-900/90 p-6 md:p-8">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div className="space-y-2.5 flex-1">
                                <div className="h-7 w-64 bg-white/10 rounded-lg animate-pulse" />
                                <div className="h-4 w-48 bg-white/10 rounded-md animate-pulse" />
                            </div>
                            <div className="h-11 w-44 bg-white/10 rounded-xl animate-pulse" />
                        </div>
                    </div>

                    {/* Quick actions skeleton */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="bg-white rounded-xl border border-slate-100 p-4">
                                <SkeletonBox className="w-10 h-10 rounded-xl mb-3" />
                                <SkeletonBox className="w-24 h-4 rounded-md mb-1.5" />
                                <SkeletonBox className="w-20 h-3 rounded-md" />
                            </div>
                        ))}
                    </div>

                    {/* Stats skeleton */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="bg-white rounded-xl border border-slate-100 p-5 flex items-center gap-4">
                                <SkeletonBox className="w-11 h-11 rounded-xl shrink-0" />
                                <div className="flex-1">
                                    <SkeletonBox className="w-10 h-6 rounded-md mb-1.5" />
                                    <SkeletonBox className="w-16 h-3 rounded-md" />
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Projects header skeleton */}
                    <div className="space-y-5">
                        <div className="flex items-center justify-between">
                            <SkeletonBox className="w-28 h-5 rounded-md" />
                            <SkeletonBox className="w-20 h-6 rounded-full" />
                        </div>

                        {/* Project cards skeleton */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4">
                                    <div className="flex items-start justify-between">
                                        <SkeletonBox className="w-10 h-10 rounded-xl" />
                                        <SkeletonBox className="w-20 h-6 rounded-full" />
                                    </div>
                                    <div className="space-y-2">
                                        <SkeletonBox className="w-3/4 h-5 rounded-md" />
                                        <SkeletonBox className="w-full h-3 rounded-md" />
                                        <SkeletonBox className="w-2/3 h-3 rounded-md" />
                                    </div>
                                    <div className="flex items-center gap-2 pt-2">
                                        <SkeletonBox className="w-16 h-4 rounded-md" />
                                        <SkeletonBox className="w-24 h-4 rounded-md" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

/** Export page skeleton */
export function ExportSkeleton() {
    return (
        <div className="min-h-screen bg-slate-50">
            <NavbarSkeleton />
            <div className="max-w-6xl mx-auto px-4 py-8">
                {/* Back link skeleton */}
                <SkeletonBox className="w-36 h-4 rounded-md mb-6" />

                {/* Header */}
                <div className="mb-8">
                    <SkeletonBox className="w-28 h-6 rounded-full mb-3" />
                    <SkeletonBox className="w-56 h-8 rounded-lg mb-2" />
                    <SkeletonBox className="w-72 h-4 rounded-md" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left panel */}
                    <div className="lg:col-span-4 space-y-5">
                        <div className="bg-white p-5 rounded-2xl border border-slate-100">
                            <SkeletonBox className="w-28 h-4 rounded-md mb-3" />
                            <div className="grid grid-cols-2 gap-2">
                                {[1, 2, 3, 4].map(i => (
                                    <SkeletonBox key={i} className="h-10 rounded-xl" />
                                ))}
                            </div>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-slate-100">
                            <SkeletonBox className="w-24 h-4 rounded-md mb-3" />
                            <div className="flex gap-2">
                                {[1, 2, 3].map(i => (
                                    <SkeletonBox key={i} className="flex-1 h-10 rounded-xl" />
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right panel */}
                    <div className="lg:col-span-8">
                        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                                <SkeletonBox className="w-40 h-4 rounded-md" />
                                <SkeletonBox className="w-36 h-10 rounded-xl" />
                            </div>
                            <div className="p-5">
                                <SkeletonBox className="w-full h-80 rounded-xl" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

/** Profile page skeleton */
export function ProfileSkeleton() {
    return (
        <div className="min-h-screen bg-slate-50">
            <NavbarSkeleton />
            <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
                {/* Back link */}
                <SkeletonBox className="w-36 h-4 rounded-md mb-6" />

                {/* Header */}
                <div className="mb-8">
                    <SkeletonBox className="w-48 h-7 rounded-lg mb-2" />
                    <SkeletonBox className="w-72 h-4 rounded-md" />
                </div>

                {/* Section cards */}
                {[1, 2, 3].map(i => (
                    <div key={i} className="bg-white rounded-2xl border border-slate-100 p-6 mb-5 space-y-4">
                        <div className="flex items-center gap-3">
                            <SkeletonBox className="w-9 h-9 rounded-lg" />
                            <SkeletonBox className="w-36 h-5 rounded-md" />
                        </div>
                        <div className="space-y-3">
                            <SkeletonBox className="w-full h-10 rounded-xl" />
                            <SkeletonBox className="w-full h-10 rounded-xl" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

/** Admin page skeleton */
export function AdminSkeleton() {
    return (
        <div className="min-h-screen bg-slate-50">
            <NavbarSkeleton />
            {/* Sub-header */}
            <div className="bg-white border-b border-slate-100">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <SkeletonBox className="w-40 h-6 rounded-md mb-1" />
                    <SkeletonBox className="w-48 h-3 rounded-md" />
                </div>
            </div>
            <div className="max-w-7xl mx-auto px-6 mt-6">
                {/* Tab bar */}
                <div className="flex gap-1 bg-white rounded-xl border border-slate-200 p-1.5">
                    {[1, 2, 3, 4, 5].map(i => (
                        <SkeletonBox key={i} className="w-24 h-10 rounded-lg" />
                    ))}
                </div>
                {/* Content area */}
                <div className="py-6 space-y-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="bg-white rounded-xl border border-slate-100 p-6">
                            <SkeletonBox className="w-full h-20 rounded-lg" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
