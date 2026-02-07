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
    Create a structured, professional resume from this conversation following best practices.
    
    ${importedText}
    
    CONVERSATION:
    ${conversationText}
    
    CRITICAL REQUIREMENTS FOR DATA EXTRACTION:
    
    1. WORK EXPERIENCE - Extract with precision:
       - Use EXACT company names as provided (e.g., "Kerofit Pte Ltd", "Mount Packt")
       - Extract complete job titles/positions
       - Parse date ranges accurately (e.g., "2021 - Present", "2020 - 2021")
       - Convert all responsibilities into concise, action-oriented bullet points
       - Each responsibility should start with a strong action verb
       - Include metrics and results where mentioned
    
    2. CAREER TIMELINE - Create chronological summary:
       - List all positions in reverse chronological order (newest first)
       - Format: "Period: Company Position (Duration)"
       - Include calculated durations in parentheses
    
    3. EDUCATION - Always include if mentioned:
       - Extract degree name exactly as provided
       - Extract institution name exactly as provided
       - Include enrollment period or graduation date
       - Add any relevant notes (e.g., "Currently Enrolled", "Year")
    
    4. SKILLS - Extract all technical and soft skills:
       - Organize by category if appropriate (e.g., "Languages & Frameworks", "Tools", etc.)
       - List each skill clearly
    
    5. CERTIFICATIONS - Always include if mentioned:
       - Extract certification names exactly
       - Include issuing organization if mentioned
    
    6. CAREER OVERVIEW - Calculate statistics:
       - Total experience in years
       - Number of different employers
       - Average tenure per position
       - Current position duration
    
    7. PROFESSIONAL SUMMARY:
       - Create a concise 2-3 sentence summary highlighting key experience and expertise
       - Focus on years of experience, specialization, and key achievements
    
    FORMATTING GUIDELINES:
    - Use clear, precise, professional language
    - Maintain consistency in date formats
    - Quantify achievements with specific numbers where possible
    - Keep bullet points focused and results-oriented
    - Use proper grammar and punctuation
    
    Output as JSON matching the schema exactly.
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

                // Ensure IDs for workExperience, education
                if (data.workExperience) {
                    data.workExperience = data.workExperience.map((e, i) => ({ ...e, id: e.id || `work_${i}` }));
                }
                if (data.education) {
                    data.education = data.education.map((e, i) => ({ ...e, id: e.id || `edu_${i}` }));
                }

                // Initialize arrays if not present
                if (!data.workExperience) data.workExperience = [];
                if (!data.education) data.education = [];
                if (!data.skills) data.skills = [];
                if (!data.certifications) data.certifications = [];

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
