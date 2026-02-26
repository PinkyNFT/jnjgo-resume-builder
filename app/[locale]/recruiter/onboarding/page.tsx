'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState, useEffect } from 'react';
import {
    Building2, Briefcase, Phone, Globe, Users, Loader2,
    ArrowRight, Sparkles, CheckCircle2, ArrowLeft, Zap
} from 'lucide-react';

const COMPANY_SIZES = [
    { value: 'startup', label: 'Startup', desc: '1–10 employees' },
    { value: 'small', label: 'Small', desc: '11–50 employees' },
    { value: 'medium', label: 'Medium', desc: '51–200 employees' },
    { value: 'large', label: 'Large', desc: '201–1,000 employees' },
    { value: 'enterprise', label: 'Enterprise', desc: '1,000+ employees' },
] as const;

const INDUSTRIES = [
    'IT / Software',
    'Recruiting / Staffing',
    'Consulting',
    'Financial Services',
    'Manufacturing',
    'Healthcare',
    'Education',
    'Other',
] as const;

function OnboardingContent() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get('callbackUrl');

    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    // Form state
    const [companyName, setCompanyName] = useState('');
    const [jobTitle, setJobTitle] = useState('');
    const [phone, setPhone] = useState('');
    const [companyWebsite, setCompanyWebsite] = useState('');
    const [companySize, setCompanySize] = useState('');
    const [industry, setIndustry] = useState('');

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/auth/signin');
        }
    }, [status, router]);

    // Check if user is a recruiter; redirect if not
    useEffect(() => {
        if (session?.user?.role && session.user.role !== 'recruiter') {
            router.push('/dashboard');
        }
    }, [session, router]);

    const handleSubmit = async () => {
        if (!companyName.trim() || !jobTitle.trim()) {
            setError('Company name and job title are required.');
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
            const res = await fetch('/api/recruiter/profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    companyName: companyName.trim(),
                    jobTitle: jobTitle.trim(),
                    phone: phone.trim() || undefined,
                    companyWebsite: companyWebsite.trim() || undefined,
                    companySize: companySize || undefined,
                    industry: industry || undefined,
                    onboardingCompleted: true,
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to save profile');
            }

            // Navigate to callback or recruiter dashboard
            router.push(callbackUrl || '/recruiter/dashboard');
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Something went wrong');
            setIsSubmitting(false);
        }
    };

    if (status === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            {/* Background */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-10 right-20 w-80 h-80 bg-emerald-200/15 rounded-full blur-3xl" />
                <div className="absolute bottom-20 left-10 w-64 h-64 bg-teal-200/15 rounded-full blur-3xl" />
            </div>

            <div className="relative w-full max-w-lg mx-auto">
                {/* Progress indicator */}
                <div className="flex items-center justify-center gap-2 mb-8">
                    <div className="flex items-center gap-1.5">
                        <div className={`w-8 h-1.5 rounded-full transition-all duration-500 ${step >= 1 ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                        <div className={`w-8 h-1.5 rounded-full transition-all duration-500 ${step >= 2 ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                    </div>
                    <span className="text-xs font-semibold text-slate-400 ml-2">Step {step} of 2</span>
                </div>

                {/* Step 1: Essential Info */}
                {step === 1 && (
                    <div className="animate-[fade-in_0.4s_ease-out]">
                        <div className="text-center mb-8">
                            <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
                                <Building2 className="w-8 h-8 text-emerald-600" />
                            </div>
                            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mb-2 tracking-tight">
                                Set up your recruiter profile
                            </h1>
                            <p className="text-slate-500 max-w-sm mx-auto">
                                Help candidates know who&apos;s viewing their profile. This builds trust and credibility.
                            </p>
                        </div>

                        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
                            {/* Company Name */}
                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                                    Company Name <span className="text-red-400">*</span>
                                </label>
                                <div className="relative">
                                    <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="text"
                                        value={companyName}
                                        onChange={(e) => setCompanyName(e.target.value)}
                                        placeholder="e.g. Recruit Holdings"
                                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all placeholder:text-slate-300"
                                    />
                                </div>
                            </div>

                            {/* Job Title */}
                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                                    Your Job Title <span className="text-red-400">*</span>
                                </label>
                                <div className="relative">
                                    <Briefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="text"
                                        value={jobTitle}
                                        onChange={(e) => setJobTitle(e.target.value)}
                                        placeholder="e.g. Senior Talent Acquisition Manager"
                                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all placeholder:text-slate-300"
                                    />
                                </div>
                            </div>

                            {/* Phone (optional) */}
                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                                    Phone <span className="text-slate-300 normal-case">(optional)</span>
                                </label>
                                <div className="relative">
                                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="tel"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        placeholder="e.g. 090-1234-5678"
                                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all placeholder:text-slate-300"
                                    />
                                </div>
                            </div>
                        </div>

                        {error && (
                            <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 text-center">
                                {error}
                            </div>
                        )}

                        <div className="mt-6 text-center">
                            <button
                                onClick={() => {
                                    if (!companyName.trim() || !jobTitle.trim()) {
                                        setError('Company name and job title are required.');
                                        return;
                                    }
                                    setError('');
                                    setStep(2);
                                }}
                                className="inline-flex items-center gap-2 px-8 py-3.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200/40 hover:-translate-y-0.5"
                            >
                                Continue
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 2: Company Details */}
                {step === 2 && (
                    <div className="animate-[fade-in_0.4s_ease-out]">
                        <div className="text-center mb-8">
                            <div className="w-16 h-16 bg-teal-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
                                <Users className="w-8 h-8 text-teal-600" />
                            </div>
                            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mb-2 tracking-tight">
                                Company details
                            </h1>
                            <p className="text-slate-500 max-w-sm mx-auto">
                                Optional info that helps us personalize your experience.
                            </p>
                        </div>

                        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
                            {/* Company Website */}
                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                                    Company Website
                                </label>
                                <div className="relative">
                                    <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="url"
                                        value={companyWebsite}
                                        onChange={(e) => setCompanyWebsite(e.target.value)}
                                        placeholder="e.g. https://company.co.jp"
                                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all placeholder:text-slate-300"
                                    />
                                </div>
                            </div>

                            {/* Company Size */}
                            <div className="space-y-2">
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                                    Company Size
                                </label>
                                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                                    {COMPANY_SIZES.map((size) => (
                                        <button
                                            key={size.value}
                                            onClick={() => setCompanySize(size.value)}
                                            className={`p-2.5 rounded-xl text-center border-2 transition-all duration-200 ${
                                                companySize === size.value
                                                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                                    : 'border-slate-100 bg-slate-50 text-slate-600 hover:border-slate-200 hover:bg-white'
                                            }`}
                                        >
                                            <div className="text-xs font-bold">{size.label}</div>
                                            <div className="text-[10px] text-slate-400 mt-0.5">{size.desc}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Industry */}
                            <div className="space-y-2">
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                                    Industry
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {INDUSTRIES.map((ind) => (
                                        <button
                                            key={ind}
                                            onClick={() => setIndustry(ind)}
                                            className={`px-3.5 py-2 rounded-lg text-xs font-semibold border transition-all duration-200 ${
                                                industry === ind
                                                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                                            }`}
                                        >
                                            {ind}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {error && (
                            <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 text-center">
                                {error}
                            </div>
                        )}

                        <div className="mt-6 flex items-center justify-between">
                            <button
                                onClick={() => { setStep(1); setError(''); }}
                                className="inline-flex items-center gap-2 px-5 py-3 text-slate-600 font-semibold text-sm rounded-xl hover:bg-slate-100 transition-all"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Back
                            </button>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => {
                                        // Skip optional step
                                        handleSubmit();
                                    }}
                                    disabled={isSubmitting}
                                    className="text-sm font-medium text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50"
                                >
                                    Skip
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={isSubmitting}
                                    className="inline-flex items-center gap-2 px-8 py-3.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200/40 hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Creating profile...
                                        </>
                                    ) : (
                                        <>
                                            Complete Setup
                                            <CheckCircle2 className="w-4 h-4" />
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function RecruiterOnboardingPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            </div>
        }>
            <OnboardingContent />
        </Suspense>
    );
}
