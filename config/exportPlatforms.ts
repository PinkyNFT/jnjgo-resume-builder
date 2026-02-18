/**
 * Export Platform Definitions
 *
 * Each platform has specific formatting requirements for resume content.
 * These configs drive the export template engine.
 */

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
    /** Whether the platform expects reverse-chronological order */
    reverseChronological: boolean;
    /** Icon color (tailwind) */
    color: string;
    /** Short category tag */
    category: 'executive' | 'engineer' | 'general' | 'freelance';
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
        sections: [
            { key: 'summary', heading: '職務要約', maxLength: 2000, required: true },
            { key: 'work', heading: '職務経歴', required: true },
            { key: 'skills', heading: 'スキル・資格', required: true },
            { key: 'education', heading: '学歴', required: false },
        ],
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
