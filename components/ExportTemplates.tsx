'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { ResumeData } from '../types';
import { PlatformId, PLATFORM_CONFIGS, PLATFORM_LIST } from '../config/exportPlatforms';
import { formatForPlatform, ExportResult, ExportSection } from '../services/exportService';
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
} from 'lucide-react';

interface ExportTemplatesProps {
    data: ResumeData;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
    executive: <Briefcase className="w-3 h-3" />,
    engineer: <Code className="w-3 h-3" />,
    freelance: <Zap className="w-3 h-3" />,
    general: <Globe className="w-3 h-3" />,
};

/** Character count bar — green when under limit, amber when near, red when over */
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

export const ExportTemplates: React.FC<ExportTemplatesProps> = ({ data }) => {
    const t = useTranslations('Export');
    const [selectedPlatform, setSelectedPlatform] = useState<PlatformId | null>(null);
    const [copiedSection, setCopiedSection] = useState<string | null>(null); // track by section key or 'all'
    const [isExpanded, setIsExpanded] = useState(false);

    // Generate the formatted output whenever platform or data change
    const exportResult: ExportResult | null = useMemo(() => {
        if (!selectedPlatform) return null;
        try {
            return formatForPlatform(data, selectedPlatform);
        } catch {
            return null;
        }
    }, [selectedPlatform, data]);

    const handleCopyAll = useCallback(async (platformId: PlatformId) => {
        try {
            const result = formatForPlatform(data, platformId);
            await navigator.clipboard.writeText(result.formattedText);
            setCopiedSection('all-' + platformId);
            setTimeout(() => setCopiedSection(null), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    }, [data]);

    const handleCopySection = useCallback(async (sectionKey: string, content: string) => {
        try {
            await navigator.clipboard.writeText(content);
            setCopiedSection(sectionKey);
            setTimeout(() => setCopiedSection(null), 2000);
        } catch (err) {
            console.error('Failed to copy section:', err);
        }
    }, []);

    const handleSelectAndPreview = useCallback((platformId: PlatformId) => {
        setSelectedPlatform(prev => prev === platformId ? null : platformId);
    }, []);

    const config = selectedPlatform ? PLATFORM_CONFIGS[selectedPlatform] : null;
    const hasMultipleSections = (exportResult?.sections.length ?? 0) > 1;

    return (
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
                    {/* Platform Grid */}
                    <div className="p-4 space-y-3">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            {t('selectPlatform')}
                        </p>
                        <div className="grid grid-cols-3 gap-2">
                            {PLATFORM_LIST.map(platformId => {
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
                        </div>
                    </div>

                    {/* Preview Panel */}
                    {selectedPlatform && config && exportResult && (
                        <div className="border-t border-slate-100">
                            {/* Platform Header */}
                            <div className="p-4 bg-slate-50 flex items-center justify-between">
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
                                <div className="flex items-center gap-3">
                                    <span className="text-[10px] text-slate-500">
                                        {exportResult.sectionCount} {exportResult.sectionCount === 1 ? 'section' : 'sections'}
                                    </span>
                                    <button
                                        onClick={() => handleCopyAll(selectedPlatform)}
                                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm ${copiedSection === 'all-' + selectedPlatform
                                            ? 'bg-green-500 text-white'
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

                            {/* Section-level output */}
                            <div className="p-4 space-y-4">
                                {exportResult.sections.map((sec: ExportSection) => {
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
                                                    onClick={() => handleCopySection(sec.key, sec.content)}
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
    );
};
