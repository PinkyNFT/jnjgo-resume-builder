import { CandidatePrivateProfile } from '../types';

export const RECRUITER_PROFILE_GENERATION_PROMPT = `
You are an expert executive recruiter and AI profile structuring assistant. 
Your task is to analyze the provided candidate's resume data and interview history, and extract/infer key data points to draft a "Recruiter-Only Private Profile".

This profile contains sensitive information that recruiters use to make scouting decisions, such as job-change intent, salary expectations, role preferences, and deal-breakers.
If any information is missing or unclear, make your best professional inference or leave it blank if no inference can be made.
The user will have a chance to review and edit this before it goes live.

Return a valid JSON object strictly matching this TypeScript interface, with NO markdown formatting, just raw JSON:

interface CandidatePrivateProfileDraft {
    orientation: string; // Must be one of: "tech-driven", "business-driven", "management-driven", or "balanced" depending on their experience.
    aiObjectiveReview: string; // A 2-3 sentence objective overview of their strengths and market value.
    jobChangeIntent: 'now' | 'within_3_months' | 'open_to_offers'; // Infer based on context, default to 'open_to_offers'.
    desiredSalary: {
        minimum: number;  // In JPY (e.g., 8000000)
        target: number;   // In JPY (e.g., 10000000)
    };
    desiredRoles: Array<{ role: string; priority: number }>; // Top 3 ideal roles based on their trajectory. Priority 1 is highest.
    workingConditions: string; // e.g., "Remote preference", "Hybrid", etc.
    dealBreakers: string[]; // e.g., ["Legacy tech stacks", "No equity"]
    interviewAvailability: string; // e.g., "Weekday evenings, Weekends"
    jobChangeReasonSummary: string; // A brief summary of why they might be looking for a change (growth, salary, etc).
}

Candidate History / Resume Text Context:
{{CANDIDATE_DATA}}
`;
