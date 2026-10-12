import { parsePeriod, toSpan } from './dateParser';
import type { GapItem as CareerGap, ResumeData } from '../types';

/**
 * Deterministic career-gap detection run after resume generation. It finds
 * gaps between jobs (month-accurate, Japanese and English periods) and, when
 * the interview already explains a gap, records it with a reason — no AI call.
 */

type Locale = 'en' | 'ja';
type ReasonKey = 'jobSearch' | 'freelance' | 'personal' | 'travel' | 'upskill' | 'relocation' | 'venture' | 'pandemic' | 'break' | 'generic';

const REASONS: Record<ReasonKey, Record<Locale, string>> = {
    jobSearch: { en: 'Job search and career transition', ja: '転職活動' },
    freelance: { en: 'Freelance/contract work', ja: 'フリーランス・業務委託' },
    personal: { en: 'Personal/family matters', ja: '家庭の事情・療養' },
    travel: { en: 'Travel and personal development', ja: '旅行・自己研鑽' },
    upskill: { en: 'Professional development and upskilling', ja: '資格取得・スキルアップ' },
    relocation: { en: 'Relocation', ja: '転居' },
    venture: { en: 'Entrepreneurial venture', ja: '起業' },
    pandemic: { en: 'Career transition during pandemic', ja: 'コロナ禍でのキャリア転換' },
    break: { en: 'Career break', ja: 'キャリアブレイク' },
    generic: { en: 'Career transition (explained in interview)', ja: 'キャリアの転換期（インタビューで説明済み）' },
};

// First match wins, so order matters (same order as the original heuristic).
const REASON_PATTERNS: [RegExp, ReasonKey][] = [
    [/(job search|looking for|finding|searching for work|search mode|転職活動|求職)/i, 'jobSearch'],
    [/(freelanc|contract|consulting|independent|own work|side project|フリーランス|業務委託|個人事業)/i, 'freelance'],
    [/(personal|family|health|medical|care|sabbatical|personal time|介護|育児|出産|療養|病気|家族|体調)/i, 'personal'],
    [/(travel|abroad|overseas|explore|trip|旅行|海外)/i, 'travel'],
    [/(upskill|learn|stud|course|training|certif|educat|school|university|degree|資格|勉強|学校|大学|研修|スクール|留学)/i, 'upskill'],
    [/(relocation|relocating|moving|moved|shift|new city|引っ越し|転居|移住)/i, 'relocation'],
    [/(startup|own business|entrepreneur|venture|launch|起業|創業)/i, 'venture'],
    [/(pandemic|covid|lockdown|コロナ)/i, 'pandemic'],
    [/(taking (time|break)|needed (time|break)|took (time|break)|休職|休養|ブランク)/i, 'break'],
];

const GENERIC_DISCUSSION = [
    /(i was|i did|during (that|this) (time|period|gap))/i,
    /(between jobs|career break|time off|break in|employment gap)/i,
    /(空白|ブランク|離職|退職後|その間|期間中)/,
];

const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function escapeRegExp(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Month label for an instant expressed as a fractional year at the start of a month. */
function monthLabel(fraction: number, locale: Locale): string {
    const abs = Math.round(fraction * 12);
    const year = Math.floor(abs / 12);
    const month = (abs % 12) + 1;
    return locale === 'ja' ? `${year}年${month}月` : `${MONTHS_EN[month - 1]} ${year}`;
}

export interface TimelineGap {
    /** Fractional year at the start of the first gap month. */
    start: number;
    /** Fractional year at the start of the next role (exclusive end). */
    end: number;
    before: string;
    after: string;
}

/**
 * Gaps of at least `minDays` between roles. Overlapping roles count as covered,
 * and nothing after an ongoing role is a gap. Unparseable periods are ignored.
 */
export function findTimelineGaps(items: { label: string; period: string }[], minDays: number): TimelineGap[] {
    const spans = items
        .map(i => ({ label: i.label, parsed: parsePeriod(i.period) }))
        .filter((i): i is { label: string; parsed: NonNullable<ReturnType<typeof parsePeriod>> } => !!i.parsed)
        .map(i => ({ label: i.label, ...toSpan(i.parsed), ongoing: i.parsed.isOngoing }))
        .sort((a, b) => a.start - b.start);

    const gaps: TimelineGap[] = [];
    let covered: { end: number; label: string; ongoing: boolean } | null = null;
    for (const s of spans) {
        if (covered && !covered.ongoing && (s.start - covered.end) * 365.25 >= minDays) {
            gaps.push({ start: covered.end, end: s.start, before: covered.label, after: s.label });
        }
        if (!covered || s.ongoing || (!covered.ongoing && s.end > covered.end)) {
            covered = { end: s.end, label: s.label, ongoing: s.ongoing };
        }
        if (covered.ongoing) break;
    }
    return gaps;
}

function overlaps(a: { start: number; end: number }, b: { start: number; end: number }): boolean {
    return a.start < b.end && b.start < a.end;
}

/**
 * Gaps the interview already explains, ready to append to `data.careerGaps`.
 * Gaps the model already listed are skipped. Unexplained gaps are not added,
 * matching the previous behaviour (the model reports those itself).
 */
export function explainedGaps(data: ResumeData, conversation: string, minDays: number, locale: string = 'en'): CareerGap[] {
    const loc: Locale = locale === 'ja' ? 'ja' : 'en';
    const work = data.workExperience?.length
        ? data.workExperience.map(w => ({ label: w.company, period: w.period }))
        : (data.timeline || []).filter(t => t.type === 'work').map(t => ({ label: t.organization, period: t.period }));
    const education = data.education?.length
        ? data.education.map(e => ({ degree: e.degree, institution: e.institution, period: e.period }))
        : (data.timeline || []).filter(t => t.type === 'education').map(t => ({ degree: t.role, institution: t.organization, period: t.period }));

    const existing = (data.careerGaps || [])
        .map(g => parsePeriod(g.period))
        .filter((p): p is NonNullable<typeof p> => !!p)
        .map(p => toSpan(p));
    const text = conversation.toLowerCase();
    const sep = loc === 'ja' ? '～' : ' – ';
    const out: CareerGap[] = [];

    for (const gap of findTimelineGaps(work, minDays)) {
        if (existing.some(e => overlaps(e, gap))) continue;
        const period = `${monthLabel(gap.start, loc)}${sep}${monthLabel(gap.end - 1 / 12, loc)}`;

        const study = education.find(e => {
            const p = parsePeriod(e.period);
            return !!p && overlaps(toSpan(p), gap);
        });
        if (study) {
            out.push({
                period,
                reason: loc === 'ja' ? `${study.institution}にて${study.degree}を履修` : `Pursuing ${study.degree} at ${study.institution}`,
                isExplained: true,
            });
            continue;
        }

        const before = escapeRegExp(gap.before.toLowerCase());
        const after = escapeRegExp(gap.after.toLowerCase());
        const years = [Math.floor(gap.start), Math.floor(gap.end - 1 / 12)].map(String);
        const discussed =
            new RegExp(`(gap|between|after|leaving).*${before}.*${after}`, 'i').test(text) ||
            new RegExp(`(gap|between|after|leaving).*${after}.*${before}`, 'i').test(text) ||
            years.some(y => new RegExp(`(gap|during|in).*${y}`, 'i').test(text)) ||
            GENERIC_DISCUSSION.some(p => p.test(text));
        if (!discussed) continue;

        const key = REASON_PATTERNS.find(([p]) => p.test(text))?.[1] ?? 'generic';
        out.push({ period, reason: REASONS[key][loc], isExplained: true });
    }
    return out;
}
