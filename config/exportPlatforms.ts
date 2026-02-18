/**
 * Export Platform Definitions
 *
 * Each platform has specific formatting requirements for resume content.
 * These configs drive the export template engine.
 *
 * Spec reference: Section 3.1 of Addendum v1.0
 */

// ─── Variant (Short / Standard / Long) ────────────────────
export type ExportVariant = 'short' | 'standard' | 'long';

export interface VariantRules {
    maxCharsPerSection: number;    // overall char budget for this variant
    bulletLimit: number;           // max bullets per responsibility list
    tone: 'concise' | 'standard' | 'detailed';
    includeOptionalSections: boolean; // whether to include non-required sections
}

/** Default rules per variant — platforms override where needed */
export const DEFAULT_VARIANT_RULES: Record<ExportVariant, VariantRules> = {
    short: {
        maxCharsPerSection: 500,
        bulletLimit: 3,
        tone: 'concise',
        includeOptionalSections: false,
    },
    standard: {
        maxCharsPerSection: 1500,
        bulletLimit: 6,
        tone: 'standard',
        includeOptionalSections: true,
    },
    long: {
        maxCharsPerSection: 3000,
        bulletLimit: 10,
        tone: 'detailed',
        includeOptionalSections: true,
    },
};

// ─── Link injection policy ─────────────────────────────────
export type LinkInjectionPolicy = 'optional' | 'default_on' | 'default_off';

// ─── Template category (per spec 3.1.4) ────────────────────
export type TemplateCategory = 'agency' | 'profile' | 'it_specialized';

export type PlatformId =
    | 'bizreach'
    | 'linkedin'
    | 'levtech'
    | 'geekly'
    | 'yourtrust'
    | 'green'
    | 'duda'
    | 'recruit_agent'
    | 'indeed';

export interface PlatformSection {
    key: string;
    heading: string;        // The heading text used on the platform
    maxLength?: number;      // Character limit (if applicable)
    required: boolean;
}

export interface PlatformConfig {
    id: PlatformId;
    nameKey: string;         // i18n key for display name
    descriptionKey: string;  // i18n key for short description
    url: string;             // Platform URL
    locale: 'ja' | 'en' | 'both';   // Primary locale
    maxSummaryLength: number;
    sections: PlatformSection[];
    /** Sections order — also defines the output order */
    sectionsOrder: string[];
    /** Whether the platform expects reverse-chronological order */
    reverseChronological: boolean;
    /** Icon color (tailwind) */
    color: string;
    /** Display category tag */
    category: 'executive' | 'engineer' | 'general' | 'freelance';
    /** Internal template category (A/B/C per spec 3.1.4) */
    templateCategory: TemplateCategory;
    /** Link injection policy per spec 3.1.3 */
    linkInjectionPolicy: LinkInjectionPolicy;
    /** Optional per-variant rule overrides */
    variantOverrides?: Partial<Record<ExportVariant, Partial<VariantRules>>>;
}

export const PLATFORM_CONFIGS: Record<PlatformId, PlatformConfig> = {
    bizreach: {
        id: 'bizreach',
        nameKey: 'platformBizReach',
        descriptionKey: 'platformBizReachDesc',
        url: 'https://www.bizreach.jp',
        locale: 'ja',
        maxSummaryLength: 2000,
        reverseChronological: true,
        color: 'bg-blue-600',
        category: 'executive',
        templateCategory: 'agency',
        linkInjectionPolicy: 'optional',
        sectionsOrder: ['summary', 'work', 'skills', 'education'],
        sections: [
            { key: 'summary', heading: '職務要約', maxLength: 2000, required: true },
            { key: 'work', heading: '職務経歴', required: true },
            { key: 'skills', heading: 'スキル・資格', required: true },
            { key: 'education', heading: '学歴', required: false },
        ],
        variantOverrides: {
            short: { maxCharsPerSection: 400, bulletLimit: 2 },
        },
    },
    linkedin: {
        id: 'linkedin',
        nameKey: 'platformLinkedIn',
        descriptionKey: 'platformLinkedInDesc',
        url: 'https://www.linkedin.com',
        locale: 'en',
        maxSummaryLength: 2600,
        reverseChronological: true,
        color: 'bg-sky-700',
        category: 'general',
        templateCategory: 'profile',
        linkInjectionPolicy: 'default_on',
        sectionsOrder: ['headline', 'about', 'experience', 'skills', 'education'],
        sections: [
            { key: 'headline', heading: 'Headline', maxLength: 220, required: true },
            { key: 'about', heading: 'About', maxLength: 2600, required: true },
            { key: 'experience', heading: 'Experience', required: true },
            { key: 'skills', heading: 'Skills', required: true },
            { key: 'education', heading: 'Education', required: false },
        ],
    },
    levtech: {
        id: 'levtech',
        nameKey: 'platformLevTech',
        descriptionKey: 'platformLevTechDesc',
        url: 'https://freelance.levtech.jp',
        locale: 'ja',
        maxSummaryLength: 1500,
        reverseChronological: true,
        color: 'bg-emerald-600',
        category: 'freelance',
        templateCategory: 'it_specialized',
        linkInjectionPolicy: 'optional',
        sectionsOrder: ['summary', 'techStack', 'projects', 'skills'],
        sections: [
            { key: 'summary', heading: 'スキル概要', maxLength: 1500, required: true },
            { key: 'techStack', heading: '技術スタック', required: true },
            { key: 'projects', heading: 'プロジェクト経歴', required: true },
            { key: 'skills', heading: '保有スキル', required: true },
        ],
    },
    geekly: {
        id: 'geekly',
        nameKey: 'platformGeekly',
        descriptionKey: 'platformGeeklyDesc',
        url: 'https://www.geekly.co.jp',
        locale: 'ja',
        maxSummaryLength: 1500,
        reverseChronological: true,
        color: 'bg-violet-600',
        category: 'engineer',
        templateCategory: 'it_specialized',
        linkInjectionPolicy: 'optional',
        sectionsOrder: ['summary', 'work', 'skills', 'achievements'],
        sections: [
            { key: 'summary', heading: '職務概要', maxLength: 1500, required: true },
            { key: 'work', heading: '職務経歴', required: true },
            { key: 'skills', heading: 'テクニカルスキル', required: true },
            { key: 'achievements', heading: '実績・成果', required: false },
        ],
    },
    yourtrust: {
        id: 'yourtrust',
        nameKey: 'platformYourTrust',
        descriptionKey: 'platformYourTrustDesc',
        url: 'https://your-trust.jp',
        locale: 'ja',
        maxSummaryLength: 2000,
        reverseChronological: true,
        color: 'bg-orange-600',
        category: 'general',
        templateCategory: 'it_specialized',
        linkInjectionPolicy: 'optional',
        sectionsOrder: ['summary', 'work', 'skills', 'education', 'selfPR'],
        sections: [
            { key: 'summary', heading: '職務要約', maxLength: 2000, required: true },
            { key: 'work', heading: '職務経歴詳細', required: true },
            { key: 'skills', heading: 'スキル', required: true },
            { key: 'education', heading: '学歴', required: false },
            { key: 'selfPR', heading: '自己PR', maxLength: 1000, required: false },
        ],
    },
    green: {
        id: 'green',
        nameKey: 'platformGreen',
        descriptionKey: 'platformGreenDesc',
        url: 'https://www.green-japan.com',
        locale: 'ja',
        maxSummaryLength: 1500,
        reverseChronological: true,
        color: 'bg-green-600',
        category: 'engineer',
        templateCategory: 'profile',
        linkInjectionPolicy: 'default_on',
        sectionsOrder: ['selfPR', 'work', 'skills'],
        sections: [
            { key: 'selfPR', heading: '自己PR', maxLength: 1500, required: true },
            { key: 'work', heading: '職務経歴', required: true },
            { key: 'skills', heading: 'スキル・経験', required: true },
        ],
    },
    duda: {
        id: 'duda',
        nameKey: 'platformDuda',
        descriptionKey: 'platformDudaDesc',
        url: 'https://duda.job',
        locale: 'ja',
        maxSummaryLength: 2000,
        reverseChronological: true,
        color: 'bg-rose-600',
        category: 'general',
        templateCategory: 'agency',
        linkInjectionPolicy: 'optional',
        sectionsOrder: ['summary', 'work', 'skills', 'education'],
        sections: [
            { key: 'summary', heading: '職務要約', maxLength: 2000, required: true },
            { key: 'work', heading: '職務経歴', required: true },
            { key: 'skills', heading: 'スキル・資格', required: true },
            { key: 'education', heading: '学歴', required: false },
        ],
    },
    recruit_agent: {
        id: 'recruit_agent',
        nameKey: 'platformRecruitAgent',
        descriptionKey: 'platformRecruitAgentDesc',
        url: 'https://www.r-agent.com',
        locale: 'ja',
        maxSummaryLength: 2000,
        reverseChronological: true,
        color: 'bg-red-600',
        category: 'general',
        templateCategory: 'agency',
        linkInjectionPolicy: 'optional',
        sectionsOrder: ['summary', 'work', 'projects', 'skills', 'education', 'selfPR'],
        sections: [
            { key: 'summary', heading: '職務要約', maxLength: 2000, required: true },
            { key: 'work', heading: '職務経歴', required: true },
            { key: 'projects', heading: '主なプロジェクト', required: false },
            { key: 'skills', heading: '活かせる経験・スキル', required: true },
            { key: 'education', heading: '学歴', required: false },
            { key: 'selfPR', heading: '自己PR', maxLength: 1000, required: false },
        ],
    },
    indeed: {
        id: 'indeed',
        nameKey: 'platformIndeed',
        descriptionKey: 'platformIndeedDesc',
        url: 'https://www.indeed.com',
        locale: 'en',
        maxSummaryLength: 2500,
        reverseChronological: true,
        color: 'bg-indigo-600',
        category: 'general',
        templateCategory: 'profile',
        linkInjectionPolicy: 'default_on',
        sectionsOrder: ['summary', 'experience', 'skills', 'education', 'certifications'],
        sections: [
            { key: 'summary', heading: 'Professional Summary', maxLength: 2500, required: true },
            { key: 'experience', heading: 'Work Experience', required: true },
            { key: 'skills', heading: 'Skills', required: true },
            { key: 'education', heading: 'Education', required: false },
            { key: 'certifications', heading: 'Certifications', required: false },
        ],
    },
};

export const PLATFORM_LIST: PlatformId[] = [
    'bizreach',
    'linkedin',
    'levtech',
    'geekly',
    'yourtrust',
    'green',
    'duda',
    'recruit_agent',
    'indeed',
];

/** Group platforms by category for display */
export const PLATFORM_CATEGORIES = {
    executive: ['bizreach'] as PlatformId[],
    engineer: ['geekly', 'green'] as PlatformId[],
    freelance: ['levtech'] as PlatformId[],
    general: ['linkedin', 'yourtrust', 'duda', 'recruit_agent', 'indeed'] as PlatformId[],
};

/** Internal template categories per spec 3.1.4 (shared template logic) */
export const TEMPLATE_CATEGORIES: Record<TemplateCategory, PlatformId[]> = {
    agency: ['bizreach', 'recruit_agent', 'duda'],           // A: Agency-like
    profile: ['linkedin', 'green', 'indeed'],                // B: Profile-like
    it_specialized: ['levtech', 'geekly', 'yourtrust'],      // C: IT-specialized
};

/** Variant labels for display */
export const VARIANT_LIST: ExportVariant[] = ['short', 'standard', 'long'];

/** Get resolved rules for a platform + variant */
export function getVariantRules(platformId: PlatformId, variant: ExportVariant): VariantRules {
    const config = PLATFORM_CONFIGS[platformId];
    const base = { ...DEFAULT_VARIANT_RULES[variant] };
    const overrides = config?.variantOverrides?.[variant];
    if (overrides) {
        return { ...base, ...overrides };
    }
    return base;
}
