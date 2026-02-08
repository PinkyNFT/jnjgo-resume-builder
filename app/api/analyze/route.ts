import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';
import { ImportData, ResumeData, RoleType, EvaluationResult } from '@/types';
import { GEMINI_MODEL } from '@/config/models';

// Validate API key exists
const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
    console.error('GEMINI_API_KEY environment variable is not set');
}

export async function POST(request: NextRequest) {
    try {
        if (!API_KEY) {
            return NextResponse.json(
                { error: 'Server configuration error: API key not configured' },
                { status: 500 }
            );
        }

        const body = await request.json();
        const { action, text, data, roleType } = body;

        const ai = new GoogleGenAI({ apiKey: API_KEY });

        const model = GEMINI_MODEL;

        // Handle different analysis actions
        if (action === 'analyzeImport') {
            // Analyze imported resume text
            const prompt = `
    Quick analysis of this resume text:
    1. What's the summary?
    2. Any numbers/achievements?
    3. Main timeline?
    
    TEXT: ${text.substring(0, 10000)}
  `;

            const response = await ai.models.generateContent({
                model,
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            summary: { type: Type.STRING },
                        }
                    }
                }
            });

            const parsed = JSON.parse(response.text || "{}");
            const importData: ImportData = {
                sourceText: text,
                parsedSummary: parsed.summary || "Imported Resume",
                extractionDate: Date.now()
            };

            return NextResponse.json({ data: importData });

        } else if (action === 'evaluateResume') {
            // Evaluate resume quality
            const resumeData = data as ResumeData;
            const role = roleType as RoleType;

            // === RULE-BASED PRE-VALIDATION ===
            const hasBasicProfile = !!(resumeData.fullName && resumeData.contactInfo?.email && resumeData.careerSummary);
            const hasWorkHistory = (resumeData.workExperience?.length || 0) > 0;
            const hasQuantifiedAchievement = JSON.stringify(resumeData).match(/\d+%|\d+x|\$\d+|\d+\s*(users|customers|projects|team|members|days|months|years|hours|reduction|increase|improvement|growth)/i);

            // Check for Education, Skills, Certifications
            const hasEducation = (resumeData.education?.length || 0) > 0;
            const hasSkills = (resumeData.skills?.length || 0) >= 3; // Minimum 3 skills
            const hasCertifications = resumeData.certifications !== undefined; // Even empty array means it was asked

            // Check for chronological order (most recent first) using timeline
            let isChronological = true;
            if (resumeData.timeline && resumeData.timeline.length > 1) {
                const workTimeline = resumeData.timeline.filter(t => t.type === 'work');
                for (let i = 0; i < workTimeline.length - 1; i++) {
                    const current = workTimeline[i];
                    const next = workTimeline[i + 1];
                    // Timeline should be sorted most recent first
                    // Check periods - this is a simple check
                    const currentYear = parseInt(current.period.match(/\d{4}/)?.[0] || '0');
                    const nextYear = parseInt(next.period.match(/\d{4}/)?.[0] || '0');
                    if (currentYear < nextYear) {
                        isChronological = false;
                        break;
                    }
                }
            }

            // Check for 90+ day gaps - primarily use careerGaps field
            let hasUnexplainedGap = false;
            let gapDetails = '';
            if (resumeData.careerGaps && resumeData.careerGaps.length > 0) {
                hasUnexplainedGap = resumeData.careerGaps.some(gap => !gap.isExplained);
                if (hasUnexplainedGap) {
                    gapDetails = resumeData.careerGaps
                        .filter(gap => !gap.isExplained)
                        .map(gap => `Gap: ${gap.period}`)
                        .join('; ');
                }
            }

            const prompt = `You are a professional resume evaluator. You must score this resume following EXACT criteria and point allocations.

RESUME DATA:
${JSON.stringify(resumeData, null, 2)}

TARGET ROLE: ${role === 'consultant' ? 'Consultant' : role === 'senior_engineer' ? 'Senior Engineer' : 'General'}

PRE-VALIDATION RESULTS:
- Has basic profile (name/email/summary): ${hasBasicProfile ? 'YES' : 'NO'}
- Has work history: ${hasWorkHistory ? 'YES' : 'NO'}
- Has education section: ${hasEducation ? 'YES' : 'NO'}
- Has skills (3+ listed): ${hasSkills ? 'YES' : 'NO'}
- Has certifications section: ${hasCertifications ? 'YES' : 'NO'}
- Timeline is chronological (most recent first): ${isChronological ? 'YES' : 'NO'}
- Has quantified achievements: ${hasQuantifiedAchievement ? 'YES' : 'NO'}
- Has unexplained gaps (90+ days): ${hasUnexplainedGap ? 'YES - ' + gapDetails : 'NO'}

===== SCORING CRITERIA (100 POINTS TOTAL) =====

## A) REQUIRED STRUCTURE — 55 points

### A1. Basic Profile Completeness (5 points)
- Award 5 points if: name, contact (email/phone), AND professional summary are ALL present and non-empty
- Award 2 points if: only 2 of 3 are complete
- Award 0 points if: fewer than 2 are complete

### A2. Education Section (5 points) — MANDATORY
- Award 5 points if: education array has at least 1 entry with degree and institution
- Award 3 points if: education exists but missing details
- Award 0 points if: no education section or empty array
- PRE-VALIDATION: ${hasEducation ? 'PASS' : 'FAIL'}
- NOTE: Professional resumes require education background

### A3. Skills Section (5 points) — MANDATORY
- Award 5 points if: skills array has 5+ items
- Award 3 points if: skills array has 3-4 items
- Award 1 point if: skills array has 1-2 items
- Award 0 points if: no skills or empty array
- PRE-VALIDATION: ${hasSkills ? 'PASS (3+ skills)' : 'FAIL'}
- NOTE: World-class resumes list specific technical/professional skills

### A4. Chronological Work History (10 points)
- Award 10 points if: experience entries are ordered from most recent to oldest (reverse chronological)
- Award 5 points if: mostly chronological but 1-2 items out of order
- Award 0 points if: not chronological or no dates provided
- PRE-VALIDATION: ${isChronological ? 'PASS' : 'FAIL'}

### A5. Complete Role Information (10 points)
- For EACH experience entry, check: company name, job title, duration (start/end dates), role description
- Award 10 points if: ALL entries have all 4 elements
- Award 7 points if: 80%+ of entries are complete
- Award 5 points if: 60-79% of entries are complete
- Award 2 points if: 40-59% of entries are complete
- Award 0 points if: <40% complete

### A6. Quantified Achievements (15 points) — CRITICAL REQUIREMENT
- Look for: numbers, percentages, metrics, scale indicators (team size, users, revenue, time saved, etc.)
- Award 15 points if: 3+ distinct quantified achievements across different experiences
- Award 10 points if: 2 quantified achievements
- Award 5 points if: 1 quantified achievement
- Award 0 points if: no quantified achievements
- PRE-VALIDATION: ${hasQuantifiedAchievement ? 'HAS METRICS' : 'NO METRICS FOUND'}
- NOTE: This is a PASS/FAIL requirement. Resume CANNOT pass without at least 1 quantified achievement.

### A7. Readability & Format (5 points)
- Check: bullet points used, concise statements (not walls of text), action verbs, clear structure
- Award 5 points if: well-formatted, uses bullets, action-oriented, scannable
- Award 3 points if: mostly readable but some dense paragraphs
- Award 1 point if: poor formatting or hard to scan
- Award 0 points if: unreadable or no structure

## B) REPRODUCIBILITY — 25 points

### B1. Decision-Making Context (10 points)
- Look for: trade-offs discussed, constraints mentioned, rationale for technical/business choices, "why" not just "what"
- Award 10 points if: 3+ examples showing clear decision-making rationale
- Award 7 points if: 2 examples of decision context
- Award 4 points if: 1 example or implied but not explicit
- Award 0 points if: no decision context, only describes actions

### B2. Problem → Action → Result Flow (10 points)
- Look for: clear description of problem/challenge, specific actions taken, measurable outcomes
- Award 10 points if: 3+ complete PAR stories (problem-action-result)
- Award 7 points if: 2 complete PAR stories
- Award 4 points if: 1 complete PAR story or incomplete stories
- Award 0 points if: no clear problem-action-result structure

### B3. Individual Contribution Clarity (5 points)
- Look for: use of "I" vs "we", clear scope of personal responsibility, distinguishes own work from team work
- Award 5 points if: consistently clear what individual contributed vs team
- Award 3 points if: somewhat clear but some ambiguity
- Award 0 points if: unclear or entirely uses "we" without individual scope

## C) ROLE FIT — 15 points (Role-Specific)

${role === 'consultant' ? `
### CONSULTANT EVALUATION:
- Problem Framing (3 pts): Shows ability to define/scope business problems
- As-Is/To-Be Analysis (3 pts): Demonstrates current state vs desired state thinking
- Proposals & Recommendations (3 pts): Shows advisory/proposal work
- Execution & Implementation (3 pts): Demonstrates delivery capability
- Stakeholder Management (3 pts): Shows client/stakeholder collaboration
TOTAL: Sum of above (max 15 points)
` : role === 'senior_engineer' ? `
### SENIOR ENGINEER EVALUATION:
- System Design (3 pts): Shows architecture/design decisions
- Operations & Reliability (3 pts): Demonstrates production system management
- Scale & Performance (3 pts): Shows handling of scale/performance challenges
- Technical Choices (3 pts): Demonstrates technology selection and trade-offs
- Technical Leadership (3 pts): Shows mentoring, code review, or technical guidance
TOTAL: Sum of above (max 15 points)
` : `
### GENERAL EVALUATION:
- Technical competency appropriate to experience level (5 pts)
- Project/initiative ownership (5 pts)
- Impact and results orientation (5 pts)
TOTAL: Sum of above (max 15 points)
`}

## D) RISK / CONCERN HANDLING — 10 points

### D1. Career Gap Explanation (10 points)
- Check for: unexplained gaps of 90+ days between roles
- Award 10 points if: NO gaps >90 days OR all gaps are explained in gapsExplanation field
- Award 5 points if: gaps exist but partial explanation provided
- Award 0 points if: unexplained gaps of 90+ days exist
- PRE-VALIDATION: ${hasUnexplainedGap ? 'UNEXPLAINED GAPS DETECTED' : 'NO UNEXPLAINED GAPS'}

===== PASSING CRITERIA =====

Resume is "SUBMISSION-READY" (passing) if ALL of the following are met:
1. Total Score >= 80 points
2. Required Structure score >= 45 points (out of 55)
3. At least ONE quantified achievement exists (cannot be zero)
4. Education section is present (at least 1 entry)
5. Skills section has at least 3 skills

Evaluate carefully and assign scores based ONLY on evidence in the resume data. Be strict and accurate.

OUTPUT: Provide exact scores for each category following the rubric above.`;

            const response = await ai.models.generateContent({
                model,
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            totalScore: { type: Type.NUMBER },
                            breakdown: {
                                type: Type.OBJECT,
                                properties: {
                                    structure: {
                                        type: Type.OBJECT,
                                        properties: {
                                            total: { type: Type.NUMBER },
                                            basicProfile: { type: Type.NUMBER },
                                            education: { type: Type.NUMBER },
                                            skills: { type: Type.NUMBER },
                                            chronological: { type: Type.NUMBER },
                                            roleInfo: { type: Type.NUMBER },
                                            quantifiedAchievements: { type: Type.NUMBER },
                                            readability: { type: Type.NUMBER }
                                        }
                                    },
                                    reproducibility: {
                                        type: Type.OBJECT,
                                        properties: {
                                            total: { type: Type.NUMBER },
                                            decisionMaking: { type: Type.NUMBER },
                                            problemActionResult: { type: Type.NUMBER },
                                            individualContribution: { type: Type.NUMBER }
                                        }
                                    },
                                    roleFit: {
                                        type: Type.OBJECT,
                                        properties: {
                                            total: { type: Type.NUMBER },
                                            details: { type: Type.STRING }
                                        }
                                    },
                                    riskHandling: {
                                        type: Type.OBJECT,
                                        properties: {
                                            total: { type: Type.NUMBER },
                                            gapExplanation: { type: Type.NUMBER }
                                        }
                                    }
                                }
                            },
                            missingItems: { type: Type.ARRAY, items: { type: Type.STRING } },
                            suggestions: { type: Type.ARRAY, items: { type: Type.STRING } }
                        }
                    }
                }
            });

            const result = JSON.parse(response.text || "{}");

            // Extract flat breakdown for backward compatibility
            const flatBreakdown = {
                structure: result.breakdown?.structure?.total || 0,
                reproducibility: result.breakdown?.reproducibility?.total || 0,
                roleFit: result.breakdown?.roleFit?.total || 0,
                riskHandling: result.breakdown?.riskHandling?.total || 0
            };

            // Validate passing criteria according to spec
            const meetsScoreThreshold = (result.totalScore || 0) >= 80;
            const meetsStructureThreshold = flatBreakdown.structure >= 45; // Updated from 40 to 45 (out of 55)
            const hasQuantifiedMetrics = flatBreakdown.structure >= 5 &&
                result.breakdown?.structure?.quantifiedAchievements > 0;
            const hasEducationSection = result.breakdown?.structure?.education >= 3; // At least partial education
            const hasSkillsSection = result.breakdown?.structure?.skills >= 3; // At least 3 skills

            const isPassing = meetsScoreThreshold && meetsStructureThreshold && hasQuantifiedMetrics &&
                hasEducationSection && hasSkillsSection;

            // Add validation messages if not passing
            const validationMessages: string[] = [];
            if (!meetsScoreThreshold) {
                validationMessages.push(`Total score is ${result.totalScore}/100 (need ≥80)`);
            }
            if (!meetsStructureThreshold) {
                validationMessages.push(`Structure score is ${flatBreakdown.structure}/55 (need ≥45)`);
            }
            if (!hasQuantifiedMetrics) {
                validationMessages.push('No quantified achievements found (required: at least 1)');
            }
            if (!hasEducationSection) {
                validationMessages.push('Education section is missing or incomplete (required)');
            }
            if (!hasSkillsSection) {
                validationMessages.push('Skills section needs at least 3 skills (required)');
            }

            const evaluation: EvaluationResult = {
                totalScore: result.totalScore || 0,
                breakdown: flatBreakdown,
                detailedBreakdown: result.breakdown,
                missingItems: result.missingItems || [],
                suggestions: result.suggestions || [],
                isPassing,
                validationMessages: isPassing ? undefined : validationMessages
            };

            return NextResponse.json({ data: evaluation });

        } else {
            return NextResponse.json(
                { error: 'Invalid action' },
                { status: 400 }
            );
        }

    } catch (error) {
        console.error('Analyze API error:', error);
        return NextResponse.json(
            { error: 'Failed to analyze', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
