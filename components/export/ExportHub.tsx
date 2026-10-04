'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { EXPORT_PLATFORMS, ExportVariant, generateExportText } from '../../lib/export-templates';
import { ResumeData } from '../../types';
import { Copy, Check, ExternalLink, AlertCircle, ArrowRight, Briefcase, Linkedin, FileText, Minimize2, AlignLeft, AlignJustify, ChevronLeft } from 'lucide-react';
import BackToDashboard from '../navigation/BackToDashboard';
import BizReachGuide from './BizReachGuide';

interface ExportHubProps {
    resumeData?: ResumeData;
    candidateSlug?: string | null;
    projectId?: string | null;
    projectTitle?: string | null;
}

export default function ExportHub({ resumeData, candidateSlug, projectId, projectTitle }: ExportHubProps) {
    const locale = useLocale();
    const t = useTranslations('Export');
    const [activeFlow, setActiveFlow] = useState<'selection' | 'linkedin' | 'bizreach'>('selection');
    const [variant, setVariant] = useState<ExportVariant>('standard');
    const [includeLink, setIncludeLink] = useState(false);
    const [copied, setCopied] = useState(false);
    const [generatedText, setGeneratedText] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Hardcode selected platform for linkedin flow
    const linkedinPlatform = EXPORT_PLATFORMS.find(p => p.id === 'linkedin') || EXPORT_PLATFORMS[0];

    const recruiterLink = useMemo(() => {
        if (!candidateSlug) return null;
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL || 'https://app.jnjgo.com');
        return `${baseUrl}/c/${candidateSlug}?ref=export&site=linkedin&utm_campaign=export&utm_medium=copy`;
    }, [candidateSlug]);

    useEffect(() => {
        if (activeFlow !== 'linkedin') return;

        let text = generateExportText(resumeData, linkedinPlatform.category, variant);

        if (includeLink && recruiterLink) {
            text += `\n\n---\n【詳細プロフィール・ご条件のご確認】\n希望年収や譲れない条件、面接可能日などは以下のMyページに詳細を記載しております。\n${recruiterLink} (JNJGO)`;
        }

        setGeneratedText(text);

        if (includeLink && textareaRef.current) {
            setTimeout(() => {
                if (textareaRef.current) {
                    textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
                }
            }, 0);
        }
    }, [resumeData, linkedinPlatform, variant, includeLink, recruiterLink, activeFlow]);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(generatedText);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);

            await fetch('/api/export/events', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    siteKey: 'linkedin',
                    variant,
                    linkIncluded: includeLink,
                    ...(projectId && { projectId }),
                })
            });
        } catch (err) {
            console.error('Failed to copy text', err);
        }
    };

    return (
        <div className="max-w-6xl mx-auto px-4 py-8 page-transition min-h-[calc(100vh-6rem)] flex flex-col relative">
            {/* Nav Row */}
            <div className="flex items-center justify-between z-10">
                {activeFlow === 'selection' ? (
                    <BackToDashboard />
                ) : (
                    <button
                        onClick={() => setActiveFlow('selection')}
                        className="text-slate-500 hover:text-slate-800 text-sm font-bold flex items-center gap-2 mb-6 transition-colors"
                    >
                        {t('backToPlatforms')}
                    </button>
                )}
            </div>

            {/* Selection View */}
            {activeFlow === 'selection' && (
                <div className="mt-8">
                    <div className="text-center mb-12">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 text-indigo-700 text-sm font-bold mb-4 shadow-sm border border-indigo-100">
                            <ExternalLink className="w-4 h-4" /> {t('title')}
                        </div>
                        <h1 className="text-4xl lg:text-5xl font-black text-slate-900 tracking-tight mb-4">
                            {t('hubTitle')}
                        </h1>
                        <p className="text-lg text-slate-500 max-w-2xl mx-auto font-medium">
                            {t('hubSubtitle')}
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 max-w-4xl mx-auto px-4">
                        {/* LinkedIn Card */}
                        <div
                            onClick={() => setActiveFlow('linkedin')}
                            className="group cursor-pointer bg-white rounded-3xl p-8 border-2 border-slate-100 hover:border-[#0A66C2] transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                                <Linkedin className="w-32 h-32 text-[#0A66C2]" />
                            </div>
                            <div className="w-14 h-14 bg-blue-50 text-[#0A66C2] rounded-2xl flex items-center justify-center mb-6 shadow-inner border border-blue-100">
                                <Linkedin className="w-7 h-7" />
                            </div>
                            <h2 className="text-2xl font-black text-slate-900 mb-3">{t('linkedinCardTitle')}</h2>
                            <p className="text-slate-500 font-medium mb-8 leading-relaxed">
                                {t('linkedinCardDesc')}
                            </p>
                            <div className="flex items-center justify-between mt-auto pt-6 border-t border-slate-100">
                                <span className="text-[#0A66C2] font-bold group-hover:underline flex items-center gap-2">
                                    {t('linkedinCardAction')}
                                </span>
                                <ArrowRight className="w-5 h-5 text-[#0A66C2] group-hover:translate-x-1 transition-transform" />
                            </div>
                        </div>

                        {/* BizReach Card */}
                        <div
                            onClick={() => setActiveFlow('bizreach')}
                            className="group cursor-pointer bg-slate-900 rounded-3xl p-8 border-2 border-slate-800 hover:border-emerald-400 transition-all duration-300 hover:shadow-2xl hover:shadow-emerald-900/20 hover:-translate-y-1 relative overflow-hidden text-white"
                        >
                            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                                <Briefcase className="w-32 h-32 text-emerald-400" />
                            </div>
                            <div className="w-14 h-14 bg-slate-800 text-emerald-400 rounded-2xl flex items-center justify-center mb-6 shadow-inner border border-slate-700 group-hover:bg-slate-800 transition-colors">
                                <span className="text-2xl font-black italic tracking-tighter">B</span>
                            </div>
                            <h2 className="text-2xl font-black text-white mb-3">{t('bizreachCardTitle')}</h2>
                            <p className="text-slate-400 font-medium mb-8 leading-relaxed">
                                {t('bizreachCardDesc')}
                            </p>
                            <div className="flex items-center justify-between mt-auto pt-6 border-t border-slate-800">
                                <span className="text-emerald-400 font-bold group-hover:underline flex items-center gap-2">
                                    {t('bizreachCardAction')}
                                </span>
                                <ArrowRight className="w-5 h-5 text-emerald-400 group-hover:translate-x-1 transition-transform" />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* BizReach Guided Flow */}
            {activeFlow === 'bizreach' && (
                <div className="mt-6 w-full max-w-4xl mx-auto pb-10">
                    <BizReachGuide
                        resumeData={resumeData}
                        onClose={() => setActiveFlow('selection')}
                    />
                </div>
            )}

            {/* LinkedIn Classical Flow */}
            {activeFlow === 'linkedin' && (
                <div className="mt-4 flex-1 pb-10 max-w-5xl mx-auto w-full">
                    {/* LinkedIn Header Bar */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 p-5 mb-6 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-11 h-11 bg-[#0A66C2] text-white rounded-xl flex items-center justify-center shrink-0">
                                <Linkedin className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">LinkedIn {t('title')}</h3>
                                <p className="text-xs text-slate-400 font-medium">{t('subtitle')}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-xs font-medium text-slate-400 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                                {generatedText.length} {t('chars')}
                            </span>
                            <button
                                onClick={() => window.open('https://www.linkedin.com/in/', '_blank', 'noreferrer')}
                                className="hidden sm:flex items-center gap-2 px-4 py-2 text-sm font-bold text-[#0A66C2] bg-blue-50 hover:bg-blue-100 rounded-xl transition-all duration-200 border border-blue-100"
                            >
                                <ExternalLink className="w-3.5 h-3.5" />
                                {t('openLinkedIn')}
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* Left Settings Panel */}
                        <div className="lg:col-span-4 space-y-4">
                            {/* Variant Selector */}
                            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50">
                                <label className="block text-sm font-bold text-slate-700 mb-3">{t('variantLabel')}</label>
                                <div className="space-y-2">
                                    {([
                                        { key: 'short' as ExportVariant, icon: Minimize2, desc: t('variantShortDesc') },
                                        { key: 'standard' as ExportVariant, icon: AlignLeft, desc: '' },
                                        { key: 'long' as ExportVariant, icon: AlignJustify, desc: t('variantLongDesc') },
                                    ]).map(({ key, icon: Icon, desc }) => (
                                        <button
                                            key={key}
                                            onClick={() => setVariant(key)}
                                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-left border ${variant === key
                                                ? 'border-[#0A66C2] bg-blue-50 text-[#0A66C2] shadow-sm'
                                                : 'border-slate-100 bg-white text-slate-600 hover:border-slate-200 hover:bg-slate-50'
                                                }`}
                                        >
                                            <Icon className={`w-4 h-4 shrink-0 ${variant === key ? 'text-[#0A66C2]' : 'text-slate-400'}`} />
                                            <div className="flex-1 min-w-0">
                                                <span className="text-sm font-bold capitalize block">{t(`variant_${key}`)}</span>
                                                {desc && <span className="text-[11px] text-slate-400 font-medium block mt-0.5 leading-tight">{desc}</span>}
                                            </div>
                                            {variant === key && (
                                                <div className="w-2 h-2 rounded-full bg-[#0A66C2] shrink-0" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Link Injection Option */}
                            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50">
                                <label className="block text-sm font-bold text-slate-700 mb-3">{t('linkLabel')}</label>

                                {!candidateSlug ? (
                                    <div className="p-4 bg-amber-50 text-amber-700 text-xs rounded-xl border border-amber-100 flex items-start gap-3">
                                        <AlertCircle size={16} className="shrink-0 mt-0.5" />
                                        <div>
                                            <p className="mb-3 text-[13px] leading-relaxed font-medium">{t.rich('publishProfileForLink', { strong: (chunks) => <strong>{chunks}</strong> })}</p>
                                            <a href={`/${locale}/profile/private`} target="_blank" className="inline-block bg-white border border-amber-200 text-amber-800 font-bold px-4 py-2 rounded-xl hover:bg-amber-100 transition-all duration-200 shadow-sm">
                                                {t('createPrivateProfile')}
                                            </a>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <div
                                            className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all duration-200 ${includeLink
                                                ? 'bg-blue-50 border-[#0A66C2]/30'
                                                : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                                                }`}
                                            onClick={() => setIncludeLink(!includeLink)}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={includeLink}
                                                onChange={() => { }}
                                                className="mt-1 h-5 w-5 text-[#0A66C2] rounded border-gray-300 focus:ring-[#0A66C2] pointer-events-none"
                                            />
                                            <div className="flex-1">
                                                <span className="text-sm font-bold text-slate-800 block mb-0.5">{t('linkToggleTooltip')}</span>
                                                <span className="text-xs text-slate-400 font-medium leading-relaxed block">
                                                    {t('linkAppendDesc')}
                                                </span>
                                            </div>
                                        </div>
                                        {includeLink && recruiterLink && (
                                            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                                                <p className="text-[10px] font-bold text-[#0A66C2] uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><Check size={12} /> {t('linkIncluded')}</p>
                                                <a
                                                    href={recruiterLink}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-xs text-blue-700 font-medium break-all hover:underline flex items-start gap-1"
                                                >
                                                    <ExternalLink size={12} className="shrink-0 mt-0.5" />
                                                    {recruiterLink}
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Right Panel Preview */}
                        <div className="lg:col-span-8 flex flex-col min-h-125">
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 flex-1 flex flex-col overflow-hidden">
                                <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
                                    <span className="text-sm font-bold text-slate-600 flex items-center gap-2">
                                        <FileText className="w-4 h-4 text-slate-400" />
                                        {t('outputPreview')}
                                    </span>
                                    <button
                                        onClick={handleCopy}
                                        className={`px-5 py-2 text-sm font-bold rounded-xl flex items-center gap-2 transition-all duration-200 ${copied
                                            ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                                            : 'bg-slate-900 text-white hover:bg-slate-800'
                                            }`}
                                    >
                                        {copied ? <Check size={15} /> : <Copy size={15} />}
                                        {copied ? t('copied') : t('copyAll')}
                                    </button>
                                </div>
                                <div className="p-5 flex-1">
                                    <textarea
                                        ref={textareaRef}
                                        readOnly
                                        value={generatedText}
                                        className="w-full h-full min-h-100 p-5 font-mono text-sm text-slate-700 leading-relaxed rounded-xl border border-slate-200 bg-slate-50/50 focus:ring-0 focus:border-blue-200 resize-none"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
