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

            const prompt = `
    Evaluate this resume for ${role}.
    
    DATA: ${JSON.stringify(resumeData)}
    
    SCORING (100 points total):
    
    Structure (50pts):
       - Profile complete: 5pts
       - Timeline chronological: 10pts
       - Clear roles & durations: 10pts
       - Has numbers/metrics: 15pts
       - Easy to read: 10pts
       
    Clarity (25pts):
       - Shows decisions made: 10pts
       - Clear problem→action→result: 10pts
       - Individual contribution clear: 5pts
       
    Role Match (15pts):
       - ${role === 'consultant'
                    ? 'Shows consulting skills: problem solving, stakeholder work, impact'
                    : 'Shows engineering skills: design, scale, reliability, tech choices'}: 15pts
            
    Completeness (10pts):
       - No unexplained gaps >3 months: 10pts
    
    PASS if: Score >= 80 AND Structure >= 40 AND has numbers
    
    Output JSON with score, breakdown, and 2-3 specific suggestions.
  `;

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
                                    structure: { type: Type.NUMBER },
                                    reproducibility: { type: Type.NUMBER },
                                    roleFit: { type: Type.NUMBER },
                                    riskHandling: { type: Type.NUMBER },
                                }
                            },
                            missingItems: { type: Type.ARRAY, items: { type: Type.STRING } },
                            suggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
                        }
                    }
                }
            });

            const result = JSON.parse(response.text || "{}");
            const evaluation: EvaluationResult = {
                ...result,
                isPassing: (result.totalScore || 0) >= 80
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
