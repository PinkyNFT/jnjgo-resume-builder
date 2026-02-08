/**
 * Production-grade gap detection utility
 * Uses semantic analysis instead of naive string matching
 */

import { Message } from '../types';

export interface GapAnalysis {
    hasUnresolvedGaps: boolean;
    confidence: number;
    reasons: string[];
    gapQuestions: Array<{
        questionIndex: number;
        question: string;
        hasAnswer: boolean;
        answerQuality: 'none' | 'insufficient' | 'adequate';
    }>;
}

/**
 * Pattern matchers for gap-related questions
 * Uses word boundaries to avoid false positives
 */
const GAP_QUESTION_PATTERNS = [
    // Only match 'gap' if it's about career/employment/timeline (not 'gap analysis')
    /\b(employment|career|resume|timeline)\s+gap\b/i,
    /\bgap\s+(in|between|during)\b/i,
    /\bexplain.*gap\b/i,
    /\bgap.*\b(2[0-9]{3}|year|month)\b/i, // Gap with years/dates
    /\bbreak\b.*\b(employment|career|work)\b/i,
    /\b(between|during)\b.*\b(positions?|jobs?|roles?)\b.*\?/i,
    /what were you doing\b.*\b(during|between|then)\b/i,
    /can you explain\b.*\b(time|period)\b/i,
    /\bunemployed\b/i,
    /\btime off\b/i,
];

/**
 * Semantic indicators that a user provided substantive gap explanation
 * Organized by category for maintainability
 */
const GAP_ANSWER_INDICATORS = {
    employment: ['job search', 'freelanc', 'consult', 'contract', 'entrepreneur', 'startup'],
    personal: ['family', 'parenting', 'care', 'health', 'medical', 'personal'],
    education: ['school', 'study', 'education', 'course', 'training', 'learn', 'bootcamp', 'degree'],
    lifestyle: ['travel', 'sabbatical', 'volunteer', 'relocation', 'moving'],
    transition: ['transition', 'career change', 'pivoting', 'exploring'],
    military: ['service', 'deployed', 'military'],
    leave: ['leave', 'sabbatical', 'hiatus', 'break'],
    // Common verbs in explanations
    verbs: ['was', 'did', 'took', 'spent', 'focused', 'dedicated', 'pursued', 'worked', 'helped'],
};

/**
 * Minimum character threshold for substantive answers
 * Prevents "yes", "no", "ok" from being considered valid
 */
const MIN_ANSWER_LENGTH = 15;

/**
 * Checks if text matches gap question patterns
 */
function isGapQuestion(text: string): boolean {
    return GAP_QUESTION_PATTERNS.some(pattern => pattern.test(text));
}

/**
 * Analyzes answer quality using semantic indicators
 */
function assessAnswerQuality(answer: string): 'none' | 'insufficient' | 'adequate' {
    if (!answer || answer.trim().length === 0) {
        return 'none';
    }

    const normalizedAnswer = answer.toLowerCase();

    // Check for dismissive/minimal responses BEFORE length check
    const dismissivePatterns = /^(no|yes|ok|sure|maybe|idk|i don't know)[.,!?]?$/i;
    if (dismissivePatterns.test(answer.trim())) {
        return 'insufficient';
    }

    // Now check minimum length for non-dismissive answers
    if (answer.trim().length < MIN_ANSWER_LENGTH) {
        return 'insufficient';
    }

    // Count semantic indicator matches
    let indicatorMatches = 0;
    for (const category of Object.values(GAP_ANSWER_INDICATORS)) {
        for (const indicator of category) {
            // Use word boundaries to avoid false positives
            const pattern = new RegExp(`\\b${indicator}`, 'i');
            if (pattern.test(normalizedAnswer)) {
                indicatorMatches++;
            }
        }
    }

    // Adequate if contains multiple indicators or is sufficiently detailed
    if (indicatorMatches >= 2 || answer.length > 100) {
        return 'adequate';
    }

    // Has some indicators but not enough
    if (indicatorMatches >= 1 && answer.length > MIN_ANSWER_LENGTH) {
        return 'adequate'; // Give benefit of doubt
    }

    return 'insufficient';
}

/**
 * Finds the next user response after a given message index
 */
function findNextUserResponse(messages: Message[], startIndex: number): Message | null {
    for (let i = startIndex + 1; i < messages.length; i++) {
        if (messages[i].role === 'user' && !messages[i].isHint) {
            return messages[i];
        }
    }
    return null;
}

/**
 * Main gap detection function with detailed analysis
 * More robust than simple boolean check
 */
export function analyzeGapCoverage(messages: Message[]): GapAnalysis {
    const gapQuestions: GapAnalysis['gapQuestions'] = [];
    let totalQuestions = 0;
    let unansweredOrPoorQuestions = 0;

    // Scan conversation for gap questions
    for (let i = 0; i < messages.length; i++) {
        const msg = messages[i];

        if (msg.role === 'model' && !msg.isHint) {
            if (isGapQuestion(msg.text)) {
                totalQuestions++;
                const nextUserMsg = findNextUserResponse(messages, i);
                const answerQuality = nextUserMsg ? assessAnswerQuality(nextUserMsg.text) : 'none';

                gapQuestions.push({
                    questionIndex: i,
                    question: msg.text,
                    hasAnswer: answerQuality !== 'none',
                    answerQuality,
                });

                if (answerQuality === 'none' || answerQuality === 'insufficient') {
                    unansweredOrPoorQuestions++;
                }
            }
        }
    }

    // Calculate confidence score
    let confidence = 1.0;
    if (totalQuestions > 0) {
        confidence = Math.max(0, 1 - (unansweredOrPoorQuestions / totalQuestions));
    }

    // Determine if gaps are unresolved
    const hasUnresolvedGaps = unansweredOrPoorQuestions > 0;

    // Generate human-readable reasons
    const reasons: string[] = [];
    if (totalQuestions === 0) {
        reasons.push('No gap-related questions were asked in the conversation');
    } else {
        const adequateAnswers = gapQuestions.filter(q => q.answerQuality === 'adequate').length;
        reasons.push(`${adequateAnswers} of ${totalQuestions} gap questions adequately answered`);

        if (hasUnresolvedGaps) {
            const noneCount = gapQuestions.filter(q => q.answerQuality === 'none').length;
            const insufficientCount = gapQuestions.filter(q => q.answerQuality === 'insufficient').length;

            if (noneCount > 0) {
                reasons.push(`${noneCount} gap question(s) remain unanswered`);
            }
            if (insufficientCount > 0) {
                reasons.push(`${insufficientCount} gap answer(s) need more detail`);
            }
        }
    }

    return {
        hasUnresolvedGaps,
        confidence,
        reasons,
        gapQuestions,
    };
}

/**
 * Simplified boolean check for backward compatibility
 * Uses the more sophisticated analysis under the hood
 */
export function hasUnresolvedGapQuestions(messages: Message[]): boolean {
    const analysis = analyzeGapCoverage(messages);
    return analysis.hasUnresolvedGaps;
}

/**
 * Detects if conversation contains any gap discussion
 * More accurate than simple keyword matching
 */
export function hasGapDiscussion(messages: Message[]): boolean {
    const analysis = analyzeGapCoverage(messages);

    // Has discussion if any gap questions were asked
    if (analysis.gapQuestions.length > 0) {
        return true;
    }

    // Also check if user voluntarily mentioned gaps
    const allText = messages
        .filter(m => m.role === 'user' && !m.isHint)
        .map(m => m.text.toLowerCase())
        .join(' ');

    // More precise patterns with word boundaries
    const voluntaryGapMentions = [
        /\btook\s+(a|an)\s+(break|leave|time\s+off)\b/i,
        /\bgap\s+in\s+(my\s+)?(career|employment|resume)\b/i,
        /\bwasn't\s+working\b/i,
        /\bunemployed\s+for\b/i,
        /\b(medical|family|personal)\s+leave\b/i,
    ];

    return voluntaryGapMentions.some(pattern => pattern.test(allText));
}
