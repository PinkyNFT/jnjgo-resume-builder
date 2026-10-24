import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';
import { ResumeData, ImportData } from '@/types';
import { getParseResumePrompt } from '@/lib/prompts';
import { withCurrentEmployer } from '@/utils/headline';
import { getAdminAIConfig, getAdminSetting } from '@/lib/admin-settings-reader';
import { applyRateLimitDB, RATE_LIMITS } from '@/lib/rate-limit';
import { callWithRetry, isCompleteJson, structuredOutput } from '@/lib/gemini-client';
import { aiErrorPayload } from '@/lib/ai-errors';
import { AI_LIMITS, cleanHistory, requireAiUser, tooLarge, withinChars } from '@/lib/ai-guards';
import { explainedGaps } from '@/utils/careerGaps';

// Explicit cap so a stuck AI call ends instead of running to the platform limit. Generation: observed 28–108s on the preview model with full thinking.
export const maxDuration = 120;

// Validate API key exists
const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
    console.error('GEMINI_API_KEY environment variable is not set');
}

export async function POST(request: NextRequest) {
    let locale: string | undefined;
    try {
        const body = await request.json().catch(() => null);
        locale = body?.locale;

        // Signed-in users only, then a per-user limit.
        const userId = await requireAiUser(locale);
        if (userId instanceof NextResponse) return userId;
        const limited = await applyRateLimitDB(request, 'parse', RATE_LIMITS.ai, userId);
        if (limited) return limited;

        const importData: ImportData | undefined = body?.importData || undefined;
        // Hints are example answers, not the candidate's own words: keep them out of the resume.
        const rawHistory = Array.isArray(body?.history)
            ? body.history.filter((m: { isHint?: boolean } | null) => !m?.isHint)
            : body?.history;
        const history = cleanHistory(rawHistory);
        if (!history || (importData && !withinChars(importData.sourceText, AI_LIMITS.importChars))) {
            return tooLarge(locale);
        }

        if (!API_KEY) {
            const { body: errBody, status } = aiErrorPayload(null, locale, 'config');
            return NextResponse.json(errBody, { status });
        }

        const ai = new GoogleGenAI({ apiKey: API_KEY });

        // Read model from admin settings (cached)
        const aiConfig = await getAdminAIConfig();
        const model = aiConfig.model;

        // Questions quote examples ("e.g. 'Rakuten, Senior Engineer'"); only USER lines are facts.
        const conversationText = [
            '(Use only facts stated in USER lines. MODEL lines are the interviewer\'s questions and examples, never facts about the candidate.)',
            ...history.map(m => `${m.role.toUpperCase()}: ${m.text}`),
        ].join('\n');
        const importedText = importData ? `IMPORTED RESUME CONTENT:\n${importData.sourceText}\n\n` : '';

        const prompt = await getParseResumePrompt(conversationText, importedText, locale || 'en');

        const generate = () => callWithRetry(() => ai.models.generateContent({
            model,
            contents: prompt,
            config: {
                ...structuredOutput(model),
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        fullName: { type: Type.STRING },
                        currentRole: { type: Type.STRING },
                        careerSummary: { type: Type.STRING },
                        contactInfo: {
                            type: Type.OBJECT,
                            properties: {
                                email: { type: Type.STRING },
                                phone: { type: Type.STRING },
                                location: { type: Type.STRING },
                                linkedin: { type: Type.STRING }
                            }
                        },
                        timeline: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    id: { type: Type.STRING },
                                    period: { type: Type.STRING },
                                    organization: { type: Type.STRING },
                                    role: { type: Type.STRING },
                                    type: { type: Type.STRING, enum: ['work', 'education'] },
                                    notes: { type: Type.STRING },
                                    duration: { type: Type.STRING }
                                }
                            }
                        },
                        careerOverview: {
                            type: Type.OBJECT,
                            properties: {
                                totalExperience: { type: Type.STRING },
                                numberOfEmployers: { type: Type.NUMBER },
                                averageTenure: { type: Type.STRING },
                                areasOfExpertise: { type: Type.ARRAY, items: { type: Type.STRING } },
                                projectCount: { type: Type.STRING },
                                typicalDuration: { type: Type.STRING }
                            }
                        },
                        projectPortfolio: {
                            type: Type.OBJECT,
                            properties: {
                                summary: { type: Type.ARRAY, items: { type: Type.STRING } },
                                representativeProjects: {
                                    type: Type.ARRAY,
                                    items: {
                                        type: Type.OBJECT,
                                        properties: {
                                            id: { type: Type.STRING },
                                            title: { type: Type.STRING },
                                            period: { type: Type.STRING },
                                            clientType: { type: Type.STRING },
                                            theme: { type: Type.STRING },
                                            teamStructure: { type: Type.STRING },
                                            role: { type: Type.STRING },
                                            context: { type: Type.STRING },
                                            contribution: { type: Type.STRING },
                                            challenges: { type: Type.STRING }
                                        }
                                    }
                                },
                                additionalEngagements: { type: Type.STRING }
                            }
                        },
                        careerGaps: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    period: { type: Type.STRING },
                                    reason: { type: Type.STRING },
                                    isExplained: { type: Type.BOOLEAN }
                                }
                            }
                        },
                        workExperience: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    id: { type: Type.STRING },
                                    company: { type: Type.STRING },
                                    position: { type: Type.STRING },
                                    period: { type: Type.STRING },
                                    responsibilities: { type: Type.ARRAY, items: { type: Type.STRING } }
                                },
                                // Without these the model occasionally omits them (seen in testing),
                                // which breaks the timeline bars and the default headline.
                                required: ['company', 'position', 'period']
                            }
                        },
                        skillTimelines: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    id: { type: Type.STRING },
                                    skillName: { type: Type.STRING },
                                    period: { type: Type.STRING },
                                    context: { type: Type.STRING }
                                }
                            }
                        },
                        education: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    id: { type: Type.STRING },
                                    degree: { type: Type.STRING },
                                    institution: { type: Type.STRING },
                                    period: { type: Type.STRING },
                                    notes: { type: Type.STRING }
                                }
                            }
                        },
                        skills: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                        },
                        certifications: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                        }
                    },
                    required: ['fullName', 'currentRole', 'careerSummary', 'workExperience']
                }
            }
        }), 'parse', { route: 'parse', model, userId, request });

        // A small model can still loop until the output cap now and then,
        // leaving cut-off JSON: one more try (one more credit) before giving up.
        let response = await generate();
        if (!isCompleteJson(response.text)) response = await generate();

        if (response.text) {
            try {
                const data = JSON.parse(response.text) as ResumeData;
                // Ensure IDs and initialize arrays if not present
                if (data.timeline) {
                    data.timeline = data.timeline.map((e, i) => ({ ...e, id: e.id || `time_${i}` }));
                } else {
                    data.timeline = [];
                }

                if (data.projectPortfolio?.representativeProjects) {
                    data.projectPortfolio.representativeProjects = data.projectPortfolio.representativeProjects.map((e, i) => ({ ...e, id: e.id || `proj_${i}` }));
                } else {
                    if (!data.projectPortfolio) data.projectPortfolio = {
                        summary: [],
                        representativeProjects: [],
                        additionalEngagements: ''
                    };
                    if (!data.projectPortfolio.representativeProjects) data.projectPortfolio.representativeProjects = [];
                    if (!data.projectPortfolio.summary) data.projectPortfolio.summary = [];
                    if (!data.projectPortfolio.additionalEngagements) data.projectPortfolio.additionalEngagements = '';
                }

                // Ensure IDs for workExperience, education
                if (data.workExperience) {
                    data.workExperience = data.workExperience.map((e, i) => ({ ...e, id: e.id || `work_${i}` }));
                } else {
                    data.workExperience = [];
                }

                if (data.skillTimelines) {
                    data.skillTimelines = data.skillTimelines.map((e, i) => ({ ...e, id: e.id || `skill_${i}` }));
                } else {
                    data.skillTimelines = [];
                }

                if (data.education) {
                    data.education = data.education.map((e, i) => ({ ...e, id: e.id || `edu_${i}` }));
                } else {
                    data.education = [];
                }

                // Initialize other arrays if not present
                if (!data.skills) data.skills = [];
                if (!data.certifications) data.certifications = [];
                if (!data.careerGaps) data.careerGaps = [];

                // Initialize careerOverview if not present
                if (!data.careerOverview) {
                    data.careerOverview = {
                        totalExperience: '',
                        numberOfEmployers: 0,
                        averageTenure: '',
                        areasOfExpertise: [],
                        projectCount: '',
                        typicalDuration: ''
                    };
                }

                // Default: surface the current employer in the headline (currentRole),
                // e.g. "Senior Regional TAB Partner at Deloitte SEA" (JP: "… ／ Deloitte SEA").
                // This is just a sensible default — the field stays fully editable.
                data.currentRole = withCurrentEmployer(
                    data.currentRole,
                    data.workExperience.length
                        ? data.workExperience.map(w => ({ employer: w.company, title: w.position, period: w.period }))
                        : data.timeline.filter(t => t.type === 'work').map(t => ({ employer: t.organization, title: t.role, period: t.period })),
                    locale
                );

                // Gaps the interview already explains (deterministic, month-accurate, EN + JA).
                const gapDays = await getAdminSetting<number>('gap_detection_threshold_days', 90);
                data.careerGaps.push(...explainedGaps(data, history.map(h => h.text).join('\n'), gapDays, locale));

                return NextResponse.json({ data });
            } catch (e) {
                console.error("Failed to parse JSON", e);
                const { body: errBody, status } = aiErrorPayload(e, locale, 'unknown');
                return NextResponse.json(errBody, { status });
            }
        }

        console.error('Parse API error: empty response from model');
        const { body: errBody, status } = aiErrorPayload(null, locale, 'unknown');
        return NextResponse.json(errBody, { status });

    } catch (error) {
        console.error('Parse API error:', error);
        const { body: errBody, status } = aiErrorPayload(error, locale);
        return NextResponse.json(errBody, { status });
    }
}
