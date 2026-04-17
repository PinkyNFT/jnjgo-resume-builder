'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState, useEffect } from 'react';
import {
    Building2, Briefcase, Phone, Globe, Users, Loader2,
    ArrowRight, CheckCircle2, ArrowLeft
} from 'lucide-react';
import { useTranslations } from 'next-intl';

function OnboardingContent() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get('callbackUrl');
    const t = useTranslations('RecruiterOnboarding');

    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    // Form state
    const [companyName, setCompanyName] = useState('');
    const [jobTitle, setJobTitle] = useState('');
    const [recruiterType, setRecruiterType] = useState<'in_house' | 'agency' | ''>('');
    const [phone, setPhone] = useState('');
    const [companyWebsite, setCompanyWebsite] = useState('');
    const [companySize, setCompanySize] = useState('');
    const [industry, setIndustry] = useState('');

    const COMPANY_SIZES = [
        { value: 'startup', label: t('sizeStartup'), desc: t('sizeStartupDesc') },
        { value: 'small', label: t('sizeSmall'), desc: t('sizeSmallDesc') },
        { value: 'medium', label: t('sizeMedium'), desc: t('sizeMediumDesc') },
        { value: 'large', label: t('sizeLarge'), desc: t('sizeLargeDesc') },
        { value: 'enterprise', label: t('sizeEnterprise'), desc: t('sizeEnterpriseDesc') },
    ] as const;

    const INDUSTRIES = [
        t('industryIT'),
        t('industryRecruiting'),
        t('industryConsulting'),
        t('industryFinance'),
        t('industryManufacturing'),
        t('industryHealthcare'),
        t('industryEducation'),
        t('industryOther'),
    ] as const;

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/auth/signin');
        }
    }, [status, router]);

    useEffect(() => {
        if (session?.user?.role && session.user.role !== 'recruiter' && session.user.role !== 'pending_recruiter') {
            router.push('/dashboard');
        }
    }, [session, router]);

    const handleSubmit = async () => {
        if (!companyName.trim() || !jobTitle.trim()) {
            setError(t('requiredError'));
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
                    recruiterType: recruiterType || undefined,
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

            if (session?.user?.role === 'pending_recruiter') {
                router.push('/auth/pending-approval');
            } else {
                router.push(callbackUrl || '/recruiter/dashboard');
            }
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
                    <span className="text-xs font-semibold text-slate-400 ml-2">{t('stepOf', { step })}</span>
                </div>

                {/* Step 1: Essential Info */}
                {step === 1 && (
                    <div className="animate-[fade-in_0.4s_ease-out]">
                        <div className="text-center mb-8">
                            <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
                                <Building2 className="w-8 h-8 text-emerald-600" />
                            </div>
                            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mb-2 tracking-tight">
                                {t('step1Title')}
                            </h1>
                            <p className="text-slate-500 max-w-sm mx-auto">
                                {t('step1Subtitle')}
                            </p>
                        </div>

                        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
                            {/* Company Name */}
                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                                    {t('companyName')} <span className="text-red-400">*</span>
                                </label>
                                <div className="relative">
                                    <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="text"
                                        value={companyName}
                                        onChange={(e) => setCompanyName(e.target.value)}
                                        placeholder={t('companyNamePlaceholder')}
                                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all placeholder:text-slate-300"
                                    />
                                </div>
                            </div>

                            {/* Job Title */}
                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                                    {t('jobTitle')} <span className="text-red-400">*</span>
                                </label>
                                <div className="relative">
                                    <Briefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="text"
                                        value={jobTitle}
                                        onChange={(e) => setJobTitle(e.target.value)}
                                        placeholder={t('jobTitlePlaceholder')}
                                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all placeholder:text-slate-300"
                                    />
                                </div>
                            </div>

                            {/* Recruiter Type */}
                            <div className="space-y-2">
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                                    {t('recruiterType')} <span className="text-slate-300 normal-case">{t('optional')}</span>
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setRecruiterType(recruiterType === 'in_house' ? '' : 'in_house')}
                                        className={`p-4 rounded-xl text-left border-2 transition-all duration-200 ${recruiterType === 'in_house'
                                            ? 'border-emerald-500 bg-emerald-50'
                                            : 'border-slate-100 bg-slate-50 hover:border-slate-200 hover:bg-white'
                                            }`}
                                    >
                                        <Building2 className={`w-5 h-5 mb-2 ${recruiterType === 'in_house' ? 'text-emerald-600' : 'text-slate-400'}`} />
                                        <div className={`text-sm font-bold ${recruiterType === 'in_house' ? 'text-emerald-700' : 'text-slate-700'}`}>{t('inHouse')}</div>
                                        <div className="text-[10px] text-slate-400 mt-0.5">{t('inHouseDesc')}</div>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setRecruiterType(recruiterType === 'agency' ? '' : 'agency')}
                                        className={`p-4 rounded-xl text-left border-2 transition-all duration-200 ${recruiterType === 'agency'
                                            ? 'border-emerald-500 bg-emerald-50'
                                            : 'border-slate-100 bg-slate-50 hover:border-slate-200 hover:bg-white'
                                            }`}
                                    >
                                        <Users className={`w-5 h-5 mb-2 ${recruiterType === 'agency' ? 'text-emerald-600' : 'text-slate-400'}`} />
                                        <div className={`text-sm font-bold ${recruiterType === 'agency' ? 'text-emerald-700' : 'text-slate-700'}`}>{t('agency')}</div>
                                        <div className="text-[10px] text-slate-400 mt-0.5">{t('agencyDesc')}</div>
                                    </button>
                                </div>
                            </div>

                            {/* Phone (optional) */}
                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                                    {t('phone')} <span className="text-slate-300 normal-case">{t('optional')}</span>
                                </label>
                                <div className="relative">
                                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="tel"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        placeholder={t('phonePlaceholder')}
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
                                        setError(t('requiredError'));
                                        return;
                                    }
                                    setError('');
                                    setStep(2);
                                }}
                                className="inline-flex items-center gap-2 px-8 py-3.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200/40 hover:-translate-y-0.5"
                            >
                                {t('continue')}
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
                                {t('step2Title')}
                            </h1>
                            <p className="text-slate-500 max-w-sm mx-auto">
                                {t('step2Subtitle')}
                            </p>
                        </div>

                        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
                            {/* Company Website */}
                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                                    {t('companyWebsite')}
                                </label>
                                <div className="relative">
                                    <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="url"
                                        value={companyWebsite}
                                        onChange={(e) => setCompanyWebsite(e.target.value)}
                                        placeholder={t('companyWebsitePlaceholder')}
                                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all placeholder:text-slate-300"
                                    />
                                </div>
                            </div>

                            {/* Company Size */}
                            <div className="space-y-2">
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                                    {t('companySize')}
                                </label>
                                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                                    {COMPANY_SIZES.map((size) => (
                                        <button
                                            key={size.value}
                                            onClick={() => setCompanySize(size.value)}
                                            className={`p-2.5 rounded-xl text-center border-2 transition-all duration-200 ${companySize === size.value
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
                                    {t('industry')}
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {INDUSTRIES.map((ind) => (
                                        <button
                                            key={ind}
                                            onClick={() => setIndustry(ind)}
                                            className={`px-3.5 py-2 rounded-lg text-xs font-semibold border transition-all duration-200 ${industry === ind
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
                                {t('back')}
                            </button>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={handleSubmit}
                                    disabled={isSubmitting}
                                    className="text-sm font-medium text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50"
                                >
                                    {t('skip')}
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={isSubmitting}
                                    className="inline-flex items-center gap-2 px-8 py-3.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200/40 hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            {t('creatingProfile')}
                                        </>
                                    ) : (
                                        <>
                                            {t('completeSetup')}
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
