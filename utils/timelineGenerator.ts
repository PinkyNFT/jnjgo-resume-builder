import { WorkExperience, SkillTimeline } from '../types';
import { parsePeriod } from './dateParser';

/**
 * Timeline generation utilities for converting work experience data
 * into timeline visualizations
 */

/**
 * Extract unique skills from work experience responsibilities
 * Uses common keywords and patterns to identify skills
 * 
 * @param responsibilities - Array of responsibility strings
 * @returns Array of identified skill names
 */
function extractSkillsFromText(text: string): string[] {
    const skills = new Set<string>();
    const lowerText = text.toLowerCase();

    // Common skill patterns
    const skillPatterns = [
        // Programming & Development
        { pattern: /\b(javascript|typescript|python|java|c\+\+|ruby|php|swift|kotlin|go|rust)\b/gi, skill: (match: string) => match },
        { pattern: /\b(react|vue|angular|node\.?js|express|django|flask|spring|\.net)\b/gi, skill: (match: string) => match },
        { pattern: /\b(aws|azure|gcp|kubernetes|docker|jenkins|ci\/cd)\b/gi, skill: (match: string) => match },
        { pattern: /\b(sql|mysql|postgresql|mongodb|redis|elasticsearch)\b/gi, skill: (match: string) => match },

        // Business & Management
        { pattern: /\b(project management|product management|agile|scrum|kanban)\b/gi, skill: () => 'Project Management' },
        { pattern: /\b(leadership|team management|people management)\b/gi, skill: () => 'Leadership' },
        { pattern: /\b(strategy|strategic planning|business development)\b/gi, skill: () => 'Strategy' },
        { pattern: /\b(sales|business development|account management)\b/gi, skill: () => 'Sales' },
        { pattern: /\b(marketing|digital marketing|content marketing)\b/gi, skill: () => 'Marketing' },
        { pattern: /\b(consulting|advisory|client engagement)\b/gi, skill: () => 'Consulting' },

        // Data & Analytics
        { pattern: /\b(data analysis|analytics|business intelligence)\b/gi, skill: () => 'Data Analysis' },
        { pattern: /\b(machine learning|ai|deep learning|nlp)\b/gi, skill: () => 'Machine Learning' },
        { pattern: /\b(data science|data engineering|etl)\b/gi, skill: () => 'Data Science' },

        // Design & Creative
        { pattern: /\b(ui|user interface|ux|user experience|design)\b/gi, skill: () => 'UX/UI Design' },
        { pattern: /\b(graphic design|visual design|branding)\b/gi, skill: () => 'Graphic Design' },

        // Operations
        { pattern: /\b(operations|process improvement|optimization)\b/gi, skill: () => 'Operations' },
        { pattern: /\b(quality assurance|qa|testing)\b/gi, skill: () => 'Quality Assurance' },
    ];

    for (const { pattern, skill } of skillPatterns) {
        const matches = text.matchAll(pattern);
        for (const match of matches) {
            const skillName = skill(match[0]);
            if (skillName) {
                skills.add(skillName.charAt(0).toUpperCase() + skillName.slice(1));
            }
        }
    }

    return Array.from(skills);
}

/**
 * Generate skill timelines from work experience data
 * 
 * This function analyzes work experience and creates timeline entries
 * for skills, technologies, and competencies mentioned in responsibilities.
 * 
 * @param workExperience - Array of work experience entries
 * @returns Array of skill timeline entries
 */
export function generateSkillTimelinesFromWork(
    workExperience: WorkExperience[]
): SkillTimeline[] {
    if (!workExperience || workExperience.length === 0) {
        return [];
    }

    const skillTimelines: SkillTimeline[] = [];
    const skillMap = new Map<string, { periods: string[], companies: string[] }>();

    // First pass: collect all skills and their occurrences
    for (const work of workExperience) {
        const allText = [
            work.position,
            ...work.responsibilities
        ].join(' ');

        const skills = extractSkillsFromText(allText);

        for (const skill of skills) {
            if (!skillMap.has(skill)) {
                skillMap.set(skill, { periods: [], companies: [] });
            }
            skillMap.get(skill)!.periods.push(work.period);
            skillMap.get(skill)!.companies.push(work.company);
        }
    }

    // Second pass: create timeline entries
    let timelineIndex = 0;
    for (const [skillName, data] of skillMap.entries()) {
        // For simplicity, we take the earliest and latest periods
        const parsedPeriods = data.periods
            .map(p => parsePeriod(p))
            .filter(p => p !== null);

        if (parsedPeriods.length === 0) continue;

        const startYear = Math.min(...parsedPeriods.map(p => p.startYear));
        const endYears = parsedPeriods
            .map(p => p.endYear)
            .filter(y => y !== null) as number[];
        const hasOngoing = parsedPeriods.some(p => p.isOngoing);

        const endYear = hasOngoing ? null : (endYears.length > 0 ? Math.max(...endYears) : null);

        const period = endYear === null
            ? `${startYear} - Present`
            : `${startYear} - ${endYear}`;

        skillTimelines.push({
            id: `skill-timeline-${timelineIndex++}`,
            skillName,
            period,
            context: data.companies.length > 1
                ? `${data.companies.length} employers`
                : data.companies[0]
        });
    }

    // Sort by start year (most recent first)
    return skillTimelines.sort((a, b) => {
        const aStart = parsePeriod(a.period)?.startYear || 0;
        const bStart = parsePeriod(b.period)?.startYear || 0;
        return bStart - aStart;
    });
}

/**
 * Create manual skill timeline entries
 * Helper function for users who want to manually define skill timelines
 * 
 * @param skillName - Name of the skill
 * @param startYear - Year the skill was first used
 * @param endYear - Year the skill was last used (null for ongoing)
 * @param context - Optional context (company, project, etc.)
 * @returns SkillTimeline object
 */
export function createSkillTimeline(
    skillName: string,
    startYear: number,
    endYear: number | null,
    context?: string
): SkillTimeline {
    const period = endYear === null
        ? `${startYear} - Present`
        : `${startYear} - ${endYear}`;

    return {
        id: `skill-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        skillName,
        period,
        context
    };
}

/**
 * Merge overlapping skill timelines
 * Combines skill entries that have the same name and overlapping periods
 * 
 * @param timelines - Array of skill timelines to merge
 * @returns Merged array with no overlapping entries for the same skill
 */
export function mergeSkillTimelines(timelines: SkillTimeline[]): SkillTimeline[] {
    const skillGroups = new Map<string, SkillTimeline[]>();

    // Group by skill name
    for (const timeline of timelines) {
        if (!skillGroups.has(timeline.skillName)) {
            skillGroups.set(timeline.skillName, []);
        }
        skillGroups.get(timeline.skillName)!.push(timeline);
    }

    const merged: SkillTimeline[] = [];

    // Merge timelines for each skill
    for (const [skillName, group] of skillGroups.entries()) {
        if (group.length === 1) {
            merged.push(group[0]);
            continue;
        }

        // Sort by start year
        const sorted = group
            .map(t => ({ timeline: t, parsed: parsePeriod(t.period) }))
            .filter(t => t.parsed !== null)
            .sort((a, b) => a.parsed!.startYear - b.parsed!.startYear);

        if (sorted.length === 0) continue;

        // Merge overlapping periods
        let current = sorted[0];
        const contexts = [current.timeline.context].filter(Boolean);

        for (let i = 1; i < sorted.length; i++) {
            const next = sorted[i];
            const currentEnd = current.parsed!.endYear || 9999;
            const nextStart = next.parsed!.startYear;

            // Check if periods overlap or are adjacent
            if (nextStart <= currentEnd + 1) {
                // Merge: extend current end to next end
                const nextEnd = next.parsed!.endYear;
                if (nextEnd === null || (currentEnd !== 9999 && nextEnd > currentEnd)) {
                    current.parsed!.endYear = nextEnd;
                    current.parsed!.isOngoing = next.parsed!.isOngoing;
                }
                if (next.timeline.context) {
                    contexts.push(next.timeline.context);
                }
            } else {
                // No overlap: add current and start new
                const period = current.parsed!.endYear === null
                    ? `${current.parsed!.startYear} - Present`
                    : `${current.parsed!.startYear} - ${current.parsed!.endYear}`;

                merged.push({
                    id: current.timeline.id,
                    skillName,
                    period,
                    context: contexts.length > 0 ? contexts.join(', ') : undefined
                });

                current = next;
                contexts.length = 0;
                if (current.timeline.context) {
                    contexts.push(current.timeline.context);
                }
            }
        }

        // Add the last merged timeline
        const period = current.parsed!.endYear === null
            ? `${current.parsed!.startYear} - Present`
            : `${current.parsed!.startYear} - ${current.parsed!.endYear}`;

        merged.push({
            id: current.timeline.id,
            skillName,
            period,
            context: contexts.length > 0 ? contexts.join(', ') : undefined
        });
    }

    return merged;
}

/**
 * Validate skill timeline data
 * Checks for common issues in skill timeline data
 * 
 * @param timelines - Array of skill timelines to validate
 * @returns Validation result with any issues found
 */
export function validateSkillTimelines(timelines: SkillTimeline[]): {
    valid: boolean;
    errors: string[];
    warnings: string[];
} {
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const timeline of timelines) {
        // Check required fields
        if (!timeline.skillName || timeline.skillName.trim() === '') {
            errors.push(`Timeline ${timeline.id}: Missing skill name`);
        }

        if (!timeline.period || timeline.period.trim() === '') {
            errors.push(`Timeline ${timeline.id}: Missing period`);
        }

        // Check period is parseable
        const parsed = parsePeriod(timeline.period);
        if (!parsed) {
            errors.push(`Timeline ${timeline.id}: Invalid period format "${timeline.period}"`);
        }

        // Check for future dates
        const currentYear = new Date().getFullYear();
        if (parsed && parsed.endYear && parsed.endYear > currentYear + 1) {
            warnings.push(`Timeline ${timeline.id}: End year ${parsed.endYear} is in the future`);
        }

        // Check for very old dates
        if (parsed && parsed.startYear < 1970) {
            warnings.push(`Timeline ${timeline.id}: Start year ${parsed.startYear} seems unusually old`);
        }

        // Check for inverted dates
        if (parsed && parsed.endYear && parsed.startYear > parsed.endYear) {
            errors.push(`Timeline ${timeline.id}: Start year ${parsed.startYear} is after end year ${parsed.endYear}`);
        }
    }

    return {
        valid: errors.length === 0,
        errors,
        warnings
    };
}

/**
 * Detect and insert gap items into a timeline
 * Identifies periods between timeline items where there are gaps and adds visual indicators
 * 
 * @param items - Array of timeline items (must have startYear and endYear)
 * @param minGapYears - Minimum gap in years to be considered significant (default: 0.5 years)
 * @returns Array with both original items and gap items, sorted chronologically
 */
export function insertGapsInTimeline<T extends { id: string; startYear: number; endYear: number | null; label: string }>(
    items: T[],
    minGapYears: number = 0.5
): Array<T | (T & { isGap: boolean })> {
    if (items.length === 0) return [];

    const currentYear = new Date().getFullYear();

    // Sort items by start year (earliest first)
    const sorted = [...items].sort((a, b) => a.startYear - b.startYear);

    const result: Array<T | (T & { isGap: boolean })> = [];

    for (let i = 0; i < sorted.length; i++) {
        const current = sorted[i];
        const currentEnd = current.endYear || currentYear;

        // Add the current item
        result.push(current);

        // Check if there's a next item to compare with
        if (i < sorted.length - 1) {
            const next = sorted[i + 1];
            const gapStart = currentEnd;
            const gapEnd = next.startYear;
            const gapDuration = gapEnd - gapStart;

            // If there's a significant gap, insert a gap item
            if (gapDuration >= minGapYears) {
                const gapItem = {
                    id: `gap-${current.id}-${next.id}`,
                    label: 'Gap',
                    startYear: gapStart,
                    endYear: gapEnd,
                    isGap: true
                } as T & { isGap: boolean };

                result.push(gapItem);
            }
        }
    }

    return result;
}
