'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Message, RoleType, ImportData, ResumeData } from '../types';
import { useSendMessage, useGenerateHint } from '../hooks/useGemini';
import { Send, Loader2, Sparkles, AlertCircle, ArrowUp, HelpCircle, Save, User, Bot, Home, CheckCircle2, ClipboardCheck, AlertTriangle, Square, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ===== INTERVIEW PROGRESS TRACKING (Agent-driven + fallback heuristics) =====

interface SectionProgress {
    id: string;
    label: string;
    complete: boolean;
    critical: boolean;
}

interface InterviewProgress {
    sections: SectionProgress[];
    completedCount: number;
    totalCount: number;
    agentReady: boolean;
    readyToGenerate: boolean;
}

/**
 * Layer 1: Extract sections the agent explicitly marked with ✓ in its messages.
 * The agent is prompted to use ✓ when transitioning between sections.
 */
function extractAgentMarkedSections(messages: Message[]): Set<string> {
    const completed = new Set<string>();

    for (const msg of messages) {
        if (msg.role !== 'model' || msg.isHint) continue;
        const text = msg.text;

        // English section markers
        if (/✓\s*(work\s*history|work history)/i.test(text)) completed.add('work');
        if (/✓\s*(experience\s*detail|detail|project detail)/i.test(text)) completed.add('details');
        if (/✓\s*(education)/i.test(text)) completed.add('education');
        if (/✓\s*(skill)/i.test(text)) completed.add('skills');
        if (/✓\s*(cert|certification)/i.test(text)) completed.add('certifications');
        if (/✓\s*(gap|career\s*gap)/i.test(text)) completed.add('gaps');

        // Japanese section markers
        if (/✓\s*(職務経歴|職歴)/i.test(text)) completed.add('work');
        if (/✓\s*(経験.*詳細|詳細|経験の詳細)/i.test(text)) completed.add('details');
        if (/✓\s*(学歴)/i.test(text)) completed.add('education');
        if (/✓\s*(スキル)/i.test(text)) completed.add('skills');
        if (/✓\s*(資格)/i.test(text)) completed.add('certifications');
        if (/✓\s*(ギャップ)/i.test(text)) completed.add('gaps');
    }

    return completed;
}

/**
 * Layer 2: Detect whether the agent has signaled overall readiness
 * (i.e. offered to generate the resume with all sections complete).
 */
function detectAgentReadyInHistory(messages: Message[]): boolean {
    return messages.some(msg => {
        if (msg.role !== 'model' || msg.isHint) return false;
        const text = msg.text;
        const checkmarkCount = (text.match(/✓/g) || []).length;
        const readyPatterns = [
            /i have everything/i,
            /ready to generate/i,
            /generate.*resume\?/i,
            /shall\s*(i|we)\s*generate/i,
            /want me to generate/i,
            /すべて.*揃いました/,
            /生成しますか/,
        ];
        const hasReadyPhrase = readyPatterns.some(p => p.test(text));
        return (checkmarkCount >= 4 && hasReadyPhrase) || checkmarkCount >= 5;
    });
}

/**
 * Layer 3: Fallback heuristic — detect topic coverage from conversation flow
 * when the agent doesn't use ✓ markers. Analyzes agent questions + user answers.
 */
function detectTopicFromConversation(
    modelMessages: Message[],
    userMessages: Message[],
    topic: string,
    importData?: ImportData
): boolean {
    const modelText = modelMessages.map(m => m.text.toLowerCase()).join(' ');

    switch (topic) {
        case 'work': {
            const agentAsked = /company|employer|position|role|where.*work|most recent|current.*job|会社|勤務|役職|直近/.test(modelText);
            const userAnswered = userMessages.some(m =>
                m.text.length > 15 &&
                /compan|work|position|role|job|employ|manager|developer|engineer|analyst|director|lead/i.test(m.text)
            );
            return (agentAsked && userAnswered) || !!importData;
        }
        case 'details': {
            const agentAsked = /responsibilit|achievement|project|team\s*size|impact|challenge|tell.*more|deep.*dive|contribution|責任|実績|プロジェクト|チーム.*規模|詳しく/.test(modelText);
            return agentAsked && userMessages.filter(m => m.text.length > 50).length >= 2;
        }
        case 'education': {
            const agentAsked = /education|degree|university|college|graduated|highest.*degree|school|bootcamp|学歴|学位|大学|卒業/.test(modelText);
            const userAnswered = userMessages.some(m =>
                /degree|university|college|school|bachelor|master|phd|diploma|bootcamp|self.?taught|no.*degree|graduat|enrolled|studied|major/i.test(m.text.toLowerCase())
            );
            return agentAsked && userAnswered;
        }
        case 'skills': {
            const agentAsked = /skills?|technical|tools|technologies|programming|key.*tools|スキル|技術|ツール/.test(modelText);
            const userAnswered = userMessages.some(m =>
                /python|java|react|angular|aws|sql|skill|framework|docker|kubernetes|git|node|typescript|css|html|linux|agile|scrum/i.test(m.text.toLowerCase())
            ) || userMessages.some(m =>
                m.text.length > 20 && /skill|tool|tech|proficien/i.test(m.text.toLowerCase())
            );
            return agentAsked && userAnswered;
        }
        case 'certifications': {
            return /certification|certified|professional cert|do you have any.*cert|資格|認定/.test(modelText);
        }
        case 'gaps': {
            return /gap|between.*position|career break|what were you doing|between.*and|ギャップ|空白/.test(modelText)
                || userMessages.length >= 5;
        }
        default:
            return false;
    }
}

/**
 * Main progress analysis function.
 * Uses a 3-layer approach: Agent ✓ markers → Agent readiness signal → Conversation heuristics
 */
function analyzeInterviewProgress(
    messages: Message[],
    agentReadyOverride: boolean,
    importData?: ImportData
): InterviewProgress {
    const modelMessages = messages.filter(m => m.role === 'model' && !m.isHint);
    const userMessages = messages.filter(m => m.role === 'user' && !m.isHint);

    // Layer 1: Agent ✓ markers
    const markedComplete = extractAgentMarkedSections(messages);

    // Layer 2: Agent readiness (from API flag or history scan)
    const agentReady = agentReadyOverride || detectAgentReadyInHistory(messages);

    // Build section status
    const sectionDefs = [
        { id: 'work', label: 'Work History', critical: true },
        { id: 'details', label: 'Project Details', critical: true },
        { id: 'education', label: 'Education', critical: true },
        { id: 'skills', label: 'Skills', critical: true },
        { id: 'certifications', label: 'Certifications', critical: true },
        { id: 'gaps', label: 'Career Gaps', critical: false },
    ];

    const sections: SectionProgress[] = sectionDefs.map(def => ({
        ...def,
        complete: agentReady
            || markedComplete.has(def.id)
            || detectTopicFromConversation(modelMessages, userMessages, def.id, importData),
    }));

    const completedCount = sections.filter(s => s.complete).length;
    const totalCount = sections.length;
    const allCriticalComplete = sections.filter(s => s.critical).every(s => s.complete);

    return {
        sections,
        completedCount,
        totalCount,
        agentReady,
        readyToGenerate: agentReady || allCriticalComplete,
    };
}

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
    const t = useTranslations('Interview');
    const tCommon = useTranslations('Common');
    const tPersonal = useTranslations('PersonalInfo');
    const locale = useLocale();

    const [messages, setMessages] = useState<Message[]>(initialHistory || []);
    const [inputValue, setInputValue] = useState('');
    const [showSaveConfirm, setShowSaveConfirm] = useState(false);
    const [isAutoSaving, setIsAutoSaving] = useState(false);
    const [isInitializing, setIsInitializing] = useState(false);
    const [showGenerateConfirm, setShowGenerateConfirm] = useState(false);
    const [abortController, setAbortController] = useState<AbortController | null>(null);
    const [isComposing, setIsComposing] = useState(false);
    const [agentReadyFlag, setAgentReadyFlag] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const mountedRef = useRef(true);
    const initializingRef = useRef(false);
    const prevLoadingRef = useRef(false);

    // React Query mutations with automatic deduplication and retry
    const sendMessageMutation = useSendMessage();
    const generateHintMutation = useGenerateHint();

    // Derived loading and error states from mutations
    const isLoading = isInitializing || sendMessageMutation.isPending || generateHintMutation.isPending;
    const error = (sendMessageMutation.error as any)?.message || (generateHintMutation.error as any)?.message || null;

    const userMessageCount = messages.filter(m => m.role === 'user').length;

    // New agent-driven progress tracking (replaces old keyword-based system)
    const progress = analyzeInterviewProgress(messages, agentReadyFlag, importData);
    const { sections: completenessDetails, completedCount, totalCount, agentReady, readyToGenerate: isReadyToGenerate } = progress;

    // Scan existing history for agent readiness on mount
    useEffect(() => {
        if (initialHistory && initialHistory.length > 0) {
            const wasReady = detectAgentReadyInHistory(initialHistory);
            if (wasReady) setAgentReadyFlag(true);
        }
    }, [initialHistory]);

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
                        locale,
                    });

                    if (mountedRef.current && response.text) {
                        setMessages([{ role: 'model', text: response.text, phase: response.phase }]);
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

    // Auto-focus input when AI finishes responding
    useEffect(() => {
        if (prevLoadingRef.current && !isLoading) {
            // Small delay to ensure DOM is ready
            requestAnimationFrame(() => {
                inputRef.current?.focus();
            });
        }
        prevLoadingRef.current = isLoading;
    }, [isLoading]);

    // Handle sending messages
    const handleSend = async () => {
        if (!inputValue.trim() || isLoading) return;

        const userMsg: Message = { role: 'user', text: inputValue };
        const newMessages = [...messages, userMsg];

        // Check if user is explicitly requesting to generate resume
        const generateKeywords = [
            'generate resume', 'generate the resume', 'generate my resume',
            'create resume', 'create the resume', 'build resume', 'make resume',
            'ready to generate', 'let\'s generate', 'start generation',
            'yes generate', 'yes create', 'yes build'
        ];

        const isGenerateRequest = generateKeywords.some(keyword =>
            userMsg.text.toLowerCase().trim().includes(keyword)
        );

        if (isGenerateRequest) {
            // Show confirmation dialog instead of sending to AI
            setMessages(newMessages);
            setInputValue('');
            setShowGenerateConfirm(true);
            return;
        }

        setMessages(newMessages);
        setInputValue('');

        // Create AbortController for this request
        const controller = new AbortController();
        setAbortController(controller);

        try {
            const response = await sendMessageMutation.mutateAsync({
                message: userMsg.text,
                history: messages, // Use previous messages, not including this one
                roleType,
                importData,
                initialData,
                signal: controller.signal,
                locale,
            });

            if (mountedRef.current && response.text) {
                const modelMessage: Message = { role: 'model', text: response.text, phase: response.phase };
                const updatedMessages = [...newMessages, modelMessage];
                setMessages(updatedMessages);

                // Update agent readiness from API response
                if (response.agentReady) {
                    setAgentReadyFlag(true);
                }

                // Auto-save after AI response
                setIsAutoSaving(true);
                onSave(updatedMessages);
                setTimeout(() => setIsAutoSaving(false), 2000);
            }
        } catch (err: any) {
            // Check if the error is due to abort
            if (err.name === 'AbortError' || err.message?.includes('abort')) {
                console.log('Request was cancelled by user');
                // Optionally show a cancelled message
                if (mountedRef.current) {
                    setMessages([...newMessages, { role: 'model', text: '_(Response stopped by user)_' }]);
                }
            } else {
                // React Query handles retries automatically
                // Error state is managed by the mutation
                console.error('Failed to send message:', err);
                // Restore the message so user can retry
                if (mountedRef.current) {
                    setMessages(messages); // Revert to previous state
                    setInputValue(userMsg.text); // Restore input
                }
            }
        } finally {
            if (mountedRef.current) {
                setAbortController(null);
            }
        }
    };

    // Handle hint generation
    const handleHint = async () => {
        if (isLoading) return;

        // Create AbortController for hint request
        const controller = new AbortController();
        setAbortController(controller);

        try {
            const hintText = await generateHintMutation.mutateAsync({
                history: messages,
                roleType,
                importData,
                initialData,
                signal: controller.signal,
                locale,
            });

            if (mountedRef.current && hintText) {
                setMessages([...messages, { role: 'model', text: hintText, isHint: true }]);
            }
        } catch (err: any) {
            // Check if the error is due to abort
            if (err.name === 'AbortError' || err.message?.includes('abort')) {
                console.log('Hint request was cancelled by user');
            } else {
                console.error('Failed to generate hint:', err);
            }
        } finally {
            if (mountedRef.current) {
                setAbortController(null);
            }
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
        // Only submit on Enter if:
        // 1. Not in IME composition (Japanese/Chinese input)
        // 2. Not using Shift+Enter (for multiline)
        if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
            e.preventDefault();
            handleSend();
        }
    };

    // IME composition handlers for Japanese/Chinese input
    const handleCompositionStart = () => {
        setIsComposing(true);
    };

    const handleCompositionEnd = () => {
        setIsComposing(false);
    };

    const onSendClick = () => {
        handleSend();
    };

    return (
        <div className="flex flex-col h-full max-w-4xl mx-auto bg-white shadow-2xl shadow-slate-200/60 rounded-2xl overflow-hidden border border-slate-200/60">
            <div className="glass border-b border-slate-100 p-4 flex justify-between items-center sticky top-0 z-10 shadow-sm shadow-slate-100/50">
                <div className="flex items-center gap-3">
                    <button onClick={handleExit} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-800 transition-all duration-200 active:scale-95">
                        <Home className="w-5 h-5" />
                    </button>
                    <div className="h-6 w-px bg-slate-200 mx-1"></div>
                    <div>
                        <h2 className="font-bold text-slate-800 text-sm md:text-base">{t('agentName')}</h2>
                        <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">{t('roleExpert', { role: roleType })}</p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2 md:gap-3">
                    {importData && (
                        <div className="hidden md:flex items-center gap-1 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-[10px] font-bold">
                            <CheckCircle2 className="w-3 h-3" /> {t('imported')}
                        </div>
                    )}
                    <motion.button
                        onClick={handleSave}
                        animate={{
                            scale: isAutoSaving ? [1, 1.05, 1] : 1,
                        }}
                        transition={{
                            duration: 0.3,
                            ease: "easeInOut"
                        }}
                        className={`flex items-center gap-2 text-xs md:text-sm px-4 py-2.5 rounded-xl font-medium transition-all ${isAutoSaving
                            ? 'bg-green-500 text-white'
                            : showSaveConfirm
                                ? 'bg-indigo-500 text-white'
                                : 'bg-slate-600 text-white hover:bg-slate-700'
                            }`}
                    >
                        <AnimatePresence mode="wait">
                            {isAutoSaving ? (
                                <motion.div
                                    key="saving"
                                    initial={{ scale: 0, rotate: -180 }}
                                    animate={{ scale: 1, rotate: 0 }}
                                    exit={{ scale: 0, rotate: 180 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <CheckCircle2 className="w-4 h-4" />
                                </motion.div>
                            ) : showSaveConfirm ? (
                                <motion.div
                                    key="confirmed"
                                    initial={{ scale: 0, rotate: -180 }}
                                    animate={{ scale: 1, rotate: 0 }}
                                    exit={{ scale: 0, rotate: 180 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <CheckCircle2 className="w-4 h-4" />
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="default"
                                    initial={{ scale: 0, rotate: -180 }}
                                    animate={{ scale: 1, rotate: 0 }}
                                    exit={{ scale: 0, rotate: 180 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <Save className="w-4 h-4" />
                                </motion.div>
                            )}
                        </AnimatePresence>
                        <span className="hidden md:inline font-semibold">
                            {isAutoSaving ? t('autoSaved') : showSaveConfirm ? t('saved') : t('saveDraft')}
                        </span>
                    </motion.button>

                    {/* Data Completeness Indicator — Agent-driven Progress */}
                    <div className="hidden md:flex items-center gap-2">
                        <div className="relative group">
                            <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg cursor-default transition-all group-hover:bg-white group-hover:border-slate-300">
                                <div className="flex items-center gap-2">
                                    {/* Section progress dots */}
                                    <div className="flex items-center gap-1">
                                        {completenessDetails.map((section, idx) => (
                                            <div
                                                key={idx}
                                                className={`w-2 h-2 rounded-full transition-all duration-500 ${section.complete
                                                    ? 'bg-emerald-500'
                                                    : section.critical
                                                        ? 'bg-slate-300'
                                                        : 'bg-slate-200'
                                                    }`}
                                            />
                                        ))}
                                    </div>
                                    <div className="flex items-center gap-1 pl-1.5 border-l border-slate-200">
                                        {agentReady ? (
                                            <motion.div
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                className="flex items-center gap-1"
                                            >
                                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-wide">{t('ready')}</span>
                                            </motion.div>
                                        ) : (
                                            <span className={`text-[10px] font-bold tabular-nums ${completedCount >= totalCount - 1 ? 'text-emerald-600' :
                                                completedCount >= 3 ? 'text-amber-600' :
                                                    'text-slate-400'
                                                }`}>{completedCount}/{totalCount}</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            {/* Tooltip on hover */}
                            <div className="absolute right-0 top-full mt-2 w-72 bg-slate-900 text-white text-xs rounded-xl p-4 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-20 shadow-2xl border border-slate-700">
                                <div className="space-y-3">
                                    <p className="font-bold text-sm mb-2 text-slate-100">{t('interviewProgress')}</p>

                                    {/* Section checklist */}
                                    <div className="space-y-2">
                                        {completenessDetails.map((section, idx) => (
                                            <div key={idx} className="flex items-center gap-2.5">
                                                {section.complete ? (
                                                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                                                ) : section.critical ? (
                                                    <div className="w-4 h-4 rounded-full border-2 border-amber-400 shrink-0 animate-pulse" />
                                                ) : (
                                                    <div className="w-4 h-4 rounded-full border-2 border-slate-500 shrink-0" />
                                                )}
                                                <span className={`text-xs font-medium ${section.complete ? 'text-emerald-300' :
                                                    section.critical ? 'text-amber-300' : 'text-slate-400'
                                                    }`}>{section.label}</span>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="border-t border-slate-700 my-3 pt-3">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-slate-400 text-[10px]">{t('sectionsComplete')}</span>
                                            <span className="text-white text-[10px] font-bold">{completedCount} / {totalCount}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-slate-400 text-[10px]">{t('responses')}</span>
                                            <span className="text-white text-[10px] font-bold">{userMessageCount}</span>
                                        </div>
                                    </div>
                                    {agentReady ? (
                                        <div className="bg-emerald-500/15 border border-emerald-500/30 rounded-lg p-2.5">
                                            <p className="text-emerald-300 text-[10px] font-medium leading-relaxed flex items-center gap-1.5">
                                                <Zap className="w-3 h-3" /> {t('readyToGenerateHint')}
                                            </p>
                                        </div>
                                    ) : isReadyToGenerate ? (
                                        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-2.5">
                                            <p className="text-emerald-300 text-[10px] font-medium leading-relaxed">{t('allCriticalComplete')}</p>
                                        </div>
                                    ) : completedCount >= 3 ? (
                                        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-2.5">
                                            <p className="text-amber-300 text-[10px] leading-relaxed">{t('gettingThere')}</p>
                                        </div>
                                    ) : (
                                        <div className="bg-slate-500/10 border border-slate-500/30 rounded-lg p-2.5">
                                            <p className="text-slate-300 text-[10px] leading-relaxed">{t('keepAnswering')}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Generate Resume Button — always available, visual emphasis changes based on readiness */}
                        <motion.button
                            onClick={() => setShowGenerateConfirm(true)}
                            animate={agentReady ? {
                                boxShadow: ['0 0 0 0 rgba(16,185,129,0.3)', '0 0 0 8px rgba(16,185,129,0)', '0 0 0 0 rgba(16,185,129,0.3)'],
                            } : {}}
                            transition={agentReady ? { duration: 2, repeat: Infinity, ease: 'easeInOut' } : {}}
                            className={`flex items-center gap-2 text-xs px-4 py-2.5 rounded-xl font-bold transition-all duration-200 active:scale-95 ${isReadyToGenerate
                                ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-200/50 hover:shadow-lg'
                                : 'bg-orange-500 text-white hover:bg-orange-600 shadow-sm'
                                }`}
                            title={isReadyToGenerate ? t('generateResume') : t('generateEarlyHint')}
                        >
                            {isReadyToGenerate ? (
                                <CheckCircle2 className="w-4 h-4" />
                            ) : (
                                <ClipboardCheck className="w-4 h-4" />
                            )}
                            <span className="hidden sm:inline">{isReadyToGenerate ? t('generateResume') : t('generateEarly')}</span>
                            <span className="sm:hidden">{isReadyToGenerate ? 'Generate' : 'Generate'}</span>
                        </motion.button>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5 bg-linear-to-b from-slate-50/80 to-white">
                {/* Resume Generation Confirmation */}
                {showGenerateConfirm && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 animate-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
                            <div className="flex items-start gap-3 mb-5">
                                <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center shrink-0">
                                    <CheckCircle2 className="w-6 h-6 text-indigo-600" />
                                </div>
                                <div>
                                    <h3 className="font-black text-lg text-slate-900 mb-1">{t('generateConfirmTitle')}</h3>
                                    <p className="text-sm text-slate-500">{t('generateConfirmDesc')}</p>
                                </div>
                            </div>

                            {/* Data Preview */}
                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 mb-5 space-y-4">
                                <div>
                                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">{tPersonal('title')}</h4>
                                    <div className="bg-white rounded-lg p-3 text-sm">
                                        <p className="font-semibold text-slate-900">{initialData?.fullName || t('notProvided')}</p>
                                        <p className="text-slate-600 text-xs">{initialData?.contactInfo?.email || t('notProvided')}</p>
                                        <p className="text-slate-600 text-xs">{initialData?.contactInfo?.phone || t('notProvided')}</p>
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">{t('interviewProgress')}</h4>
                                    <div className="bg-white rounded-lg p-3 space-y-2">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-slate-600">{t('sectionsComplete')}</span>
                                            <span className={`font-bold ${isReadyToGenerate ? 'text-emerald-600' : 'text-amber-600'}`}>
                                                {completedCount} / {totalCount}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-slate-600">{t('totalResponses')}</span>
                                            <span className="font-bold text-slate-900">{userMessageCount}</span>
                                        </div>
                                        <div className="mt-3 pt-3 border-t border-slate-200">
                                            <p className="text-xs text-slate-500 mb-2">{t('collectionStatus')}</p>
                                            <div className="space-y-1.5">
                                                {completenessDetails.map((section, idx) => (
                                                    <div key={idx} className="flex items-center gap-2 text-xs">
                                                        {section.complete ? (
                                                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                                        ) : (
                                                            <div className={`w-3.5 h-3.5 rounded-full border-2 shrink-0 ${section.critical ? 'border-amber-400' : 'border-slate-300'}`} />
                                                        )}
                                                        <span className={section.complete ? 'text-slate-700 font-medium' : 'text-slate-400'}>
                                                            {section.label}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Agent Ready Confirmation */}
                                {agentReady && (
                                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                                        <div className="flex items-start gap-2">
                                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                            <div>
                                                <p className="text-xs font-semibold text-emerald-900 mb-1">{t('agentConfirmsReady')}</p>
                                                <p className="text-xs text-emerald-800">{t('agentConfirmsReadyDesc')}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Warning when generating without agent readiness */}
                                {!isReadyToGenerate && (
                                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                                        <div className="flex items-start gap-2">
                                            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                            <div>
                                                <p className="text-xs font-semibold text-amber-900 mb-1">{t('incompleteDataTitle')}</p>
                                                <p className="text-xs text-amber-800">{t('incompleteDataDesc')}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Missing Critical Sections Warning */}
                                {(() => {
                                    const missingCritical = completenessDetails.filter(d => d.critical && !d.complete);
                                    if (missingCritical.length > 0 && !agentReady) {
                                        return (
                                            <div className="bg-red-50 border border-red-300 rounded-lg p-3">
                                                <div className="flex items-start gap-2">
                                                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                                                    <div className="flex-1">
                                                        <p className="text-xs font-semibold text-red-900 mb-1">{t('missingCriticalTitle')}</p>
                                                        <p className="text-xs text-red-800 mb-2">{t('missingCriticalDesc')}</p>
                                                        <ul className="text-xs text-red-800 list-disc list-inside space-y-0.5">
                                                            {missingCritical.map((section, idx) => (
                                                                <li key={idx}>{section.label}</li>
                                                            ))}
                                                        </ul>
                                                        <p className="text-xs text-red-800 mt-2 font-medium">{t('continueToProvide')}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    }
                                    return null;
                                })()}
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        setShowGenerateConfirm(false);
                                    }}
                                    className="flex-1 px-4 py-2.5 bg-white border-2 border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 active:scale-[0.98]"
                                >
                                    {t('continueInterview')}
                                </button>
                                <button
                                    onClick={() => {
                                        setShowGenerateConfirm(false);
                                        onFinish(messages);
                                    }}
                                    className={`flex-1 px-4 py-2.5 font-bold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl active:scale-[0.98] ${isReadyToGenerate
                                        ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-200/50'
                                        : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200/50'
                                        }`}
                                >
                                    {t('confirmGenerate')}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Agent Ready Banner — appears in chat when agent signals all sections complete */}
                {agentReady && !showGenerateConfirm && (
                    <motion.div
                        initial={{ opacity: 0, y: 12, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ duration: 0.4, ease: 'easeOut' }}
                        className="mx-auto max-w-sm bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-5 text-center shadow-lg shadow-emerald-100/50"
                    >
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', delay: 0.2 }}
                        >
                            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-3" />
                        </motion.div>
                        <p className="font-bold text-emerald-900 text-base mb-1">{t('readyBannerTitle')}</p>
                        <p className="text-sm text-emerald-700 mb-4">{t('readyBannerDesc')}</p>
                        <button
                            onClick={() => setShowGenerateConfirm(true)}
                            className="px-6 py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all duration-200 shadow-md shadow-emerald-200/50 hover:shadow-lg active:scale-95"
                        >
                            {t('generateResume')}
                        </button>
                    </motion.div>
                )}

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-start gap-2">
                        <span className="font-semibold">⚠️</span>
                        <div>
                            <p className="font-semibold">{tCommon('error')}</p>
                            <p>{error}</p>
                            {error.includes('overloaded') && (
                                <button onClick={() => window.location.reload()} className="mt-2 text-xs underline hover:no-underline">{tCommon('reload')}</button>
                            )}
                        </div>
                    </div>
                )}
                {messages.map((msg, index) => (
                    <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, ease: 'easeOut' }}
                        className={`flex w-full gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        {msg.role === 'model' && (
                            <motion.div
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.1 }}
                                className="w-8 h-8 rounded-full bg-linear-to-br from-indigo-500 to-violet-600 flex items-center justify-center shrink-0 mt-1 shadow-md ring-2 ring-indigo-100"
                            >
                                <Bot className="w-5 h-5 text-white" />
                            </motion.div>
                        )}
                        <div className={`max-w-[85%] md:max-w-[75%] rounded-2xl px-6 py-4 text-sm leading-relaxed relative group whitespace-pre-wrap transition-shadow duration-200 ${msg.role === 'user' ? 'bg-linear-to-br from-slate-800 to-slate-900 text-white rounded-br-sm shadow-md shadow-slate-300/40' : 'bg-white text-slate-700 border border-slate-200/60 rounded-bl-sm shadow-sm hover:shadow-md'}`}>
                            {msg.isHint && <div className="flex items-center gap-1.5 mb-2 text-amber-500 font-bold text-xs uppercase tracking-wide"><HelpCircle className="w-3 h-3" /> {t('hint')}</div>}
                            <span>{formatMarkdown(msg.text)}</span>
                        </div>
                        {msg.role === 'user' && (
                            <motion.div
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.1 }}
                                className="w-8 h-8 rounded-full bg-linear-to-br from-slate-700 to-slate-800 flex items-center justify-center shrink-0 mt-1 shadow-sm ring-2 ring-slate-200"
                            >
                                <User className="w-5 h-5 text-white" />
                            </motion.div>
                        )}
                    </motion.div>
                ))}
                {isLoading && (
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex justify-start gap-3"
                    >
                        <motion.div
                            animate={{
                                boxShadow: [
                                    '0 0 0 0 rgba(99,102,241,0.2)',
                                    '0 0 0 8px rgba(99,102,241,0)',
                                    '0 0 0 0 rgba(99,102,241,0.2)',
                                ],
                            }}
                            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                            className="w-8 h-8 rounded-full bg-linear-to-br from-indigo-500 to-violet-600 flex items-center justify-center shrink-0 mt-1 ring-2 ring-indigo-200"
                        >
                            <Bot className="w-5 h-5 text-white" />
                        </motion.div>
                        <div className="bg-white px-5 py-4 rounded-2xl rounded-bl-sm border border-slate-100 shadow-sm flex items-center gap-2">
                            <motion.span animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.4, repeat: Infinity, delay: 0, ease: 'easeInOut' }} className="w-2 h-2 bg-indigo-500 rounded-full inline-block" />
                            <motion.span animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.4, repeat: Infinity, delay: 0.2, ease: 'easeInOut' }} className="w-2 h-2 bg-indigo-500 rounded-full inline-block" />
                            <motion.span animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.4, repeat: Infinity, delay: 0.4, ease: 'easeInOut' }} className="w-2 h-2 bg-indigo-500 rounded-full inline-block" />
                        </div>
                    </motion.div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="p-3 md:p-4 glass border-t border-slate-200/80 shadow-[0_-2px_10px_rgba(0,0,0,0.03)]">
                <div className="flex items-end gap-2 max-w-4xl mx-auto">
                    {/* Hint Button with improved styling */}
                    <div className="group relative">
                        <button
                            onClick={handleHint}
                            disabled={isLoading}
                            className="p-2.5 bg-amber-50 text-amber-600 hover:bg-amber-100 hover:text-amber-700 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed border border-amber-200 hover:shadow-sm active:scale-95"
                            title={t('getHint')}
                        >
                            <HelpCircle className="w-5 h-5" />
                        </button>
                        <div className="absolute bottom-full left-0 mb-2 px-2.5 py-1.5 bg-slate-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 font-medium shadow-lg">
                            {t('getHint')}
                        </div>
                    </div>

                    {/* Input Area with improved styling */}
                    <div className={`flex-1 rounded-xl flex items-center px-4 py-1.5 border-2 transition-all duration-200 ${isLoading
                        ? 'bg-slate-100 border-slate-200'
                        : 'bg-slate-50 border-slate-200 focus-within:border-indigo-400 focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(99,102,241,0.08)]'
                        }`}>
                        <textarea
                            ref={inputRef}
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            onCompositionStart={handleCompositionStart}
                            onCompositionEnd={handleCompositionEnd}
                            placeholder={isLoading ? t('agentThinking') : t('placeholder')}
                            disabled={isLoading}
                            className="flex-1 bg-transparent border-none focus:ring-0 resize-none h-10 py-2.5 text-sm outline-none text-slate-800 placeholder:text-slate-400 disabled:opacity-50 disabled:cursor-not-allowed"
                            rows={1}
                        />
                    </div>

                    {/* Stop Button (visible when loading) or Send Button */}
                    {isLoading ? (
                        <button
                            onClick={() => {
                                if (abortController) {
                                    abortController.abort();
                                    setAbortController(null);
                                }
                            }}
                            className="p-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-all duration-200 shadow-sm active:scale-95"
                            title={t('stopGenerating')}
                        >
                            <Square className="w-5 h-5 fill-current" />
                        </button>
                    ) : (
                        <button
                            onClick={onSendClick}
                            disabled={!inputValue.trim() || isLoading}
                            className={`p-2.5 rounded-xl transition-all duration-200 active:scale-95 ${inputValue.trim()
                                ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200/50 hover:shadow-lg'
                                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                }`}
                            title={t('sendMessage')}
                        >
                            <ArrowUp className="w-5 h-5" />
                        </button>
                    )}
                </div>

                {/* Helper text */}
                <div className="max-w-4xl mx-auto mt-1.5">
                    <p className="text-center text-[11px] text-slate-400">
                        {isLoading ? (
                            <span className="inline-flex items-center gap-1.5">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                {t('agentThinking')}
                            </span>
                        ) : t('pressEnter')}
                    </p>
                </div>
            </div>
        </div>
    );
};
