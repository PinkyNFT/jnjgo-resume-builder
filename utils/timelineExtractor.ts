/**
 * Extract employment timeline data from interview conversation
 * This utility parses the conversation history to identify employers and their dates
 * for timeline preview during the interview process
 */

import { Message, WorkExperience } from '../types';
import { parsePeriod } from './dateParser';

export interface ExtractedEmployer {
    company: string;
    position?: string;
    period: string;
    confidence: 'high' | 'medium' | 'low';
}

/**
 * Extract employer names and dates from conversation text
 */
export function extractEmployersFromConversation(messages: Message[]): ExtractedEmployer[] {
    const employers: ExtractedEmployer[] = [];
    const allText = messages.map(m => `${m.role}: ${m.text}`).join('\n');

    // Enhanced Pattern for numbered lists - more flexible
    // Matches: "1. Company (dates)" or "1) Company (dates)" or "1. Company - dates"
    const lines = allText.split('\n');
    for (const line of lines) {
        // Match numbered list format: "1. Company (2020-2023)" or "1. Company (September 2022 - Present)"
        const listMatch = line.match(/^\s*\d+[\.\)]\s*(.+?)\s*[\(\-–]\s*([^\)]+?)[\)]?\s*$/);
        if (listMatch) {
            const company = listMatch[1].trim();
            const period = listMatch[2].trim().replace(/\(|\)/g, '');

            console.log('Extracted from list:', { company, period, line });

            if (company && period && parsePeriod(period)) {
                employers.push({
                    company,
                    period,
                    confidence: 'high'
                });
            }
        }
    }

    // Also try matching the format directly in model messages
    const modelMessages = messages.filter(m => m.role === 'model');
    for (const msg of modelMessages) {
        // Look for pattern like "1. Company (dates)" in the message
        const matches = msg.text.matchAll(/(\d+)\.\s*([A-Z][A-Za-z\s&\.\-]+?)\s*\(([^\)]+)\)/g);
        for (const match of matches) {
            const company = match[2].trim();
            const period = match[3].trim();

            console.log('Extracted from model message:', { company, period });

            if (company && period && parsePeriod(period)) {
                employers.push({
                    company,
                    period,
                    confidence: 'high'
                });
            }
        }
    }

    // Pattern 1: "worked at [Company] from [date] to [date]"
    const pattern1 = /(?:worked at|work at|employed at|joined|at)\s+([A-Z][A-Za-z\s&\.]+?)(?:\s+(?:from|since|starting)\s+([A-Za-z0-9\s\-–,]+?)(?:\s+(?:to|until|-|–)\s+([A-Za-z0-9\s\-–,]+)|(?:\s+to\s+)?(?:present|current|now)))/gi;

    // Pattern 2: "[Company], [Position], [dates]"
    const pattern2 = /([A-Z][A-Za-z\s&\.]+?),\s*([A-Za-z\s]+?),\s*([0-9]{4}\s*[-–]\s*(?:[0-9]{4}|present|current))/gi;

    // Match pattern 1
    let match;
    while ((match = pattern1.exec(allText)) !== null) {
        const company = match[1].trim();
        const start = match[2]?.trim();
        const end = match[3]?.trim() || 'Present';

        if (company && start) {
            const period = `${start} - ${end}`;
            if (parsePeriod(period)) {
                employers.push({
                    company,
                    period,
                    confidence: 'medium'
                });
            }
        }
    }

    // Match pattern 2
    pattern2.lastIndex = 0;
    while ((match = pattern2.exec(allText)) !== null) {
        const company = match[1].trim();
        const position = match[2].trim();
        const period = match[3].trim();

        if (company && period && parsePeriod(period)) {
            employers.push({
                company,
                position,
                period,
                confidence: 'high'
            });
        }
    }

    // Deduplicate based on company name (keep highest confidence)
    const deduplicated = new Map<string, ExtractedEmployer>();
    for (const emp of employers) {
        const existing = deduplicated.get(emp.company);
        if (!existing ||
            (emp.confidence === 'high' && existing.confidence !== 'high') ||
            (emp.confidence === 'medium' && existing.confidence === 'low')) {
            deduplicated.set(emp.company, emp);
        }
    }

    const result = Array.from(deduplicated.values())
        .filter(emp => parsePeriod(emp.period) !== null)
        .sort((a, b) => {
            const aParsed = parsePeriod(a.period);
            const bParsed = parsePeriod(b.period);
            if (!aParsed || !bParsed) return 0;
            return bParsed.startYear - aParsed.startYear;
        });

    console.log('Total extracted employers:', result.length, result);
    return result;
}

/**
 * Check if the conversation has discussed work history/employment
 */
export function hasDiscussedEmployment(messages: Message[]): boolean {
    const keywords = [
        'company', 'employer', 'worked', 'work at', 'employed', 'position',
        'job', 'role', 'joined', 'started working', 'left', 'resigned'
    ];

    const allText = messages.map(m => m.text.toLowerCase()).join(' ');
    const matchCount = keywords.filter(kw => allText.includes(kw)).length;

    // Require at least 3 keywords and some user responses
    const userResponses = messages.filter(m => m.role === 'user' && m.text.length > 20).length;
    return matchCount >= 3 && userResponses >= 2;
}

/**
 * Check if timeline has been confirmed by user
 */
export function hasTimelineConfirmation(messages: Message[]): boolean {
    // Look for confirmation pattern in user responses after a timeline is shown
    const userMessages = messages.filter(m => m.role === 'user');

    for (let i = userMessages.length - 1; i >= Math.max(0, userMessages.length - 5); i--) {
        const msg = userMessages[i].text.toLowerCase();
        const confirmationWords = [
            'yes', 'correct', 'right', 'looks good', 'that\'s right',
            'accurate', 'perfect', 'exactly', 'confirmed', 'ok', 'okay',
            'はい', 'そうです', '正しい', '合っています', '大丈夫'
        ];

        if (confirmationWords.some(word => msg.includes(word))) {
            return true;
        }
    }

    return false;
}

/**
 * Check if AI has asked for timeline confirmation
 */
export function hasAskedForTimelineConfirmation(messages: Message[]): boolean {
    const modelMessages = messages.filter(m => m.role === 'model');

    for (let i = modelMessages.length - 1; i >= Math.max(0, modelMessages.length - 5); i--) {
        const msg = modelMessages[i].text.toLowerCase();
        const confirmationPhrases = [
            'does this look right', 'is this correct', 'does this timeline',
            'confirm', 'verify', 'is this accurate', 'look correct',
            '合っていますか', '正しいですか', 'これで', '確認'
        ];

        if (confirmationPhrases.some(phrase => msg.includes(phrase))) {
            return true;
        }
    }

    return false;
}

/**
 * Determine if we should show timeline preview
 * Shows when: employment discussed, at least 2 employers, not yet confirmed
 */
export function shouldShowTimelinePreview(messages: Message[]): boolean {
    const employers = extractEmployersFromConversation(messages);

    console.log('shouldShowTimelinePreview check:', {
        hasDiscussedEmployment: hasDiscussedEmployment(messages),
        employersCount: employers.length,
        hasAskedForConfirmation: hasAskedForTimelineConfirmation(messages),
        hasConfirmed: hasTimelineConfirmation(messages)
    });

    // Must have discussed employment and have at least 2 employers
    if (!hasDiscussedEmployment(messages) || employers.length < 2) {
        return false;
    }

    // Don't show if already confirmed
    if (hasTimelineConfirmation(messages)) {
        return false;
    }

    // Show if asked for confirmation (regardless of whether confirmed yet)
    // OR if we have enough data (2+ employers)
    return hasAskedForTimelineConfirmation(messages) || employers.length >= 2;
}

/**
 * Convert extracted employers to WorkExperience format
 */
export function convertToWorkExperience(employers: ExtractedEmployer[]): WorkExperience[] {
    return employers.map((emp, index) => ({
        id: `extracted-${index}`,
        company: emp.company,
        position: emp.position || 'Position',
        period: emp.period,
        responsibilities: []
    }));
}
