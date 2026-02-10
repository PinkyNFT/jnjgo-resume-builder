/**
 * Date parsing utilities for timeline visualization
 * Handles various date formats commonly found in resumes:
 * - "April 2015 – March 2021"
 * - "2021 - Present"
 * - "Oct 2023 – Jan 2024"
 * - "2008-2012"
 * - "2018-2020 (2 years)"
 */

/**
 * Represents a parsed date range
 */
export interface ParsedDateRange {
    startYear: number;
    endYear: number | null; // null means "Present" or ongoing
    isOngoing: boolean;
}

/**
 * Common patterns that indicate an ongoing/current position
 */
const PRESENT_PATTERNS = [
    'present',
    'current',
    'now',
    '現在',
    '在職中',
    'currently',
    'enrolled'
];

/**
 * Month name to number mapping
 */
const MONTH_MAP: Record<string, number> = {
    'jan': 1, 'january': 1,
    'feb': 2, 'february': 2,
    'mar': 3, 'march': 3,
    'apr': 4, 'april': 4,
    'may': 5,
    'jun': 6, 'june': 6,
    'jul': 7, 'july': 7,
    'aug': 8, 'august': 8,
    'sep': 9, 'sept': 9, 'september': 9,
    'oct': 10, 'october': 10,
    'nov': 11, 'november': 11,
    'dec': 12, 'december': 12
};

/**
 * Extract a year from a string
 * Looks for 4-digit years (e.g., 2015, 2024)
 */
function extractYear(text: string): number | null {
    const yearMatch = text.match(/\b(19|20)\d{2}\b/);
    return yearMatch ? parseInt(yearMatch[0], 10) : null;
}

/**
 * Check if text indicates a present/ongoing position
 */
function isPresent(text: string): boolean {
    const normalized = text.toLowerCase().trim();
    return PRESENT_PATTERNS.some(pattern => normalized.includes(pattern));
}

/**
 * Parse a period string into start and end years
 * 
 * Examples:
 * - "April 2015 – March 2021" -> { startYear: 2015, endYear: 2021, isOngoing: false }
 * - "2021 - Present" -> { startYear: 2021, endYear: null, isOngoing: true }
 * - "Oct 2023 – Jan 2024 (3 months)" -> { startYear: 2023, endYear: 2024, isOngoing: false }
 * - "2008" -> { startYear: 2008, endYear: 2008, isOngoing: false }
 * 
 * @param period - The period string to parse
 * @returns Parsed date range or null if parsing fails
 */
export function parsePeriod(period: string): ParsedDateRange | null {
    if (!period || typeof period !== 'string') {
        return null;
    }

    const normalized = period.trim();

    // Split on common separators: – (en dash), - (hyphen), ~, to, |
    const separators = /[–\-~|]|\s+to\s+/i;
    const parts = normalized.split(separators).map(p => p.trim());

    if (parts.length === 0) {
        return null;
    }

    // Extract start year from first part
    const startYear = extractYear(parts[0]);
    if (!startYear) {
        return null;
    }

    // Single part (just a year or "YYYY (X years)")
    if (parts.length === 1) {
        return {
            startYear,
            endYear: startYear,
            isOngoing: false
        };
    }

    // Multiple parts - check second part for end year or "present"
    const secondPart = parts[1];

    if (isPresent(secondPart)) {
        return {
            startYear,
            endYear: null,
            isOngoing: true
        };
    }

    const endYear = extractYear(secondPart);
    if (!endYear) {
        // If we can't extract end year but have start year, assume it's ongoing
        return {
            startYear,
            endYear: null,
            isOngoing: true
        };
    }

    return {
        startYear,
        endYear,
        isOngoing: false
    };
}

/**
 * Calculate duration in years between two years
 * 
 * @param startYear - Start year
 * @param endYear - End year (null for ongoing)
 * @returns Duration in years (decimal)
 */
export function calculateDuration(startYear: number, endYear: number | null): number {
    const end = endYear || new Date().getFullYear();
    return Math.max(0, end - startYear);
}

/**
 * Format a duration as a human-readable string
 * 
 * @param years - Duration in years
 * @returns Formatted string (e.g., "3 years", "1.5 years")
 */
export function formatDuration(years: number): string {
    if (years < 1) {
        return '< 1 year';
    }

    const rounded = Math.round(years * 10) / 10;
    return `${rounded} ${rounded === 1 ? 'year' : 'years'}`;
}

/**
 * Validate that date ranges are in chronological order
 * 
 * @param ranges - Array of parsed date ranges
 * @returns true if valid, false otherwise
 */
export function validateChronology(ranges: ParsedDateRange[]): boolean {
    for (let i = 1; i < ranges.length; i++) {
        const prev = ranges[i - 1];
        const curr = ranges[i];

        // Current should start after or at the same time as previous
        if (curr.startYear < prev.startYear) {
            return false;
        }
    }

    return true;
}
