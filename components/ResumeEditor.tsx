'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import { ResumeData, ResumeVersion, Project, EvaluationResult } from '../types';
import { evaluateResume } from '../services/geminiService';
import { saveProject, createVersion } from '../services/storageService';
import { VersionHistory } from './VersionHistory';
import { ResumePhoto } from './ResumePhoto';
import { Printer, Save, BarChart3, AlertTriangle, RefreshCcw, ArrowLeft, CheckCircle2, MessageSquare, Eye, X, RotateCcw, Share2 } from 'lucide-react';
import { toast } from '../lib/toast';
import { TimelineChart, TimelineChartItem } from './TimelineChart';
import { parsePeriod } from '../utils/dateParser';
import { insertGapsInTimeline } from '../utils/timelineGenerator';
import { resumeFileName } from '../utils/fileName';
import { useQueryClient } from '@tanstack/react-query';
import { useAiCreditsPaused } from './AiCredits';
import { AI_CREDITS_KEY } from '../hooks/useAiCredits';

interface ResumeEditorProps {
    project: Project;
    // Autosave: called (debounced) with the latest edits
    onUpdate: (data: ResumeData, evaluation?: EvaluationResult) => void;
    onBack: () => void;
    onResumeInterview?: (data: ResumeData, evaluation?: EvaluationResult) => void;
}

const AUTOSAVE_DELAY_MS = 1500;

const ScoreBar = ({ label, score, max, colorClass, description }: { label: string, score: number, max: number, colorClass: string, description?: string }) => (
    <div className="group relative">
        <div className="flex justify-between items-end mb-1.5">
            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">{label}</span>
            <span className="text-[10px] font-bold text-slate-500 tabular-nums">{score}/{max}</span>
        </div>
        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
            <div
                className={`h-full rounded-full transition-all duration-1000 ease-out ${colorClass}`}
                style={{ width: `${Math.min((score / max) * 100, 100)}%` }}
            />
        </div>
        {/* Tooltip on hover */}
        {description && (
            <div className="absolute bottom-full left-0 mb-2 w-52 p-2.5 bg-slate-800 text-white text-[9px] rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-xl leading-relaxed">
                {description}
                <div className="absolute top-full left-4 -mt-1 border-4 border-transparent border-t-slate-800"></div>
            </div>
        )}
    </div>
);

export const ResumeEditor: React.FC<ResumeEditorProps> = ({ project, onUpdate, onBack, onResumeInterview }) => {
    const t = useTranslations('Editor');
    const tCredits = useTranslations('Credits');
    const creditsPaused = useAiCreditsPaused();
    const queryClient = useQueryClient();
    const locale = useLocale();
    const [data, setData] = useState<ResumeData>(project.data!);
    const [evaluation, setEvaluation] = useState<EvaluationResult | undefined>(project.evaluation);
    const [isEvaluating, setIsEvaluating] = useState(false);
    const [activeTab, setActiveTab] = useState<'preview' | 'edit'>('preview');
    const [showResumeInterviewConfirm, setShowResumeInterviewConfirm] = useState(false);
    const [previewVersion, setPreviewVersion] = useState<ResumeVersion | null>(null);
    const [isExporting, setIsExporting] = useState(false);

    // When previewing a version, show its data read-only; otherwise show the live data
    const displayData = previewVersion ? previewVersion.data : data;
    const isPreviewMode = previewVersion !== null;

    // Autosave edits (debounced) so they survive "Back to Dashboard", reloads and
    // resuming the interview. Score analysis and Save as Complete still save
    // immediately and cancel any pending autosave so it can't overwrite them.
    const onUpdateRef = useRef(onUpdate);
    const pendingSave = useRef<{ data: ResumeData; evaluation?: EvaluationResult } | null>(null);
    useEffect(() => { onUpdateRef.current = onUpdate; }, [onUpdate]);
    useEffect(() => {
        if (data === project.data && evaluation === project.evaluation) return; // nothing changed since load/last save
        pendingSave.current = { data, evaluation };
        const timer = setTimeout(() => {
            const pending = pendingSave.current;
            pendingSave.current = null;
            if (pending) onUpdateRef.current(pending.data, pending.evaluation);
        }, AUTOSAVE_DELAY_MS);
        return () => clearTimeout(timer);
    }, [data, evaluation, project.data, project.evaluation]);
    // Flush a pending autosave when the editor closes.
    useEffect(() => () => {
        const pending = pendingSave.current;
        pendingSave.current = null;
        if (pending) onUpdateRef.current(pending.data, pending.evaluation);
    }, []);

    // Generate employer timeline data from work experience
    const employerTimelineData = useMemo((): TimelineChartItem[] => {
        if (!displayData.workExperience || displayData.workExperience.length === 0) {
            // Fallback to timeline items if work experience is not available
            const workItems = displayData.timeline?.filter(item => item.type === 'work') || [];
            const items = workItems
                .map(item => {
                    const parsed = parsePeriod(item.period);
                    if (!parsed) return null;
                    return {
                        id: item.id,
                        label: item.organization,
                        startYear: parsed.startYear,
                        endYear: parsed.endYear,
                        startMonth: parsed.startMonth,
                        endMonth: parsed.endMonth
                    };
                })
                .filter((item): item is NonNullable<typeof item> => item !== null);

            // Insert gaps
            return insertGapsInTimeline(items);
        }

        const items = displayData.workExperience
            .map(work => {
                const parsed = parsePeriod(work.period);
                if (!parsed) return null;
                return {
                    id: work.id,
                    label: work.company,
                    startYear: parsed.startYear,
                    endYear: parsed.endYear,
                    startMonth: parsed.startMonth,
                    endMonth: parsed.endMonth
                };
            })
            .filter((item): item is NonNullable<typeof item> => item !== null);

        // Insert gaps
        return insertGapsInTimeline(items);
    }, [displayData.workExperience, displayData.timeline]);

    // Generate skill timeline data
    const skillTimelineData = useMemo((): TimelineChartItem[] => {
        if (!displayData.skillTimelines || displayData.skillTimelines.length === 0) {
            return [];
        }

        const items = displayData.skillTimelines
            .map(skill => {
                const parsed = parsePeriod(skill.period);
                if (!parsed) return null;
                return {
                    id: skill.id,
                    label: skill.skillName,
                    startYear: parsed.startYear,
                    endYear: parsed.endYear,
                    startMonth: parsed.startMonth,
                    endMonth: parsed.endMonth
                };
            })
            .filter((item): item is NonNullable<typeof item> => item !== null);

        // Insert gaps
        return insertGapsInTimeline(items);
    }, [displayData.skillTimelines]);

    const handleRunEvaluation = async () => {
        setIsEvaluating(true);
        try {
            const result = await evaluateResume(data, project.roleType, locale);
            setEvaluation(result);
            pendingSave.current = null; // saved below
            const updatedProject = { ...project, evaluation: result, data: data };
            await saveProject(updatedProject);
            // Auto-version after evaluation
            await createVersion(
                project.id,
                `Score: ${result.totalScore}/100 — ${new Date().toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
                'auto_evaluated',
                data,
                result
            );
        } catch (e) {
            console.error(e);
            toast.error(e instanceof Error && e.message ? e.message : t('evaluationFailed'));
        } finally {
            setIsEvaluating(false);
            // Scoring uses a beta AI credit: refresh the meter.
            queryClient.invalidateQueries({ queryKey: AI_CREDITS_KEY });
        }
    };

    const timelineLabels = useMemo(
        () => ({ present: t('timelinePresent'), gap: t('timelineGapLabel'), labelPlaceholder: t('timelineLabelPlaceholder') }),
        [t]
    );

    // Handle employer timeline label changes
    const handleEmployerLabelChange = (itemId: string, newLabel: string) => {
        // Check if it's a gap item
        if (itemId.startsWith('gap-')) {
            // For now, gaps are not persisted, so we just update the memo
            // You could add a separate gaps array if you want to persist custom gap labels
            return;
        }

        // Update workExperience company name
        if (data.workExperience) {
            const newWorkExperience = data.workExperience.map(work =>
                work.id === itemId ? { ...work, company: newLabel } : work
            );
            setData({ ...data, workExperience: newWorkExperience });
        }
    };

    // Handle skill timeline label changes
    const handleSkillLabelChange = (itemId: string, newLabel: string) => {
        // Check if it's a gap item
        if (itemId.startsWith('gap-')) {
            return;
        }

        // Update skillTimelines skillName
        if (data.skillTimelines) {
            const newSkillTimelines = data.skillTimelines.map(skill =>
                skill.id === itemId ? { ...skill, skillName: newLabel } : skill
            );
            setData({ ...data, skillTimelines: newSkillTimelines });
        }
    };

    const handleSaveComplete = async () => {
        pendingSave.current = null; // saved below — a late autosave would revert the status
        try {
            const updatedProject = {
                ...project,
                data,
                evaluation,
                status: 'completed' as const,
                updatedAt: Date.now()
            };
            await saveProject(updatedProject);
            // Auto-version when saving as complete
            await createVersion(
                project.id,
                `Completed — ${new Date().toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
                'auto_saved',
                data,
                evaluation
            );
            toast.success(t('saved'));
            onBack();
        } catch (error) {
            console.error('Failed to save project:', error);
            toast.error(t('saveFailed'));
        }
    };

    const handleRestoreVersion = (restoredData: ResumeData, restoredEvaluation?: EvaluationResult) => {
        setData(restoredData);
        if (restoredEvaluation) {
            setEvaluation(restoredEvaluation);
        }
        // Exit preview mode after restoring
        setPreviewVersion(null);
    };

    const handlePreviewVersion = (version: ResumeVersion | null) => {
        setPreviewVersion(version);
        if (version) setActiveTab('preview');
    };

    const handleRestoreFromPreview = async () => {
        if (previewVersion) {
            // Create a safety snapshot of current state before restoring
            try {
                const now = new Date();
                const formatted = now.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
                await createVersion(
                    project.id,
                    `${t('preRestoreBackup')} — ${formatted}`,
                    'auto_pre_restore',
                    data,
                    evaluation
                );
            } catch {
                // Non-blocking: proceed with restore even if backup fails
            }
            handleRestoreVersion(previewVersion.data, previewVersion.evaluation);
        }
    };

    const handlePrint = () => {
        // The browser uses document.title as the suggested "Save as PDF" filename.
        // Swap it to "Resume <name>" for the duration of the print, then restore.
        const original = document.title;
        document.title = resumeFileName(displayData.fullName);
        const restore = () => { document.title = original; };
        window.addEventListener('afterprint', restore, { once: true });
        window.print();
        // Fallback restore in case afterprint doesn't fire (some browsers).
        setTimeout(restore, 1000);
    };

    // Export a guaranteed text-layer PDF via the server (headless Chromium).
    // Falls back to the browser print dialog if the server export fails.
    const handleExportPdf = async () => {
        const fileName = resumeFileName(displayData.fullName);
        setIsExporting(true);
        try {
            // Capture the rendered resume, not the edit form. Switch to the preview
            // rendering first so inputs become plain text in the snapshot.
            if (activeTab === 'edit') {
                setActiveTab('preview');
                await new Promise(r => setTimeout(r, 80));
            }

            const preview = document.getElementById('resume-preview');
            if (!preview) { handlePrint(); return; }

            // Clone and strip editor-only affordances (e.g. the "Add photo" button)
            // so they never appear in the exported PDF.
            const exportNode = preview.cloneNode(true) as HTMLElement;
            exportNode.querySelectorAll('[data-export-exclude]').forEach(el => el.remove());

            const res = await fetch('/api/export/pdf', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    headHtml: document.head.innerHTML,
                    bodyHtml: exportNode.outerHTML,
                    origin: window.location.origin,
                    fileName,
                }),
            });

            if (!res.ok) {
                const msg = (await res.json().catch(() => ({}))).error || 'Export failed';
                throw new Error(msg);
            }

            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${fileName}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        } catch (e) {
            console.error('PDF export failed, falling back to print dialog:', e);
            toast.error(t('pdfExportFailed'));
            handlePrint();
        } finally {
            setIsExporting(false);
        }
    };

    // --- Render Helpers ---

    const renderEditableText = (value: string, onChange: (val: string) => void, multiline = false, className = "", placeholder = "") => {
        if (activeTab === 'preview' || isPreviewMode) {
            return <div className={`whitespace-pre-wrap ${className}`}>{value || <span className="text-slate-300 italic">{placeholder}</span>}</div>;
        }
        if (multiline) {
            return (
                <textarea
                    className={`w-full border border-indigo-200 bg-indigo-50/30 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-300 text-slate-800 transition-all duration-200 ${className}`}
                    value={value || ""}
                    onChange={(e) => onChange(e.target.value)}
                    rows={Math.max(2, (value || "").split('\n').length)}
                    placeholder={placeholder}
                />
            );
        }
        return (
            <input
                className={`w-full border border-indigo-200 bg-indigo-50/30 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-300 text-slate-800 transition-all duration-200 ${className}`}
                value={value || ""}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
            />
        );
    };

    return (
        <div className="max-w-7xl mx-auto pb-24 lg:pb-20 flex flex-col lg:flex-row gap-6 lg:gap-8 page-transition">
            {/* Print Styles */}
            <style>{`
        @media print {
          @page {
            margin: 15mm 0;
            size: auto;
          }
          body * { visibility: hidden; }
          #resume-preview, #resume-preview * { visibility: visible; }
          #resume-preview {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 0 15mm;
            background: white;
            box-shadow: none;
            overflow: visible;
          }
          /* Ensure background colors print */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          /* Hide placeholders in print */
          input::placeholder, textarea::placeholder { color: transparent; }
          /* Avoid breaking inside major sections */
          #resume-preview h2 {
            break-after: avoid;
          }
        }
      `}</style>

            {/* LEFT COLUMN: Controls */}
            <div className="w-full lg:w-80 lg:shrink-0 space-y-6 print:hidden h-fit lg:sticky lg:top-6">
                <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-semibold text-sm mb-2 transition-all duration-200 hover:-translate-x-0.5 group">
                    <ArrowLeft className="w-4 h-4 group-hover:scale-110 transition-transform" /> {t('backToDashboard')}
                </button>

                <div className="bg-white p-5 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100">
                    <div className="flex gap-1.5 mb-6 bg-slate-100 p-1.5 rounded-xl">
                        <button onClick={() => setActiveTab('preview')} className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all duration-200 ${activeTab === 'preview' ? 'bg-white shadow-md text-slate-900 ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'}`}>
                            <span className="flex items-center justify-center gap-1.5"><Eye className="w-3.5 h-3.5" />{t('preview')}</span>
                        </button>
                        <button onClick={() => !isPreviewMode && setActiveTab('edit')} disabled={isPreviewMode} className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all duration-200 ${isPreviewMode ? 'opacity-40 cursor-not-allowed text-slate-400' : activeTab === 'edit' ? 'bg-white shadow-md text-slate-900 ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'}`}>
                            <span className="flex items-center justify-center gap-1.5">{t('editData')}</span>
                        </button>
                    </div>

                    <div className="space-y-3">
                        <button onClick={handleRunEvaluation} disabled={isEvaluating || creditsPaused.paused} className="w-full py-3 bg-indigo-50 text-indigo-700 font-bold text-sm rounded-xl hover:bg-indigo-100 transition-all duration-200 flex items-center justify-center gap-2 group border border-indigo-100 shadow-sm hover:shadow-md active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed">
                            {isEvaluating ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <BarChart3 className="w-4 h-4 group-hover:scale-110 transition-transform" />}
                            {t('runScoreAnalysis')}
                        </button>
                        {creditsPaused.paused && (
                            <p role="status" className="text-xs text-red-800 bg-red-50 border border-red-200 rounded-lg p-2.5 leading-relaxed">
                                {tCredits('scorePaused', { time: creditsPaused.time })}
                            </p>
                        )}

                        {evaluation && (
                            <div className="mt-4 bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm animate-in fade-in slide-in-from-top-2">
                                {/* Score Header */}
                                <div className={`p-4 border-b border-slate-100 flex justify-between items-center ${evaluation.isPassing ? 'bg-emerald-50/50' : 'bg-amber-50/50'}`}>
                                    <div>
                                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{t('qualityScore')}</div>
                                        <div className={`text-3xl font-black flex items-baseline tabular-nums ${evaluation.isPassing ? 'text-emerald-600' : 'text-amber-600'}`}>
                                            {evaluation.totalScore}<span className="text-sm text-slate-400 font-medium ml-1">/100</span>
                                        </div>
                                    </div>
                                    <div className={`px-3 py-1.5 rounded-full text-[10px] font-bold border flex items-center gap-1.5 ${evaluation.isPassing ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-amber-100 text-amber-700 border-amber-200'}`}>
                                        {evaluation.isPassing ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                                        {evaluation.isPassing ? t('passing') : t('needsWork')}
                                    </div>
                                </div>

                                {/* Detailed Breakdown */}
                                <div className="p-4 space-y-4 bg-white">
                                    <ScoreBar
                                        label={t('structure')}
                                        score={evaluation.breakdown.structure}
                                        max={50}
                                        colorClass="bg-blue-500"
                                        description={t('structureDesc')}
                                    />

                                    {/* Detailed Structure Breakdown if available */}
                                    {evaluation.detailedBreakdown?.structure && (
                                        <div className="ml-4 p-3 bg-slate-50 rounded-xl space-y-2 border border-slate-100">
                                            <div className="text-[9px] font-bold text-slate-500 uppercase mb-2 tracking-wider">{t('structureDetails')}</div>
                                            <div className="grid grid-cols-2 gap-2 text-[9px]">
                                                <div className="flex justify-between">
                                                    <span className="text-slate-600">{t('basicProfile')}</span>
                                                    <span className="font-semibold text-slate-800">{evaluation.detailedBreakdown.structure.basicProfile}/5</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-slate-600">{t('chronological')}</span>
                                                    <span className="font-semibold text-slate-800">{evaluation.detailedBreakdown.structure.chronological}/10</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-slate-600">{t('roleInfo')}</span>
                                                    <span className="font-semibold text-slate-800">{evaluation.detailedBreakdown.structure.roleInfo}/10</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-slate-600">{t('quantifiedAchievements')}</span>
                                                    <span className={`font-semibold ${evaluation.detailedBreakdown.structure.quantifiedAchievements === 0 ? 'text-red-600' : 'text-slate-800'}`}>
                                                        {evaluation.detailedBreakdown.structure.quantifiedAchievements}/15
                                                    </span>
                                                </div>
                                                <div className="flex justify-between col-span-2">
                                                    <span className="text-slate-600">{t('readability')}</span>
                                                    <span className="font-semibold text-slate-800">{evaluation.detailedBreakdown.structure.readability}/10</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <ScoreBar
                                        label={t('reproducibility')}
                                        score={evaluation.breakdown.reproducibility}
                                        max={25}
                                        colorClass="bg-indigo-500"
                                        description={t('reproducibilityDesc')}
                                    />

                                    {/* Detailed Reproducibility Breakdown if available */}
                                    {evaluation.detailedBreakdown?.reproducibility && (
                                        <div className="ml-4 p-3 bg-slate-50 rounded-xl space-y-2 border border-slate-100">
                                            <div className="text-[9px] font-bold text-slate-500 uppercase mb-2 tracking-wider">{t('reproducibilityDetails')}</div>
                                            <div className="grid grid-cols-2 gap-2 text-[9px]">
                                                <div className="flex justify-between">
                                                    <span className="text-slate-600">{t('decisionMaking')}</span>
                                                    <span className="font-semibold text-slate-800">{evaluation.detailedBreakdown.reproducibility.decisionMaking}/10</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-slate-600">{t('parFlow')}</span>
                                                    <span className="font-semibold text-slate-800">{evaluation.detailedBreakdown.reproducibility.problemActionResult}/10</span>
                                                </div>
                                                <div className="flex justify-between col-span-2">
                                                    <span className="text-slate-600">{t('individualContribution')}</span>
                                                    <span className="font-semibold text-slate-800">{evaluation.detailedBreakdown.reproducibility.individualContribution}/5</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <ScoreBar
                                        label={t('roleFit')}
                                        score={evaluation.breakdown.roleFit}
                                        max={15}
                                        colorClass="bg-violet-500"
                                        description={t('roleFitDesc')}
                                    />

                                    {/* Role Fit Details if available */}
                                    {evaluation.detailedBreakdown?.roleFit?.details && (
                                        <div className="ml-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
                                            <div className="text-[9px] text-slate-600 leading-relaxed">{evaluation.detailedBreakdown.roleFit.details}</div>
                                        </div>
                                    )}

                                    <ScoreBar
                                        label={t('risk')}
                                        score={evaluation.breakdown.riskHandling}
                                        max={10}
                                        colorClass="bg-rose-500"
                                        description={t('riskDesc')}
                                    />
                                </div>

                                {/* Validation Messages (if not passing) */}
                                {evaluation.validationMessages && evaluation.validationMessages.length > 0 && (
                                    <div className="bg-red-50 p-4 border-t border-red-100">
                                        <p className="text-[10px] font-bold text-red-600 uppercase mb-2 flex items-center gap-1.5">
                                            <AlertTriangle className="w-3 h-3" /> {t('failingCriteria')}
                                        </p>
                                        <ul className="space-y-1.5">
                                            {evaluation.validationMessages.map((msg, i) => (
                                                <li key={i} className="flex gap-2 text-[10px] text-red-700 leading-snug font-medium">
                                                    <span className="text-red-400 mt-0.5">✗</span>
                                                    {msg}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* Action Items */}
                                {evaluation.missingItems.length > 0 && (
                                    <div className="bg-slate-50 p-4 border-t border-slate-100">
                                        <p className="text-[10px] font-bold text-slate-500 uppercase mb-2 flex items-center gap-1.5">
                                            <AlertTriangle className="w-3 h-3 text-amber-500" /> {t('improvementsNeeded')}
                                        </p>
                                        <ul className="space-y-2">
                                            {evaluation.missingItems.map((item, i) => (
                                                <li key={i} className="flex gap-2 text-[10px] text-slate-600 leading-snug">
                                                    <span className="text-amber-400 mt-0.5">•</span>
                                                    {item}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}

                        <button
                            onClick={handleSaveComplete}
                            disabled={!evaluation?.isPassing}
                            className={`w-full py-3 font-bold text-sm rounded-xl transition-all duration-200 flex items-center justify-center gap-2 ${evaluation?.isPassing ? 'bg-slate-900 text-white hover:bg-slate-800 shadow-lg shadow-slate-900/20 hover:-translate-y-0.5 active:scale-[0.98]' : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'}`}
                        >
                            <Save className="w-4 h-4" /> {t('saveAsComplete')}
                        </button>

                        <button onClick={handleExportPdf} disabled={isExporting} className="w-full py-3 bg-white border-2 border-slate-200 text-slate-700 font-bold text-sm rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed">
                            {isExporting ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />} {t('exportPDF')}
                        </button>

                        {onResumeInterview && (
                            <div className="pt-3 border-t border-slate-100">
                                <button
                                    onClick={() => setShowResumeInterviewConfirm(true)}
                                    className="w-full py-3 bg-amber-50 text-amber-700 font-bold text-sm rounded-xl hover:bg-amber-100 transition-all duration-200 flex items-center justify-center gap-2 border border-amber-200 shadow-sm hover:shadow-md active:scale-[0.98]"
                                >
                                    <MessageSquare className="w-4 h-4" /> {t('resumeInterview')}
                                </button>
                                <p className="text-[10px] text-slate-400 mt-1.5 leading-snug text-center">
                                    {t('resumeInterviewDesc')}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {(() => {
                    // Filter out gaps that overlap with education periods
                    const unexplainedGaps = data.careerGaps.filter(gap => {
                        if (gap.isExplained) return false;

                        // Check if this gap overlaps with any education period
                        const gapOverlapsEducation = data.timeline?.some(item => {
                            if (item.type !== 'education') return false;
                            // Simple check - if gap reason mentions the education org, consider it explained
                            return gap.period.toLowerCase().includes(item.organization.toLowerCase()) ||
                                gap.period.toLowerCase().includes(item.role.toLowerCase());
                        });

                        return !gapOverlapsEducation;
                    });

                    if (unexplainedGaps.length === 0) return null;

                    return (
                        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start gap-3 shadow-sm">
                            <div className="p-1.5 bg-amber-100 rounded-full text-amber-600 shrink-0">
                                <AlertTriangle className="w-4 h-4" />
                            </div>
                            <div className="flex-1">
                                <h4 className="font-bold text-amber-900 text-sm">{t('timelineGap')}</h4>
                                <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                                    {t('gapMessage')}
                                </p>
                                {unexplainedGaps.length > 0 && (
                                    <div className="mt-2 text-xs text-amber-800">
                                        <span className="font-semibold">{t('gapsFound')}</span> {unexplainedGaps.map(g => g.period).join(', ')}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })()}

                {/* Export for Platforms */}
                <Link
                    href={`/${locale}/export?projectId=${project.id}`}
                    className="flex items-center gap-3 w-full p-4 bg-white rounded-2xl border border-slate-100 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:border-indigo-100 hover:-translate-y-0.5 transition-all duration-200 group"
                >
                    <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0 group-hover:bg-indigo-100 transition-colors">
                        <Share2 className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-900">{t('exportForPlatforms')}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{t('exportForPlatformsDesc')}</p>
                    </div>
                    <ArrowLeft className="w-4 h-4 text-slate-400 rotate-180 group-hover:translate-x-0.5 transition-transform" />
                </Link>

                {/* Version History */}
                <VersionHistory
                    projectId={project.id}
                    currentData={data}
                    currentEvaluation={evaluation}
                    onRestore={handleRestoreVersion}
                    onPreview={handlePreviewVersion}
                    previewingVersionId={previewVersion?.id}
                />
            </div>

            {/* RIGHT COLUMN: Master Resume (Japanese Style Layout) */}
            <div className="flex-1 min-w-0 overflow-x-auto pb-10">
                {/* Preview Version Banner */}
                {isPreviewMode && (
                    <div className="sticky top-0 z-20 mb-4 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="w-[210mm] mx-auto bg-indigo-600 text-white rounded-xl px-5 py-3 flex items-center justify-between shadow-lg shadow-indigo-600/20">
                            <div className="flex items-center gap-3">
                                <div className="p-1.5 bg-white/20 rounded-lg">
                                    <Eye className="w-4 h-4" />
                                </div>
                                <div>
                                    <div className="text-xs font-bold">{t('previewingVersion')}</div>
                                    <div className="text-[10px] text-indigo-200 truncate max-w-xs">{previewVersion?.label}</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleRestoreFromPreview}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-white text-indigo-700 rounded-lg hover:bg-indigo-50 transition-all duration-200 shadow-sm active:scale-[0.97]"
                                >
                                    <RotateCcw className="w-3 h-3" />
                                    {t('restoreThis')}
                                </button>
                                <button
                                    onClick={() => setPreviewVersion(null)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-white/15 text-white rounded-lg hover:bg-white/25 transition-all duration-200 active:scale-[0.97]"
                                >
                                    <X className="w-3 h-3" />
                                    {t('exitPreview')}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                <div
                    id="resume-preview"
                    className={`bg-white shadow-2xl min-h-[297mm] w-[210mm] mx-auto p-[15mm] text-slate-900 resume-doc text-[9.5pt] leading-relaxed transition-all duration-300 ${isPreviewMode ? 'ring-4 ring-indigo-400/30' : activeTab === 'edit' ? 'ring-4 ring-indigo-500/10' : ''}`}
                >

                    {/* Header - Professional Layout */}
                    <div className="border-b-2 border-slate-900 pb-3 mb-4">
                        <div className="flex justify-between items-start gap-6">
                            <div className="flex-1 min-w-0">
                                <div className="mb-3">
                                    <h1 className="text-[24pt] font-bold tracking-tight text-slate-900 mb-2 leading-none">
                                        {renderEditableText(displayData.fullName, val => setData({ ...data, fullName: val }), false, "font-sans", "")}
                                    </h1>
                                    <div className="text-[11pt] text-slate-700 leading-tight mb-1">
                                        {renderEditableText(displayData.currentRole, val => setData({ ...data, currentRole: val }), true, "", "")}
                                        {activeTab === 'edit' && !isPreviewMode && (
                                            <p className="text-[8pt] text-slate-400 mt-1 print:hidden" data-export-exclude>{t('headlineHint')}</p>
                                        )}
                                    </div>
                                    {displayData.contactInfo.department && (
                                        <div className="text-[10pt] italic text-slate-600">
                                            {renderEditableText(displayData.contactInfo.department || "", val => setData({ ...data, contactInfo: { ...data.contactInfo, department: val } }), false, "", "")}
                                        </div>
                                    )}
                                </div>
                                <div className="text-[9pt] text-slate-700 leading-tight flex gap-2 flex-wrap items-center">
                                    {(() => {
                                        // Render only the present fields, joined by separators (no trailing "|").
                                        const parts: React.ReactNode[] = [];
                                        if (displayData.contactInfo.email) parts.push(
                                            <span key="email" className="flex items-center gap-1">{t('contactEmail')} {renderEditableText(displayData.contactInfo.email, val => setData({ ...data, contactInfo: { ...data.contactInfo, email: val } }), false, "inline-block", "")}</span>
                                        );
                                        if (displayData.contactInfo.phone) parts.push(
                                            <span key="phone" className="flex items-center gap-1">{t('contactPhone')} {renderEditableText(displayData.contactInfo.phone, val => setData({ ...data, contactInfo: { ...data.contactInfo, phone: val } }), false, "inline-block", "")}</span>
                                        );
                                        if (displayData.contactInfo.location) parts.push(
                                            <span key="location">{renderEditableText(displayData.contactInfo.location, val => setData({ ...data, contactInfo: { ...data.contactInfo, location: val } }), false, "inline-block", "")}</span>
                                        );
                                        if (displayData.contactInfo.linkedin) parts.push(
                                            <span key="linkedin" className="flex items-center gap-1">{t('contactLinkedIn')} {renderEditableText(displayData.contactInfo.linkedin, val => setData({ ...data, contactInfo: { ...data.contactInfo, linkedin: val } }), false, "inline-block", "")}</span>
                                        );
                                        return parts.map((node, i) => (
                                            <React.Fragment key={i}>
                                                {i > 0 && <span className="text-slate-400">|</span>}
                                                {node}
                                            </React.Fragment>
                                        ));
                                    })()}
                                </div>
                            </div>
                            <ResumePhoto
                                photo={displayData.photo}
                                editable={activeTab === 'edit' && !isPreviewMode}
                                onChange={(next) => setData({ ...data, photo: next })}
                                onAddRequest={!isPreviewMode ? () => setActiveTab('edit') : undefined}
                            />
                        </div>
                    </div>

                    {/* Professional Summary */}
                    <div className="mb-5">
                        <h2 className="text-[11pt] font-bold border-b border-slate-900 mb-2 pb-1 tracking-wide uppercase">{t('professionalSummary')}</h2>
                        <div className="text-[9.5pt] text-slate-800 leading-relaxed">
                            {renderEditableText(displayData.careerSummary, val => setData({ ...data, careerSummary: val }), true, "", t('professionalSummaryPlaceholder'))}
                        </div>
                    </div>

                    {/* Employer Timeline Visualization - Positioned at top */}
                    {employerTimelineData.length > 0 && (
                        <div className="mb-5 break-inside-avoid">
                            <h2 className="text-[11pt] font-bold border-b border-slate-900 mb-2 pb-1 tracking-wide uppercase">
                                {t('employerTimeline')}
                            </h2>
                            <TimelineChart
                                items={employerTimelineData}
                                className="bg-slate-50/30 p-4 rounded-lg"
                                editable={activeTab === 'edit' && !isPreviewMode}
                                onItemLabelChange={handleEmployerLabelChange}
                                labels={timelineLabels}
                            />
                        </div>
                    )}

                    {/* Skill Timeline Visualization - Positioned at top */}
                    {skillTimelineData.length > 0 && (
                        <div className="mb-5 break-inside-avoid">
                            <h2 className="text-[11pt] font-bold border-b border-slate-900 mb-2 pb-1 tracking-wide uppercase">
                                {t('skillTimeline')}
                            </h2>
                            <TimelineChart
                                items={skillTimelineData}
                                className="bg-slate-50/30 p-4 rounded-lg"
                                editable={activeTab === 'edit' && !isPreviewMode}
                                onItemLabelChange={handleSkillLabelChange}
                                labels={timelineLabels}
                            />
                        </div>
                    )}

                    {/* Career Summary Timeline */}
                    <div className="mb-5">
                        <h2 className="text-[11pt] font-bold border-b border-slate-900 mb-2 pb-1 tracking-wide uppercase">{t('careerSummary')}</h2>
                        <div className="space-y-2 text-[9.5pt] mb-4">
                            {displayData.timeline && displayData.timeline.length > 0 ? (
                                displayData.timeline.filter(t => t.type === 'work').map((item, i) => (
                                    <div key={i} className="flex gap-2 leading-snug">
                                        <span className="text-slate-900 font-bold">•</span>
                                        <div className="flex-1">
                                            <span className="font-medium text-slate-900">
                                                {item.period ? renderEditableText(item.period, val => {
                                                    const newT = [...data.timeline];
                                                    newT.find(t => t.id === item.id)!.period = val;
                                                    setData({ ...data, timeline: newT });
                                                }, false, "inline-block", "") : <span className="text-slate-400 italic text-[9pt]">{t('current')}</span>}
                                            </span>
                                            <span className="mx-1.5 text-slate-500">:</span>
                                            <span className="text-slate-900 font-semibold">
                                                {item.organization ? renderEditableText(item.organization, val => {
                                                    const newT = [...data.timeline];
                                                    newT.find(t => t.id === item.id)!.organization = val;
                                                    setData({ ...data, timeline: newT });
                                                }, false, "inline-block", "") : <span className="text-slate-400 italic text-[9pt]">{t('previous')}</span>}
                                            </span>
                                            {item.role && (
                                                <span className="text-slate-700">
                                                    {' '}{renderEditableText(item.role, val => {
                                                        const newT = [...data.timeline];
                                                        newT.find(t => t.id === item.id)!.role = val;
                                                        setData({ ...data, timeline: newT });
                                                    }, false, "inline-block", "")}
                                                </span>
                                            )}
                                            {item.duration && (
                                                <span className="text-slate-600 ml-1">
                                                    {renderEditableText(item.duration, val => {
                                                        const newT = [...data.timeline];
                                                        newT.find(t => t.id === item.id)!.duration = val;
                                                        setData({ ...data, timeline: newT });
                                                    }, false, "inline-block", "")}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-slate-400 italic text-[9pt]">{t('noTimeline')}</div>
                            )}
                        </div>

                        {/* Career Overview Stats */}
                        <div className="pt-3 border-t border-slate-200 text-[9pt] text-slate-700">
                            <div className="flex gap-5 flex-wrap">
                                {displayData.careerOverview.totalExperience && <span>{t('totalCareer')} <strong className="text-slate-900">{displayData.careerOverview.totalExperience}</strong></span>}
                                {displayData.careerOverview.numberOfEmployers > 0 && <span>{t('numberOfEmployers')} <strong className="text-slate-900">{displayData.careerOverview.numberOfEmployers}</strong></span>}
                                {displayData.careerOverview.averageTenure && <span>{t('averageTenure')} <strong className="text-slate-900">{displayData.careerOverview.averageTenure}</strong></span>}
                                {displayData.careerOverview.projectCount && <span>{t('currentPositionDuration')} <strong className="text-slate-900">{displayData.careerOverview.projectCount}</strong></span>}
                            </div>
                        </div>

                        {/* Career Gaps Section - Only show if gaps exist and are explained */}
                        {displayData.careerGaps && displayData.careerGaps.length > 0 && displayData.careerGaps.some(g => g.isExplained) && (
                            <div className="mt-4 pt-3 border-t border-slate-200">
                                <div className="text-[9pt] font-semibold text-slate-700 mb-2">{t('careerNotes')}</div>
                                <div className="space-y-1.5">
                                    {displayData.careerGaps.filter(g => g.isExplained).map((gap, i) => (
                                        <div key={i} className="flex gap-2 text-[9pt] text-slate-700">
                                            <span className="text-slate-900 font-bold">•</span>
                                            <div className="flex-1">
                                                <span className="font-medium text-slate-900">
                                                    {(activeTab === 'preview' || isPreviewMode) ? gap.period : (
                                                        <input
                                                            className="border border-indigo-200 bg-indigo-50/30 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-300 text-slate-800 transition-all duration-200"
                                                            value={gap.period}
                                                            onChange={(e) => {
                                                                const newGaps = [...data.careerGaps];
                                                                newGaps[i].period = e.target.value;
                                                                setData({ ...data, careerGaps: newGaps });
                                                            }}
                                                            placeholder={t('period')}
                                                        />
                                                    )}
                                                </span>
                                                <span className="mx-1.5 text-slate-500">:</span>
                                                <span className="text-slate-700">
                                                    {(activeTab === 'preview' || isPreviewMode) ? gap.reason : (
                                                        <input
                                                            className="border border-indigo-200 bg-indigo-50/30 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-300 text-slate-800 transition-all duration-200"
                                                            value={gap.reason}
                                                            onChange={(e) => {
                                                                const newGaps = [...data.careerGaps];
                                                                newGaps[i].reason = e.target.value;
                                                                setData({ ...data, careerGaps: newGaps });
                                                            }}
                                                            placeholder={t('reason')}
                                                        />
                                                    )}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Work Experience */}
                    <div className="mb-5">
                        <h2 className="text-[11pt] font-bold border-b border-slate-900 mb-3 pb-1 tracking-wide uppercase">{t('workExperience')}</h2>

                        <div className="space-y-5">
                            {displayData.workExperience && displayData.workExperience.length > 0 ? (
                                displayData.workExperience.map((work, i) => (
                                    <div key={work.id} className="break-inside-avoid">
                                        {/* Company & Position Header */}
                                        <div className="mb-3">
                                            <div className="flex justify-between items-start mb-1">
                                                <h3 className="font-bold text-[10.5pt] text-slate-900 flex-1">
                                                    {(activeTab === 'preview' || isPreviewMode) ? (
                                                        <>
                                                            {work.company || <span className="text-slate-400 italic">{t('companyName')}</span>}
                                                            {' | '}
                                                            {work.position || <span className="text-slate-400 italic">{t('position')}</span>}
                                                        </>
                                                    ) : (
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                className="flex-1 border border-indigo-200 bg-indigo-50/30 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-300 text-slate-800 transition-all duration-200"
                                                                value={work.company}
                                                                onChange={(e) => {
                                                                    const newWork = [...(data.workExperience || [])];
                                                                    newWork[i].company = e.target.value;
                                                                    setData({ ...data, workExperience: newWork });
                                                                }}
                                                                placeholder={t('companyName')}
                                                            />
                                                            <span className="text-slate-500">|</span>
                                                            <input
                                                                className="flex-1 border border-indigo-200 bg-indigo-50/30 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-300 text-slate-800 transition-all duration-200"
                                                                value={work.position}
                                                                onChange={(e) => {
                                                                    const newWork = [...(data.workExperience || [])];
                                                                    newWork[i].position = e.target.value;
                                                                    setData({ ...data, workExperience: newWork });
                                                                }}
                                                                placeholder={t('position')}
                                                            />
                                                        </div>
                                                    )}
                                                </h3>
                                                {work.period && (
                                                    <span className="text-[9pt] italic text-slate-600 ml-4 whitespace-nowrap">
                                                        {renderEditableText(work.period, val => {
                                                            const newWork = [...(data.workExperience || [])];
                                                            newWork[i].period = val;
                                                            setData({ ...data, workExperience: newWork });
                                                        }, false, "", t('period'))}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Responsibilities Section */}
                                        {work.responsibilities && work.responsibilities.length > 0 && (
                                            <div className="mb-3">
                                                <div className="font-bold text-[9pt] text-slate-900 mb-2">■ {t('responsibilities')}</div>
                                                <ul className="space-y-1.5">
                                                    {work.responsibilities.map((resp, j) => (
                                                        <li key={j} className="flex gap-2 text-[9.5pt] text-slate-800 leading-relaxed ml-4">
                                                            <span className="text-slate-900 font-bold mt-0.5">•</span>
                                                            <div className="flex-1">
                                                                {renderEditableText(resp, val => {
                                                                    const newWork = [...(data.workExperience || [])];
                                                                    newWork[i].responsibilities[j] = val;
                                                                    setData({ ...data, workExperience: newWork });
                                                                }, true, "", t('responsibility'))}
                                                            </div>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                ))
                            ) : (
                                displayData.projectPortfolio.representativeProjects.map((proj, i) => (
                                    <div key={i} className="break-inside-avoid">
                                        {/* Company Header */}
                                        <div className="mb-3">
                                            <div className="flex justify-between items-start mb-1">
                                                <h3 className="font-bold text-[11pt] text-slate-900 flex-1">
                                                    {proj.title ? renderEditableText(proj.title, val => {
                                                        const newProjs = [...data.projectPortfolio.representativeProjects];
                                                        newProjs[i].title = val;
                                                        setData({ ...data, projectPortfolio: { ...data.projectPortfolio, representativeProjects: newProjs } });
                                                    }, false, "", "") : <span className="text-slate-400 italic text-[10pt]">{t('companyAndPosition')}</span>}
                                                </h3>
                                                {proj.period && (
                                                    <span className="text-[9pt] font-medium text-slate-700 ml-4">
                                                        {renderEditableText(proj.period, val => {
                                                            const newProjs = [...data.projectPortfolio.representativeProjects];
                                                            newProjs[i].period = val;
                                                            setData({ ...data, projectPortfolio: { ...data.projectPortfolio, representativeProjects: newProjs } });
                                                        }, false, "", "")}
                                                    </span>
                                                )}
                                            </div>
                                            {proj.context && (
                                                <div className="text-[9.5pt] text-slate-800 leading-relaxed">
                                                    {renderEditableText(proj.context, val => {
                                                        const newProjs = [...data.projectPortfolio.representativeProjects];
                                                        newProjs[i].context = val;
                                                        setData({ ...data, projectPortfolio: { ...data.projectPortfolio, representativeProjects: newProjs } });
                                                    }, true, "", "")}
                                                </div>
                                            )}
                                        </div>

                                        {/* Responsibilities Section */}
                                        {(proj.role || proj.teamStructure) && (
                                            <div className="mb-3">
                                                <div className="font-bold text-[9pt] text-slate-900 mb-1.5">■ {t('responsibilities')}</div>
                                                {proj.role && (
                                                    <div className="text-[9.5pt] text-slate-800 mb-1 ml-4">
                                                        {renderEditableText(proj.role, val => {
                                                            const newProjs = [...data.projectPortfolio.representativeProjects];
                                                            newProjs[i].role = val;
                                                            setData({ ...data, projectPortfolio: { ...data.projectPortfolio, representativeProjects: newProjs } });
                                                        }, true, "", "")}
                                                    </div>
                                                )}
                                                {proj.teamStructure && (
                                                    <div className="text-[9.5pt] text-slate-800 ml-4">
                                                        {renderEditableText(proj.teamStructure || "", val => {
                                                            const newProjs = [...data.projectPortfolio.representativeProjects];
                                                            newProjs[i].teamStructure = val;
                                                            setData({ ...data, projectPortfolio: { ...data.projectPortfolio, representativeProjects: newProjs } });
                                                        }, true, "", "")}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Main Achievements Section */}
                                        {(proj.contribution || proj.challenges) && (
                                            <div className="mb-3">
                                                <div className="font-bold text-[9pt] text-slate-900 mb-1.5">■ {t('mainAchievements')}</div>
                                                {proj.contribution && (
                                                    <div className="text-[9.5pt] text-slate-800 mb-1 ml-4">
                                                        {renderEditableText(proj.contribution, val => {
                                                            const newProjs = [...data.projectPortfolio.representativeProjects];
                                                            newProjs[i].contribution = val;
                                                            setData({ ...data, projectPortfolio: { ...data.projectPortfolio, representativeProjects: newProjs } });
                                                        }, true, "", "")}
                                                    </div>
                                                )}
                                                {proj.challenges && (
                                                    <div className="text-[9.5pt] text-slate-800 ml-4">
                                                        {renderEditableText(proj.challenges || "", val => {
                                                            const newProjs = [...data.projectPortfolio.representativeProjects];
                                                            newProjs[i].challenges = val;
                                                            setData({ ...data, projectPortfolio: { ...data.projectPortfolio, representativeProjects: newProjs } });
                                                        }, true, "", "")}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Detailed Box: Challenge/Approach/Results */}
                                        {(proj.clientType || proj.theme || displayData.projectPortfolio.additionalEngagements) && (
                                            <div className="bg-slate-50 border border-slate-200 px-4 py-3.5 text-[9pt] leading-relaxed space-y-2 rounded-lg">
                                                {proj.clientType && (
                                                    <div className="flex gap-2">
                                                        <span className="font-bold text-slate-900 min-w-20">{t('challenge')}</span>
                                                        <span className="text-slate-800 flex-1">
                                                            {renderEditableText(proj.clientType || "", val => {
                                                                const newProjs = [...data.projectPortfolio.representativeProjects];
                                                                newProjs[i].clientType = val;
                                                                setData({ ...data, projectPortfolio: { ...data.projectPortfolio, representativeProjects: newProjs } });
                                                            }, false, "inline-block", "")}
                                                        </span>
                                                    </div>
                                                )}
                                                {proj.theme && (
                                                    <div className="flex gap-2">
                                                        <span className="font-bold text-slate-900 min-w-20">{t('approach')}</span>
                                                        <span className="text-slate-800 flex-1">
                                                            {renderEditableText(proj.theme || "", val => {
                                                                const newProjs = [...data.projectPortfolio.representativeProjects];
                                                                newProjs[i].theme = val;
                                                                setData({ ...data, projectPortfolio: { ...data.projectPortfolio, representativeProjects: newProjs } });
                                                            }, false, "inline-block", "")}
                                                        </span>
                                                    </div>
                                                )}
                                                {displayData.projectPortfolio.additionalEngagements && (
                                                    <div className="flex gap-2">
                                                        <span className="font-bold text-slate-900 min-w-20">{t('results')}</span>
                                                        <span className="text-slate-800 flex-1">
                                                            {renderEditableText(displayData.projectPortfolio.additionalEngagements, val => setData({ ...data, projectPortfolio: { ...data.projectPortfolio, additionalEngagements: val } }), false, "inline-block", "")}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Education Section */}
                    {displayData.education && displayData.education.length > 0 && (
                        <div className="mb-5">
                            <h2 className="text-[11pt] font-bold border-b border-slate-900 mb-3 pb-1 tracking-wide uppercase">{t('education')}</h2>
                            <div className="space-y-4">
                                {displayData.education.map((edu, i) => (
                                    <div key={edu.id} className="break-inside-avoid">
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                                <h3 className="font-bold text-[10pt] text-slate-900">
                                                    {edu.degree ? renderEditableText(edu.degree, val => {
                                                        const newEdu = [...(data.education || [])];
                                                        newEdu[i].degree = val;
                                                        setData({ ...data, education: newEdu });
                                                    }, false, "", t('degree')) : <span className="text-slate-400 italic">{t('degree')}</span>}
                                                </h3>
                                                <div className="text-[9.5pt] text-slate-700">
                                                    {edu.institution ? renderEditableText(edu.institution, val => {
                                                        const newEdu = [...(data.education || [])];
                                                        newEdu[i].institution = val;
                                                        setData({ ...data, education: newEdu });
                                                    }, false, "", t('institution')) : <span className="text-slate-400 italic">{t('institution')}</span>}
                                                </div>
                                            </div>
                                            {edu.period && (
                                                <span className="text-[9pt] italic text-slate-600 ml-4">
                                                    {renderEditableText(edu.period, val => {
                                                        const newEdu = [...(data.education || [])];
                                                        newEdu[i].period = val;
                                                        setData({ ...data, education: newEdu });
                                                    }, false, "", t('period'))}
                                                </span>
                                            )}
                                        </div>
                                        {edu.notes && (
                                            <div className="text-[9pt] text-slate-600 mt-1 ml-2">
                                                {renderEditableText(edu.notes, val => {
                                                    const newEdu = [...(data.education || [])];
                                                    newEdu[i].notes = val;
                                                    setData({ ...data, education: newEdu });
                                                }, false, "", t('notes'))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Skills Section */}
                    {displayData.skills && displayData.skills.length > 0 && (
                        <div className="mb-5">
                            <h2 className="text-[11pt] font-bold border-b border-slate-900 mb-3 pb-1 tracking-wide uppercase">{t('skills')}</h2>
                            <div className="flex flex-wrap gap-1.5">
                                {displayData.skills.map((skill, i) => (
                                    <div key={i} className="inline-flex items-center">
                                        {(activeTab === 'preview' || isPreviewMode) ? (
                                            <span className="px-2 py-0.5 bg-slate-100 text-slate-800 text-[8.5pt] rounded border border-slate-200">
                                                {skill}
                                            </span>
                                        ) : (
                                            <input
                                                className="px-2 py-0.5 border border-indigo-200 bg-indigo-50/30 rounded text-[8.5pt] focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-300 text-slate-800 transition-all duration-200"
                                                value={skill}
                                                onChange={(e) => {
                                                    const newSkills = [...(data.skills || [])];
                                                    newSkills[i] = e.target.value;
                                                    setData({ ...data, skills: newSkills });
                                                }}
                                                placeholder={t('skillPlaceholder')}
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Certifications Section */}
                    {displayData.certifications && displayData.certifications.length > 0 && (
                        <div className="mb-5">
                            <h2 className="text-[11pt] font-bold border-b border-slate-900 mb-3 pb-1 tracking-wide uppercase">{t('certifications')}</h2>
                            <div className="space-y-2">
                                {displayData.certifications.map((cert, i) => (
                                    <div key={i} className="flex gap-2 text-[9.5pt] text-slate-800">
                                        <span className="text-slate-900 font-bold">•</span>
                                        <div className="flex-1">
                                            {renderEditableText(cert, val => {
                                                const newCerts = [...(data.certifications || [])];
                                                newCerts[i] = val;
                                                setData({ ...data, certifications: newCerts });
                                            }, false, "", t('certificationPlaceholder'))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Resume Interview Confirmation Dialog */}
            {showResumeInterviewConfirm && onResumeInterview && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-5 animate-in zoom-in-95 duration-200">
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-amber-50 rounded-xl text-amber-600 shrink-0">
                                <MessageSquare className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">{t('resumeInterviewConfirmTitle')}</h3>
                                <p className="text-sm text-slate-500 mt-1 leading-relaxed">{t('resumeInterviewConfirmDesc')}</p>
                            </div>
                        </div>
                        <div className="flex gap-3 justify-end pt-2">
                            <button
                                onClick={() => setShowResumeInterviewConfirm(false)}
                                className="px-5 py-2.5 text-slate-600 font-bold text-sm hover:bg-slate-100 rounded-xl transition-all duration-200 active:scale-[0.98]"
                            >
                                {t('resumeInterviewKeepEditing')}
                            </button>
                            <button
                                onClick={() => {
                                    setShowResumeInterviewConfirm(false);
                                    pendingSave.current = null; // the handler saves the latest data itself
                                    onResumeInterview(data, evaluation);
                                }}
                                className="px-5 py-2.5 bg-amber-500 text-white font-bold text-sm rounded-xl hover:bg-amber-600 shadow-lg shadow-amber-500/25 hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-2 active:scale-[0.98]"
                            >
                                <MessageSquare className="w-4 h-4" />
                                {t('resumeInterviewConfirm')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
