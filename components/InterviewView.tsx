'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Message, RoleType, ImportData, ResumeData } from '../types';
import { useSendMessage, useGenerateHint } from '../hooks/useGemini';
import { Send, Loader2, Sparkles, AlertCircle, ArrowUp, HelpCircle, Save, User, Bot, Home, CheckCircle2, ClipboardCheck, AlertTriangle, Square } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Check if there are any unresolved gap questions in the conversation
const hasUnresolvedGapQuestions = (messages: Message[]): boolean => {
    // Look for gap questions from the model followed by substantive user answers
    for (let i = 0; i < messages.length - 1; i++) {
        const msg = messages[i];
        if (msg.role === 'model') {
            const text = msg.text.toLowerCase();
            // Check if this is a gap-related question
            const isGapQuestion = (
                text.includes('gap') ||
                (text.includes('between') && text.includes('?')) ||
                (text.includes('during that time') && text.includes('?')) ||
                (text.includes('what were you doing') && text.includes('?'))
            );

            if (isGapQuestion) {
                // Check if the next user message is a substantive answer (not just "yes" or "no")
                const nextUserMsg = messages.slice(i + 1).find(m => m.role === 'user');
                if (!nextUserMsg || nextUserMsg.text.trim().length < 10) {
                    return true; // Found unanswered gap question
                }
                // Check if the answer actually addresses the gap - expanded keywords
                const answer = nextUserMsg.text.toLowerCase();
                const hasSubstantiveAnswer = (
                    answer.includes('was') || answer.includes('did') || answer.includes('doing') ||
                    answer.includes('search') || answer.includes('freelanc') || answer.includes('school') ||
                    answer.includes('education') || answer.includes('personal') || answer.includes('break') ||
                    answer.includes('transition') || answer.includes('time') || answer.includes('leave') ||
                    answer.includes('medical') || answer.includes('family') || answer.includes('sabbatical') ||
                    answer.includes('traveled') || answer.includes('study') || answer.includes('training') ||
                    answer.includes('care') || answer.includes('health') || answer.includes('relocation')
                );
                if (!hasSubstantiveAnswer) {
                    return true; // User didn't really answer the gap question
                }
            }
        }
    }
    return false; // All gap questions were answered
};

// Calculate data completeness score based on collected information
const calculateDataCompleteness = (messages: Message[], importData?: ImportData): { score: number; details: { category: string; complete: boolean; priority?: 'high' | 'normal' }[] } => {
    const userMessages = messages.filter(m => m.role === 'user' && !m.isHint);
    const modelMessages = messages.filter(m => m.role === 'model' && !m.isHint);
    const allText = messages.map(m => m.text.toLowerCase()).join(' ');

    // Calculate average message length to gauge detail level
    const avgUserMessageLength = userMessages.length > 0
        ? userMessages.reduce((sum, m) => sum + m.text.length, 0) / userMessages.length
        : 0;

    // Count substantive messages (more than 50 characters)
    const substantiveMessages = userMessages.filter(m => m.text.trim().length > 50).length;

    // Check for specific section discussions
    const workKeywords = ['company', 'position', 'role', 'job', 'work', 'employer', 'worked at', 'responsibilities'];
    const hasWorkDiscussion = workKeywords.some(kw => allText.includes(kw)) && userMessages.length >= 3;

    const projectKeywords = ['project', 'achievement', 'built', 'developed', 'led', 'managed', 'implemented'];
    const hasProjectDiscussion = projectKeywords.some(kw => allText.includes(kw)) && substantiveMessages >= 5;

    const gapKeywords = ['gap', 'break', 'unemployed', 'between jobs', 'career break', 'time off', 'sabbatical', 'hiatus', 'freelanc', 'job search', 'medical leave', 'medical', 'family leave', 'personal leave', 'traveling', 'study', 'relocation'];
    const hasGapDiscussion = gapKeywords.some(kw => allText.includes(kw));

    // CRITICAL: Check for Education discussion
    const educationKeywords = ['degree', 'university', 'college', 'bachelor', 'master', 'phd', 'graduated', 'education', 'school', 'mba', 'b.s', 'm.s', 'bootcamp', 'coursework'];
    const educationQuestions = modelMessages.filter(m =>
        m.text.toLowerCase().includes('education') ||
        m.text.toLowerCase().includes('degree') ||
        m.text.toLowerCase().includes('university') ||
        m.text.toLowerCase().includes('graduated')
    );
    const hasEducationDiscussion = educationKeywords.some(kw => allText.includes(kw)) && educationQuestions.length > 0;

    // CRITICAL: Check for Skills discussion
    const skillsKeywords = ['skill', 'python', 'java', 'javascript', 'react', 'aws', 'framework', 'language', 'tool', 'technology', 'platform', 'proficient'];
    const skillsQuestions = modelMessages.filter(m =>
        m.text.toLowerCase().includes('skill') ||
        m.text.toLowerCase().includes('technical') ||
        m.text.toLowerCase().includes('tools')
    );
    const hasSkillsDiscussion = skillsKeywords.some(kw => allText.includes(kw)) && skillsQuestions.length > 0;

    // CRITICAL: Check for Certifications discussion (asked, even if answer is "none")
    const certificationsQuestions = modelMessages.filter(m =>
        m.text.toLowerCase().includes('certification') ||
        m.text.toLowerCase().includes('certified')
    );
    const hasCertificationsAsked = certificationsQuestions.length > 0;

    const details: { category: string; complete: boolean; priority?: 'high' | 'normal' }[] = [];

    // Minimum thresholds based on whether resume was imported
    const minTimeline = importData ? 4 : 6;
    const minProjects = importData ? 6 : 9;
    const minDepth = importData ? 8 : 12;

    // 1. Work History Timeline (15%)
    const hasTimeline = hasWorkDiscussion && userMessages.length >= minTimeline;
    details.push({ category: 'Work History', complete: hasTimeline, priority: 'high' });

    // 2. Career Gaps Explained (10%)
    const hasGaps = hasGapDiscussion || userMessages.length >= 4;
    details.push({ category: 'Career Gaps', complete: hasGaps, priority: 'normal' });

    // 3. Project Details (20%)
    const hasProjects = hasProjectDiscussion && userMessages.length >= minProjects && substantiveMessages >= Math.floor(minProjects * 0.7);
    details.push({ category: 'Project Details', complete: hasProjects, priority: 'high' });

    // 4. Education (20%) - MANDATORY
    details.push({ category: 'Education', complete: hasEducationDiscussion, priority: 'high' });

    // 5. Skills (20%) - MANDATORY
    details.push({ category: 'Skills', complete: hasSkillsDiscussion, priority: 'high' });

    // 6. Certifications Asked (10%) - MANDATORY
    details.push({ category: 'Certifications', complete: hasCertificationsAsked, priority: 'high' });

    // 7. Overall Depth & Context (5%)
    const hasDepth = userMessages.length >= minDepth && substantiveMessages >= Math.floor(minDepth * 0.7) && avgUserMessageLength > 80;
    details.push({ category: 'Depth & Context', complete: hasDepth, priority: 'normal' });

    const completeCount = details.filter(d => d.complete).length;
    const score = Math.round((completeCount / details.length) * 100);

    return { score, details };
};

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
    const { score: dataCompleteness, details: completenessDetails } = calculateDataCompleteness(messages, importData);

    // Check if all critical sections are complete (Work, Projects, Education, Skills, Certifications)
    const criticalSections = completenessDetails.filter(d => d.priority === 'high');
    const allCriticalComplete = criticalSections.every(s => s.complete);
    const isReadyToGenerate = dataCompleteness >= 85 && allCriticalComplete; // Raised threshold to 85% and require all critical sections

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
        <div className="flex flex-col h-full max-w-4xl mx-auto bg-white shadow-xl rounded-2xl overflow-hidden border border-slate-200/60">
            <div className="bg-white/95 backdrop-blur-sm border-b border-slate-100 p-4 flex justify-between items-center sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <button onClick={handleExit} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition-colors">
                        <Home className="w-5 h-5" />
                    </button>
                    <div className="h-6 w-px bg-slate-200 mx-1"></div>
                    <div>
                        <h2 className="font-bold text-slate-800 text-sm md:text-base">{t('agentName')}</h2>
                        <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                            <p className="text-[10px] text-slate-500 font-medium uppercase">{t('roleExpert', { role: roleType })}</p>
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

                    {/* Data Completeness Indicator */}
                    <div className="hidden md:flex items-center gap-2">
                        <div className="relative group">
                            <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg cursor-default transition-all group-hover:bg-white group-hover:border-slate-300">
                                <div className="flex items-center gap-2">
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wide leading-none mb-1">Quality</span>
                                        <div className="w-20 h-2 bg-slate-200 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full transition-all duration-700 ease-out ${dataCompleteness >= 85 ? 'bg-linear-to-r from-green-500 to-emerald-500' :
                                                    dataCompleteness >= 60 ? 'bg-linear-to-r from-amber-500 to-yellow-500' :
                                                        dataCompleteness >= 40 ? 'bg-linear-to-r from-orange-400 to-red-400' :
                                                            'bg-slate-300'
                                                    }`}
                                                style={{ width: `${Math.max(dataCompleteness, 2)}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 pl-1 border-l border-slate-200">
                                        <div className={`w-1 h-1 rounded-full ${dataCompleteness >= 85 ? 'bg-green-500 animate-pulse' :
                                            dataCompleteness >= 60 ? 'bg-amber-500' :
                                                'bg-slate-300'
                                            }`}></div>
                                        <span className={`text-xs font-black tabular-nums ${dataCompleteness >= 85 ? 'text-green-600' :
                                            dataCompleteness >= 60 ? 'text-amber-600' :
                                                dataCompleteness >= 40 ? 'text-orange-500' :
                                                    'text-slate-400'
                                            }`}>{dataCompleteness}%</span>
                                    </div>
                                </div>
                            </div>
                            {/* Tooltip on hover */}
                            <div className="absolute right-0 top-full mt-2 w-72 bg-slate-900 text-white text-xs rounded-xl p-4 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-20 shadow-2xl border border-slate-700">
                                <div className="space-y-3">
                                    <p className="font-bold text-sm mb-2 text-slate-100">{t('dataQuality')}</p>

                                    {/* High Priority Items */}
                                    {completenessDetails.filter(d => d.priority === 'high').length > 0 && (
                                        <div className="mb-3">
                                            <p className="text-[9px] text-amber-400 font-bold uppercase tracking-wider mb-2 flex items-center gap-1">
                                                <AlertTriangle className="w-3 h-3" /> {t('criticalInfo')}
                                            </p>
                                            {completenessDetails.filter(d => d.priority === 'high').map((detail, idx) => (
                                                <div key={idx} className="flex items-center gap-2.5 mb-2">
                                                    {detail.complete ? (
                                                        <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                                                    ) : (
                                                        <div className="w-4 h-4 rounded-full border-2 border-amber-400 shrink-0 animate-pulse" />
                                                    )}
                                                    <span className={`text-xs font-medium ${detail.complete ? 'text-green-300' : 'text-amber-300'}`}>{detail.category}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Regular Items */}
                                    <div className="space-y-2">
                                        {completenessDetails.filter(d => d.priority !== 'high').map((detail, idx) => (
                                            <div key={idx} className="flex items-center gap-2.5">
                                                {detail.complete ? (
                                                    <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0" />
                                                ) : (
                                                    <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-500 shrink-0" />
                                                )}
                                                <span className={`text-xs ${detail.complete ? 'text-green-300 font-medium' : 'text-slate-400'}`}>{detail.category}</span>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="border-t border-slate-700 my-3 pt-3">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-slate-400 text-[10px]">{t('responses')}</span>
                                            <span className="text-white text-[10px] font-bold">{userMessageCount} / {importData ? '12+' : '16+'}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-slate-400 text-[10px]">{t('qualityScore')}</span>
                                            <span className={`text-[10px] font-bold ${dataCompleteness >= 85 ? 'text-green-400' :
                                                dataCompleteness >= 60 ? 'text-amber-400' :
                                                    'text-slate-400'
                                                }`}>{dataCompleteness}%</span>
                                        </div>
                                    </div>
                                    {dataCompleteness >= 85 && allCriticalComplete ? (
                                        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-2.5">
                                            <p className="text-green-300 text-[10px] font-medium leading-relaxed">{t('excellent')}</p>
                                        </div>
                                    ) : dataCompleteness >= 60 ? (
                                        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-2.5">
                                            <p className="text-amber-300 text-[10px] leading-relaxed">{t('missingCritical')}</p>
                                        </div>
                                    ) : (
                                        <div className="bg-slate-500/10 border border-slate-500/30 rounded-lg p-2.5">
                                            <p className="text-slate-300 text-[10px] leading-relaxed">{t('keepAnswering')}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Generate Resume Button - changes based on data completeness */}
                        <button
                            onClick={() => setShowGenerateConfirm(true)}
                            className={`flex items-center gap-2 text-xs px-4 py-2 rounded-lg font-semibold transition-colors ${isReadyToGenerate
                                ? 'bg-green-600 text-white hover:bg-green-700'
                                : 'bg-orange-500 text-white hover:bg-orange-600'
                                }`}
                            title={isReadyToGenerate ? t('generateResume') : 'Generate with incomplete data - missing critical sections'}
                        >
                            <ClipboardCheck className="w-4 h-4" />
                            <span className="hidden sm:inline">{isReadyToGenerate ? t('generateResume') : t('forceGenerate')}</span>
                            <span className="sm:hidden">{isReadyToGenerate ? 'Generate' : 'Force'}</span>
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5 bg-linear-to-b from-slate-50/80 to-white">
                {/* Resume Generation Confirmation */}
                {showGenerateConfirm && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 animate-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
                            <div className="flex items-start gap-3 mb-4">
                                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                                    <CheckCircle2 className="w-5 h-5 text-indigo-600" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-slate-900 mb-1">{t('generateConfirmTitle')}</h3>
                                    <p className="text-sm text-slate-600">{t('generateConfirmDesc')}</p>
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
                                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">{t('conversationSummary')}</h4>
                                    <div className="bg-white rounded-lg p-3 space-y-2">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-slate-600">{t('totalResponses')}</span>
                                            <span className="font-bold text-slate-900">{userMessageCount}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-slate-600">{t('dataCompleteness')}</span>
                                            <span className={`font-bold ${dataCompleteness >= 75 ? 'text-green-600' :
                                                dataCompleteness >= 50 ? 'text-amber-600' :
                                                    'text-orange-600'
                                                }`}>{dataCompleteness}%</span>
                                        </div>
                                        <div className="mt-3 pt-3 border-t border-slate-200">
                                            <p className="text-xs text-slate-500 mb-2">{t('collectionStatus')}</p>
                                            <div className="space-y-1">
                                                {completenessDetails.map((detail, idx) => (
                                                    <div key={idx} className="flex items-center gap-2 text-xs">
                                                        {detail.complete ? (
                                                            <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                                                        ) : (
                                                            <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-300 shrink-0" />
                                                        )}
                                                        <span className={detail.complete ? 'text-slate-700' : 'text-slate-400'}>
                                                            {detail.category}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {dataCompleteness < 85 && (
                                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                                        <div className="flex items-start gap-2">
                                            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                            <div>
                                                <p className="text-xs font-semibold text-amber-900 mb-1">{t('qualityBelowRecommended')}</p>
                                                <p className="text-xs text-amber-800">{t('qualityBelowDesc')}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Missing Critical Sections Warning */}
                                {(() => {
                                    const missingCritical = completenessDetails.filter(d => d.priority === 'high' && !d.complete);
                                    if (missingCritical.length > 0) {
                                        return (
                                            <div className="bg-red-50 border border-red-300 rounded-lg p-3">
                                                <div className="flex items-start gap-2">
                                                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                                                    <div className="flex-1">
                                                        <p className="text-xs font-semibold text-red-900 mb-1">{t('missingCriticalTitle')}</p>
                                                        <p className="text-xs text-red-800 mb-2">{t('missingCriticalDesc')}</p>
                                                        <ul className="text-xs text-red-800 list-disc list-inside space-y-0.5">
                                                            {missingCritical.map((section, idx) => (
                                                                <li key={idx}>{section.category}</li>
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

                                {/* Unresolved Gap Questions Warning */}
                                {(() => {
                                    const hasUnresolvedGaps = hasUnresolvedGapQuestions(messages);
                                    const hasGapDiscussion = completenessDetails.find(d => d.category === 'Career Gaps')?.complete;

                                    // Only show warning if there are unresolved gap questions
                                    if (hasUnresolvedGaps && !hasGapDiscussion) {
                                        return (
                                            <div className="bg-amber-50 border border-amber-300 rounded-lg p-3">
                                                <div className="flex items-start gap-2">
                                                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                                    <div className="flex-1">
                                                        <p className="text-xs font-semibold text-amber-900 mb-1">{t('timelineGapsTitle')}</p>
                                                        <p className="text-xs text-amber-800">{t('timelineGapsDesc')}</p>
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
                                    className="flex-1 px-4 py-2.5 bg-white border-2 border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-all"
                                >
                                    {t('continueInterview')}
                                </button>
                                <button
                                    onClick={() => {
                                        setShowGenerateConfirm(false);
                                        onFinish(messages);
                                    }}
                                    className="flex-1 px-4 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg hover:shadow-xl"
                                >
                                    {t('confirmGenerate')}
                                </button>
                            </div>
                        </div>
                    </div>
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
                        <div className={`max-w-[85%] md:max-w-[75%] rounded-2xl px-6 py-4 text-sm leading-relaxed shadow-sm relative group whitespace-pre-wrap ${msg.role === 'user' ? 'bg-slate-900 text-white rounded-br-none' : 'bg-white text-slate-700 border border-slate-200/60 rounded-bl-none'}`}>
                            {msg.isHint && <div className="flex items-center gap-1.5 mb-2 text-amber-600 font-bold text-xs uppercase"><HelpCircle className="w-3 h-3" /> {t('hint')}</div>}
                            <span>{formatMarkdown(msg.text)}</span>
                        </div>
                        {msg.role === 'user' && (
                            <motion.div
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.1 }}
                                className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center shrink-0 mt-1"
                            >
                                <User className="w-5 h-5 text-slate-500" />
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
                        <div className="bg-white px-5 py-4 rounded-2xl rounded-bl-none border border-slate-100 shadow-sm flex items-center gap-1.5">
                            <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.2, repeat: Infinity, delay: 0 }} className="w-2 h-2 bg-indigo-400 rounded-full inline-block" />
                            <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.2, repeat: Infinity, delay: 0.2 }} className="w-2 h-2 bg-indigo-400 rounded-full inline-block" />
                            <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.2, repeat: Infinity, delay: 0.4 }} className="w-2 h-2 bg-indigo-400 rounded-full inline-block" />
                        </div>
                    </motion.div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="p-3 md:p-4 bg-white/95 backdrop-blur-sm border-t border-slate-200/80 shadow-[0_-1px_3px_rgba(0,0,0,0.03)]">
                <div className="flex items-end gap-2 max-w-4xl mx-auto">
                    {/* Hint Button with improved styling */}
                    <div className="group relative">
                        <button
                            onClick={handleHint}
                            disabled={isLoading}
                            className="p-2.5 bg-amber-50 text-amber-600 hover:bg-amber-100 hover:text-amber-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-amber-200"
                            title={t('getHint')}
                        >
                            <HelpCircle className="w-5 h-5" />
                        </button>
                        <div className="absolute bottom-full left-0 mb-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                            {t('getHint')}
                        </div>
                    </div>

                    {/* Input Area with improved styling */}
                    <div className={`flex-1 rounded-xl flex items-center px-4 py-1.5 border-2 transition-all duration-200 ${isLoading
                            ? 'bg-slate-100 border-slate-200'
                            : 'bg-slate-50 border-slate-200 focus-within:border-indigo-400 focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(99,102,241,0.1)]'
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
                            className="p-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                            title={t('stopGenerating')}
                        >
                            <Square className="w-5 h-5 fill-current" />
                        </button>
                    ) : (
                        <button
                            onClick={onSendClick}
                            disabled={!inputValue.trim() || isLoading}
                            className={`p-2.5 rounded-lg transition-colors ${inputValue.trim()
                                ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
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
