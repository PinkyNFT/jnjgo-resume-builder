'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
    Loader2, Save, Check, Plus, Eye, EyeOff, FileText, Hash,
    AlertTriangle, Info, ChevronDown, RotateCcw, History, GitCompare,
    Clock, ChevronRight, X
} from 'lucide-react';

// ===== TYPES =====

interface PromptComparison {
    slug: string;
    name: string;
    description: string;
    baseEn: string;
    baseJa: string;
    currentEn: string;
    currentJa: string;
    hasOverride: boolean;
    isModifiedEn: boolean;
    isModifiedJa: boolean;
    version?: number;
    updatedBy?: string;
    updatedAt?: string;
    isActive?: boolean;
}

interface PromptHistoryEntry {
    _id: string;
    slug: string;
    version: number;
    contentEn: string;
    contentJa: string;
    changedBy: string;
    changeReason: string;
    createdAt: string;
}

const DEFAULT_PROMPT_TEMPLATES = [
    {
        slug: 'system_instruction',
        name: 'System Instruction (Chat)',
        description: 'Main system prompt used during the AI interview conversation.',
    },
    {
        slug: 'analyze_import',
        name: 'Analyze Import',
        description: 'Prompt used when analyzing an imported resume text.',
    },
    {
        slug: 'evaluate_resume',
        name: 'Evaluate Resume',
        description: 'Scoring rubric prompt for resume evaluation.',
    },
    {
        slug: 'parse_resume',
        name: 'Parse Resume (Generation)',
        description: 'Prompt used to generate the final structured resume.',
    },
];

/** Maps prompt slugs to the template variables they support */
const TEMPLATE_VARIABLES: Record<string, { name: string; description: string }[]> = {
    system_instruction: [
        { name: '{{ROLE_CONTEXT}}', description: 'User\'s selected role (e.g. "a consultant", "an engineer")' },
        { name: '{{PERSONAL_INFO_CONTEXT}}', description: 'Pre-filled name/email if known' },
        { name: '{{IMPORT_CONTEXT}}', description: 'Imported resume summary or "starting from scratch" context' },
        { name: '{{GAP_THRESHOLD_DAYS}}', description: 'Gap detection threshold in days (from Admin Settings)' },
    ],
    analyze_import: [
        { name: '{{RESUME_TEXT}}', description: 'The imported resume text (truncated to 10,000 chars)' },
        { name: '{{GAP_THRESHOLD_DAYS}}', description: 'Gap detection threshold in days (from Admin Settings)' },
    ],
    evaluate_resume: [
        { name: '{{RESUME_DATA}}', description: 'JSON of the resume being evaluated' },
        { name: '{{ROLE_NAME}}', description: 'Target role name (Consultant / Senior Engineer / General)' },
        { name: '{{LOCALE_INSTRUCTION}}', description: 'Language instruction for Japanese output' },
        { name: '{{HAS_BASIC_PROFILE}}', description: 'YES/NO — pre-validation result' },
        { name: '{{HAS_WORK_HISTORY}}', description: 'YES/NO — pre-validation result' },
        { name: '{{HAS_EDUCATION}}', description: 'YES/NO — pre-validation result' },
        { name: '{{HAS_SKILLS}}', description: 'YES/NO — pre-validation result' },
        { name: '{{HAS_CERTIFICATIONS}}', description: 'YES/NO — pre-validation result' },
        { name: '{{IS_CHRONOLOGICAL}}', description: 'YES/NO — pre-validation result' },
        { name: '{{HAS_QUANTIFIED}}', description: 'YES/NO — pre-validation result' },
        { name: '{{HAS_UNEXPLAINED_GAP}}', description: 'YES/NO + details — pre-validation result' },
        { name: '{{EDUCATION_VALIDATION}}', description: 'PASS/FAIL' },
        { name: '{{SKILLS_VALIDATION}}', description: 'PASS/FAIL' },
        { name: '{{CHRONOLOGICAL_VALIDATION}}', description: 'PASS/FAIL' },
        { name: '{{QUANTIFIED_VALIDATION}}', description: 'HAS METRICS / NO METRICS FOUND' },
        { name: '{{ROLE_CRITERIA}}', description: 'Role-specific evaluation criteria block' },
        { name: '{{GAP_VALIDATION}}', description: 'Gap detection status' },
        { name: '{{GAP_THRESHOLD_DAYS}}', description: 'Gap detection threshold in days (from Admin Settings)' },
    ],
    parse_resume: [
        { name: '{{CONVERSATION_TEXT}}', description: 'Full interview conversation transcript' },
        { name: '{{IMPORTED_TEXT}}', description: 'Original imported resume content (if any)' },
        { name: '{{GAP_THRESHOLD_DAYS}}', description: 'Gap detection threshold in days (from Admin Settings)' },
    ],
};

// ===== COMPONENT =====

export function AdminPrompts() {
    const [comparisons, setComparisons] = useState<PromptComparison[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeSlug, setActiveSlug] = useState<string | null>(null);
    const [editLang, setEditLang] = useState<'en' | 'ja'>('en');
    const [editContent, setEditContent] = useState<Record<string, { en: string; ja: string }>>({});
    const [saving, setSaving] = useState<Record<string, boolean>>({});
    const [saved, setSaved] = useState<Record<string, boolean>>({});
    const [creating, setCreating] = useState(false);
    const [showBase, setShowBase] = useState<Record<string, boolean>>({});
    const [historySlug, setHistorySlug] = useState<string | null>(null);
    const [history, setHistory] = useState<PromptHistoryEntry[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [resetting, setResetting] = useState<Record<string, boolean>>({});
    const [confirmReset, setConfirmReset] = useState<string | null>(null);

    // ── Data fetching ──

    const fetchComparisons = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/prompts?compare=true');
            if (!res.ok) throw new Error('Failed to fetch');
            const data = await res.json();
            setComparisons(data.comparisons);
        } catch {
            setError('Failed to load prompts');
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchHistory = useCallback(async (slug: string) => {
        setHistoryLoading(true);
        try {
            const res = await fetch(`/api/admin/prompts?history=${slug}&limit=20`);
            if (!res.ok) throw new Error('Failed to fetch history');
            const data = await res.json();
            setHistory(data.history);
        } catch {
            setHistory([]);
        } finally {
            setHistoryLoading(false);
        }
    }, []);

    useEffect(() => { fetchComparisons(); }, [fetchComparisons]);

    // ── Actions ──

    const handleSave = async (slug: string) => {
        const content = editContent[slug];
        if (!content) return;

        setSaving(prev => ({ ...prev, [slug]: true }));
        try {
            const comp = comparisons.find(c => c.slug === slug);

            // If there's no override yet, create one first
            if (!comp?.hasOverride) {
                const createRes = await fetch('/api/admin/prompts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        slug,
                        useDefaults: true,
                    })
                });
                if (!createRes.ok) {
                    const err = await createRes.json();
                    // 409 = already exists, that's fine
                    if (createRes.status !== 409) throw new Error(err.error || 'Failed to create override');
                }
            }

            // Now update with the edited content
            const body: Record<string, unknown> = { slug };
            if (content.en !== comp?.currentEn) body.contentEn = content.en;
            if (content.ja !== comp?.currentJa) body.contentJa = content.ja;

            const res = await fetch('/api/admin/prompts', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to save');
            }

            // Refresh comparison data
            await fetchComparisons();
            setEditContent(prev => { const n = { ...prev }; delete n[slug]; return n; });
            setSaved(prev => ({ ...prev, [slug]: true }));
            setTimeout(() => setSaved(prev => ({ ...prev, [slug]: false })), 2000);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Failed to save prompt';
            alert(msg);
        } finally {
            setSaving(prev => ({ ...prev, [slug]: false }));
        }
    };

    const handleCreate = async (template: typeof DEFAULT_PROMPT_TEMPLATES[0]) => {
        setCreating(true);
        try {
            const res = await fetch('/api/admin/prompts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    slug: template.slug,
                    name: template.name,
                    description: template.description,
                    useDefaults: true,
                })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to create');
            }

            await fetchComparisons();
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Failed to create prompt';
            alert(msg);
        } finally {
            setCreating(false);
        }
    };

    const handleToggleActive = async (slug: string, isActive: boolean) => {
        try {
            const res = await fetch('/api/admin/prompts', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ slug, isActive: !isActive })
            });
            if (!res.ok) throw new Error('Failed');
            await fetchComparisons();
        } catch {
            alert('Failed to toggle prompt status');
        }
    };

    const handleReset = async (slug: string) => {
        setResetting(prev => ({ ...prev, [slug]: true }));
        try {
            const res = await fetch('/api/admin/prompts', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ slug, reset: true })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to reset');
            }

            await fetchComparisons();
            setEditContent(prev => { const n = { ...prev }; delete n[slug]; return n; });
            setConfirmReset(null);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Failed to reset prompt';
            alert(msg);
        } finally {
            setResetting(prev => ({ ...prev, [slug]: false }));
        }
    };

    const handleShowHistory = async (slug: string) => {
        if (historySlug === slug) {
            setHistorySlug(null);
            return;
        }
        setHistorySlug(slug);
        fetchHistory(slug);
    };

    const handleRestoreVersion = (slug: string, entry: PromptHistoryEntry) => {
        setEditContent(prev => ({
            ...prev,
            [slug]: {
                en: entry.contentEn,
                ja: entry.contentJa,
            }
        }));
        setHistorySlug(null);
    };

    // ── Helpers ──

    const getContent = (slug: string, lang: 'en' | 'ja') => {
        if (editContent[slug]) return editContent[slug][lang];
        const comp = comparisons.find(c => c.slug === slug);
        if (!comp) return '';
        return lang === 'en' ? comp.currentEn : comp.currentJa;
    };

    const getBaseContent = (slug: string, lang: 'en' | 'ja') => {
        const comp = comparisons.find(c => c.slug === slug);
        if (!comp) return '';
        return lang === 'en' ? comp.baseEn : comp.baseJa;
    };

    const isEdited = (slug: string) => !!editContent[slug];

    const isModified = (slug: string) => {
        const comp = comparisons.find(c => c.slug === slug);
        return comp?.isModifiedEn || comp?.isModifiedJa;
    };

    // ── Render ──

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
            </div>
        );
    }

    // Check which templates haven't been created yet
    const existingOverrideSlugs = new Set(comparisons.filter(c => c.hasOverride).map(c => c.slug));
    const missingTemplates = DEFAULT_PROMPT_TEMPLATES.filter(t => !existingOverrideSlugs.has(t.slug));

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-lg font-bold text-slate-900">Prompt Templates</h2>
                <p className="text-sm text-slate-600 mt-1">
                    Customize AI prompts used throughout the application. Admin overrides are layered on top of base defaults from code.
                    Changes are version-tracked with full rollback support.
                </p>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-3 text-xs">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" /> Using base default
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full border border-amber-200">
                    <span className="w-2 h-2 rounded-full bg-amber-500" /> Admin override active
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-50 text-red-700 rounded-full border border-red-200">
                    <span className="w-2 h-2 rounded-full bg-red-500" /> Override disabled
                </span>
            </div>

            {/* Missing templates notice */}
            {missingTemplates.length > 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                        <Info className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <p className="text-sm font-medium text-slate-700">
                                {missingTemplates.length} prompt(s) running from base defaults (no DB override yet).
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                                To customize a prompt, create an override. You can always reset back to the base default.
                            </p>
                            <div className="flex flex-wrap gap-2 mt-3">
                                {missingTemplates.map(t => (
                                    <button
                                        key={t.slug}
                                        onClick={() => handleCreate(t)}
                                        disabled={creating}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        Create override for &ldquo;{t.name}&rdquo;
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Prompt cards */}
            {comparisons.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
                    <FileText className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                    <p className="text-slate-600">No prompts configured.</p>
                    <p className="text-xs text-slate-500 mt-1">Create overrides from the base defaults to get started.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {comparisons.map(comp => {
                        const modified = comp.isModifiedEn || comp.isModifiedJa;
                        const statusColor = !comp.hasOverride
                            ? 'emerald' : comp.isActive === false
                                ? 'red' : modified
                                    ? 'amber' : 'emerald';

                        return (
                            <div key={comp.slug} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                                {/* Card header */}
                                <button
                                    onClick={() => setActiveSlug(activeSlug === comp.slug ? null : comp.slug)}
                                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                                >
                                    <div className="flex items-center gap-3 text-left">
                                        <div className="relative">
                                            <FileText className="w-5 h-5 text-indigo-500 shrink-0" />
                                            <span className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-${statusColor}-500 border-2 border-white`} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-sm font-semibold text-slate-900">{comp.name}</span>
                                                {comp.hasOverride && comp.version && (
                                                    <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-mono">v{comp.version}</span>
                                                )}
                                                {!comp.hasOverride && (
                                                    <span className="text-xs bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded font-medium">Base default</span>
                                                )}
                                                {comp.hasOverride && modified && (
                                                    <span className="text-xs bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded font-medium">Modified</span>
                                                )}
                                                {comp.hasOverride && !modified && (
                                                    <span className="text-xs bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded font-medium">Matches default</span>
                                                )}
                                                {comp.isActive === false && (
                                                    <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-medium">Disabled</span>
                                                )}
                                                {isEdited(comp.slug) && (
                                                    <span className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-medium">Unsaved</span>
                                                )}
                                            </div>
                                            <p className="text-xs text-slate-600 mt-0.5">{comp.description}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <span className="text-xs text-slate-500 font-mono">{comp.slug}</span>
                                        <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${activeSlug === comp.slug ? 'rotate-180' : ''}`} />
                                    </div>
                                </button>

                                {/* Expanded editor */}
                                {activeSlug === comp.slug && (
                                    <div className="border-t border-slate-200 px-6 py-5 space-y-4">
                                        {/* Toolbar: lang toggle + actions */}
                                        <div className="flex items-center justify-between flex-wrap gap-3">
                                            <div className="flex gap-1 bg-slate-100 rounded-lg p-0.5">
                                                <button
                                                    onClick={() => setEditLang('en')}
                                                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${editLang === 'en' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
                                                >
                                                    English
                                                    {comp.isModifiedEn && <span className="ml-1 text-amber-600">*</span>}
                                                </button>
                                                <button
                                                    onClick={() => setEditLang('ja')}
                                                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${editLang === 'ja' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
                                                >
                                                    日本語
                                                    {comp.isModifiedJa && <span className="ml-1 text-amber-600">*</span>}
                                                </button>
                                            </div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                {/* Show/hide base default */}
                                                <button
                                                    onClick={() => setShowBase(prev => ({ ...prev, [comp.slug]: !prev[comp.slug] }))}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                                                >
                                                    <GitCompare className="w-3.5 h-3.5" />
                                                    {showBase[comp.slug] ? 'Hide' : 'Show'} Base
                                                </button>

                                                {/* Version history */}
                                                {comp.hasOverride && (
                                                    <button
                                                        onClick={() => handleShowHistory(comp.slug)}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                                                    >
                                                        <History className="w-3.5 h-3.5" />
                                                        History
                                                    </button>
                                                )}

                                                {/* Reset to default */}
                                                {comp.hasOverride && modified && (
                                                    confirmReset === comp.slug ? (
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-xs text-red-600 font-medium">Reset to base?</span>
                                                            <button
                                                                onClick={() => handleReset(comp.slug)}
                                                                disabled={resetting[comp.slug]}
                                                                className="px-2.5 py-1 text-xs font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors"
                                                            >
                                                                {resetting[comp.slug] ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Confirm'}
                                                            </button>
                                                            <button
                                                                onClick={() => setConfirmReset(null)}
                                                                className="px-2.5 py-1 text-xs font-medium text-slate-600 bg-slate-100 rounded-md hover:bg-slate-200 transition-colors"
                                                            >
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => setConfirmReset(comp.slug)}
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-orange-600 border border-orange-200 rounded-lg hover:bg-orange-50 transition-colors"
                                                        >
                                                            <RotateCcw className="w-3.5 h-3.5" />
                                                            Reset to Default
                                                        </button>
                                                    )
                                                )}

                                                {/* Enable / Disable */}
                                                {comp.hasOverride && (
                                                    <button
                                                        onClick={() => handleToggleActive(comp.slug, comp.isActive !== false)}
                                                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${comp.isActive !== false
                                                            ? 'text-red-600 border-red-200 hover:bg-red-50'
                                                            : 'text-green-600 border-green-200 hover:bg-green-50'
                                                            }`}
                                                    >
                                                        {comp.isActive !== false ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                                        {comp.isActive !== false ? 'Disable Override' : 'Enable Override'}
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Modification summary */}
                                        {comp.hasOverride && comp.updatedAt && (
                                            <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2">
                                                <Clock className="w-3.5 h-3.5 shrink-0" />
                                                <span>
                                                    Last updated {new Date(comp.updatedAt).toLocaleString()}
                                                    {comp.version && ` · v${comp.version}`}
                                                </span>
                                                {modified && (
                                                    <span className="text-amber-600 font-medium ml-auto">
                                                        Modified from base: {[comp.isModifiedEn && 'EN', comp.isModifiedJa && 'JA'].filter(Boolean).join(', ')}
                                                    </span>
                                                )}
                                            </div>
                                        )}

                                        {/* Variable Reference */}
                                        {TEMPLATE_VARIABLES[comp.slug] && (
                                            <details className="group border border-indigo-200 rounded-lg bg-indigo-50/50">
                                                <summary className="flex items-center gap-2 px-3 py-2 cursor-pointer text-xs font-medium text-indigo-700 select-none list-none">
                                                    <Info className="w-3.5 h-3.5 shrink-0" />
                                                    <span>Available Template Variables ({TEMPLATE_VARIABLES[comp.slug].length})</span>
                                                    <ChevronDown className="w-3.5 h-3.5 ml-auto transition-transform group-open:rotate-180" />
                                                </summary>
                                                <div className="px-3 pb-3 pt-1">
                                                    <div className="grid gap-1">
                                                        {TEMPLATE_VARIABLES[comp.slug].map(v => (
                                                            <div key={v.name} className="flex items-start gap-2 text-xs">
                                                                <code className="shrink-0 px-1.5 py-0.5 bg-indigo-100 text-indigo-800 rounded font-mono font-medium">{v.name}</code>
                                                                <span className="text-slate-600 pt-0.5">{v.description}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </details>
                                        )}

                                        {/* Base default comparison (collapsible) */}
                                        {showBase[comp.slug] && (
                                            <div className="border border-slate-300 rounded-lg overflow-hidden">
                                                <div className="bg-slate-100 px-4 py-2 flex items-center justify-between">
                                                    <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                                                        <GitCompare className="w-3.5 h-3.5" />
                                                        Base Default ({editLang === 'en' ? 'English' : '日本語'}) — read-only
                                                    </span>
                                                    <button
                                                        onClick={() => setShowBase(prev => ({ ...prev, [comp.slug]: false }))}
                                                        className="p-1 rounded hover:bg-slate-200 transition-colors"
                                                    >
                                                        <X className="w-3.5 h-3.5 text-slate-500" />
                                                    </button>
                                                </div>
                                                <textarea
                                                    readOnly
                                                    value={getBaseContent(comp.slug, editLang)}
                                                    className="w-full h-48 px-4 py-3 text-sm font-mono text-slate-600 bg-slate-50 resize-y border-0 focus:ring-0 cursor-default"
                                                />
                                            </div>
                                        )}

                                        {/* Version history panel */}
                                        {historySlug === comp.slug && (
                                            <div className="border border-slate-300 rounded-lg overflow-hidden">
                                                <div className="bg-slate-100 px-4 py-2 flex items-center justify-between">
                                                    <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                                                        <History className="w-3.5 h-3.5" />
                                                        Version History
                                                    </span>
                                                    <button
                                                        onClick={() => setHistorySlug(null)}
                                                        className="p-1 rounded hover:bg-slate-200 transition-colors"
                                                    >
                                                        <X className="w-3.5 h-3.5 text-slate-500" />
                                                    </button>
                                                </div>
                                                <div className="max-h-64 overflow-y-auto">
                                                    {historyLoading ? (
                                                        <div className="flex items-center justify-center py-8">
                                                            <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                                                        </div>
                                                    ) : history.length === 0 ? (
                                                        <div className="text-center py-8 text-xs text-slate-500">
                                                            No version history yet. History is recorded when prompts are updated.
                                                        </div>
                                                    ) : (
                                                        <div className="divide-y divide-slate-100">
                                                            {history.map(entry => (
                                                                <div
                                                                    key={entry._id}
                                                                    className="px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
                                                                >
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="flex items-center gap-2 text-xs">
                                                                            <span className="font-mono font-medium text-slate-700">v{entry.version}</span>
                                                                            <span className="text-slate-400">·</span>
                                                                            <span className="text-slate-500">{new Date(entry.createdAt).toLocaleString()}</span>
                                                                        </div>
                                                                        {entry.changeReason && (
                                                                            <p className="text-xs text-slate-500 mt-0.5 truncate">{entry.changeReason}</p>
                                                                        )}
                                                                    </div>
                                                                    <button
                                                                        onClick={() => handleRestoreVersion(comp.slug, entry)}
                                                                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-indigo-600 border border-indigo-200 rounded-md hover:bg-indigo-50 transition-colors shrink-0 ml-3"
                                                                    >
                                                                        <RotateCcw className="w-3 h-3" />
                                                                        Restore
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Current content / editor textarea */}
                                        <div>
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="text-xs font-semibold text-slate-700">
                                                    {comp.hasOverride ? 'Current Override' : 'Base Default'} ({editLang === 'en' ? 'English' : '日本語'})
                                                </span>
                                                {!comp.hasOverride && (
                                                    <span className="text-xs text-slate-500">— Create an override to edit</span>
                                                )}
                                            </div>
                                            <textarea
                                                value={getContent(comp.slug, editLang)}
                                                onChange={e => {
                                                    const current = editContent[comp.slug] || {
                                                        en: comp.currentEn,
                                                        ja: comp.currentJa
                                                    };
                                                    setEditContent(prev => ({
                                                        ...prev,
                                                        [comp.slug]: {
                                                            ...current,
                                                            [editLang]: e.target.value
                                                        }
                                                    }));
                                                }}
                                                readOnly={!comp.hasOverride}
                                                className={`w-full h-80 px-4 py-3 text-sm font-mono border rounded-lg resize-y transition-colors ${comp.hasOverride
                                                    ? 'text-slate-800 border-slate-400 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'
                                                    : 'text-slate-600 border-slate-200 bg-slate-50 cursor-default'
                                                    }`}
                                                placeholder={`Enter ${editLang === 'en' ? 'English' : 'Japanese'} prompt content...`}
                                            />
                                        </div>

                                        {/* Character count and save */}
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-slate-500 flex items-center gap-1">
                                                <Hash className="w-3.5 h-3.5" />
                                                {getContent(comp.slug, editLang).length.toLocaleString()} characters
                                            </span>
                                            <div className="flex items-center gap-2">
                                                {saved[comp.slug] && (
                                                    <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                                                        <Check className="w-3.5 h-3.5" /> Saved
                                                    </span>
                                                )}
                                                {isEdited(comp.slug) && (
                                                    <button
                                                        onClick={() => handleSave(comp.slug)}
                                                        disabled={saving[comp.slug]}
                                                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                                                    >
                                                        {saving[comp.slug] ? (
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                        ) : (
                                                            <Save className="w-4 h-4" />
                                                        )}
                                                        Save Changes
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
