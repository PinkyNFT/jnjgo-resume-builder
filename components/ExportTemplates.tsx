'use client';

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { ResumeData } from '../types';
import {
    PlatformId,
    PLATFORM_CONFIGS,
    PLATFORM_LIST,
    ExportVariant,
    VARIANT_LIST,
} from '../config/exportPlatforms';
import {
    formatForPlatform,
    ExportResult,
    ExportSection,
    ExportOptions,
} from '../services/exportService';
import {
    Copy,
    Check,
    ChevronDown,
    ChevronUp,
    ExternalLink,
    FileText,
    Globe,
    Briefcase,
    Code,
    Zap,
    AlertCircle,
    Search,
    Link2,
    Link2Off,
    Loader2,
    Sparkles,
} from 'lucide-react';

// ─── Props ─────────────────────────────────────────────────

interface ExportTemplatesProps {
    data: ResumeData;
    projectId?: string;
    candidateSlug?: string;
}

// ─── Constants ─────────────────────────────────────────────

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
    executive: <Briefcase className="w-3 h-3" />,
    engineer: <Code className="w-3 h-3" />,
    freelance: <Zap className="w-3 h-3" />,
    general: <Globe className="w-3 h-3" />,
};

// ─── Helpers ───────────────────────────────────────────────

/** Generate a deterministic slug from projectId for link injection */
function deriveSlug(projectId?: string): string {
    if (!projectId) return '';
    // Use first 8 chars of projectId as slug (MongoDB ObjectId is 24 hex chars)
    return projectId.slice(0, 8);
}

// ─── Toast Component ───────────────────────────────────────

function CopyToast({ message, visible }: { message: string; visible: boolean }) {
    return (
        <div
            className={`fixed bottom-6 right-6 z-50 transition-all duration-300 ${
                visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
            }`}
        >
            <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl shadow-2xl text-xs font-bold">
                <Check className="w-4 h-4 text-green-400" />
                {message}
            </div>
        </div>
    );
}

// ─── CharCountBar ──────────────────────────────────────────

function CharCountBar({ current, max, recommended }: { current: number; max?: number; recommended?: number }) {
    const limit = max || recommended || 0;
    if (!limit) return null;
    const ratio = current / limit;
    const barColor = ratio > 1 ? 'bg-red-500' : ratio > 0.85 ? 'bg-amber-400' : 'bg-emerald-400';
    const textColor = ratio > 1 ? 'text-red-600' : ratio > 0.85 ? 'text-amber-600' : 'text-slate-500';
    const widthPct = Math.min(ratio * 100, 100);

    return (
        <div className="mt-2 space-y-1">
            <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${widthPct}%` }} />
            </div>
            <div className="flex justify-between">
                <span className={`text-[9px] ${textColor}`}>
                    {current.toLocaleString()} / {limit.toLocaleString()}
                    {recommended && max && recommended < max ? ` (推奨 ~${recommended})` : ''}
                </span>
                {ratio > 1 && (
                    <span className="text-[9px] text-red-500 flex items-center gap-0.5">
                        <AlertCircle className="w-2.5 h-2.5" /> Over limit
                    </span>
                )}
            </div>
        </div>
    );
}

// ─── Copy Event Tracker ────────────────────────────────────

async function trackCopyEvent(params: {
    projectId?: string;
    siteKey: string;
    variant: ExportVariant;
    sectionKey?: string;
    linkIncluded: boolean;
    charCount: number;
}) {
    try {
        await fetch('/api/export/copy-event', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params),
        });
    } catch {
        // Non-blocking — fire and forget
    }
}

// ─── AI Rewrite Service ────────────────────────────────────

interface RewriteResult {
    sections: { key: string; heading: string; content: string }[];
}

async function requestAIRewrite(
    sections: ExportSection[],
    variant: 'short' | 'long',
    platformId: string,
    locale: 'ja' | 'en' | 'both',
): Promise<RewriteResult> {
    const response = await fetch('/api/export/rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            sections: sections.map(s => ({ key: s.key, heading: s.heading, content: s.content })),
            variant,
            platformId,
            locale,
        }),
    });
    if (!response.ok) {
        throw new Error('Rewrite failed');
    }
    return response.json();
}

// ─── Main Component ────────────────────────────────────────

export const ExportTemplates: React.FC<ExportTemplatesProps> = ({
    data,
    projectId,
    candidateSlug,
}) => {
    const t = useTranslations('Export');
    const [selectedPlatform, setSelectedPlatform] = useState<PlatformId | null>(null);
    const [variant, setVariant] = useState<ExportVariant>('standard');
    const [linkEnabled, setLinkEnabled] = useState(false);
    const [copiedSection, setCopiedSection] = useState<string | null>(null);
    const [isExpanded, setIsExpanded] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [toastVisible, setToastVisible] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const toastTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    // AI rewrite state
    const [isRewriting, setIsRewriting] = useState(false);
    const [rewrittenSections, setRewrittenSections] = useState<Map<string, ExportSection[]>>(new Map());
    const [rewriteError, setRewriteError] = useState<string | null>(null);

    // Derive a slug for link injection (from explicit prop or projectId)
    const effectiveSlug = candidateSlug || deriveSlug(projectId);

    // Initialize link toggle from platform policy when platform changes
    useEffect(() => {
        if (selectedPlatform) {
            const config = PLATFORM_CONFIGS[selectedPlatform];
            setLinkEnabled(config.linkInjectionPolicy === 'default_on');
        }
    }, [selectedPlatform]);

    // Build export options (always uses 'standard' as the base — AI handles variant)
    const exportOptions: ExportOptions = useMemo(() => ({
        variant: 'standard',
        linkInjection: {
            enabled: linkEnabled,
            candidateSlug: effectiveSlug || undefined,
        },
    }), [linkEnabled, effectiveSlug]);

    // Generate the base (standard) formatted output
    const baseResult: ExportResult | null = useMemo(() => {
        if (!selectedPlatform) return null;
        try {
            return formatForPlatform(data, selectedPlatform, exportOptions);
        } catch {
            return null;
        }
    }, [selectedPlatform, data, exportOptions]);

    // Cache key for AI rewritten content
    const rewriteCacheKey = selectedPlatform ? `${selectedPlatform}:${variant}` : '';

    // The sections to display: AI-rewritten if available, else base
    const displaySections: ExportSection[] = useMemo(() => {
        if (variant === 'standard' || !baseResult) {
            return baseResult?.sections || [];
        }
        const cached = rewrittenSections.get(rewriteCacheKey);
        if (cached) return cached;
        return baseResult.sections; // Fallback to standard until AI completes
    }, [variant, baseResult, rewrittenSections, rewriteCacheKey]);

    // Build the full formatted text from display sections
    const displayText = useMemo(() => {
        if (!displaySections.length) return '';
        let text = displaySections.map(s => {
            if (displaySections.length === 1) return s.content;
            return `【${s.heading}】\n${s.content}`;
        }).join('\n\n');
        if (linkEnabled && effectiveSlug && selectedPlatform) {
            const config = PLATFORM_CONFIGS[selectedPlatform];
            const base = 'https://jnjgo.app';
            const url = `${base}/c/${effectiveSlug}?ref=export&site=${selectedPlatform}&utm_campaign=export&utm_medium=copy`;
            if (config.locale === 'en') {
                text += `\n---\nPreferences, conditions & availability (private): ${url}`;
            } else {
                text += `\n---\n希望条件・転職意向の詳細（非公開情報）: ${url}`;
            }
        }
        return text;
    }, [displaySections, linkEnabled, effectiveSlug, selectedPlatform]);

    // Trigger AI rewrite when variant changes to short/long
    useEffect(() => {
        if (variant === 'standard' || !selectedPlatform || !baseResult) return;
        // Check cache
        if (rewrittenSections.has(rewriteCacheKey)) return;

        const config = PLATFORM_CONFIGS[selectedPlatform];
        setIsRewriting(true);
        setRewriteError(null);

        requestAIRewrite(baseResult.sections, variant, selectedPlatform, config.locale)
            .then(result => {
                // Map back to ExportSection with char counts
                const mapped: ExportSection[] = result.sections.map((rs, i) => {
                    const origSection = baseResult.sections[i] || baseResult.sections[0];
                    return {
                        ...origSection,
                        key: rs.key,
                        heading: rs.heading,
                        content: rs.content,
                        charCount: rs.content.length,
                    };
                });
                setRewrittenSections(prev => {
                    const next = new Map(prev);
                    next.set(rewriteCacheKey, mapped);
                    return next;
                });
            })
            .catch(() => {
                setRewriteError(t('rewriteError'));
            })
            .finally(() => {
                setIsRewriting(false);
            });
    }, [variant, selectedPlatform, baseResult, rewriteCacheKey, rewrittenSections, t]);

    // Clear rewrite cache when data changes
    useEffect(() => {
        setRewrittenSections(new Map());
    }, [data]);

    // Filter platforms by search query
    const filteredPlatforms = useMemo(() => {
        if (!searchQuery.trim()) return PLATFORM_LIST;
        const q = searchQuery.toLowerCase();
        return PLATFORM_LIST.filter(id => {
            const cfg = PLATFORM_CONFIGS[id];
            return (
                id.includes(q) ||
                t(cfg.nameKey).toLowerCase().includes(q) ||
                cfg.category.includes(q) ||
                cfg.templateCategory.includes(q)
            );
        });
    }, [searchQuery, t]);

    // Copy success toast
    const showToast = useCallback((msg: string) => {
        setToastMessage(msg);
        setToastVisible(true);
        if (toastTimeout.current) clearTimeout(toastTimeout.current);
        toastTimeout.current = setTimeout(() => setToastVisible(false), 2000);
    }, []);

    const handleCopyAll = useCallback(async (platformId: PlatformId) => {
        try {
            await navigator.clipboard.writeText(displayText);
            setCopiedSection('all-' + platformId);
            setTimeout(() => setCopiedSection(null), 2000);
            showToast(t('copiedToast'));
            trackCopyEvent({
                projectId,
                siteKey: platformId,
                variant,
                linkIncluded: linkEnabled && !!effectiveSlug,
                charCount: displayText.length,
            });
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    }, [displayText, variant, projectId, showToast, t, linkEnabled, effectiveSlug]);

    const handleCopySection = useCallback(async (
        platformId: PlatformId,
        sectionKey: string,
        content: string,
    ) => {
        try {
            await navigator.clipboard.writeText(content);
            setCopiedSection(sectionKey);
            setTimeout(() => setCopiedSection(null), 2000);
            showToast(t('copiedToast'));
            trackCopyEvent({
                projectId,
                siteKey: platformId,
                variant,
                sectionKey,
                linkIncluded: false,
                charCount: content.length,
            });
        } catch (err) {
            console.error('Failed to copy section:', err);
        }
    }, [variant, projectId, showToast, t]);

    const handleSelectAndPreview = useCallback((platformId: PlatformId) => {
        setSelectedPlatform(prev => prev === platformId ? null : platformId);
        setVariant('standard'); // Reset variant when switching platforms
    }, []);

    const config = selectedPlatform ? PLATFORM_CONFIGS[selectedPlatform] : null;

    // Determine if current variant has AI-rewritten content
    const hasAIContent = variant !== 'standard' && rewrittenSections.has(rewriteCacheKey);

    // Total char count for display
    const totalCharCount = displaySections.reduce((sum, s) => sum + s.charCount, 0);

    return (
        <>
        <CopyToast message={toastMessage} visible={toastVisible} />
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
            {/* Header */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
                        <FileText className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                        <h3 className="text-sm font-bold text-slate-900">{t('title')}</h3>
                        <p className="text-[10px] text-slate-500">{t('subtitle')}</p>
                    </div>
                </div>
                {isExpanded
                    ? <ChevronUp className="w-4 h-4 text-slate-400" />
                    : <ChevronDown className="w-4 h-4 text-slate-400" />
                }
            </button>

            {isExpanded && (
                <div className="border-t border-slate-100">
                    {/* Search + Platform Grid */}
                    <div className="p-4 space-y-3">
                        {/* Search bar */}
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={t('searchPlaceholder')}
                                className="w-full pl-8 pr-3 py-1.5 text-[11px] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 bg-slate-50"
                            />
                        </div>

                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            {t('selectPlatform')}
                        </p>
                        <div className="grid grid-cols-3 gap-2">
                            {filteredPlatforms.map(platformId => {
                                const pConfig = PLATFORM_CONFIGS[platformId];
                                const isSelected = selectedPlatform === platformId;
                                const isCopied = copiedSection === 'all-' + platformId;

                                return (
                                    <div key={platformId} className="relative group">
                                        <button
                                            onClick={() => handleSelectAndPreview(platformId)}
                                            className={`w-full text-left p-2 rounded-xl border-2 transition-all text-[10px] ${isSelected
                                                ? 'border-indigo-400 bg-indigo-50 shadow-sm'
                                                : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                                                }`}
                                        >
                                            <div className="flex items-center gap-1.5 mb-1">
                                                <span className={`w-2 h-2 rounded-full ${pConfig.color}`} />
                                                <span className="font-bold text-slate-800 truncate">
                                                    {t(pConfig.nameKey)}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1 text-slate-400">
                                                {CATEGORY_ICONS[pConfig.category]}
                                                <span className="text-[8px] uppercase tracking-wide">
                                                    {pConfig.locale === 'ja' ? 'JA' : pConfig.locale === 'en' ? 'EN' : 'JA/EN'}
                                                </span>
                                            </div>
                                        </button>

                                        {/* Quick-copy button overlay */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleCopyAll(platformId);
                                            }}
                                            className={`absolute -top-1 -right-1 p-1.5 rounded-lg shadow-lg transition-all opacity-0 group-hover:opacity-100 ${isCopied
                                                ? 'bg-green-500 text-white'
                                                : 'bg-slate-900 text-white hover:bg-indigo-600'
                                                }`}
                                            title={t('copyForPlatform')}
                                        >
                                            {isCopied
                                                ? <Check className="w-3 h-3" />
                                                : <Copy className="w-3 h-3" />
                                            }
                                        </button>
                                    </div>
                                );
                            })}
                            {filteredPlatforms.length === 0 && (
                                <p className="col-span-3 text-center text-[10px] text-slate-400 py-4">
                                    {t('noResults')}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Preview Panel */}
                    {selectedPlatform && config && baseResult && (
                        <div className="border-t border-slate-100">
                            {/* Platform Header */}
                            <div className="px-4 pt-4 pb-2 bg-slate-50">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className={`w-3 h-3 rounded-full ${config.color}`} />
                                        <span className="text-xs font-bold text-slate-800">{t(config.nameKey)}</span>
                                        <a
                                            href={config.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-slate-400 hover:text-indigo-600 transition-colors"
                                        >
                                            <ExternalLink className="w-3 h-3" />
                                        </a>
                                    </div>
                                    <button
                                        onClick={() => handleCopyAll(selectedPlatform)}
                                        disabled={isRewriting}
                                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm ${copiedSection === 'all-' + selectedPlatform
                                            ? 'bg-green-500 text-white'
                                            : isRewriting
                                                ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                                                : 'bg-slate-900 text-white hover:bg-indigo-600'
                                            }`}
                                    >
                                        {copiedSection === 'all-' + selectedPlatform
                                            ? <><Check className="w-3 h-3" /> {t('copied')}</>
                                            : <><Copy className="w-3 h-3" /> {t('copyAll')}</>
                                        }
                                    </button>
                                </div>
                            </div>

                            {/* Toolbar: Variant selector + Link toggle — clean separated row */}
                            <div className="px-4 py-3 bg-slate-50 border-t border-slate-100/70">
                                <div className="flex flex-col gap-2.5">
                                    {/* Row 1: AI Variant selector */}
                                    <div>
                                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">
                                            {t('variantLabel')}
                                        </label>
                                        <div className="flex items-center gap-1">
                                            {VARIANT_LIST.map(v => {
                                                const isActive = variant === v;
                                                const isAI = v !== 'standard';
                                                return (
                                                    <button
                                                        key={v}
                                                        onClick={() => setVariant(v)}
                                                        disabled={isRewriting && v !== variant}
                                                        className={`relative flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                                                            isActive
                                                                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                                                                : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200'
                                                        } ${isRewriting && v !== variant ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                    >
                                                        {isAI && isActive && isRewriting && (
                                                            <Loader2 className="w-3 h-3 animate-spin" />
                                                        )}
                                                        {isAI && !isRewriting && (
                                                            <Sparkles className="w-3 h-3" />
                                                        )}
                                                        {t(`variant_${v}`)}
                                                    </button>
                                                );
                                            })}
                                            {hasAIContent && (
                                                <span className="ml-1.5 text-[9px] text-indigo-500 font-medium flex items-center gap-0.5">
                                                    <Sparkles className="w-2.5 h-2.5" />
                                                    {t('aiRewritten')}
                                                </span>
                                            )}
                                        </div>
                                        {variant !== 'standard' && (
                                            <p className="mt-1 text-[9px] text-slate-400">
                                                {variant === 'short' ? t('variantShortDesc') : t('variantLongDesc')}
                                            </p>
                                        )}
                                    </div>

                                    {/* Row 2: Link toggle */}
                                    <div className="flex items-center justify-between pt-1 border-t border-slate-100/70">
                                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                            {t('linkLabel')}
                                        </label>
                                        <button
                                            onClick={() => setLinkEnabled(prev => !prev)}
                                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                                                linkEnabled ? 'bg-indigo-600' : 'bg-slate-300'
                                            }`}
                                            title={t('linkToggleTooltip')}
                                        >
                                            <span
                                                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow-sm ${
                                                    linkEnabled ? 'translate-x-4' : 'translate-x-0.5'
                                                }`}
                                            />
                                        </button>
                                    </div>
                                    {linkEnabled && (
                                        <div className="flex items-center gap-1.5 text-[9px] text-indigo-600 bg-indigo-50 rounded-lg px-2.5 py-1.5 -mt-1">
                                            <Link2 className="w-3 h-3 shrink-0" />
                                            <span className="truncate">
                                                {effectiveSlug
                                                    ? `jnjgo.app/c/${effectiveSlug}`
                                                    : t('linkNoSlug')
                                                }
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Meta info row */}
                            <div className="px-4 py-2 bg-slate-50 border-t border-slate-100/50 flex items-center gap-3 text-[10px] text-slate-500">
                                <span>{displaySections.length} {displaySections.length === 1 ? 'section' : 'sections'}</span>
                                <span className="text-slate-300">·</span>
                                <span>{totalCharCount.toLocaleString()} {t('chars')}</span>
                                {linkEnabled && effectiveSlug && (
                                    <>
                                        <span className="text-slate-300">·</span>
                                        <span className="text-indigo-600 font-bold flex items-center gap-0.5">
                                            <Link2 className="w-2.5 h-2.5" />
                                            {t('linkIncluded')}
                                        </span>
                                    </>
                                )}
                            </div>

                            {/* Rewrite error banner */}
                            {rewriteError && (
                                <div className="mx-4 mt-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-center gap-2 text-[10px] text-amber-700">
                                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                    <span>{rewriteError}</span>
                                    <button
                                        onClick={() => {
                                            setRewriteError(null);
                                            // Retry by clearing cache for this key
                                            setRewrittenSections(prev => {
                                                const next = new Map(prev);
                                                next.delete(rewriteCacheKey);
                                                return next;
                                            });
                                        }}
                                        className="ml-auto text-amber-800 font-bold hover:underline"
                                    >
                                        {t('retry')}
                                    </button>
                                </div>
                            )}

                            {/* Rewriting overlay */}
                            {isRewriting && (
                                <div className="mx-4 mt-3 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-3 flex items-center gap-2.5 text-[10px] text-indigo-700">
                                    <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                                    <div>
                                        <span className="font-bold">{t('rewritingTitle')}</span>
                                        <span className="text-indigo-500 ml-1">{t('rewritingDesc')}</span>
                                    </div>
                                </div>
                            )}

                            {/* Section-level output */}
                            <div className={`p-4 space-y-4 ${isRewriting ? 'opacity-50 pointer-events-none' : ''}`}>
                                {displaySections.map((sec: ExportSection) => {
                                    const isSectionCopied = copiedSection === sec.key;
                                    return (
                                        <div key={sec.key} className="rounded-xl border border-slate-200 overflow-hidden">
                                            {/* Section header */}
                                            <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-200">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[11px] font-bold text-slate-700">
                                                        {sec.heading}
                                                    </span>
                                                    {sec.hintKey && (
                                                        <span className="text-[9px] text-slate-400">
                                                            {t(sec.hintKey)}
                                                        </span>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={() => handleCopySection(selectedPlatform, sec.key, sec.content)}
                                                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold transition-all ${isSectionCopied
                                                        ? 'bg-green-500 text-white'
                                                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200'
                                                        }`}
                                                >
                                                    {isSectionCopied
                                                        ? <><Check className="w-3 h-3" /> {t('copied')}</>
                                                        : <><Copy className="w-3 h-3" /> {t('copySection')}</>
                                                    }
                                                </button>
                                            </div>

                                            {/* Section content */}
                                            <div className="p-3">
                                                <pre className="text-[10px] font-mono text-slate-700 whitespace-pre-wrap leading-relaxed select-all">
                                                    {sec.content}
                                                </pre>
                                                <CharCountBar
                                                    current={sec.charCount}
                                                    max={sec.maxLength}
                                                    recommended={sec.recommendedLength}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Platform Tips */}
                            <div className="px-4 pb-4">
                                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3">
                                    <p className="text-[10px] font-bold text-indigo-700 mb-1">💡 {t('tip')}</p>
                                    <p className="text-[10px] text-indigo-600 leading-relaxed">
                                        {t(config.descriptionKey)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
        </>
    );
};
