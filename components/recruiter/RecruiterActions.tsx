'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
    Bookmark, BookmarkCheck, MessageSquare, Send, X, Loader2,
    CheckCircle2, AlertCircle, Sparkles, Shield, User, Inbox
} from 'lucide-react';

interface RecruiterActionsProps {
    candidateSlug: string;
    candidateName?: string;
    candidateRole?: string;
}

export default function RecruiterActions({ candidateSlug, candidateName, candidateRole }: RecruiterActionsProps) {
    const params = useParams();
    const locale = params.locale as string || 'en';
    const [isSaved, setIsSaved] = useState(false);
    const [hasContacted, setHasContacted] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showContactForm, setShowContactForm] = useState(false);
    const [contactMessage, setContactMessage] = useState('');
    const [sendingContact, setSendingContact] = useState(false);
    const [contactSent, setContactSent] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchStatus = useCallback(async () => {
        try {
            const res = await fetch(`/api/recruiter/actions?candidateSlug=${encodeURIComponent(candidateSlug)}`);
            if (res.ok) {
                const data = await res.json();
                setIsSaved(data.isSaved);
                setHasContacted(data.hasContacted);
            }
        } catch {
            // silently fail on status check
        } finally {
            setLoading(false);
        }
    }, [candidateSlug]);

    useEffect(() => {
        fetchStatus();
    }, [fetchStatus]);

    // Auto-dismiss error after 4s
    useEffect(() => {
        if (error) {
            const t = setTimeout(() => setError(null), 4000);
            return () => clearTimeout(t);
        }
    }, [error]);

    const handleApiError = async (res: Response) => {
        try {
            const data = await res.json();
            if (data.code === 'SELF_ACTION') {
                setError('You cannot perform this action on your own profile.');
            } else {
                setError(data.error || 'Something went wrong. Please try again.');
            }
        } catch {
            setError('Something went wrong. Please try again.');
        }
    };

    const handleSaveToggle = async () => {
        setSaving(true);
        setError(null);
        try {
            const res = await fetch('/api/recruiter/actions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    candidatePageSlug: candidateSlug,
                    actionType: isSaved ? 'unsave' : 'save',
                }),
            });
            if (res.ok) {
                setIsSaved(!isSaved);
            } else {
                await handleApiError(res);
            }
        } catch {
            setError('Network error. Please check your connection.');
        } finally {
            setSaving(false);
        }
    };

    const handleContactSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!contactMessage.trim()) return;

        setSendingContact(true);
        setError(null);
        try {
            const res = await fetch('/api/recruiter/actions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    candidatePageSlug: candidateSlug,
                    actionType: 'contact_request',
                    message: contactMessage.trim(),
                }),
            });
            if (res.ok) {
                setContactSent(true);
                setHasContacted(true);
                setContactMessage('');
                setTimeout(() => {
                    setShowContactForm(false);
                    setContactSent(false);
                }, 2500);
            } else {
                await handleApiError(res);
            }
        } catch {
            setError('Network error. Please check your connection.');
        } finally {
            setSendingContact(false);
        }
    };

    if (loading) {
        return (
            <div className="flex gap-3">
                <div className="h-11 w-28 bg-slate-100 rounded-xl animate-pulse" />
                <div className="h-11 w-40 bg-slate-100 rounded-xl animate-pulse" />
            </div>
        );
    }

    const displayName = candidateName || 'this candidate';

    return (
        <>
            {/* Action Buttons */}
            <div className="space-y-3">
                <div className="flex flex-wrap gap-3">
                    <button
                        onClick={handleSaveToggle}
                        disabled={saving}
                        className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed ${isSaved
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 shadow-sm'
                            : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 shadow-sm'
                            }`}
                    >
                        {saving ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : isSaved ? (
                            <BookmarkCheck className="w-4 h-4" />
                        ) : (
                            <Bookmark className="w-4 h-4" />
                        )}
                        {isSaved ? 'Saved' : 'Save'}
                    </button>

                    <button
                        onClick={() => { setShowContactForm(true); setError(null); }}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-all duration-200 hover:-translate-y-0.5 shadow-sm hover:shadow-lg shadow-indigo-200/40"
                    >
                        <MessageSquare className="w-4 h-4" />
                        {hasContacted ? 'Send Another Message' : 'Contact Candidate'}
                    </button>

                    {hasContacted && (
                        <Link
                            href={`/${locale}/recruiter/dashboard?tab=contacts`}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 hover:-translate-y-0.5 shadow-sm"
                        >
                            <Inbox className="w-4 h-4" />
                            Open Inbox
                        </Link>
                    )}
                </div>

                {/* Inline error toast */}
                {error && (
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 animate-in fade-in slide-in-from-top-1 duration-200">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{error}</span>
                    </div>
                )}
            </div>

            {/* Contact Request Modal */}
            {showContactForm && createPortal(
                <>
                    {/* Backdrop — full viewport */}
                    <div
                        className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm"
                        onClick={() => setShowContactForm(false)}
                    />

                    {/* Modal — centered over backdrop */}
                    <div className="fixed inset-0 z-50 overflow-y-auto pointer-events-none">
                        <div className="min-h-full flex items-center justify-center p-4 sm:p-6">
                            <div
                                className="pointer-events-auto relative bg-white rounded-2xl shadow-2xl shadow-slate-900/20 w-full max-w-md overflow-hidden"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {contactSent ? (
                                    /* ── Success State ── */
                                    <div className="px-8 py-12 text-center">
                                        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5">
                                            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                                        </div>
                                        <h3 className="text-xl font-bold text-slate-900 mb-2">Request Sent</h3>
                                        <p className="text-slate-500 text-sm leading-relaxed max-w-xs mx-auto">
                                            Your scouting message has been sent to {displayName}. You&apos;ll be notified when they respond.
                                        </p>
                                    </div>
                                ) : (
                                    /* ── Form State ── */
                                    <>
                                        {/* Header */}
                                        <div className="relative px-6 pt-6 pb-5">
                                            <button
                                                onClick={() => setShowContactForm(false)}
                                                className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>

                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="w-10 h-10 rounded-xl bg-linear-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-200/50">
                                                    <Send className="w-4.5 h-4.5 text-white" />
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-bold text-slate-900">Scout Candidate</h3>
                                                    <p className="text-xs text-slate-500">Send a direct scouting message</p>
                                                </div>
                                            </div>

                                            {/* Candidate info pill */}
                                            {(candidateName || candidateRole) && (
                                                <div className="flex items-center gap-2.5 bg-slate-50 rounded-xl p-3 border border-slate-100">
                                                    <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0">
                                                        <User className="w-4 h-4 text-slate-400" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        {candidateName && (
                                                            <p className="text-sm font-semibold text-slate-800 truncate">{candidateName}</p>
                                                        )}
                                                        {candidateRole && (
                                                            <p className="text-xs text-slate-500 truncate">{candidateRole}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Form */}
                                        <form onSubmit={handleContactSubmit} className="px-6 pb-6">
                                            <div className="mb-4">
                                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                                    Your message
                                                </label>
                                                <p className="text-xs text-slate-400 mb-2.5">
                                                    Introduce yourself, your role, and why this candidate is a great fit.
                                                </p>
                                                <textarea
                                                    value={contactMessage}
                                                    onChange={e => setContactMessage(e.target.value)}
                                                    placeholder={"Hi, I'm recruiting for [Company]. We have an exciting [Role] opportunity that aligns with your experience in..."}
                                                    rows={5}
                                                    maxLength={2000}
                                                    autoFocus
                                                    className="w-full px-4 py-3 text-sm text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 resize-none placeholder:text-slate-400 transition-all"
                                                    required
                                                />
                                                <div className="flex items-center justify-between mt-1.5">
                                                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                                                        <Shield className="w-3 h-3" />
                                                        Only shared with this candidate
                                                    </div>
                                                    <span className={`text-[11px] tabular-nums ${contactMessage.length > 1800 ? 'text-amber-500 font-medium' : 'text-slate-400'}`}>
                                                        {contactMessage.length.toLocaleString()}/{(2000).toLocaleString()}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Error in modal */}
                                            {error && (
                                                <div className="flex items-center gap-2 px-3 py-2 mb-4 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                                                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                                    {error}
                                                </div>
                                            )}

                                            {/* Actions */}
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setShowContactForm(false)}
                                                    className="flex-1 px-4 py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    type="submit"
                                                    disabled={sendingContact || !contactMessage.trim()}
                                                    className="flex-2 inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-bold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-200/40 hover:shadow-xl hover:-translate-y-0.5"
                                                >
                                                    {sendingContact ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <Send className="w-4 h-4" />
                                                    )}
                                                    {sendingContact ? 'Sending...' : 'Send Scout Request'}
                                                </button>
                                            </div>
                                        </form>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </>,
                document.body
            )}
        </>
    );
}
