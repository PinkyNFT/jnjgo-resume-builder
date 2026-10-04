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
    startMonth?: number; // 1-12, when the period specifies a month
    endMonth?: number; // 1-12, when the period specifies a month
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
    '在籍中',
    'currently',
    'enrolled'
];

/**
 * Range separators: hyphen/en/em dashes and other dash look-alikes, ASCII and
 * full-width/wave tildes (common in Japanese: "2015年4月～2018年3月"), "|" and "to".
 */
const RANGE_SEPARATORS = /[–—―‒‐−\-~～〜|]|\s+to\s+/i;

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
 * Extract a month (1-12) from a single date fragment, when present.
 * Handles English month names ("July", "Jul"), Japanese ("7月"),
 * and numeric forms ("07/2015", "2015/07", "2015.07").
 * Returns undefined when no month can be determined.
 */
function extractMonth(text: string): number | undefined {
    const lower = text.toLowerCase();

    // English month names (reuse MONTH_MAP)
    const nameMatch = lower.match(/\b(jan(uary)?|feb(ruary)?|mar(ch)?|apr(il)?|may|jun(e)?|jul(y)?|aug(ust)?|sep(t|tember)?|oct(ober)?|nov(ember)?|dec(ember)?)\b/);
    if (nameMatch) {
        const m = MONTH_MAP[nameMatch[1]];
        if (m) return m;
    }

    // Japanese "7月"
    const jpMatch = text.match(/(\d{1,2})\s*月/);
    if (jpMatch) {
        const m = parseInt(jpMatch[1], 10);
        if (m >= 1 && m <= 12) return m;
    }

    // Numeric MM/YYYY or MM.YYYY (month before a 4-digit year)
    const mmYyyy = text.match(/\b(\d{1,2})[\/.](19|20)\d{2}\b/);
    if (mmYyyy) {
        const m = parseInt(mmYyyy[1], 10);
        if (m >= 1 && m <= 12) return m;
    }

    // Numeric YYYY/MM or YYYY.MM (month after a 4-digit year)
    const yyyyMm = text.match(/\b(19|20)\d{2}[\/.](\d{1,2})\b/);
    if (yyyyMm) {
        const m = parseInt(yyyyMm[2], 10);
        if (m >= 1 && m <= 12) return m;
    }

    return undefined;
}

/**
 * Convert a start point (year + optional month) to a fractional year.
 * A known month maps to the *start* of that month: Jan -> +0, Dec -> +11/12.
 * Missing month -> start of the year (+0), preserving year-only behavior.
 */
export function toStartFraction(startYear: number, startMonth?: number): number {
    return startYear + (startMonth ? (startMonth - 1) / 12 : 0);
}

/**
 * Convert an end point (year + optional month) to a fractional year.
 * A known month maps to the *end* of that month: Jul -> +7/12.
 * Missing month -> the year boundary (+0), preserving year-only behavior.
 * Ongoing (endYear null) resolves to `now` (defaults to the end of the current
 * month, so "Present" includes this month just like any other end month).
 */
export function toEndFraction(endYear: number | null, endMonth?: number, now?: number): number {
    if (endYear == null) {
        if (now != null) return now;
        const d = new Date();
        return d.getFullYear() + (d.getMonth() + 1) / 12;
    }
    return endYear + (endMonth ? endMonth / 12 : 0);
}

/**
 * Month-accurate [start, end] of a period as fractional years, for drawing bars.
 * A year-only end that doesn't fall after the start ("2012", "2012 – 2012",
 * "Jul 2012 – 2012") extends to the end of that year so the bar is never
 * zero- or negative-width.
 */
export function toSpan(
    p: { startYear: number; startMonth?: number; endYear: number | null; endMonth?: number },
    now?: number
): { start: number; end: number } {
    const start = toStartFraction(p.startYear, p.startMonth);
    let end = toEndFraction(p.endYear, p.endMonth, now);
    if (p.endYear != null && !p.endMonth && end <= start) end = p.endYear + 1;
    return { start, end };
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

    // Rewrite ISO-style "2015-04" as "2015/04" so its hyphen isn't taken as a
    // range separator (only when the part after the hyphen is a valid month).
    const normalized = period.trim().replace(
        /\b((?:19|20)\d{2})-(\d{1,2})(?!\d)/g,
        (match, y: string, m: string) => (+m >= 1 && +m <= 12 ? `${y}/${m}` : match)
    );

    const parts = normalized.split(RANGE_SEPARATORS).map(p => p.trim());

    if (parts.length === 0) {
        return null;
    }

    // Extract start year from first part
    const startYear = extractYear(parts[0]);
    if (!startYear) {
        return null;
    }
    const startMonth = extractMonth(parts[0]);

    // Single part (just a year or "Month YYYY")
    if (parts.length === 1) {
        return {
            startYear,
            endYear: startYear,
            isOngoing: false,
            startMonth,
            // A lone "Month YYYY" represents that single month
            endMonth: startMonth
        };
    }

    // Multiple parts - check second part for end year or "present"
    const secondPart = parts[1];

    if (isPresent(secondPart)) {
        return {
            startYear,
            endYear: null,
            isOngoing: true,
            startMonth
        };
    }

    const endYear = extractYear(secondPart);
    if (!endYear) {
        // If we can't extract end year but have start year, assume it's ongoing
        return {
            startYear,
            endYear: null,
            isOngoing: true,
            startMonth
        };
    }

    return {
        startYear,
        endYear,
        isOngoing: false,
        startMonth,
        endMonth: extractMonth(secondPart)
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
