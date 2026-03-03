'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Clock, ArrowLeft, LogOut } from 'lucide-react';
import { signOut } from 'next-auth/react';

export default function PendingApprovalPage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/auth/signin');
        } else if (status === 'authenticated' && session?.user?.role !== 'pending_recruiter') {
            const dest = session?.user?.role === 'recruiter' ? '/recruiter/dashboard' : '/dashboard';
            router.push(dest);
        }
    }, [status, session, router]);

    if (status === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="w-8 h-8 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            {/* Background decoration */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-20 left-20 w-72 h-72 bg-amber-200/20 rounded-full blur-3xl" />
                <div className="absolute bottom-20 right-20 w-96 h-96 bg-indigo-200/15 rounded-full blur-3xl" />
            </div>

            <div className="relative w-full max-w-md mx-auto text-center animate-[fade-in_0.4s_ease-out]">
                <div className="bg-white rounded-3xl p-8 sm:p-10 shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col items-center">
                    <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mb-6">
                        <Clock className="w-10 h-10 text-amber-500" />
                    </div>

                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mb-4 tracking-tight">
                        Approval Pending
                    </h1>

                    <p className="text-slate-600 leading-relaxed mb-8">
                        Thank you for registering as a Recruiter. Your account is currently under review by our administrators. This manual verification helps us ensure a secure, high-quality network.
                        We will notify you once your account is approved.
                    </p>

                    <div className="w-full flex flex-col sm:flex-row gap-3">
                        <button
                            onClick={() => signOut({ callbackUrl: '/' })}
                            className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 font-semibold text-sm rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                        >
                            <LogOut className="w-4 h-4" />
                            Sign Out
                        </button>
                        <button
                            onClick={() => router.push('/')}
                            className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 font-semibold text-sm rounded-xl border-2 border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50 transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Return Home
                        </button>
                    </div>
                </div>

                <p className="mt-8 text-xs text-slate-400">
                    If you believe this is an error, please contact support.
                </p>
            </div>
        </div>
    );
}
