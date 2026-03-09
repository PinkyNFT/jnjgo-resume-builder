import { ResumeData } from '../types';

export type TemplateCategory = 'agency' | 'profile';
export type ExportVariant = 'short' | 'standard' | 'long';

export interface ExportPlatform {
    id: string;
    name: string;
    category: TemplateCategory;
}

export const EXPORT_PLATFORMS: ExportPlatform[] = [
    { id: 'bizreach', name: 'BizReach', category: 'agency' },
    { id: 'linkedin', name: 'LinkedIn', category: 'profile' },
];

/**
 * Formats a single work experience entry into a standard text block.
 */
function formatExperience(exp: any, variant: ExportVariant): string {
    const header = `■ ${exp.company} | ${exp.position} (${exp.period})\n`;

    if (variant === 'short') {
        return header + exp.responsibilities.slice(0, 2).map((r: string) => `  - ${r}`).join('\n');
    }

    return header + exp.responsibilities.map((r: string) => `  - ${r}`).join('\n');
}

/**
 * Formats data specifically for typical agency forms (BizReach, etc.)
 * High focus on chronological experience and clear demarcations.
 */
function formatAgencyTemplate(data: ResumeData, variant: ExportVariant): string {
    let output = `【職務要約】\n${data.careerSummary || '記載なし'}\n\n`;

    if (data.skills && data.skills.length > 0) {
        output += `【コアスキル】\n${data.skills.join(', ')}\n\n`;
    }

    output += `【職務経歴詳細】\n`;
    if (data.workExperience && data.workExperience.length > 0) {
        output += data.workExperience.map(exp => formatExperience(exp, variant)).join('\n\n');
    } else {
        output += '記載なし';
    }

    if (variant === 'long' && data.education && data.education.length > 0) {
        output += `\n\n【学歴】\n`;
        output += data.education.map(edu => `${edu.period}: ${edu.institution} ${edu.degree}`).join('\n');
    }

    return output;
}

/**
 * Formats data for public profiles (LinkedIn, etc.)
 * More conversational, focuses on summary and skills first.
 */
function formatProfileTemplate(data: ResumeData, variant: ExportVariant): string {
    let output = `[ 概要 ]\n${data.careerSummary || ''}\n\n`;

    if (data.skills && data.skills.length > 0) {
        output += `[ 専門スキル ]\n${data.skills.join(' | ')}\n\n`;
    }

    output += `[ 経験 ]\n`;
    if (data.workExperience && data.workExperience.length > 0) {
        output += data.workExperience.map(exp => formatExperience(exp, variant)).join('\n\n');
    }

    return output;
}

/**
 * Main switchboard function to generate the appropriate format.
 */
export function generateExportText(data: ResumeData | undefined, category: TemplateCategory, variant: ExportVariant): string {
    if (!data) return '';

    switch (category) {
        case 'agency':
            return formatAgencyTemplate(data, variant);
        case 'profile':
            return formatProfileTemplate(data, variant);
        default:
            return formatAgencyTemplate(data, variant);
    }
}
