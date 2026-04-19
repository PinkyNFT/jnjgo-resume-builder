import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';
import { ImportData, ResumeData, RoleType, EvaluationResult } from '@/types';
import { GEMINI_MODEL } from '@/config/models';
import { getAnalyzeImportPrompt, getEvaluateResumePrompt } from '@/lib/prompts';
import { getAdminAIConfig } from '@/lib/admin-settings-reader';
import { applyRateLimitDB, RATE_LIMITS } from '@/lib/rate-limit';

// Validate API key exists
const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
    console.error('GEMINI_API_KEY environment variable is not set');
}

export async function POST(request: NextRequest) {
    try {
        const limited = await applyRateLimitDB(request, 'analyze', RATE_LIMITS.ai);
        if (limited) return limited;

        if (!API_KEY) {
            return NextResponse.json(
                { error: 'Server configuration error: API key not configured' },
                { status: 500 }
            );
        }

        const body = await request.json();
        const { action, text, data, roleType, locale } = body;

        const ai = new GoogleGenAI({ apiKey: API_KEY });

        // Read model from admin settings (cached)
        const aiConfig = await getAdminAIConfig();
        const model = aiConfig.model;

        // Handle different analysis actions
        if (action === 'analyzeImport') {
            // Analyze imported resume text
            const prompt = await getAnalyzeImportPrompt(text, locale || 'en');

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
            const hasQuantifiedAchievement = !!JSON.stringify(resumeData).match(/\d+%|\d+x|\$\d+|\d+\s*(users|customers|projects|team|members|days|months|years|hours|reduction|increase|improvement|growth)/i);

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

            const prompt = await getEvaluateResumePrompt(resumeData, role, {
                hasBasicProfile,
                hasWorkHistory,
                hasEducation,
                hasSkills,
                hasCertifications,
                isChronological,
                hasQuantifiedAchievement,
                hasUnexplainedGap,
                gapDetails
            }, locale || 'en');

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

            const t = (key: string) => {
                if (locale === 'ja') {
                    const messages: Record<string, string> = {
                        'totalScore': `総合スコアは ${result.totalScore}/100 です（必要スコア ≥80）`,
                        'structureScore': `構成スコアは ${flatBreakdown.structure}/55 です（必要スコア ≥45）`,
                        'noMetrics': '数値化された実績が見つかりません（少なくとも1つ必要です）',
                        'noEducation': '学歴セクションが不足または不完全です（必須）',
                        'noSkills': 'スキルセクションには少なくとも3つのスキルが必要です（必須）'
                    };
                    return messages[key] || key;
                }
                const messages: Record<string, string> = {
                    'totalScore': `Total score is ${result.totalScore}/100 (need ≥80)`,
                    'structureScore': `Structure score is ${flatBreakdown.structure}/55 (need ≥45)`,
                    'noMetrics': 'No quantified achievements found (required: at least 1)',
                    'noEducation': 'Education section is missing or incomplete (required)',
                    'noSkills': 'Skills section needs at least 3 skills (required)'
                };
                return messages[key] || key;
            };

            if (!meetsScoreThreshold) {
                validationMessages.push(t('totalScore'));
            }
            if (!meetsStructureThreshold) {
                validationMessages.push(t('structureScore'));
            }
            if (!hasQuantifiedMetrics) {
                validationMessages.push(t('noMetrics'));
            }
            if (!hasEducationSection) {
                validationMessages.push(t('noEducation'));
            }
            if (!hasSkillsSection) {
                validationMessages.push(t('noSkills'));
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
