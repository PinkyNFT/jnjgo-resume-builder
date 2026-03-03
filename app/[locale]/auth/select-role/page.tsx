'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState, useEffect } from 'react';
import { FileText, Search, ArrowRight, Sparkles, Users, Building2, CheckCircle2, Loader2 } from 'lucide-react';

function SelectRoleContent() {
    const { data: session, status, update } = useSession();
    const router = useRouter();
    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get('callbackUrl');
    const intent = searchParams.get('intent'); // 'recruiter' hint from /c/[slug]
    const [selectedRole, setSelectedRole] = useState<'candidate' | 'recruiter' | null>(
        intent === 'recruiter' ? 'recruiter' : null
    );
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    // Redirect if not authenticated
    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/auth/signin');
        }
    }, [status, router]);

    // If user already has the matching role and there's no intent to change, redirect
    useEffect(() => {
        if (session?.user?.role && !intent) {
            const dest = session.user.role === 'recruiter'
                ? (callbackUrl || '/recruiter/dashboard')
                : (callbackUrl || '/dashboard');
            router.push(dest);
        }
    }, [session, callbackUrl, router, intent]);

    const handleSelectRole = async () => {
        if (!selectedRole || isSubmitting) return;

        setIsSubmitting(true);
        setError('');

        try {
            const res = await fetch('/api/auth/role', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: selectedRole }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to set role');
            }

            // Refresh the session to pick up the new role
            await update();

            // Route to appropriate destination
            if (selectedRole === 'recruiter') {
                // Always go through onboarding for new recruiters
                const onboardingUrl = callbackUrl
                    ? `/recruiter/onboarding?callbackUrl=${encodeURIComponent(callbackUrl)}`
                    : '/recruiter/onboarding';
                router.push(onboardingUrl);
            } else {
                router.push(callbackUrl || '/dashboard');
            }
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Something went wrong');
            setIsSubmitting(false);
        }
    };

    if (status === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            {/* Background decoration */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-20 left-20 w-72 h-72 bg-indigo-200/20 rounded-full blur-3xl" />
                <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-200/15 rounded-full blur-3xl" />
            </div>

            <div className="relative w-full max-w-2xl mx-auto">
                {/* Header */}
                <div className="text-center mb-10 animate-[fade-in_0.4s_ease-out]">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold uppercase tracking-wider mb-5 border border-indigo-100">
                        <Sparkles className="w-3.5 h-3.5" />
                        Welcome to JNJGO
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-black text-slate-900 mb-3 tracking-tight">
                        How will you use JNJGO?
                    </h1>
                    <p className="text-slate-500 text-lg max-w-md mx-auto">
                        Choose your role to get a personalized experience. This helps us tailor the platform for you.
                    </p>
                </div>

                {/* Role Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                    {/* Candidate Card */}
                    <button
                        onClick={() => setSelectedRole('candidate')}
                        disabled={isSubmitting}
                        className={`group relative text-left p-6 rounded-2xl border-2 transition-all duration-300 ${selectedRole === 'candidate'
                            ? 'border-indigo-600 bg-white shadow-xl shadow-indigo-100/50 ring-4 ring-indigo-50'
                            : 'border-slate-200 bg-white hover:border-indigo-300 hover:shadow-lg hover:-translate-y-0.5'
                            } disabled:opacity-60 disabled:cursor-not-allowed`}
                    >
                        {selectedRole === 'candidate' && (
                            <div className="absolute top-4 right-4">
                                <CheckCircle2 className="w-6 h-6 text-indigo-600" />
                            </div>
                        )}
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-5 transition-all duration-300 ${selectedRole === 'candidate'
                            ? 'bg-indigo-600 shadow-lg shadow-indigo-200/50'
                            : 'bg-indigo-50 group-hover:bg-indigo-100'
                            }`}>
                            <FileText className={`w-7 h-7 ${selectedRole === 'candidate' ? 'text-white' : 'text-indigo-600'}`} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">I&apos;m a Candidate</h3>
                        <p className="text-sm text-slate-500 leading-relaxed mb-4">
                            Build AI-powered resumes, manage your career profile, and connect with top recruiters.
                        </p>
                        <div className="space-y-2">
                            {['AI interview & resume builder', 'Private recruiter profile', 'Multi-platform export'].map((item) => (
                                <div key={item} className="flex items-center gap-2 text-xs text-slate-600">
                                    <div className="w-1 h-1 rounded-full bg-indigo-400" />
                                    {item}
                                </div>
                            ))}
                        </div>
                    </button>

                    {/* Recruiter Card */}
                    <button
                        onClick={() => setSelectedRole('recruiter')}
                        disabled={isSubmitting}
                        className={`group relative text-left p-6 rounded-2xl border-2 transition-all duration-300 ${selectedRole === 'recruiter'
                            ? 'border-emerald-600 bg-white shadow-xl shadow-emerald-100/50 ring-4 ring-emerald-50'
                            : 'border-slate-200 bg-white hover:border-emerald-300 hover:shadow-lg hover:-translate-y-0.5'
                            } disabled:opacity-60 disabled:cursor-not-allowed`}
                    >
                        {selectedRole === 'recruiter' && (
                            <div className="absolute top-4 right-4">
                                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                            </div>
                        )}
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-5 transition-all duration-300 ${selectedRole === 'recruiter'
                            ? 'bg-emerald-600 shadow-lg shadow-emerald-200/50'
                            : 'bg-emerald-50 group-hover:bg-emerald-100'
                            }`}>
                            <Search className={`w-7 h-7 ${selectedRole === 'recruiter' ? 'text-white' : 'text-emerald-600'}`} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">I&apos;m a Recruiter</h3>
                        <p className="text-sm text-slate-500 leading-relaxed mb-4">
                            Access verified candidate profiles with salary expectations, career intent, and deal-breakers.
                        </p>
                        <div className="space-y-2">
                            {['View candidate private profiles', 'Salary & availability data', 'Direct scouting pipeline'].map((item) => (
                                <div key={item} className="flex items-center gap-2 text-xs text-slate-600">
                                    <div className="w-1 h-1 rounded-full bg-emerald-400" />
                                    {item}
                                </div>
                            ))}
                        </div>
                    </button>
                </div>

                {/* Error */}
                {error && (
                    <div className="mb-8 p-4 rounded-2xl bg-red-50/80 border border-red-200 text-sm text-red-700 flex items-start gap-3 animate-[fade-in_0.3s_ease-out]">
                        <div className="p-1 min-w-fit bg-red-100 rounded-full">
                            <svg className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <p className="leading-relaxed font-medium">{error}</p>
                    </div>
                )}

                {/* Continue button */}
                <div className="text-center">
                    <button
                        onClick={handleSelectRole}
                        disabled={!selectedRole || isSubmitting}
                        className={`inline-flex items-center justify-center gap-2 px-10 py-4 font-bold text-lg rounded-2xl transition-all duration-300 ${selectedRole
                            ? selectedRole === 'recruiter'
                                ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-xl shadow-emerald-200/40 hover:-translate-y-0.5'
                                : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-xl shadow-indigo-200/40 hover:-translate-y-0.5'
                            : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            } disabled:cursor-not-allowed disabled:hover:translate-y-0`}
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Setting up your account...
                            </>
                        ) : (
                            <>
                                Continue
                                <ArrowRight className="w-5 h-5" />
                            </>
                        )}
                    </button>
                    <p className="mt-4 text-xs text-slate-400">
                        {session?.user?.role
                            ? `You are currently a ${session.user.role}. Your role cannot be changed.`
                            : 'Choose the role that best describes you. This choice is permanent and cannot be changed later.'}
                    </p>
                </div>
            </div>
        </div>
    );
}

export default function SelectRolePage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        }>
            <SelectRoleContent />
        </Suspense>
    );
}
