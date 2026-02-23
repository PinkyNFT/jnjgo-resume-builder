'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLocale } from 'next-intl';
import { EXPORT_PLATFORMS, ExportPlatform, ExportVariant, generateExportText } from '../../lib/export-templates';
import { ResumeData } from '../../types';
import { Copy, Check, ChevronDown, Link as LinkIcon, AlertCircle, ExternalLink } from 'lucide-react';

interface ExportHubProps {
    resumeData?: ResumeData;
    candidateSlug?: string | null;
    projectId?: string | null;
    projectTitle?: string | null;
}

export default function ExportHub({ resumeData, candidateSlug, projectId, projectTitle }: ExportHubProps) {
    const locale = useLocale();
    const [selectedPlatform, setSelectedPlatform] = useState<ExportPlatform>(EXPORT_PLATFORMS[0]);
    const [variant, setVariant] = useState<ExportVariant>('standard');
    const [includeLink, setIncludeLink] = useState(false);
    const [copied, setCopied] = useState(false);
    const [generatedText, setGeneratedText] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Build the recruiter link URL so it can be previewed in the UI
    const recruiterLink = useMemo(() => {
        if (!candidateSlug) return null;
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL || 'https://app.jnjgo.com');
        return `${baseUrl}/c/${candidateSlug}?ref=export&site=${selectedPlatform.id}&utm_campaign=export&utm_medium=copy`;
    }, [candidateSlug, selectedPlatform.id]);

    useEffect(() => {
        let text = generateExportText(resumeData, selectedPlatform.category, variant);

        if (includeLink && recruiterLink) {
            text += `\n\n---\n【詳細プロフィール・ご条件のご確認】\n希望年収や譲れない条件、面接可能日などは以下のMyページに詳細を記載しております。\n${recruiterLink} (JNJGO)`;
        }

        setGeneratedText(text);

        // Scroll textarea to bottom when link is toggled on so user sees the appended block
        if (includeLink && textareaRef.current) {
            setTimeout(() => {
                if (textareaRef.current) {
                    textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
                }
            }, 0);
        }
    }, [resumeData, selectedPlatform, variant, includeLink, recruiterLink]);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(generatedText);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);

            // Log the export event (KPI: export usage rate, link-inclusion rate)
            await fetch('/api/export/events', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    siteKey: selectedPlatform.id,
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
        <div className="max-w-6xl mx-auto px-4 py-8 page-transition">
            <div className="mb-8">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold mb-3">
                    <ExternalLink className="w-3 h-3" /> Export Center
                </div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">Export to Job Sites</h1>
                {projectTitle && (
                    <p className="mt-2 text-sm font-semibold text-indigo-600 inline-flex items-center gap-1.5">
                        <span className="text-slate-400 font-normal">Project:</span> {projectTitle}
                    </p>
                )}
                <p className="mt-2 text-slate-500">
                    Format your resume instantly for major job platforms. One-click copy, structured perfectly.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Panel: Settings */}
                <div className="lg:col-span-4 space-y-5 stagger-children">
                    {/* Platform Selector */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                        <label className="block text-sm font-bold text-slate-700 mb-3">Target Platform</label>
                        <div className="grid grid-cols-2 gap-2">
                            {EXPORT_PLATFORMS.map(platform => (
                                <button
                                    key={platform.id}
                                    onClick={() => setSelectedPlatform(platform)}
                                    className={`group px-3 py-2.5 text-sm rounded-xl border-2 transition-all duration-200 text-left ${selectedPlatform.id === platform.id
                                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-semibold shadow-sm shadow-indigo-100/50'
                                        : 'border-slate-200 text-slate-600 hover:border-indigo-200 hover:bg-indigo-50/30'
                                        }`}
                                >
                                    {platform.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Variant Selector */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                        <label className="block text-sm font-bold text-slate-700 mb-3">Length Variant</label>
                        <div className="flex gap-2">
                            {(['short', 'standard', 'long'] as ExportVariant[]).map((v) => (
                                <button
                                    key={v}
                                    onClick={() => setVariant(v)}
                                    className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all duration-200 capitalize ${variant === v
                                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200/50'
                                        : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-200'
                                        }`}
                                >
                                    {v}
                                </button>
                            ))}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-2 text-center">
                            {variant === 'short' ? 'Overview only' : variant === 'standard' ? 'Recommended' : 'Includes all details'}
                        </p>
                    </div>

                    {/* Link Injection Option */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-3">
                        <label className="block text-sm font-bold text-slate-700">Recruiter Conversion Loop</label>

                        {!candidateSlug ? (
                            <div className="p-3 bg-amber-50 text-amber-700 text-xs rounded-xl border border-amber-100 flex items-start gap-2">
                                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                                <div>
                                    <p className="mb-2 text-[13px] leading-snug">You must publish your <strong>Recruiter-Only Profile</strong> to enable direct recruiter scouting links.</p>
                                    <a href={`/${locale}/profile/private`} target="_blank" className="inline-block bg-white border border-amber-200 text-amber-800 font-semibold px-3 py-1.5 rounded-lg hover:bg-amber-100 transition-all duration-200 shadow-sm">
                                        Create Private Profile
                                    </a>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <div className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                                    <input
                                        type="checkbox"
                                        id="linkInjection"
                                        checked={includeLink}
                                        onChange={(e) => setIncludeLink(e.target.checked)}
                                        className="mt-1 h-4 w-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                                    />
                                    <label htmlFor="linkInjection" className="text-sm text-slate-700">
                                        <span className="font-semibold block mb-0.5">Include My Direct Scout Link</span>
                                        Append a secure link to your private preferences, letting recruiters scout you directly through JNJGO.
                                    </label>
                                </div>
                                {includeLink && recruiterLink && (
                                    <div className="p-2.5 bg-indigo-50 border border-indigo-200 rounded-xl">
                                        <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-1">Link appended to text ✓</p>
                                        <a
                                            href={recruiterLink}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-[11px] text-indigo-700 break-all hover:underline flex items-start gap-1"
                                        >
                                            <ExternalLink size={10} className="shrink-0 mt-0.5" />
                                            {recruiterLink}
                                        </a>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Panel: Preview & Actions */}
                <div className="lg:col-span-8 flex flex-col">
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex-1 flex flex-col overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                            <div>
                                <span className="text-sm font-semibold text-slate-700">Generated for {selectedPlatform.name}</span>
                                <span className="text-xs text-slate-400 ml-2 capitalize">({variant})</span>
                            </div>
                            <button
                                onClick={handleCopy}
                                className={`px-5 py-2.5 text-sm font-bold rounded-xl flex items-center gap-2 transition-all duration-300 active:scale-[0.97] ${copied
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm'
                                    : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200/50 hover:shadow-xl'
                                    }`}
                            >
                                {copied ? <Check size={16} /> : <Copy size={16} />}
                                {copied ? 'Copied!' : 'Copy to Clipboard'}
                            </button>
                        </div>
                        <div className="p-5 flex-1 bg-slate-50/30">
                            <textarea
                                ref={textareaRef}
                                readOnly
                                value={generatedText}
                                className="w-full h-full min-h-125 p-4 font-mono text-sm leading-relaxed rounded-xl border border-slate-200 bg-white focus:ring-0 focus:border-slate-300 resize-none shadow-inner"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
