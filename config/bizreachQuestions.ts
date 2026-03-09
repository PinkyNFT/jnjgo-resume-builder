import { ResumeData } from '../types';

export type BizReachFieldType = 'text' | 'textarea' | 'radio' | 'dropdown' | 'select' | 'date' | 'checkbox' | 'buttons' | 'multi' | 'number' | 'none';

export interface BizReachQuestion {
    id: string;
    stepNumber: number;
    totalSteps: number | string;
    section: string;
    questionJa: string;
    questionEn: string;
    fieldType: BizReachFieldType;
    getAnswer: (data: ResumeData) => string | null;
    tipKey: string;
}

export const BIZREACH_QUESTIONS: BizReachQuestion[] = [
    // --- Basic Information (15 Steps) ---
    {
        id: 'basic_income',
        stepNumber: 1, totalSteps: '15', section: 'Basic Information',
        questionJa: '現在の年収を教えてください', questionEn: 'Current Annual Income',
        fieldType: 'checkbox',
        getAnswer: () => null, tipKey: 'bizreachQIncomeTip',
    },
    {
        id: 'basic_gender',
        stepNumber: 2, totalSteps: '15', section: 'Basic Information',
        questionJa: '性別を教えてください', questionEn: 'Gender',
        fieldType: 'checkbox',
        getAnswer: () => null, tipKey: 'bizreachQGenderTip',
    },
    {
        id: 'basic_residence',
        stepNumber: 3, totalSteps: '15', section: 'Basic Information',
        questionJa: 'お住まいの地域を教えてください', questionEn: 'Current Residence',
        fieldType: 'checkbox',
        getAnswer: (data: ResumeData) => data.contactInfo?.location || null, tipKey: 'bizreachQResidenceTip',
    },
    {
        id: 'basic_dob',
        stepNumber: 4, totalSteps: '15', section: 'Basic Information',
        questionJa: '生年月日を教えてください', questionEn: 'Date of Birth',
        fieldType: 'date',
        getAnswer: (data: ResumeData) => {
            const ageStr = data.contactInfo?.age;
            if (!ageStr) return null;
            const ageNum = parseInt(ageStr.replace(/[^0-9]/g, ''), 10);
            if (isNaN(ageNum)) return null;
            const estimatedBirthYear = new Date().getFullYear() - ageNum;
            return `Estimated birth year: ${estimatedBirthYear} (age ~${ageNum})`;
        }, tipKey: 'bizreachQDobTip',
    },
    {
        id: 'basic_language',
        stepNumber: 5, totalSteps: '15', section: 'Basic Information',
        questionJa: '語学について教えてください', questionEn: 'Language Proficiency',
        fieldType: 'select',
        getAnswer: (data: ResumeData) => {
            const engSkills = data.skills?.filter(s => s.toLowerCase().includes('english') || s.toLowerCase().includes('toeic'));
            return engSkills?.length ? engSkills.join(', ') : null;
        }, tipKey: 'bizreachQLanguageTip',
    },
    {
        id: 'basic_education',
        stepNumber: 6, totalSteps: '15', section: 'Basic Information',
        questionJa: '最終学歴を教えてください', questionEn: 'Highest Education',
        fieldType: 'multi',
        getAnswer: (data: ResumeData) => {
            if (!data.education?.length) return null;
            const ed = data.education[0];
            const parts = [];
            if (ed.institution) parts.push(`School Name: ${ed.institution}`);
            if (ed.degree) parts.push(`Faculty/Major: ${ed.degree}`);
            if (ed.period) parts.push(`Graduation: ${ed.period}`);
            return parts.join('\n');
        }, tipKey: 'bizreachQEducationTip',
    },
    {
        id: 'basic_name',
        stepNumber: 7, totalSteps: '15', section: 'Basic Information',
        questionJa: 'お名前を教えてください', questionEn: 'Full Name',
        fieldType: 'text',
        getAnswer: (data: ResumeData) => data.fullName || null, tipKey: 'bizreachQNameTip',
    },
    {
        id: 'basic_phone',
        stepNumber: 8, totalSteps: '15', section: 'Basic Information',
        questionJa: '連絡先（携帯電話番号）を教えてください', questionEn: 'Contact Details (Mobile Phone)',
        fieldType: 'text',
        getAnswer: (data: ResumeData) => data.contactInfo?.phone || null, tipKey: 'bizreachQPhoneTip',
    },
    {
        id: 'basic_job_change_exp',
        stepNumber: 9, totalSteps: '15', section: 'Basic Information',
        questionJa: '転職経験について教えてください', questionEn: 'Job Change Experience',
        fieldType: 'buttons',
        getAnswer: (data: ResumeData) => {
            const count = data.workExperience?.length;
            if (!count) return null;
            if (count <= 1) return 'No previous job changes (1 company)';
            return `${count - 1} previous job change(s) (${count} companies total)`;
        }, tipKey: 'bizreachQGenericTip',
    },
    {
        id: 'basic_job_change_timing',
        stepNumber: 10, totalSteps: '15', section: 'Basic Information',
        questionJa: 'いつ頃の転職をお考えですか', questionEn: 'When Do You Want to Change Jobs',
        fieldType: 'buttons',
        getAnswer: () => null, tipKey: 'bizreachQGenericTip',
    },
    {
        id: 'basic_recent_company',
        stepNumber: 11, totalSteps: '15', section: 'Basic Information',
        questionJa: '直近の会社について教えてください', questionEn: 'Most Recent Company',
        fieldType: 'multi',
        getAnswer: (data: ResumeData) => {
            const w = data.workExperience?.[0];
            if (!w) return null;
            const parts = [];
            if (w.company) parts.push(`Company Name: ${w.company}`);
            if (w.position) parts.push(`Department/Job Title: ${w.position}`);
            if (w.period) parts.push(`Period of Enrollment: ${w.period}`);
            return parts.join('\n');
        }, tipKey: 'bizreachQCompanyTip',
    },
    {
        id: 'basic_industry',
        stepNumber: 12, totalSteps: '15', section: 'Basic Information',
        questionJa: '直近の会社の業種を教えてください', questionEn: 'Most Recent Company Industry',
        fieldType: 'multi',
        getAnswer: () => null, tipKey: 'bizreachQIndustryTip',
    },
    {
        id: 'basic_occupation',
        stepNumber: 13, totalSteps: '15', section: 'Basic Information',
        questionJa: '直近の会社での職種を教えてください', questionEn: 'Most Recent Job Title',
        fieldType: 'multi',
        getAnswer: (data: ResumeData) => data.currentRole || data.workExperience?.[0]?.position || null,
        tipKey: 'bizreachQOccupationTip',
    },
    {
        id: 'basic_work_description',
        stepNumber: 14, totalSteps: '15', section: 'Basic Information',
        questionJa: '直近の会社でのお仕事について教えてください', questionEn: 'Work at Most Recent Company',
        fieldType: 'textarea',
        getAnswer: (data: ResumeData) => {
            const w = data.workExperience?.[0];
            if (!w) return null;
            const positionLine = w.position ? `${w.position}として、` : '';
            const respText = w.responsibilities?.length
                ? w.responsibilities.join('、')
                : '';
            if (!positionLine && !respText) return null;
            const parts = [`${positionLine}${respText}に従事。`];
            if (w.responsibilities?.length) {
                parts.push('');
                parts.push('【業務内容】');
                w.responsibilities.forEach(r => parts.push(`・${r}`));
            }
            return parts.join('\n');
        }, tipKey: 'bizreachQWorkDescTip',
    },
    {
        id: 'basic_confirmation',
        stepNumber: 15, totalSteps: '15', section: 'Basic Information',
        questionJa: '入力内容の確認', questionEn: 'Confirmation',
        fieldType: 'none',
        getAnswer: () => 'Review all your entries on BizReach and click confirm to proceed.', tipKey: 'bizreachQConfirmTip',
    },

    // --- Detailed Information (15 Steps) ---
    {
        id: 'detail_income_exact',
        stepNumber: 1, totalSteps: '15', section: 'Detailed Information',
        questionJa: '直近の年収（円）を教えてください', questionEn: 'Most Recent Annual Income (Yen)',
        fieldType: 'text',
        getAnswer: () => null, tipKey: 'bizreachQDetailIncomeTip',
    },
    {
        id: 'detail_management',
        stepNumber: 2, totalSteps: '15', section: 'Detailed Information',
        questionJa: 'マネジメント経験を教えてください', questionEn: 'Management Experience',
        fieldType: 'buttons',
        getAnswer: (data: ResumeData) => {
            const mgmtKeywords = ['manager', 'management', 'managing', 'lead', 'director', 'head of', 'vp', 'マネージャー', '部長', '課長', 'チームリーダー'];
            const searchText = [
                data.currentRole,
                ...(data.workExperience?.map(w => `${w.position} ${w.responsibilities?.join(' ')}`) || []),
                data.careerSummary,
            ].filter(Boolean).join(' ').toLowerCase();
            const hasManagement = mgmtKeywords.some(kw => searchText.includes(kw));
            return hasManagement ? 'Management experience detected — select your team size' : 'No management keywords found';
        }, tipKey: 'bizreachQGenericTip',
    },
    {
        id: 'detail_exp_industries',
        stepNumber: 3, totalSteps: '15', section: 'Detailed Information',
        questionJa: '今までに経験した業種を教えてください（最大3つまで選択可能）＋経験年数', questionEn: 'Experienced Industries (Max 3) + Years',
        fieldType: 'multi',
        getAnswer: () => null, tipKey: 'bizreachQExpIndustryTip',
    },
    {
        id: 'detail_exp_occupations',
        stepNumber: 4, totalSteps: '15', section: 'Detailed Information',
        questionJa: '今までに経験した職種を教えてください（最大5つまで選択可能）＋経験年数', questionEn: 'Experienced Occupations (Max 5) + Years',
        fieldType: 'multi',
        getAnswer: (data: ResumeData) => {
            if (!data.currentRole && !data.workExperience?.length) return null;
            const roles = new Set<string>();
            if (data.currentRole) roles.add(data.currentRole);
            data.workExperience?.forEach(w => { if (w.position) roles.add(w.position); });
            return Array.from(roles).join(', ');
        }, tipKey: 'bizreachQExpOccupationTip',
    },
    {
        id: 'detail_work_history',
        stepNumber: 5, totalSteps: '15', section: 'Detailed Information',
        questionJa: '職務経歴を教えてください', questionEn: 'Work History',
        fieldType: 'textarea',
        getAnswer: (data: ResumeData) => {
            if (!data.workExperience?.length) return null;
            return data.workExperience.map(w => {
                const parts: string[] = [];
                parts.push(`${w.company}`);
                if (w.position) parts.push(`${w.position}として、${w.responsibilities?.slice(0, 2).join('、') || ''}に従事。`);
                if (w.responsibilities?.length) {
                    parts.push('');
                    parts.push('【業務内容】');
                    w.responsibilities.forEach(r => parts.push(`・${r}`));
                }
                return parts.join('\n');
            }).join('\n\n');
        }, tipKey: 'bizreachQWorkHistoryTip',
    },
    {
        id: 'detail_desired_income',
        stepNumber: 6, totalSteps: '15', section: 'Detailed Information',
        questionJa: 'ご希望の年収を教えてください', questionEn: 'Desired Annual Income',
        fieldType: 'dropdown',
        getAnswer: () => null, tipKey: 'bizreachQGenericTip',
    },
    {
        id: 'detail_desired_industry',
        stepNumber: 7, totalSteps: '15', section: 'Detailed Information',
        questionJa: 'ご希望の業種を教えてください（最大2つまで選択可能）', questionEn: 'Desired Industries (Max 2)',
        fieldType: 'multi',
        getAnswer: () => null, tipKey: 'bizreachQGenericTip',
    },
    {
        id: 'detail_desired_occupation',
        stepNumber: 8, totalSteps: '15', section: 'Detailed Information',
        questionJa: 'ご希望の職種を教えてください（最大3つまで選択可能）', questionEn: 'Desired Occupations (Max 3)',
        fieldType: 'multi',
        getAnswer: (data: ResumeData) => data.currentRole || null, tipKey: 'bizreachQGenericTip',
    },
    {
        id: 'detail_desired_location',
        stepNumber: 9, totalSteps: '15', section: 'Detailed Information',
        questionJa: 'ご希望の勤務地を教えてください', questionEn: 'Desired Work Location',
        fieldType: 'checkbox',
        getAnswer: (data: ResumeData) => data.contactInfo?.location || null, tipKey: 'bizreachQDesiredLocationTip',
    },
    {
        id: 'detail_work_style',
        stepNumber: 10, totalSteps: '15', section: 'Detailed Information',
        questionJa: 'ご興味がある働き方を教えてください（最大5つまで選択可能）', questionEn: 'Interested Work Styles (Max 5)',
        fieldType: 'checkbox',
        getAnswer: () => null, tipKey: 'bizreachQGenericTip',
    },
    {
        id: 'detail_qualifications',
        stepNumber: 11, totalSteps: '15', section: 'Detailed Information',
        questionJa: '保有している資格・免許を教えてください', questionEn: 'Qualifications & Licenses',
        fieldType: 'checkbox',
        getAnswer: (data: ResumeData) => data.certifications?.join(', ') || null, tipKey: 'bizreachQSkillsTip',
    },
    {
        id: 'detail_awards',
        stepNumber: 12, totalSteps: '15', section: 'Detailed Information',
        questionJa: '社内・社外を問わず、特筆すべき表彰事項があれば教えてください', questionEn: 'Notable Awards & Honors',
        fieldType: 'multi',
        getAnswer: () => null, tipKey: 'bizreachQAwardsTip',
    },
    {
        id: 'detail_skills',
        stepNumber: 13, totalSteps: '15', section: 'Detailed Information',
        questionJa: 'あなたのスキルを教えてください', questionEn: 'Your Skills',
        fieldType: 'text',
        getAnswer: (data: ResumeData) => data.skills?.join(', ') || null, tipKey: 'bizreachQSkillsTip',
    },
    {
        id: 'detail_career_summary',
        stepNumber: 14, totalSteps: '15', section: 'Detailed Information',
        questionJa: 'これまでのキャリアの職務要約を教えてください', questionEn: 'Career Summary',
        fieldType: 'textarea',
        getAnswer: (data: ResumeData) => data.careerSummary || null, tipKey: 'bizreachQJobSummaryTip',
    },
    {
        id: 'detail_special_notes',
        stepNumber: 15, totalSteps: '15', section: 'Detailed Information',
        questionJa: '特記事項がある場合は教えてください', questionEn: 'Special Notes (Optional)',
        fieldType: 'textarea',
        getAnswer: () => null, tipKey: 'bizreachQSpecialNotesTip',
    }
];
