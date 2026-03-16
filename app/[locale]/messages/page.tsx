'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import {
    MessageSquare, Loader2, Building2, Clock, CheckCheck,
    ArrowLeft, Inbox, ChevronLeft, ChevronRight, User, Sparkles,
} from 'lucide-react';

interface ScoutMessage {
    id: string;
    recruiterId: string;
    recruiterCompany: string | null;
    recruiterTitle: string | null;
    message: string;
    isRead: boolean;
    createdAt: number;
}

interface ReplyMessage {
    id: string;
    message: string;
    isFromCandidate: boolean;
    createdAt: number;
}

interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

function timeAgo(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString();
}

export default function MessagesPage() {
    const { status } = useSession();
    const router = useRouter();
    const locale = useLocale();

    const [messages, setMessages] = useState<ScoutMessage[]>([]);
    const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [selectedMessage, setSelectedMessage] = useState<ScoutMessage | null>(null);
    const [threadReplies, setThreadReplies] = useState<ReplyMessage[]>([]);
    const [threadLoading, setThreadLoading] = useState(false);
    const [replyText, setReplyText] = useState('');
    const [isReplying, setIsReplying] = useState(false);
    const [markingAllRead, setMarkingAllRead] = useState(false);

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/auth/signin');
        }
    }, [status, router]);

    const fetchMessages = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/candidate/messages?page=${page}&limit=20`);
            if (!res.ok) throw new Error('Failed to fetch');
            const data = await res.json();
            setMessages(data.messages || []);
            setPagination(data.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 });
            setUnreadCount(data.unreadCount ?? 0);
        } catch {
            setMessages([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (status === 'authenticated') {
            fetchMessages();
        }
    }, [status, fetchMessages]);

    const handleOpenMessage = async (msg: ScoutMessage) => {
        setSelectedMessage(msg);
        setThreadReplies([]);
        setReplyText('');
        setThreadLoading(true);

        // Fetch thread replies
        try {
            const res = await fetch(`/api/candidate/messages?actionId=${msg.id}`);
            if (res.ok) {
                const data = await res.json();
                setThreadReplies(data.replies || []);
            }
        } catch {
            // silently fail
        } finally {
            setThreadLoading(false);
        }

        // Mark as read if it wasn't
        if (!msg.isRead) {
            try {
                await fetch('/api/candidate/messages', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ messageId: msg.id }),
                });
                // Optimistically update local state
                setMessages(prev =>
                    prev.map(m => m.id === msg.id ? { ...m, isRead: true } : m)
                );
                setUnreadCount(prev => Math.max(0, prev - 1));
            } catch {
                // silently fail
            }
        }
    };

    const handleSendReply = async () => {
        if (!selectedMessage || !replyText.trim() || isReplying) return;
        setIsReplying(true);

        try {
            const res = await fetch('/api/candidate/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    actionId: selectedMessage.id,
                    message: replyText.trim(),
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to send reply');
            }

            const data = await res.json();
            setThreadReplies(prev => [...prev, data.reply]);
            setReplyText('');
        } catch (error: any) {
            alert(error.message);
        } finally {
            setIsReplying(false);
        }
    };

    const handleMarkAllRead = async () => {
        if (unreadCount === 0) return;
        setMarkingAllRead(true);
        try {
            await fetch('/api/candidate/messages', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}),
            });
            setMessages(prev => prev.map(m => ({ ...m, isRead: true })));
            setUnreadCount(0);
        } catch {
            // silently fail
        } finally {
            setMarkingAllRead(false);
        }
    };

    if (status === 'loading' || loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 font-sans">
            {/* Header */}
            <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200/60 sticky top-0 z-20">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link
                            href={`/${locale}/dashboard`}
                            className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-900 transition-all duration-200 hover:-translate-x-0.5 group"
                        >
                            <ArrowLeft className="w-4 h-4 group-hover:scale-110 transition-transform" />
                            <span className="hidden sm:inline">Dashboard</span>
                        </Link>
                        <div className="w-px h-5 bg-slate-200" />
                        <div className="flex items-center gap-2">
                            <MessageSquare className="w-4 h-4 text-indigo-600" />
                            <span className="font-bold text-slate-800">Scout Inbox</span>
                            {unreadCount > 0 && (
                                <span className="inline-flex items-center justify-center text-[10px] font-bold bg-indigo-600 text-white w-5 h-5 rounded-full">
                                    {unreadCount > 99 ? '99+' : unreadCount}
                                </span>
                            )}
                        </div>
                    </div>
                    {unreadCount > 0 && (
                        <button
                            onClick={handleMarkAllRead}
                            disabled={markingAllRead}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors disabled:opacity-50"
                        >
                            {markingAllRead ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                                <CheckCheck className="w-3.5 h-3.5" />
                            )}
                            Mark all read
                        </button>
                    )}
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 animate-in fade-in duration-300">
                {messages.length === 0 ? (
                    /* ── Empty State ── */
                    <div className="flex flex-col items-center justify-center py-32 text-center">
                        <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                            <Inbox className="w-10 h-10 text-indigo-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-800 mb-2">No messages yet</h2>
                        <p className="text-slate-500 max-w-sm leading-relaxed">
                            When a recruiter scouts you via your JNJGO profile link, their message will appear here.
                        </p>
                        <Link
                            href={`/${locale}/profile/private`}
                            className="mt-8 inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-all hover:-translate-y-0.5 shadow-lg shadow-indigo-200/50"
                        >
                            <Sparkles className="w-4 h-4" />
                            Set up your recruiter profile
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                        {/* ── Message List ── */}
                        <div className="md:col-span-1 space-y-2">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1 mb-3">
                                {pagination.total} message{pagination.total !== 1 ? 's' : ''}
                                {unreadCount > 0 && ` · ${unreadCount} unread`}
                            </p>
                            {messages.map(msg => (
                                <button
                                    key={msg.id}
                                    onClick={() => handleOpenMessage(msg)}
                                    className={`w-full text-left p-4 rounded-2xl border transition-all duration-200 hover:shadow-md ${selectedMessage?.id === msg.id
                                        ? 'bg-indigo-50 border-indigo-200 shadow-sm'
                                        : msg.isRead
                                            ? 'bg-white border-slate-200/80 hover:border-slate-300'
                                            : 'bg-white border-indigo-200 shadow-sm'
                                        }`}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="relative shrink-0">
                                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white text-sm font-bold shadow-sm">
                                                {(msg.recruiterCompany || 'R').charAt(0).toUpperCase()}
                                            </div>
                                            {!msg.isRead && (
                                                <span className="absolute -top-1 -right-1 w-3 h-3 bg-indigo-600 rounded-full border-2 border-white" />
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center justify-between gap-1 mb-0.5">
                                                <p className={`text-sm truncate ${!msg.isRead ? 'font-bold text-slate-900' : 'font-semibold text-slate-700'}`}>
                                                    {msg.recruiterCompany || 'Unknown Company'}
                                                </p>
                                                <span className="text-[10px] text-slate-400 shrink-0 font-medium">
                                                    {timeAgo(msg.createdAt)}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-500 truncate leading-relaxed">
                                                {msg.message.slice(0, 80)}{msg.message.length > 80 ? '…' : ''}
                                            </p>
                                        </div>
                                    </div>
                                </button>
                            ))}

                            {/* Pagination */}
                            {pagination.totalPages > 1 && (
                                <div className="flex items-center justify-between pt-3">
                                    <button
                                        onClick={() => fetchMessages(pagination.page - 1)}
                                        disabled={pagination.page <= 1}
                                        className="p-2 rounded-lg hover:bg-slate-200 disabled:opacity-30 transition-colors"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    <span className="text-xs text-slate-500 font-medium">
                                        {pagination.page} / {pagination.totalPages}
                                    </span>
                                    <button
                                        onClick={() => fetchMessages(pagination.page + 1)}
                                        disabled={pagination.page >= pagination.totalPages}
                                        className="p-2 rounded-lg hover:bg-slate-200 disabled:opacity-30 transition-colors"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* ── Message Detail ── */}
                        <div className="md:col-span-2">
                            {selectedMessage ? (
                                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden animate-in fade-in duration-200">
                                    {/* Detail header */}
                                    <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
                                        <div className="flex items-start gap-4">
                                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white text-lg font-bold shadow-sm shrink-0">
                                                {(selectedMessage.recruiterCompany || 'R').charAt(0).toUpperCase()}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <h2 className="font-bold text-slate-900 text-lg leading-tight">
                                                    {selectedMessage.recruiterCompany || 'Unknown Company'}
                                                </h2>
                                                {selectedMessage.recruiterTitle && (
                                                    <div className="flex items-center gap-1.5 mt-1">
                                                        <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                        <p className="text-sm text-slate-500 font-medium">{selectedMessage.recruiterTitle}</p>
                                                    </div>
                                                )}
                                                <div className="flex items-center gap-1.5 mt-1">
                                                    <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                    <p className="text-xs text-slate-400">
                                                        {new Date(selectedMessage.createdAt).toLocaleString(undefined, {
                                                            year: 'numeric', month: 'short', day: 'numeric',
                                                            hour: '2-digit', minute: '2-digit'
                                                        })}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="shrink-0">
                                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                                                    <Building2 className="w-3 h-3" />
                                                    Scout Message
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Message body */}
                                    <div className="px-6 py-6 pb-4">
                                        <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                                            {selectedMessage.message}
                                        </p>
                                    </div>

                                    {/* Replies */}
                                    <div className="px-6 pb-6 space-y-4">
                                        {threadLoading ? (
                                            <div className="flex justify-center py-4">
                                                <Loader2 className="w-5 h-5 animate-spin text-slate-300" />
                                            </div>
                                        ) : (
                                            threadReplies.map((reply) => (
                                                <div key={reply.id} className={`flex ${reply.isFromCandidate ? 'justify-end' : 'justify-start'}`}>
                                                    <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${reply.isFromCandidate
                                                            ? 'bg-indigo-600 text-white rounded-tr-sm'
                                                            : 'bg-slate-100 text-slate-800 rounded-tl-sm'
                                                        }`}>
                                                        <p className="whitespace-pre-wrap">{reply.message}</p>
                                                        <span className={`block text-[10px] mt-1 text-right ${reply.isFromCandidate ? 'text-indigo-200' : 'text-slate-400'}`}>
                                                            {new Date(reply.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>

                                    {/* Reply Composer */}
                                    <div className="px-4 py-4 border-t border-slate-100 bg-slate-50 relative">
                                        <textarea
                                            value={replyText}
                                            onChange={(e) => setReplyText(e.target.value)}
                                            placeholder="Type your reply to the recruiter..."
                                            className="w-full h-[100px] bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none shadow-sm pb-12"
                                            maxLength={3000}
                                        />
                                        <div className="absolute bottom-6 right-6 flex items-center gap-3">
                                            <span className="text-[10px] font-medium text-slate-400">
                                                {replyText.length}/3000
                                            </span>
                                            <button
                                                onClick={handleSendReply}
                                                disabled={isReplying || !replyText.trim()}
                                                className="px-4 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md group flex items-center gap-1.5"
                                            >
                                                {isReplying ? (
                                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                ) : (
                                                    <>Send <ArrowLeft className="w-3 h-3 rotate-180 group-hover:translate-x-0.5 transition-transform" /></>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                /* No message selected */
                                <div className="bg-white rounded-2xl border border-slate-200/80 flex flex-col items-center justify-center py-24 text-center shadow-sm">
                                    <MessageSquare className="w-10 h-10 text-slate-200 mb-4" />
                                    <p className="text-sm font-semibold text-slate-400">Select a message to read it</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
