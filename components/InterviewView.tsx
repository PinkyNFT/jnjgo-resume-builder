'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Message, RoleType, ImportData, ResumeData } from '../types';
import { useSendMessage, useGenerateHint } from '../hooks/useGemini';
import { ArrowUp, HelpCircle, Loader2, Save, User, Bot, Home, CheckCircle2 } from 'lucide-react';

// Simple markdown formatter for basic formatting
const formatMarkdown = (text: string) => {
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    // Match **bold text**
    const boldRegex = /\*\*(.+?)\*\*/g;
    let match;

    while ((match = boldRegex.exec(text)) !== null) {
        // Add text before the match
        if (match.index > lastIndex) {
            parts.push(text.substring(lastIndex, match.index));
        }
        // Add bold text
        parts.push(<strong key={match.index} className="font-semibold">{match[1]}</strong>);
        lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
        parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : text;
};

interface InterviewViewProps {
    initialHistory?: Message[];
    onFinish: (history: Message[]) => void;
    onSave: (history: Message[]) => void;
    onExit: () => void;
    roleType: RoleType;
    importData?: ImportData;
    initialData?: ResumeData;
}

export const InterviewView: React.FC<InterviewViewProps> = ({ initialHistory, onFinish, onSave, onExit, roleType, importData, initialData }) => {
    const [messages, setMessages] = useState<Message[]>(initialHistory || []);
    const [inputValue, setInputValue] = useState('');
    const [showSaveConfirm, setShowSaveConfirm] = useState(false);
    const [isInitializing, setIsInitializing] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const mountedRef = useRef(true);
    const initializingRef = useRef(false);

    // React Query mutations with automatic deduplication and retry
    const sendMessageMutation = useSendMessage();
    const generateHintMutation = useGenerateHint();

    // Derived loading and error states from mutations
    const isLoading = isInitializing || sendMessageMutation.isPending || generateHintMutation.isPending;
    const error = sendMessageMutation.error?.message || generateHintMutation.error?.message || null;

    const userMessageCount = messages.filter(m => m.role === 'user').length;
    const isReadyToGenerate = importData ? userMessageCount >= 3 : userMessageCount >= 7;

    // Initialize chat on mount
    useEffect(() => {
        mountedRef.current = true;

        const initChat = async () => {
            // Prevent double initialization
            if (initializingRef.current) return;
            initializingRef.current = true;

            // Send initial greeting if no history
            if (!initialHistory || initialHistory.length === 0) {
                setIsInitializing(true);
                const initialMessage = importData
                    ? "Please analyze my imported resume and start the deep dive."
                    : "Hello! Please start the interview.";

                try {
                    const response = await sendMessageMutation.mutateAsync({
                        message: initialMessage,
                        history: [],
                        roleType,
                        importData,
                        initialData,
                    });

                    if (mountedRef.current && response.text) {
                        setMessages([{ role: 'model', text: response.text }]);
                    }
                } catch (err) {
                    console.error('Failed to initialize chat:', err);
                } finally {
                    if (mountedRef.current) {
                        setIsInitializing(false);
                        initializingRef.current = false;
                    }
                }
            } else {
                // If we have initial history, just mark initialization as complete
                initializingRef.current = false;
            }
        };

        initChat();

        return () => {
            mountedRef.current = false;
            initializingRef.current = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Handle sending messages
    const handleSend = async () => {
        if (!inputValue.trim() || isLoading) return;

        const userMsg: Message = { role: 'user', text: inputValue };
        const newMessages = [...messages, userMsg];
        setMessages(newMessages);
        setInputValue('');

        try {
            const response = await sendMessageMutation.mutateAsync({
                message: userMsg.text,
                history: messages, // Use previous messages, not including this one
                roleType,
                importData,
                initialData,
            });

            if (mountedRef.current && response.text) {
                setMessages([...newMessages, { role: 'model', text: response.text }]);
            }
        } catch (err) {
            // React Query handles retries automatically
            // Error state is managed by the mutation
            console.error('Failed to send message:', err);
            // Restore the message so user can retry
            if (mountedRef.current) {
                setMessages(messages); // Revert to previous state
                setInputValue(userMsg.text); // Restore input
            }
        }
    };

    // Handle hint generation
    const handleHint = async () => {
        if (isLoading) return;

        try {
            const hintText = await generateHintMutation.mutateAsync({
                history: messages,
                roleType,
                importData,
                initialData,
            });

            if (mountedRef.current && hintText) {
                setMessages([...messages, { role: 'model', text: hintText, isHint: true }]);
            }
        } catch (err) {
            console.error('Failed to generate hint:', err);
        }
    };

    const handleSave = () => {
        onSave(messages);
        setShowSaveConfirm(true);
        setTimeout(() => setShowSaveConfirm(false), 2000);
    };

    const handleExit = () => {
        onSave(messages);
        onExit();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const onSendClick = () => {
        handleSend();
    };

    return (
        <div className="flex flex-col h-full max-w-4xl mx-auto bg-white shadow-2xl rounded-2xl overflow-hidden border border-slate-100">
            <div className="bg-white/95 backdrop-blur-sm border-b border-slate-100 p-4 flex justify-between items-center sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <button onClick={handleExit} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition-colors">
                        <Home className="w-5 h-5" />
                    </button>
                    <div className="h-6 w-px bg-slate-200 mx-1"></div>
                    <div>
                        <h2 className="font-bold text-slate-800 text-sm md:text-base">JNJGO Agent</h2>
                        <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                            <p className="text-[10px] text-slate-500 font-medium uppercase">{roleType} Expert</p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2 md:gap-3">
                    {importData && (
                        <div className="hidden md:flex items-center gap-1 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-[10px] font-bold">
                            <CheckCircle2 className="w-3 h-3" /> IMPORTED
                        </div>
                    )}
                    <button onClick={handleSave} className="flex items-center gap-2 text-xs md:text-sm px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50">
                        <Save className="w-4 h-4" />
                        <span className="hidden md:inline">{showSaveConfirm ? "Saved!" : "Save Draft"}</span>
                    </button>

                    {isReadyToGenerate ? (
                        <button onClick={() => onFinish(messages)} className="text-xs md:text-sm px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-all font-medium shadow-md">
                            Generate Master Resume
                        </button>
                    ) : (
                        <div className="hidden md:flex items-center px-4 py-2 bg-slate-50 text-slate-400 text-[10px] rounded-lg border border-slate-100 italic">
                            Complete Phase 1 (Timeline) & Phase 2 (Projects) to unlock generation.
                        </div>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-slate-50/50">
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-start gap-2">
                        <span className="font-semibold">⚠️</span>
                        <div>
                            <p className="font-semibold">Error</p>
                            <p>{error}</p>
                            {error.includes('overloaded') && (
                                <button onClick={() => window.location.reload()} className="mt-2 text-xs underline hover:no-underline">Reload page</button>
                            )}
                        </div>
                    </div>
                )}
                {messages.map((msg, index) => (
                    <div key={index} className={`flex w-full gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {msg.role === 'model' && (
                            <div className="w-8 h-8 rounded-full bg-linear-to-br from-indigo-500 to-violet-600 flex items-center justify-center shrink-0 mt-1 shadow-md">
                                <Bot className="w-5 h-5 text-white" />
                            </div>
                        )}
                        <div className={`max-w-[85%] md:max-w-[75%] rounded-2xl px-6 py-4 text-sm leading-relaxed shadow-sm relative group whitespace-pre-wrap ${msg.role === 'user' ? 'bg-slate-900 text-white rounded-br-none' : 'bg-white text-slate-700 border border-slate-200/60 rounded-bl-none'}`}>
                            {msg.isHint && <div className="flex items-center gap-1.5 mb-2 text-amber-600 font-bold text-xs uppercase"><HelpCircle className="w-3 h-3" /> Hint</div>}
                            <span>{formatMarkdown(msg.text)}</span>
                        </div>
                        {msg.role === 'user' && (
                            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center shrink-0 mt-1">
                                <User className="w-5 h-5 text-slate-500" />
                            </div>
                        )}
                    </div>
                ))}
                {isLoading && (
                    <div className="flex justify-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-linear-to-br from-indigo-500 to-violet-600 flex items-center justify-center shrink-0 mt-1 opacity-50"><Bot className="w-5 h-5 text-white" /></div>
                        <div className="bg-white px-5 py-4 rounded-2xl rounded-bl-none border border-slate-100 shadow-sm"><Loader2 className="w-4 h-4 animate-spin text-indigo-500" /></div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="p-4 md:p-6 bg-white border-t border-slate-100">
                <div className="flex items-end gap-3 max-w-4xl mx-auto">
                    <button onClick={handleHint} disabled={isLoading} className="p-3.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all">
                        <HelpCircle className="w-6 h-6" />
                    </button>
                    <div className="flex-1 bg-slate-100 rounded-2xl flex items-center px-4 py-2 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:bg-white transition-all">
                        <textarea
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Type your answer..."
                            className="flex-1 bg-transparent border-none focus:ring-0 resize-none h-12 py-3.5 text-sm outline-none text-slate-700 placeholder:text-slate-400"
                            rows={1}
                        />
                    </div>
                    <button onClick={onSendClick} disabled={!inputValue.trim() || isLoading} className={`p-3.5 rounded-xl transition-all ${inputValue.trim() ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-300'}`}>
                        <ArrowUp className="w-6 h-6" />
                    </button>
                </div>
            </div>
        </div>
    );
};
