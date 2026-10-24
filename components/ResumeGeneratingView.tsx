'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowLeft, CheckCircle2, Loader2, Sparkles, FileText, Briefcase, GraduationCap, Award, Brain, X, Clock, RefreshCcw } from 'lucide-react';
import { formatCreditReset } from '../hooks/useAiCredits';
import { GenerationError, waitText } from '../utils/generationError';

interface GeneratingStep {
    id: string;
    labelKey: string;
    icon: React.ReactNode;
    duration: number; // ms to "complete" this step
}

const STEPS: GeneratingStep[] = [
    { id: 'analyzing', labelKey: 'stepAnalyzing', icon: <Brain className="w-5 h-5" />, duration: 2800 },
    { id: 'work', labelKey: 'stepWork', icon: <Briefcase className="w-5 h-5" />, duration: 3200 },
    { id: 'projects', labelKey: 'stepProjects', icon: <Sparkles className="w-5 h-5" />, duration: 2500 },
    { id: 'education', labelKey: 'stepEducation', icon: <GraduationCap className="w-5 h-5" />, duration: 1800 },
    { id: 'skills', labelKey: 'stepSkills', icon: <Award className="w-5 h-5" />, duration: 2000 },
    { id: 'finalizing', labelKey: 'stepFinalizing', icon: <FileText className="w-5 h-5" />, duration: 2200 },
];

// Fun tips shown while generating
const TIP_KEYS = ['tip1', 'tip2', 'tip3', 'tip4', 'tip5'] as const;

/** Seconds before "Try again" unlocks after the AI was busy (per-minute limits clear within a minute). */
const BUSY_WAIT_SECONDS = 60;

interface ResumeGeneratingViewProps {
    onCancel: () => void;
    /** Run generation again from the saved interview. */
    onRetry?: () => void;
    isGenerating: boolean; // true while the API call is in progress
    error?: GenerationError | null;
}

export function ResumeGeneratingView({ onCancel, onRetry, isGenerating, error }: ResumeGeneratingViewProps) {
    const t = useTranslations('Generating');
    const tCommon = useTranslations('Common');
    const locale = useLocale();

    // A clock that ticks while an error is shown: drives the "Try again in 42s"
    // countdown after the AI was busy, and "in about 3 h 20 min" for credits.
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        if (!error) return;
        const timer = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(timer);
    }, [error]);
    const retryIn = error?.kind === 'busy' ? Math.max(0, BUSY_WAIT_SECONDS - Math.floor((now - error.at) / 1000)) : 0;
    const creditsReset = error?.kind === 'credits' && error.resetAt
        ? { time: formatCreditReset(error.resetAt, locale).time, wait: waitText(error.resetAt, locale, now) }
        : null;

    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
    const [tipIndex, setTipIndex] = useState(0);
    const [elapsed, setElapsed] = useState(0);
    const [showCancelConfirm, setShowCancelConfirm] = useState(false);

    // Animate through steps progressively
    useEffect(() => {
        if (!isGenerating || error) return;

        const step = STEPS[currentStepIndex];
        if (!step) return;

        const timer = setTimeout(() => {
            setCompletedSteps(prev => new Set([...prev, step.id]));
            if (currentStepIndex < STEPS.length - 1) {
                setCurrentStepIndex(prev => prev + 1);
            }
        }, step.duration);

        return () => clearTimeout(timer);
    }, [currentStepIndex, isGenerating, error]);

    // Cycle through tips
    useEffect(() => {
        const tipTimer = setInterval(() => {
            setTipIndex(prev => (prev + 1) % TIP_KEYS.length);
        }, 5000);
        return () => clearInterval(tipTimer);
    }, []);

    // Timer
    useEffect(() => {
        if (!isGenerating || error) return;
        const timer = setInterval(() => setElapsed(prev => prev + 1), 1000);
        return () => clearInterval(timer);
    }, [isGenerating, error]);

    const handleCancelClick = () => {
        setShowCancelConfirm(true);
    };

    const handleConfirmCancel = () => {
        setShowCancelConfirm(false);
        onCancel();
    };

    const progressPercent = Math.min(
        ((completedSteps.size) / STEPS.length) * 100,
        isGenerating ? 95 : 100
    );

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return m > 0 ? `${m}m ${s}s` : `${s}s`;
    };

    return (
        <div className="h-screen flex flex-col bg-linear-to-br from-slate-50 via-white to-indigo-50/30 page-transition">
            {/* Header with back/cancel */}
            <div className="sticky top-0 z-30 glass border-b border-slate-200/60 px-6 py-4 shadow-sm">
                <div className="max-w-3xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleCancelClick}
                            className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-all duration-200 group font-medium"
                        >
                            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                            {t('backToInterview')}
                        </button>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-slate-400 font-medium">
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
                            <span className="tabular-nums">{formatTime(elapsed)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main content */}
            <div className="flex-1 flex items-start justify-center px-6 pt-16 pb-8 overflow-y-auto">
                <div className="max-w-2xl w-full space-y-8">
                    {/* Title area */}
                    <div className="text-center space-y-3">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-full text-sm font-bold border border-indigo-100">
                            <Sparkles className="w-4 h-4" />
                            {t('title')}
                        </div>
                        <h1 className="text-3xl md:text-4xl font-black text-slate-900">
                            {t('heading')}
                        </h1>
                        <p className="text-slate-400 text-lg max-w-md mx-auto">
                            {t('description')}
                        </p>
                    </div>

                    {/* Progress bar */}
                    <div className="space-y-2">
                        <div className="flex justify-between text-xs text-slate-500 font-bold">
                            <span>{t('progress')}</span>
                            <span className="tabular-nums">{Math.round(progressPercent)}%</span>
                        </div>
                        <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-linear-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full transition-all duration-1000 ease-out"
                                style={{ width: `${progressPercent}%` }}
                            />
                        </div>
                    </div>

                    {/* Steps */}
                    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-lg shadow-slate-200/40 overflow-hidden divide-y divide-slate-100">
                        {STEPS.map((step, index) => {
                            const isCompleted = completedSteps.has(step.id);
                            const isActive = index === currentStepIndex && !isCompleted && !error;
                            const isPending = index > currentStepIndex;

                            return (
                                <div
                                    key={step.id}
                                    className={`flex items-center gap-4 px-5 py-4 transition-all duration-500 ${isActive ? 'bg-indigo-50/50' : isCompleted ? 'bg-emerald-50/30' : ''
                                        }`}
                                >
                                    {/* Step icon */}
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-500 ${isCompleted
                                        ? 'bg-emerald-100 text-emerald-600'
                                        : isActive
                                            ? 'bg-indigo-100 text-indigo-600'
                                            : 'bg-slate-100 text-slate-400'
                                        }`}>
                                        {isCompleted ? (
                                            <CheckCircle2 className="w-5 h-5" />
                                        ) : isActive ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : (
                                            step.icon
                                        )}
                                    </div>

                                    {/* Step label */}
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm font-bold transition-colors duration-300 ${isCompleted
                                            ? 'text-emerald-700'
                                            : isActive
                                                ? 'text-indigo-700'
                                                : 'text-slate-400'
                                            }`}>
                                            {t(step.labelKey)}
                                        </p>
                                    </div>

                                    {/* Status badge */}
                                    <div className="shrink-0">
                                        {isCompleted && (
                                            <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-2.5 py-1 rounded-full">
                                                {t('done')}
                                            </span>
                                        )}
                                        {isActive && (
                                            <span className="text-xs font-bold text-indigo-600 bg-indigo-100 px-2.5 py-1 rounded-full animate-pulse">
                                                {t('inProgress')}
                                            </span>
                                        )}
                                        {isPending && (
                                            <span className="text-xs font-medium text-slate-400">
                                                {t('pending')}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Error state: what happened, that the interview is safe, and when to try again */}
                    {error && (
                        <div role="alert" className={`rounded-xl p-5 space-y-4 border ${error.kind === 'failed' ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
                            <div className="flex items-start gap-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${error.kind === 'failed' ? 'bg-red-100' : 'bg-amber-100'}`}>
                                    {error.kind === 'failed' ? <X className="w-5 h-5 text-red-600" /> : <Clock className="w-5 h-5 text-amber-600" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={`font-semibold ${error.kind === 'failed' ? 'text-red-900' : 'text-amber-900'}`}>
                                        {error.kind === 'credits' ? t('creditsTitle') : error.kind === 'busy' ? t('busyTitle') : t('errorTitle')}
                                    </p>
                                    <p className={`text-sm mt-1 leading-relaxed ${error.kind === 'failed' ? 'text-red-700' : 'text-amber-800'}`}>
                                        {error.kind === 'credits'
                                            ? (creditsReset ? t('creditsBody', creditsReset) : error.message)
                                            : error.kind === 'busy' ? t('busyBody') : `${error.message} ${t('savedNote')}`}
                                    </p>
                                    {error.kind === 'credits' && (
                                        <Link href="/beta#credits" className="inline-block mt-2 text-xs font-semibold text-amber-900 underline hover:no-underline">
                                            {t('howCreditsWork')}
                                        </Link>
                                    )}
                                </div>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-3">
                                {onRetry && (
                                    <button
                                        onClick={onRetry}
                                        disabled={error.kind === 'credits' || retryIn > 0}
                                        className="flex-1 py-2.5 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2 disabled:bg-slate-300 disabled:text-slate-600 disabled:cursor-not-allowed disabled:active:scale-100"
                                    >
                                        <RefreshCcw className="w-4 h-4" />
                                        {error.kind === 'credits' && creditsReset
                                            ? t('retryAt', { time: creditsReset.time })
                                            : retryIn > 0 ? t('retryIn', { seconds: retryIn }) : t('retry')}
                                    </button>
                                )}
                                <button
                                    onClick={onCancel}
                                    className="flex-1 py-2.5 text-sm font-bold text-slate-700 bg-white border-2 border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 active:scale-[0.98]"
                                >
                                    {t('backToInterview')}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Pro tip carousel */}
                    {!error && (
                        <div className="bg-linear-to-r from-amber-50 to-orange-50 border border-amber-200/60 rounded-2xl px-5 py-4">
                            <div className="flex items-start gap-3">
                                <span className="text-lg mt-0.5">💡</span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-1">{t('proTip')}</p>
                                    <p className="text-sm text-amber-900 leading-relaxed transition-opacity duration-500" key={tipIndex}>
                                        {t(TIP_KEYS[tipIndex])}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Cancel button - always visible */}
                    {!error && (
                        <div className="text-center">
                            <button
                                onClick={handleCancelClick}
                                className="text-sm text-slate-400 hover:text-slate-600 transition-colors underline underline-offset-2"
                            >
                                {tCommon('cancel')}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Cancel confirmation dialog */}
            {showCancelConfirm && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4 animate-in zoom-in-95 duration-200">
                        <div className="text-center space-y-2">
                            <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto">
                                <ArrowLeft className="w-6 h-6 text-amber-600" />
                            </div>
                            <h3 className="font-black text-lg text-slate-900">{t('cancelTitle')}</h3>
                            <p className="text-sm text-slate-400">{t('cancelDesc')}</p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowCancelConfirm(false)}
                                className="flex-1 py-2.5 text-sm font-bold text-slate-700 bg-white border-2 border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 active:scale-[0.98]"
                            >
                                {t('keepWaiting')}
                            </button>
                            <button
                                onClick={handleConfirmCancel}
                                className="flex-1 py-2.5 text-sm font-bold text-white bg-red-500 rounded-xl hover:bg-red-600 transition-all duration-200 shadow-lg shadow-red-200/50 active:scale-[0.98]"
                            >
                                {t('confirmCancel')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
