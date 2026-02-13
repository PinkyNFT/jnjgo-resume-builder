'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowLeft, CheckCircle2, Loader2, Sparkles, FileText, Briefcase, GraduationCap, Award, Brain, X } from 'lucide-react';

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

interface ResumeGeneratingViewProps {
    onCancel: () => void;
    isGenerating: boolean; // true while the API call is in progress
    error?: string | null;
}

export function ResumeGeneratingView({ onCancel, isGenerating, error }: ResumeGeneratingViewProps) {
    const t = useTranslations('Generating');
    const tCommon = useTranslations('Common');

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

    const handleCancelClick = useCallback(() => {
        setShowCancelConfirm(true);
    }, []);

    const handleConfirmCancel = useCallback(() => {
        setShowCancelConfirm(false);
        onCancel();
    }, [onCancel]);

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
        <div className="h-screen flex flex-col bg-linear-to-br from-slate-50 via-white to-indigo-50/30">
            {/* Header with back/cancel */}
            <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 px-6 py-4">
                <div className="max-w-3xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleCancelClick}
                            className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors group"
                        >
                            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                            {t('backToInterview')}
                        </button>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-slate-400">
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
                            <span>{formatTime(elapsed)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main content */}
            <div className="flex-1 flex items-start justify-center px-6 pt-16 pb-8 overflow-y-auto">
                <div className="max-w-2xl w-full space-y-8">
                    {/* Title area */}
                    <div className="text-center space-y-3">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-full text-sm font-semibold">
                            <Sparkles className="w-4 h-4" />
                            {t('title')}
                        </div>
                        <h1 className="text-3xl md:text-4xl font-bold text-slate-900">
                            {t('heading')}
                        </h1>
                        <p className="text-slate-500 text-lg max-w-md mx-auto">
                            {t('description')}
                        </p>
                    </div>

                    {/* Progress bar */}
                    <div className="space-y-2">
                        <div className="flex justify-between text-xs text-slate-500 font-medium">
                            <span>{t('progress')}</span>
                            <span>{Math.round(progressPercent)}%</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-linear-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full transition-all duration-1000 ease-out"
                                style={{ width: `${progressPercent}%` }}
                            />
                        </div>
                    </div>

                    {/* Steps */}
                    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden divide-y divide-slate-100">
                        {STEPS.map((step, index) => {
                            const isCompleted = completedSteps.has(step.id);
                            const isActive = index === currentStepIndex && !isCompleted && !error;
                            const isPending = index > currentStepIndex;

                            return (
                                <div
                                    key={step.id}
                                    className={`flex items-center gap-4 px-5 py-4 transition-all duration-500 ${isActive ? 'bg-indigo-50/50' : isCompleted ? 'bg-green-50/30' : ''
                                        }`}
                                >
                                    {/* Step icon */}
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-500 ${isCompleted
                                        ? 'bg-green-100 text-green-600'
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
                                        <p className={`text-sm font-semibold transition-colors duration-300 ${isCompleted
                                            ? 'text-green-700'
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
                                            <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded-full">
                                                {t('done')}
                                            </span>
                                        )}
                                        {isActive && (
                                            <span className="text-xs font-medium text-indigo-600 bg-indigo-100 px-2 py-1 rounded-full animate-pulse">
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

                    {/* Error state */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-5 space-y-3">
                            <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                                    <X className="w-5 h-5 text-red-600" />
                                </div>
                                <div className="flex-1">
                                    <p className="font-semibold text-red-900">{t('errorTitle')}</p>
                                    <p className="text-sm text-red-700 mt-1">{error}</p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={onCancel}
                                    className="flex-1 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                                >
                                    {t('backToInterview')}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Pro tip carousel */}
                    {!error && (
                        <div className="bg-linear-to-r from-amber-50 to-orange-50 border border-amber-200/60 rounded-xl px-5 py-4">
                            <div className="flex items-start gap-3">
                                <span className="text-lg mt-0.5">💡</span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-1">{t('proTip')}</p>
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
                            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
                                <ArrowLeft className="w-6 h-6 text-amber-600" />
                            </div>
                            <h3 className="font-bold text-lg text-slate-900">{t('cancelTitle')}</h3>
                            <p className="text-sm text-slate-500">{t('cancelDesc')}</p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowCancelConfirm(false)}
                                className="flex-1 py-2.5 text-sm font-semibold text-slate-700 bg-white border-2 border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                            >
                                {t('keepWaiting')}
                            </button>
                            <button
                                onClick={handleConfirmCancel}
                                className="flex-1 py-2.5 text-sm font-semibold text-white bg-red-500 rounded-xl hover:bg-red-600 transition-colors"
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
