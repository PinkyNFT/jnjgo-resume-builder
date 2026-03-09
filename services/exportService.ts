/**
 * Export Formatting Service
 *
 * Transforms ResumeData into platform-specific plain-text output
 * that can be directly copied and pasted into each target platform.
 */

import { ResumeData, WorkExperience, Education, RepresentativeProject } from '../types';
import {
    PlatformId,
    PLATFORM_CONFIGS,
    PlatformConfig,
    ExportVariant,
    VariantRules,
    DEFAULT_VARIANT_RULES,
    getVariantRules,
} from '../config/exportPlatforms';

// ─── Helpers ───────────────────────────────────────────────

function truncate(text: string, maxLength: number): string {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength - 3) + '...';
}

function bulletList(items: string[], bullet = '・', limit?: number): string {
    const capped = limit ? items.filter(Boolean).slice(0, limit) : items.filter(Boolean);
    return capped.map(item => `${bullet} ${item}`).join('\n');
}

function dashList(items: string[], limit?: number): string {
    const capped = limit ? items.filter(Boolean).slice(0, limit) : items.filter(Boolean);
    return capped.map(item => `- ${item}`).join('\n');
}

function divider(): string {
    return '─'.repeat(40);
}

function section(heading: string, content: string): string {
    if (!content.trim()) return '';
    return `\n【${heading}】\n${content}\n`;
}

function sectionPlain(heading: string, content: string): string {
    if (!content.trim()) return '';
    return `\n## ${heading}\n\n${content}\n`;
}

/**
 * Format work experience in Japanese style (職務経歴書)
 */
function formatWorkJa(experiences: WorkExperience[], reverseChron: boolean, bulletLimit?: number): string {
    const sorted = reverseChron ? [...experiences].reverse() : experiences;
    return sorted.map(work => {
        const responsibilities = work.responsibilities?.length
            ? '\n' + bulletList(work.responsibilities, '・', bulletLimit)
            : '';
        return `■ ${work.company}\n${work.position}　（${work.period}）${responsibilities}`;
    }).join('\n\n');
}

/**
 * Format work experience in English style
 */
function formatWorkEn(experiences: WorkExperience[], reverseChron: boolean, bulletLimit?: number): string {
    const sorted = reverseChron ? [...experiences].reverse() : experiences;
    return sorted.map(work => {
        const responsibilities = work.responsibilities?.length
            ? '\n' + dashList(work.responsibilities, bulletLimit)
            : '';
        return `${work.position}\n${work.company} | ${work.period}${responsibilities}`;
    }).join('\n\n');
}

/**
 * Format representative projects (Japanese)
 */
function formatProjectsJa(projects: RepresentativeProject[]): string {
    return projects.map(proj => {
        const lines: string[] = [
            `■ ${proj.title}`,
            `期間: ${proj.period}`,
        ];
        if (proj.role) lines.push(`役割: ${proj.role}`);
        if (proj.teamStructure) lines.push(`体制: ${proj.teamStructure}`);
        if (proj.context) lines.push(`背景: ${proj.context}`);
        if (proj.contribution) lines.push(`貢献: ${proj.contribution}`);
        if (proj.challenges) lines.push(`課題: ${proj.challenges}`);
        return lines.join('\n');
    }).join('\n\n');
}

/**
 * Format representative projects (English)
 */
function formatProjectsEn(projects: RepresentativeProject[]): string {
    return projects.map(proj => {
        const lines: string[] = [
            `${proj.title}`,
            `Period: ${proj.period}`,
        ];
        if (proj.role) lines.push(`Role: ${proj.role}`);
        if (proj.teamStructure) lines.push(`Team: ${proj.teamStructure}`);
        if (proj.context) lines.push(`Context: ${proj.context}`);
        if (proj.contribution) lines.push(`Key Contributions: ${proj.contribution}`);
        if (proj.challenges) lines.push(`Challenges: ${proj.challenges}`);
        return lines.join('\n');
    }).join('\n\n');
}

/**
 * Format education (Japanese)
 */
function formatEducationJa(education: Education[]): string {
    return education.map(edu => {
        const notes = edu.notes ? `（${edu.notes}）` : '';
        return `${edu.institution}　${edu.degree}　${edu.period}${notes}`;
    }).join('\n');
}

/**
 * Format education (English)
 */
function formatEducationEn(education: Education[]): string {
    return education.map(edu => {
        const notes = edu.notes ? ` — ${edu.notes}` : '';
        return `${edu.degree}\n${edu.institution} | ${edu.period}${notes}`;
    }).join('\n\n');
}

/**
 * Build a Self-PR section from career summary + key achievements
 */
function buildSelfPR(data: ResumeData, maxLength: number): string {
    const parts: string[] = [];
    if (data.careerSummary) {
        parts.push(data.careerSummary);
    }
    if (data.careerOverview.areasOfExpertise?.length) {
        parts.push(`専門分野: ${data.careerOverview.areasOfExpertise.join('、')}`);
    }
    if (data.careerOverview.totalExperience) {
        parts.push(`総経験: ${data.careerOverview.totalExperience}`);
    }
    return truncate(parts.join('\n\n'), maxLength);
}

/**
 * Build a LinkedIn headline from name + current role
 */
function buildLinkedInHeadline(data: ResumeData, maxLen: number): string {
    const parts: string[] = [];
    if (data.currentRole) parts.push(data.currentRole);
    if (data.careerOverview.areasOfExpertise?.length) {
        parts.push(data.careerOverview.areasOfExpertise.slice(0, 3).join(' | '));
    }
    return truncate(parts.join(' — '), maxLen);
}

// ─── Platform-Specific Formatters ──────────────────────────

function formatBizReach(data: ResumeData, config: PlatformConfig): string {
    const lines: string[] = [
        `${data.fullName}`,
        `${data.currentRole}`,
        divider(),
    ];

    // 職務要約
    lines.push(section('職務要約', truncate(data.careerSummary || '', config.maxSummaryLength)));

    // 職務経歴
    if (data.workExperience?.length) {
        lines.push(section('職務経歴', formatWorkJa(data.workExperience, config.reverseChronological)));
    }

    // スキル・資格
    const skillParts: string[] = [];
    if (data.skills?.length) skillParts.push(bulletList(data.skills));
    if (data.certifications?.length) {
        skillParts.push('\n資格:\n' + bulletList(data.certifications));
    }
    if (skillParts.length) {
        lines.push(section('スキル・資格', skillParts.join('\n')));
    }

    // 学歴
    if (data.education?.length) {
        lines.push(section('学歴', formatEducationJa(data.education)));
    }

    return lines.join('\n');
}

function formatLinkedIn(data: ResumeData, config: PlatformConfig): string {
    const lines: string[] = [];

    // Headline
    lines.push(sectionPlain('Headline', buildLinkedInHeadline(data, 220)));

    // About
    const about = [
        data.careerSummary || '',
        data.careerOverview.areasOfExpertise?.length
            ? `Areas of Expertise: ${data.careerOverview.areasOfExpertise.join(', ')}`
            : '',
        data.careerOverview.totalExperience
            ? `${data.careerOverview.totalExperience} of professional experience`
            : '',
    ].filter(Boolean).join('\n\n');
    lines.push(sectionPlain('About', truncate(about, 2600)));

    // Experience
    if (data.workExperience?.length) {
        lines.push(sectionPlain('Experience', formatWorkEn(data.workExperience, config.reverseChronological)));
    }

    // Skills
    if (data.skills?.length) {
        lines.push(sectionPlain('Skills', data.skills.join(' · ')));
    }

    // Education
    if (data.education?.length) {
        lines.push(sectionPlain('Education', formatEducationEn(data.education)));
    }

    return lines.join('\n');
}



// ─── Main Export Function ──────────────────────────────────

// ─── Link Injection ────────────────────────────────────────

export interface LinkInjectionOptions {
    enabled: boolean;
    candidateSlug?: string;   // e.g. "abc123" → /c/abc123
    baseUrl?: string;         // e.g. "https://jnjgo.app"
}

/**
 * Build the JNJGO detail link line for injection into exported text.
 * Per spec 3.3: natural single line, not ad-like, emphasizes recruiter benefit.
 */
function buildLinkLine(
    platformId: PlatformId,
    linkOpts: LinkInjectionOptions,
    locale: 'ja' | 'en' | 'both',
): string {
    if (!linkOpts.enabled || !linkOpts.candidateSlug) return '';
    const base = linkOpts.baseUrl || 'https://jnjgo.app';
    const url = `${base}/c/${linkOpts.candidateSlug}?ref=export&site=${platformId}&utm_campaign=export&utm_medium=copy`;
    if (locale === 'en') {
        return `\n---\nPreferences, conditions & availability (private): ${url}`;
    }
    return `\n---\n希望条件・転職意向の詳細（非公開情報）: ${url}`;
}

// ─── Section-level types ───────────────────────────────────

export interface ExportSection {
    key: string;          // unique section identifier
    heading: string;      // display heading
    content: string;      // the text to copy
    charCount: number;
    maxLength?: number;   // platform character limit for this field
    recommendedLength?: number; // recommended length (shown as guidance)
    hintKey?: string;     // i18n key for section-specific instruction
}

/** Options passed to formatForPlatform */
export interface ExportOptions {
    variant?: ExportVariant;
    linkInjection?: LinkInjectionOptions;
}

export interface ExportResult {
    platformId: PlatformId;
    variant: ExportVariant;
    formattedText: string;     // full concatenated output (backward compat)
    sections: ExportSection[]; // individual copyable sections
    charCount: number;
    sectionCount: number;
    linkIncluded: boolean;
}

// ─── Section-aware Formatters ──────────────────────────────

type SectionFormatter = (data: ResumeData, config: PlatformConfig, rules: VariantRules) => ExportSection[];

/**
 * Wrap a legacy full-text formatter into the section-based interface.
 * Produces a single section containing the full output.
 */
function legacySections(
    formatter: (data: ResumeData, config: PlatformConfig) => string,
    data: ResumeData,
    config: PlatformConfig,
): ExportSection[] {
    const text = formatter(data, config).trim();
    return [{
        key: 'full',
        heading: 'Full Output',
        content: text,
        charCount: text.length,
    }];
}

// ─── BizReach Section Formatter ────────────────────────────

/**
 * BizReach-specific formatter.
 *
 * BizReach has a single 「職務要約」 textarea (recommended ~400 chars)
 * plus separate skill tag inputs. The narrative should:
 *  - Flow chronologically in paragraph form
 *  - Embed numbered markers (1)(2)(3)… for key competencies
 *  - Be objective, fact-based, with concrete numbers
 * A separate "Skills entered" list maps the numbers to competency labels.
 */
function formatBizReachSections(data: ResumeData, config: PlatformConfig, rules: VariantRules): ExportSection[] {
    const sections: ExportSection[] = [];

    // ── 1. Build the narrative job summary ─────────────────
    // Use careerSummary as the base narrative. If it doesn't exist, build
    // a chronological paragraph from work experience.
    let narrative = '';

    if (data.careerSummary) {
        narrative = data.careerSummary;
    } else if (data.workExperience?.length) {
        // Build a chronological narrative from work entries
        const sorted = config.reverseChronological
            ? [...data.workExperience].reverse()
            : data.workExperience;
        narrative = sorted.map(w => {
            const resp = w.responsibilities?.length
                ? w.responsibilities.slice(0, 2).join('、')
                : '';
            return `${w.company}にて${w.position}として${w.period}従事。${resp ? resp + '。' : ''}`;
        }).join('');
    }

    // ── 2. Extract top skills and build numbered mappings ──
    const topSkills = (data.skills || []).slice(0, 6);
    const skillMap = topSkills.map((skill, i) => ({
        number: i + 1,
        label: skill,
    }));

    // Try to embed numbered skill references into the narrative:
    // Look for skill-related keywords in the narrative and tag them.
    let taggedNarrative = narrative;
    let taggedCount = 0;
    for (const entry of skillMap) {
        // Check if the skill name (or a significant keyword from it) appears
        // in the narrative. If so, tag the first occurrence.
        const keywords = entry.label
            .split(/[\s/・,、/()（）]+/)
            .filter(k => k.length >= 2);
        let tagged = false;
        for (const kw of keywords) {
            const idx = taggedNarrative.indexOf(kw);
            if (idx !== -1 && !tagged) {
                // Insert the number marker just before the keyword
                taggedNarrative =
                    taggedNarrative.slice(0, idx) +
                    `(${entry.number}) ` +
                    taggedNarrative.slice(idx);
                tagged = true;
                taggedCount++;
                break;
            }
        }
    }

    // If few/no tags were embedded, append a summary note listing them
    if (taggedCount < Math.min(2, skillMap.length) && skillMap.length > 0) {
        const summaryNote = skillMap
            .map(e => `(${e.number})${e.label}`)
            .join('、');
        taggedNarrative = taggedNarrative.trimEnd();
        if (!taggedNarrative.endsWith('。')) taggedNarrative += '。';
        taggedNarrative += `\n\n主なスキル: ${summaryNote}`;
    }

    sections.push({
        key: 'jobSummary',
        heading: '職務要約',
        content: truncate(taggedNarrative.trim(), rules.maxCharsPerSection),
        charCount: truncate(taggedNarrative.trim(), rules.maxCharsPerSection).length,
        maxLength: 2000,
        recommendedLength: rules.tone === 'concise' ? 300 : 400,
        hintKey: 'bizreachJobSummaryHint',
    });

    // ── 3. Skills entered section ─────────────────────────
    if (skillMap.length > 0) {
        const skillText = skillMap
            .map(e => `(${e.number}) ${e.label}`)
            .join('\n');
        sections.push({
            key: 'skillTags',
            heading: 'スキル入力',
            content: skillText,
            charCount: skillText.length,
            hintKey: 'bizreachSkillTagsHint',
        });
    }

    // ── 4. Optional: work history for company-level entries ──
    if (data.workExperience?.length && rules.includeOptionalSections) {
        const workText = formatWorkJa(data.workExperience, config.reverseChronological, rules.bulletLimit);
        sections.push({
            key: 'workHistory',
            heading: '職務経歴（各社入力用）',
            content: truncate(workText, rules.maxCharsPerSection),
            charCount: truncate(workText, rules.maxCharsPerSection).length,
            hintKey: 'bizreachWorkHistoryHint',
        });
    }

    return sections;
}

// ─── Formatter registry ────────────────────────────────────

const SECTION_FORMATTERS: Partial<Record<PlatformId, SectionFormatter>> = {
    bizreach: formatBizReachSections,
};

const LEGACY_FORMATTERS: Record<PlatformId, (data: ResumeData, config: PlatformConfig) => string> = {
    bizreach: formatBizReach,   // kept as fallback / not used when section formatter exists
    linkedin: formatLinkedIn,
};

/**
 * Format resume data for a specific platform.
 * Supports variant (short/standard/long) and optional link injection.
 */
export function formatForPlatform(
    data: ResumeData,
    platformId: PlatformId,
    options: ExportOptions = {},
): ExportResult {
    const config = PLATFORM_CONFIGS[platformId];
    if (!config) throw new Error(`Unknown platform: ${platformId}`);

    const variant = options.variant || 'standard';
    const rules = getVariantRules(platformId, variant);

    // Prefer section-aware formatter, fall back to legacy wrapper
    const sectionFormatter = SECTION_FORMATTERS[platformId];
    let sections: ExportSection[];

    if (sectionFormatter) {
        sections = sectionFormatter(data, config, rules);
    } else {
        const legacyFn = LEGACY_FORMATTERS[platformId];
        if (!legacyFn) throw new Error(`No formatter for platform: ${platformId}`);
        sections = legacySections(legacyFn, data, config);
    }

    // Apply per-section maxLength truncation only (variant length is handled by AI rewrite)
    sections = sections.map(s => {
        if (s.maxLength) {
            const truncated = truncate(s.content, s.maxLength);
            return { ...s, content: truncated, charCount: truncated.length };
        }
        return s;
    });

    // Build full text
    let formattedText = sections.map(s => {
        if (sections.length === 1) return s.content;
        return `【${s.heading}】\n${s.content}`;
    }).join('\n\n');

    // Link injection (per spec 3.3)
    let linkIncluded = false;
    const linkOpts = options.linkInjection;
    if (linkOpts?.enabled) {
        const linkLine = buildLinkLine(platformId, linkOpts, config.locale);
        if (linkLine) {
            formattedText += linkLine;
            linkIncluded = true;
        }
    }

    return {
        platformId,
        variant,
        formattedText,
        sections,
        charCount: formattedText.length,
        sectionCount: sections.length,
        linkIncluded,
    };
}

/**
 * Format resume data for all platforms (standard variant, no link).
 */
export function formatForAllPlatforms(data: ResumeData, options: ExportOptions = {}): ExportResult[] {
    return Object.keys(LEGACY_FORMATTERS).map(id =>
        formatForPlatform(data, id as PlatformId, options)
    );
}
