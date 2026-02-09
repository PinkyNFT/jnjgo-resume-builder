export type RoleType = 'consultant' | 'senior_engineer' | 'general';
export type ProjectStatus = 'draft' | 'imported' | 'interviewing' | 'generated' | 'completed';

export interface Message {
    role: 'user' | 'model';
    text: string;
    isHint?: boolean;
    phase?: 'overview' | 'confirmation' | 'detail' | 'general';
}

export interface ImportData {
    sourceText: string;
    parsedSummary: string;
    extractionDate: number;
}

export interface UserProfile {
    fullName: string;
    email: string;
    phone: string;
    location: string;
    linkedin?: string;
}

// --- JNJGO Master Resume Schema ---

export interface TimelineItem {
    id: string;
    period: string; // e.g. "April 2015 – March 2021"
    organization: string; // Company or School
    role: string; // Title or Degree
    type: 'work' | 'education';
    notes?: string; // e.g. "pursued while employed"
    duration?: string; // e.g. "(6 years)"
}

export interface CareerOverview {
    totalExperience: string; // "10 years"
    numberOfEmployers: number;
    averageTenure: string; // "6 years"
    areasOfExpertise: string[]; // ["Growth Strategy", "Marketing"]
    projectCount: string; // "Approx. 14"
    typicalDuration: string; // "Approx. 3 months"
}

export interface RepresentativeProject {
    id: string;
    title: string; // "Global Consumer Goods Company | Enterprise Growth Strategy"
    period: string; // "Oct 2023 – Jan 2024 (3 months)"
    clientType?: string;
    theme?: string;
    teamStructure?: string; // "1 Partner, 1 EM, 3 Consultants"
    role: string; // "Project Manager"
    context: string; // "Background/Context"
    contribution: string; // "Key Contributions / Decision Making"
    challenges?: string; // "Key Challenges"
}

export interface WorkExperience {
    id: string;
    company: string; // "Kerofit Pte Ltd"
    position: string; // "Frontend Web Developer"
    period: string; // "2021 - Present"
    responsibilities: string[]; // Array of bullet points
}

export interface Education {
    id: string;
    degree: string; // "Bachelor of Science in Computer Science (BSCS)"
    institution: string; // "Air University Islamabad"
    period: string; // "Currently Enrolled (1st Year)"
    notes?: string;
}

export interface ProjectPortfolio {
    summary: string[]; // High level bullets of types of projects
    representativeProjects: RepresentativeProject[];
    additionalEngagements: string; // Text summary of other work
}

export interface GapItem {
    period: string;
    reason: string;
    isExplained: boolean;
}

export interface ResumeData {
    fullName: string;
    currentRole: string; // e.g. "McKinsey & Company | Manager"
    contactInfo: {
        email: string;
        phone: string;
        location: string;
        linkedin?: string;
        age?: string; // e.g. "(Taro Yamada, 38歳)"
        department?: string; // e.g. "営業部 部長"
    };
    careerSummary: string; // Top narrative
    timeline: TimelineItem[]; // Chronological work + education
    careerOverview: CareerOverview; // The quantitative box
    projectPortfolio: ProjectPortfolio;
    careerGaps: GapItem[];
    workExperience?: WorkExperience[]; // Traditional work experience section
    education?: Education[]; // Education section
    skills?: string[]; // Skills array
    certifications?: string[]; // Certifications array
}

export interface EvaluationResult {
    totalScore: number;
    isPassing: boolean;
    breakdown: {
        structure: number; // 50pts
        reproducibility: number; // 25pts
        roleFit: number; // 15pts
        riskHandling: number; // 10pts
    };
    detailedBreakdown?: {
        structure?: {
            total: number;
            basicProfile: number;
            chronological: number;
            roleInfo: number;
            quantifiedAchievements: number;
            readability: number;
        };
        reproducibility?: {
            total: number;
            decisionMaking: number;
            problemActionResult: number;
            individualContribution: number;
        };
        roleFit?: {
            total: number;
            details: string;
        };
        riskHandling?: {
            total: number;
            gapExplanation: number;
        };
    };
    missingItems: string[];
    suggestions: string[];
    validationMessages?: string[];
}

export interface ValidationResult {
    hasBasicProfile: boolean;
    hasWorkHistory: boolean;
    hasEducation: boolean;
    hasSkills: boolean;
    hasCertifications: boolean;
    isChronological: boolean;
    hasQuantifiedAchievement: boolean;
    hasUnexplainedGap: boolean;
    gapDetails: string;
}

export interface Project {
    id: string;
    title: string;
    roleType: RoleType;
    updatedAt: number;
    status: ProjectStatus;
    history: Message[];
    importData?: ImportData;
    data?: ResumeData;
    evaluation?: EvaluationResult;
}

export const INITIAL_RESUME_DATA: ResumeData = {
    fullName: '',
    currentRole: '',
    careerSummary: '',
    contactInfo: { email: '', phone: '', location: '' },
    timeline: [],
    careerOverview: {
        totalExperience: '',
        numberOfEmployers: 0,
        averageTenure: '',
        areasOfExpertise: [],
        projectCount: '',
        typicalDuration: ''
    },
    projectPortfolio: {
        summary: [],
        representativeProjects: [],
        additionalEngagements: ''
    },
    careerGaps: [],
    workExperience: [],
    education: [],
    skills: [],
    certifications: []
};
