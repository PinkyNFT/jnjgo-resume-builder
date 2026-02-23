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
        <div className="max-w-6xl mx-auto px-4 py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Export to Job Sites</h1>
                {projectTitle && (
                    <p className="mt-1 text-sm font-semibold text-indigo-600 inline-flex items-center gap-1.5">
                        <span className="text-slate-400 font-normal">Project:</span> {projectTitle}
                    </p>
                )}
                <p className="mt-2 text-slate-500">
                    Format your resume instantly for major job platforms. One-click copy, structured perfectly.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Panel: Settings */}
                <div className="lg:col-span-4 space-y-6">
                    {/* Platform Selector */}
                    <div className="bg-white p-5 rounded-xl border shadow-sm">
                        <label className="block text-sm font-semibold text-slate-700 mb-3">Target Platform</label>
                        <div className="grid grid-cols-2 gap-2">
                            {EXPORT_PLATFORMS.map(platform => (
                                <button
                                    key={platform.id}
                                    onClick={() => setSelectedPlatform(platform)}
                                    className={`px-3 py-2 text-sm rounded-lg border transition-all text-left ${selectedPlatform.id === platform.id
                                        ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium ring-1 ring-blue-500'
                                        : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                                        }`}
                                >
                                    {platform.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Variant Selector */}
                    <div className="bg-white p-5 rounded-xl border shadow-sm">
                        <label className="block text-sm font-semibold text-slate-700 mb-3">Length Variant</label>
                        <select
                            value={variant}
                            onChange={(e) => setVariant(e.target.value as ExportVariant)}
                            className="w-full rounded-lg border-slate-300 p-2.5 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        >
                            <option value="short">Short (Overview only)</option>
                            <option value="standard">Standard (Recommended)</option>
                            <option value="long">Long (Includes all details)</option>
                        </select>
                    </div>

                    {/* Link Injection Option */}
                    <div className="bg-white p-5 rounded-xl border shadow-sm space-y-3">
                        <label className="block text-sm font-semibold text-slate-700">Recruiter Conversion Loop</label>

                        {!candidateSlug ? (
                            <div className="p-3 bg-amber-50 text-amber-700 text-xs rounded-lg border border-amber-100 flex items-start gap-2">
                                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                                <div>
                                    <p className="mb-2 text-[13px] leading-snug">You must publish your <strong>Recruiter-Only Profile</strong> to enable direct recruiter scouting links.</p>
                                    <a href={`/${locale}/profile/private`} target="_blank" className="inline-block bg-white border border-amber-200 text-amber-800 font-semibold px-3 py-1.5 rounded-md hover:bg-amber-100 transition shadow-sm">
                                        Create Private Profile
                                    </a>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <div className="flex items-start gap-3 p-3 bg-slate-50 border rounded-lg">
                                    <input
                                        type="checkbox"
                                        id="linkInjection"
                                        checked={includeLink}
                                        onChange={(e) => setIncludeLink(e.target.checked)}
                                        className="mt-1 h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                    />
                                    <label htmlFor="linkInjection" className="text-sm text-slate-700">
                                        <span className="font-semibold block mb-0.5">Include My Direct Scout Link</span>
                                        Append a secure link to your private preferences, letting recruiters scout you directly through JNJGO.
                                    </label>
                                </div>
                                {includeLink && recruiterLink && (
                                    <div className="p-2.5 bg-indigo-50 border border-indigo-200 rounded-lg">
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
                    <div className="bg-white rounded-xl border shadow-sm flex-1 flex flex-col overflow-hidden">
                        <div className="px-5 py-4 border-b bg-slate-50 flex items-center justify-between">
                            <span className="text-sm font-medium text-slate-600">Generated text for {selectedPlatform.name}</span>
                            <button
                                onClick={handleCopy}
                                className={`px-4 py-2 text-sm font-medium rounded-lg flex items-center gap-2 transition-all ${copied
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                                    }`}
                            >
                                {copied ? <Check size={16} /> : <Copy size={16} />}
                                {copied ? 'Copied to Clipboard!' : 'Copy to Clipboard'}
                            </button>
                        </div>
                        <div className="p-5 flex-1 bg-slate-50">
                            <textarea
                                ref={textareaRef}
                                readOnly
                                value={generatedText}
                                className="w-full h-full min-h-[500px] p-4 font-mono text-sm leading-relaxed rounded-lg border border-slate-200 bg-white focus:ring-0 focus:border-slate-300 resize-none shadow-inner"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
