'use client';

import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { Shield, Zap, FileText, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

function SignInContent() {
    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
    const [loadingProvider, setLoadingProvider] = useState<string | null>(null);

    const handleSignIn = (provider: string) => {
        setLoadingProvider(provider);
        signIn(provider, { callbackUrl });
    };

    return (
        <div className="min-h-screen flex">
            {/* Left Panel - Branding */}
            <div className="hidden lg:flex lg:w-1/2 bg-linear-to-br from-slate-900 via-indigo-950 to-slate-900 relative overflow-hidden">
                {/* Decorative elements */}
                <div className="absolute top-0 left-0 w-full h-full">
                    <div className="absolute top-20 left-20 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl"></div>
                    <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
                    <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl"></div>
                </div>

                {/* Grid pattern */}
                <div className="absolute inset-0 opacity-[0.03]" style={{
                    backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
                    backgroundSize: '60px 60px'
                }}></div>

                <div className="relative z-10 flex flex-col justify-between p-12 w-full">
                    {/* Logo */}
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/10">
                            <span className="text-xl">🚀</span>
                        </div>
                        <span className="text-white font-bold text-xl tracking-tight">JNJGO Resume</span>
                    </div>

                    {/* Main content */}
                    <div className="space-y-8 max-w-lg">
                        <div className="space-y-4">
                            <h1 className="text-4xl xl:text-5xl font-black text-white leading-tight">
                                Build Resumes That
                                <span className="block text-transparent bg-clip-text bg-linear-to-r from-indigo-400 via-purple-400 to-pink-400">
                                    Win Interviews
                                </span>
                            </h1>
                            <p className="text-lg text-slate-400 leading-relaxed">
                                AI-powered resume builder that helps IT professionals create decision-making documents, not just job listings.
                            </p>
                        </div>

                        {/* Feature highlights */}
                        <div className="space-y-4">
                            <div className="flex items-start gap-4 group">
                                <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center shrink-0 border border-indigo-500/20 group-hover:bg-indigo-500/30 transition-colors">
                                    <Zap className="w-5 h-5 text-indigo-400" />
                                </div>
                                <div>
                                    <h3 className="text-white font-semibold mb-0.5">AI Interview Process</h3>
                                    <p className="text-sm text-slate-400">Smart AI guides you through structured questions to capture your full career impact.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4 group">
                                <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center shrink-0 border border-purple-500/20 group-hover:bg-purple-500/30 transition-colors">
                                    <FileText className="w-5 h-5 text-purple-400" />
                                </div>
                                <div>
                                    <h3 className="text-white font-semibold mb-0.5">Master Resume Format</h3>
                                    <p className="text-sm text-slate-400">Professional format emphasizing decision-making, metrics, and career progression.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4 group">
                                <div className="w-10 h-10 rounded-lg bg-pink-500/20 flex items-center justify-center shrink-0 border border-pink-500/20 group-hover:bg-pink-500/30 transition-colors">
                                    <Shield className="w-5 h-5 text-pink-400" />
                                </div>
                                <div>
                                    <h3 className="text-white font-semibold mb-0.5">Quality Scoring</h3>
                                    <p className="text-sm text-slate-400">Built-in evaluation ensures your resume meets professional standards.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bottom quote */}
                    <div className="border-t border-white/10 pt-6">
                        <p className="text-slate-500 text-sm italic">&quot;Stop telling stories; start showing impact.&quot;</p>
                    </div>
                </div>
            </div>

            {/* Right Panel - Sign In Form */}
            <div className="w-full lg:w-1/2 flex flex-col bg-slate-50">
                {/* Mobile back button */}
                <div className="p-6 lg:p-8">
                    <Link href="/" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                        Back to home
                    </Link>
                </div>

                <div className="flex-1 flex items-center justify-center px-6 pb-12">
                    <div className="w-full max-w-sm space-y-8">
                        {/* Mobile logo */}
                        <div className="lg:hidden text-center mb-4">
                            <div className="inline-flex items-center gap-2.5 mb-6">
                                <span className="text-3xl">🚀</span>
                                <span className="font-black text-slate-800 text-xl">JNJGO Resume</span>
                            </div>
                        </div>

                        {/* Header */}
                        <div className="text-center lg:text-left">
                            <h2 className="text-2xl font-bold text-slate-900 mb-2">Welcome back</h2>
                            <p className="text-slate-500">Sign in to your account to continue building your resume</p>
                        </div>

                        {/* Sign in buttons */}
                        <div className="space-y-3">
                            <button
                                onClick={() => handleSignIn('google')}
                                disabled={loadingProvider !== null}
                                className="w-full flex items-center justify-center gap-3 px-5 py-4 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 hover:shadow-md transition-all duration-200 group disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {loadingProvider === 'google' ? (
                                    <div className="w-5 h-5 border-2 border-slate-300 border-t-indigo-600 rounded-full animate-spin"></div>
                                ) : (
                                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                    </svg>
                                )}
                                <span className="font-medium text-slate-700 group-hover:text-slate-900">Continue with Google</span>
                            </button>

                            {/* Coming soon providers */}
                            <div className="pt-2">
                                <p className="text-xs text-slate-400 text-center mb-3">More sign-in options coming soon</p>
                                <div className="flex justify-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center opacity-40 cursor-not-allowed" title="GitHub - Coming soon">
                                        <svg className="w-5 h-5 text-slate-500" fill="currentColor" viewBox="0 0 24 24">
                                            <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center opacity-40 cursor-not-allowed" title="LinkedIn - Coming soon">
                                        <svg className="w-5 h-5 text-slate-500" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Divider */}
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-slate-200"></div>
                            </div>
                            <div className="relative flex justify-center text-xs">
                                <span className="bg-slate-50 px-4 text-slate-400 uppercase tracking-wider font-medium">Secure sign-in</span>
                            </div>
                        </div>

                        {/* Trust signals */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-3 text-sm text-slate-500">
                                <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center shrink-0">
                                    <Shield className="w-4 h-4 text-green-600" />
                                </div>
                                <span>Your data is encrypted and securely stored</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-slate-500">
                                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                                    <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                </div>
                                <span>We never post anything on your behalf</span>
                            </div>
                        </div>

                        {/* Footer */}
                        <p className="text-center text-xs text-slate-400 pt-4">
                            By continuing, you agree to our Terms of Service and Privacy Policy.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function SignIn() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="text-center space-y-4">
                    <div className="w-10 h-10 border-2 border-slate-200 border-t-indigo-600 rounded-full animate-spin mx-auto"></div>
                    <p className="text-slate-500 font-medium">Loading...</p>
                </div>
            </div>
        }>
            <SignInContent />
        </Suspense>
    );
}
