'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { ResumeData } from '../../types';
import { BIZREACH_QUESTIONS } from '../../config/bizreachQuestions';
import {
    ChevronLeft,
    ChevronRight,
    Copy,
    Check,
    ExternalLink,
    AlertCircle,
    Sparkles,
    CheckCircle2,
    Type,
    List,
    Calendar,
    ChevronDown,
    ToggleLeft,
    PenLine,
    Minus,
    RotateCcw,
    ClipboardCheck,
    CircleDot,
    Flag,
    ArrowRight,
    FileText,
    UserCheck,
    ListFilter,
    LayoutGrid,
    Layers,
} from 'lucide-react';

const FIELD_TYPE_META: Record<string, { icon: React.ElementType; label: string }> = {
    text: { icon: Type, label: 'Text input' },
    textarea: { icon: PenLine, label: 'Long text' },
    radio: { icon: ToggleLeft, label: 'Select one' },
    dropdown: { icon: ChevronDown, label: 'Dropdown' },
    select: { icon: ListFilter, label: 'Select' },
    date: { icon: Calendar, label: 'Date picker' },
    checkbox: { icon: List, label: 'Multi-select' },
    buttons: { icon: LayoutGrid, label: 'Choose option' },
    multi: { icon: Layers, label: 'Multiple fields' },
    number: { icon: Type, label: 'Number input' },
    none: { icon: Minus, label: 'No input' },
};

// Section metadata for descriptions and icons
const SECTION_META: Record<string, { icon: React.ElementType; description: string }> = {
    'Basic Information': {
        icon: UserCheck,
        description: 'Personal info, contact details, and current employment basics.',
    },
    'Detailed Information': {
        icon: FileText,
        description: 'Work history, career summary, skills, and preferences.',
    },
};

interface BizReachGuideProps {
    resumeData?: ResumeData;
    onClose?: () => void;
}

export default function BizReachGuide({ resumeData, onClose }: BizReachGuideProps) {
    const t = useTranslations('Export');
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});
    const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
    const [showSummary, setShowSummary] = useState(false);
    const [showSectionTransition, setShowSectionTransition] = useState<string | null>(null);
    const [hoveredDot, setHoveredDot] = useState<number | null>(null);

    const question = BIZREACH_QUESTIONS[currentStepIndex];
    const totalQuestions = BIZREACH_QUESTIONS.length;
    const isLastStep = currentStepIndex === totalQuestions - 1;

    const answer = resumeData ? question.getAnswer(resumeData) : null;
    const hasData = answer !== null && answer.trim() !== '';

    const completedCount = useMemo(() => completedSteps.size, [completedSteps]);
    const progressPct = showSummary ? 100 : ((currentStepIndex + 1) / totalQuestions) * 100;
    const fieldMeta = FIELD_TYPE_META[question.fieldType] || FIELD_TYPE_META.none;
    const FieldIcon = fieldMeta.icon;

    // Ordered list of unique sections
    const sectionNames = useMemo(() => {
        const seen = new Set<string>();
        return BIZREACH_QUESTIONS.reduce<string[]>((acc, q) => {
            if (!seen.has(q.section)) { seen.add(q.section); acc.push(q.section); }
            return acc;
        }, []);
    }, []);

    // Current section name
    const currentSection = question.section;

    // Group questions by section with indices
    const sectionGroups = useMemo(() => {
        const groups: Record<string, { indices: number[]; questions: typeof BIZREACH_QUESTIONS }> = {};
        BIZREACH_QUESTIONS.forEach((q, i) => {
            if (!groups[q.section]) {
                groups[q.section] = { indices: [], questions: [] };
            }
            groups[q.section].indices.push(i);
            groups[q.section].questions.push(q);
        });
        return groups;
    }, []);

    // Per-section progress
    const sectionProgress = useMemo(() => {
        const result: Record<string, { total: number; completed: number }> = {};
        for (const [section, group] of Object.entries(sectionGroups)) {
            const completed = group.indices.filter(i => completedSteps.has(i)).length;
            result[section] = { total: group.indices.length, completed };
        }
        return result;
    }, [sectionGroups, completedSteps]);

    // Steps within current section
    const currentSectionGroup = sectionGroups[currentSection];
    const stepWithinSection = currentSectionGroup.indices.indexOf(currentStepIndex);
    const totalInSection = currentSectionGroup.indices.length;

    const markStepCompleted = useCallback(() => {
        setCompletedSteps(prev => {
            const next = new Set(prev);
            next.add(currentStepIndex);
            return next;
        });
    }, [currentStepIndex]);

    const handleCopy = async () => {
        if (!hasData) return;
        try {
            await navigator.clipboard.writeText(answer);
            setCopiedStates({ ...copiedStates, [question.id]: true });
            markStepCompleted();
            setTimeout(() => {
                setCopiedStates(prev => ({ ...prev, [question.id]: false }));
                // Auto-advance to next step after copy
                if (!isLastStep) {
                    const nextIndex = currentStepIndex + 1;
                    const nextQuestion = BIZREACH_QUESTIONS[nextIndex];
                    if (nextQuestion.section !== question.section) {
                        setShowSectionTransition(nextQuestion.section);
                    } else {
                        setCurrentStepIndex(nextIndex);
                    }
                }
            }, 800);
        } catch (err) {
            console.error('Failed to copy', err);
        }
    };

    const handleNext = () => {
        if (currentStepIndex < totalQuestions - 1) {
            const nextIndex = currentStepIndex + 1;
            const nextQuestion = BIZREACH_QUESTIONS[nextIndex];
            // Show transition when entering a new section
            if (nextQuestion.section !== question.section) {
                setShowSectionTransition(nextQuestion.section);
            } else {
                setCurrentStepIndex(nextIndex);
            }
        }
    };

    const handlePrev = () => {
        if (currentStepIndex > 0) {
            setCurrentStepIndex(currentStepIndex - 1);
        }
    };

    const handleJumpToSection = (section: string) => {
        const group = sectionGroups[section];
        if (group) {
            setShowSectionTransition(null);
            setShowSummary(false);
            setCurrentStepIndex(group.indices[0]);
        }
    };

    const handleContinueToSection = () => {
        if (showSectionTransition) {
            const group = sectionGroups[showSectionTransition];
            if (group) {
                setCurrentStepIndex(group.indices[0]);
            }
            setShowSectionTransition(null);
        }
    };

    const handleFinish = () => {
        markStepCompleted();
        setShowSummary(true);
    };

    const handleGoToStep = (index: number) => {
        setShowSummary(false);
        setCurrentStepIndex(index);
    };

    const handleOpenBizReach = () => {
        window.open('https://www.bizreach.jp/', '_blank', 'noreferrer');
    };

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (showSummary || showSectionTransition) return;
            if (e.key === 'ArrowRight') handleNext();
            if (e.key === 'ArrowLeft') handlePrev();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentStepIndex, showSummary, showSectionTransition]);

    // Pre-compute summary stats
    const summaryStats = useMemo(() => {
        const withData: number[] = [];
        const manual: number[] = [];
        BIZREACH_QUESTIONS.forEach((q, i) => {
            const a = resumeData ? q.getAnswer(resumeData) : null;
            if (a && a.trim() !== '') {
                withData.push(i);
            } else {
                manual.push(i);
            }
        });
        return { withData, manual };
    }, [resumeData]);

    return (
        <div className="w-full bg-white rounded-2xl border border-slate-200/80 shadow-xl shadow-slate-200/50 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100">
                <div className="flex items-center justify-between mb-3">
                    <div>
                        <h2 className="text-base font-bold text-slate-900">BizReach Registration Assistant</h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                            {showSummary
                                ? 'Review & Complete'
                                : showSectionTransition
                                    ? 'Section Transition'
                                    : `Step ${stepWithinSection + 1} of ${totalInSection}`
                            }
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleOpenBizReach}
                            className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all duration-200"
                        >
                            Open BizReach <ExternalLink className="w-3 h-3" />
                        </button>
                        {onClose && (
                            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-sm font-bold px-2 py-1.5 transition-colors">
                                Close
                            </button>
                        )}
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="flex items-center gap-3 mb-3">
                    <div className="h-1.5 flex-1 bg-slate-100 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-indigo-500 rounded-full transition-all duration-500 ease-out"
                            style={{ width: `${progressPct}%` }}
                        />
                    </div>
                    <span className="text-[11px] text-slate-400 font-bold tabular-nums whitespace-nowrap">
                        {completedCount}/{totalQuestions} done
                    </span>
                </div>

                {/* Section Tabs */}
                <div className="flex gap-2">
                    {sectionNames.map((section) => {
                        const isActive = !showSummary && !showSectionTransition && currentSection === section;
                        const progress = sectionProgress[section];
                        const allDone = progress.completed === progress.total;
                        const SectionIcon = SECTION_META[section]?.icon || FileText;

                        return (
                            <button
                                key={section}
                                onClick={() => handleJumpToSection(section)}
                                className={`
                                    flex-1 flex items-center gap-2 px-3 py-2 rounded-xl text-left transition-all duration-200 border
                                    ${isActive
                                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300'
                                    }
                                `}
                            >
                                <SectionIcon className={`w-4 h-4 shrink-0 ${isActive ? 'text-indigo-500' : 'text-slate-400'}`} />
                                <div className="min-w-0 flex-1">
                                    <div className="text-xs font-bold truncate">{section}</div>
                                    <div className="text-[10px] text-slate-400 font-medium">
                                        {allDone ? (
                                            <span className="text-emerald-500">Complete</span>
                                        ) : (
                                            `${progress.completed}/${progress.total}`
                                        )}
                                    </div>
                                </div>
                                {allDone && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                            </button>
                        );
                    })}
                    {/* Summary Tab */}
                    <button
                        onClick={() => setShowSummary(true)}
                        className={`
                            flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-200 border
                            ${showSummary
                                ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                                : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300'
                            }
                        `}
                    >
                        <Flag className={`w-4 h-4 shrink-0 ${showSummary ? 'text-indigo-500' : 'text-slate-400'}`} />
                        <div className="text-xs font-bold">Review</div>
                    </button>
                </div>
            </div>

            {/* ====== SECTION TRANSITION VIEW ====== */}
            {showSectionTransition ? (() => {
                const meta = SECTION_META[showSectionTransition] || SECTION_META['Detailed Information'];
                const TransitionIcon = meta.icon;
                const prevSection = sectionNames[sectionNames.indexOf(showSectionTransition) - 1];
                const prevProgress = prevSection ? sectionProgress[prevSection] : null;

                return (
                    <div>
                        <div className="px-6 py-10 text-center bg-slate-50/80">
                            {/* Previous section summary */}
                            {prevProgress && (
                                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold mb-5">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    {prevSection}: {prevProgress.completed}/{prevProgress.total} completed
                                </div>
                            )}

                            <div className="w-14 h-14 bg-indigo-50 border border-indigo-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <TransitionIcon className="w-7 h-7 text-indigo-600" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-1">Up Next: {showSectionTransition}</h3>
                            <p className="text-sm text-slate-500 max-w-sm mx-auto mb-6">
                                {meta.description}
                            </p>
                            <div className="text-xs text-slate-400 mb-6">
                                {sectionGroups[showSectionTransition]?.indices.length} fields in this section
                            </div>

                            <div className="flex items-center justify-center gap-3">
                                <button
                                    onClick={() => setShowSectionTransition(null)}
                                    className="text-slate-500 hover:text-slate-800 text-sm font-bold px-4 py-2 rounded-xl transition-all duration-200"
                                >
                                    Go Back
                                </button>
                                <button
                                    onClick={handleContinueToSection}
                                    className="bg-slate-900 text-white hover:bg-indigo-600 text-sm font-bold px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all duration-200"
                                >
                                    Continue <ArrowRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()

            /* ====== SUMMARY VIEW ====== */
            : showSummary ? (
                <div>
                    {/* Summary Hero */}
                    <div className="px-6 py-8 text-center border-b border-slate-100 bg-slate-50/80">
                        <div className="w-14 h-14 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <Flag className="w-7 h-7 text-emerald-600" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-1">All Steps Reviewed</h3>
                        <p className="text-sm text-slate-500 max-w-md mx-auto">
                            You&apos;ve gone through all {totalQuestions} BizReach registration fields.
                            Open BizReach and paste your data step by step.
                        </p>
                    </div>

                    {/* Stats Row */}
                    <div className="grid grid-cols-3 border-b border-slate-100">
                        <div className="px-4 py-4 text-center border-r border-slate-100">
                            <div className="text-2xl font-bold text-emerald-600">{summaryStats.withData.length}</div>
                            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Auto-filled</div>
                        </div>
                        <div className="px-4 py-4 text-center border-r border-slate-100">
                            <div className="text-2xl font-bold text-amber-500">{summaryStats.manual.length}</div>
                            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Manual</div>
                        </div>
                        <div className="px-4 py-4 text-center">
                            <div className="text-2xl font-bold text-indigo-500">{completedCount}</div>
                            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Completed</div>
                        </div>
                    </div>

                    {/* Section-grouped step listing */}
                    <div className="px-6 py-5 max-h-[50vh] overflow-y-auto space-y-5">
                        {Object.entries(sectionGroups).map(([section, group]) => (
                            <div key={section}>
                                <div className="flex items-center justify-between mb-2">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{section}</h4>
                                    <button
                                        onClick={() => handleJumpToSection(section)}
                                        className="text-[11px] font-bold text-indigo-500 hover:text-indigo-700 transition-colors"
                                    >
                                        Go to section
                                    </button>
                                </div>
                                <div className="space-y-1">
                                    {group.questions.map((q, localIdx) => {
                                        const globalIdx = group.indices[localIdx];
                                        const a = resumeData ? q.getAnswer(resumeData) : null;
                                        const qHasData = a !== null && a.trim() !== '';
                                        const isCompleted = completedSteps.has(globalIdx);

                                        return (
                                            <button
                                                key={q.id}
                                                onClick={() => handleGoToStep(globalIdx)}
                                                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-50 transition-colors text-left group"
                                            >
                                                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                                                    isCompleted
                                                        ? 'bg-emerald-100 text-emerald-600'
                                                        : qHasData
                                                            ? 'bg-indigo-100 text-indigo-500'
                                                            : 'bg-slate-100 text-slate-400'
                                                }`}>
                                                    {isCompleted ? (
                                                        <Check className="w-3 h-3" />
                                                    ) : qHasData ? (
                                                        <ClipboardCheck className="w-3 h-3" />
                                                    ) : (
                                                        <CircleDot className="w-3 h-3" />
                                                    )}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <span className="text-sm text-slate-700 font-medium truncate block">{q.questionJa}</span>
                                                    <span className="text-[11px] text-slate-400">{q.questionEn}</span>
                                                </div>
                                                {!qHasData && (
                                                    <span className="text-[10px] font-bold text-amber-500 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-lg shrink-0">
                                                        Manual
                                                    </span>
                                                )}
                                                {qHasData && !isCompleted && (
                                                    <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-lg shrink-0">
                                                        Ready
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Summary Footer */}
                    <div className="border-t border-slate-100 px-6 py-4 flex items-center justify-between bg-slate-50/50">
                        <button
                            onClick={() => setShowSummary(false)}
                            className="text-slate-500 hover:text-slate-800 text-sm font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 transition-all duration-200"
                        >
                            <RotateCcw className="w-3.5 h-3.5" /> Back to Steps
                        </button>
                        <button
                            onClick={handleOpenBizReach}
                            className="bg-slate-900 text-white hover:bg-indigo-600 text-sm font-bold px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all duration-200"
                        >
                            Open BizReach & Start <ExternalLink className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            ) : (
                /* ====== STEP VIEW ====== */
                <>
                    {/* Question Section */}
                    <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/80">
                        <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                                    {question.section} — {stepWithinSection + 1}/{totalInSection}
                                </span>
                                <h3 className="text-lg font-bold text-slate-900 leading-snug">{question.questionJa}</h3>
                                <p className="text-xs text-slate-500 mt-1">{question.questionEn}</p>
                            </div>
                            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 shrink-0">
                                <FieldIcon className="w-3.5 h-3.5 text-slate-400" />
                                <span className="text-[11px] font-medium text-slate-500">{fieldMeta.label}</span>
                            </div>
                        </div>
                    </div>

                    {/* Content Body */}
                    <div className="px-6 py-5 space-y-4">

                        {/* Tip */}
                        <div className="bg-indigo-50/80 border border-indigo-100 px-4 py-3 rounded-xl text-sm text-indigo-800">
                            {t(question.tipKey as any) || `This field requires a ${question.fieldType} input on BizReach.`}
                        </div>

                        {/* Data Extraction */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                    <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                                    Extracted Data
                                </label>
                                {copiedStates[question.id] && (
                                    <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                                        <Check className="w-3 h-3" /> Copied — advancing...
                                    </span>
                                )}
                            </div>

                            <div className="relative group">
                                {hasData ? (
                                    <div className={`
                                        p-4 rounded-xl border transition-all duration-200
                                        ${copiedStates[question.id] ? 'border-emerald-300 bg-emerald-50/50' : 'border-slate-200 bg-white hover:border-slate-300'}
                                    `}>
                                        {question.fieldType === 'textarea' ? (
                                            <pre className="text-sm font-mono text-slate-700 whitespace-pre-wrap leading-relaxed max-h-[60vh] overflow-y-auto pr-10">
                                                {answer}
                                            </pre>
                                        ) : (
                                            <p className="text-sm text-slate-800 pr-10">
                                                {answer}
                                            </p>
                                        )}
                                    </div>
                                ) : (
                                    <div className="p-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/80 flex items-center gap-3">
                                        <AlertCircle className="w-4 h-4 text-slate-400 shrink-0" />
                                        <div>
                                            <h4 className="text-sm font-bold text-slate-600">No data extracted</h4>
                                            <p className="text-xs text-slate-500">
                                                This field needs to be filled manually on BizReach.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Copy Button */}
                                {hasData && (
                                    <button
                                        onClick={handleCopy}
                                        className={`
                                            absolute top-3 right-3
                                            p-2 rounded-lg border transition-all duration-200
                                            ${copiedStates[question.id]
                                                ? 'bg-emerald-500 border-emerald-500 text-white'
                                                : 'bg-white border-slate-200 text-slate-400 hover:text-slate-700 hover:border-slate-300 hover:shadow-sm opacity-0 group-hover:opacity-100'
                                            }
                                        `}
                                        title="Copy to clipboard"
                                    >
                                        {copiedStates[question.id] ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                    </button>
                                )}
                            </div>
                        </div>

                    </div>

                    {/* Footer Nav */}
                    <div className="border-t border-slate-100 px-6 py-3.5 flex items-center justify-between bg-slate-50/50">
                        <button
                            onClick={handlePrev}
                            disabled={currentStepIndex === 0}
                            className="text-slate-500 hover:text-slate-800 text-sm font-bold px-3 py-2 rounded-xl flex items-center gap-1 transition-all duration-200 disabled:opacity-30 disabled:hover:text-slate-500"
                        >
                            <ChevronLeft className="w-4 h-4" /> Previous
                        </button>

                        {/* In-section step dots */}
                        <div className="flex gap-0.5 items-end relative">
                            {currentSectionGroup.indices.map((globalIdx, i) => {
                                const isActive = globalIdx === currentStepIndex;
                                const isDone = completedSteps.has(globalIdx);
                                const isHovered = hoveredDot === globalIdx;

                                return (
                                    <div key={globalIdx} className="relative flex flex-col items-center">
                                        {/* Tooltip */}
                                        {isHovered && (
                                            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                                                <div className="bg-slate-800 text-white text-[11px] font-medium px-2.5 py-1.5 rounded-lg whitespace-nowrap shadow-lg">
                                                    <span className="font-bold">{i + 1}.</span> {BIZREACH_QUESTIONS[globalIdx].questionEn}
                                                </div>
                                                <div className="w-2 h-2 bg-slate-800 rotate-45 mx-auto -mt-1" />
                                            </div>
                                        )}
                                        <button
                                            onClick={() => setCurrentStepIndex(globalIdx)}
                                            onMouseEnter={() => setHoveredDot(globalIdx)}
                                            onMouseLeave={() => setHoveredDot(null)}
                                            className={`
                                                rounded-full transition-all duration-200 cursor-pointer
                                                ${isActive
                                                    ? 'w-6 h-6 bg-indigo-500 text-white text-[10px] font-bold flex items-center justify-center'
                                                    : isDone
                                                        ? 'w-4 h-4 bg-emerald-100 text-emerald-600 text-[9px] font-bold flex items-center justify-center hover:bg-emerald-200'
                                                        : 'w-4 h-4 bg-slate-100 text-slate-400 text-[9px] font-medium flex items-center justify-center hover:bg-slate-200'
                                                }
                                            `}
                                        >
                                            {isActive ? i + 1 : isDone ? <Check className="w-2.5 h-2.5" /> : i + 1}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>

                        {isLastStep ? (
                            <button
                                onClick={handleFinish}
                                className="bg-emerald-600 text-white hover:bg-emerald-500 text-sm font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all duration-200"
                            >
                                Finish & Review <Flag className="w-4 h-4" />
                            </button>
                        ) : (
                            <button
                                onClick={() => {
                                    markStepCompleted();
                                    handleNext();
                                }}
                                className="bg-slate-900 text-white hover:bg-indigo-600 text-sm font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all duration-200"
                            >
                                {hasData && !copiedStates[question.id] && !completedSteps.has(currentStepIndex)
                                    ? 'Skip & Next'
                                    : 'Next Step'} <ChevronRight className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
