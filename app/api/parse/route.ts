import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';
import { Message, ResumeData, ImportData } from '@/types';
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
        const { history, importData }: { history: Message[], importData?: ImportData } = body;

        const ai = new GoogleGenAI({ apiKey: API_KEY });
        const model = GEMINI_MODEL;

        const conversationText = history.map(m => `${m.role.toUpperCase()}: ${m.text}`).join('\n');
        const importedText = importData ? `IMPORTED RESUME CONTENT:\n${importData.sourceText}\n\n` : '';

        const prompt = `
    Create a structured resume from this conversation.
    
    ${importedText}
    
    CONVERSATION:
    ${conversationText}
    
    REQUIREMENTS:
    1. Timeline: Newest first, include work & education
    2. Career Overview: Calculate stats from the data
    3. Projects: Pick 2-3 best projects with details, summarize others
    4. Use English only
    
    Output as JSON matching the schema.
  `;

        const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
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
                        }
                    }
                }
            }
        });

        if (response.text) {
            try {
                const data = JSON.parse(response.text) as ResumeData;
                // Ensure IDs
                data.timeline = data.timeline.map((e, i) => ({ ...e, id: e.id || `time_${i}` }));
                data.projectPortfolio.representativeProjects = data.projectPortfolio.representativeProjects.map((e, i) => ({ ...e, id: e.id || `proj_${i}` }));

                return NextResponse.json({ data });
            } catch (e) {
                console.error("Failed to parse JSON", e);
                return NextResponse.json(
                    { error: 'Failed to parse resume data' },
                    { status: 500 }
                );
            }
        }

        return NextResponse.json(
            { error: 'No data generated' },
            { status: 500 }
        );

    } catch (error) {
        console.error('Parse API error:', error);
        return NextResponse.json(
            { error: 'Failed to parse resume', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
