import { GoogleGenAI, Chat, Type } from "@google/genai";
import { Message, ResumeData, RoleType, ImportData, EvaluationResult } from "../types";

const API_KEY = process.env.NEXT_PUBLIC_API_KEY || '';

// --- 1. System Instruction Generator ---

const getSystemInstruction = (roleType: RoleType, importData?: ImportData, initialData?: ResumeData) => {
    const roleContext = roleType === 'consultant'
        ? "Strategy Consultant (Focus on: Problem Solving, Stakeholder Management, Revenue Impact, As-Is/To-Be)"
        : roleType === 'senior_engineer'
            ? "Senior Software Engineer (Focus on: System Architecture, Scalability, Reliability, Tech Choices, Trade-offs)"
            : "General Professional";

    const personalInfoContext = initialData?.fullName
        ? `
      KNOWN PERSONAL INFO:
      Name: ${initialData.fullName}
      Email: ${initialData.contactInfo.email}
      DO NOT ASK FOR THESE.
    `
        : "";

    const importContext = importData
        ? `
      CONTEXT: The user has already provided a resume. 
      IMPORTED SUMMARY: "${importData.parsedSummary.substring(0, 500)}..."
      
      INSTRUCTION: 
      1. Confirm the timeline first. Are there ANY gaps? Even 1 month must be explained.
      2. Identify 2-3 "Representative Projects" that show high-level decision making.
      3. Deep dive into those projects.
    `
        : "CONTEXT: The user is starting from scratch. Guide them through Timeline construction first, then Project Selection.";

    return `
    You're a friendly career coach helping ${roleContext === 'Strategy Consultant (Focus on: Problem Solving, Stakeholder Management, Revenue Impact, As-Is/To-Be)' ? 'a consultant' : roleContext === 'Senior Software Engineer (Focus on: System Architecture, Scalability, Reliability, Tech Choices, Trade-offs)' ? 'an engineer' : 'a professional'} build a strong resume.
    
    ${personalInfoContext}
    ${importContext}
    
    STYLE:
    - Keep messages short (1-2 sentences max)
    - One question at a time
    - Be warm: "Nice!", "Great start!", "Perfect!"
    - Ask for specifics: "How many?", "What impact?", "Team size?"
    - When moving on: "Got it! Next..."
    
    FOCUS: numbers, team size, impact, results
    SKIP: name/email/phone (already have them)
  `;
};

// --- 2. Chat Creation ---

export const createChat = (roleType: RoleType, importData?: ImportData, history?: Message[], initialData?: ResumeData): Chat => {
    const ai = new GoogleGenAI({ apiKey: API_KEY });
    const model = 'gemini-3-flash-preview';

    const chat = ai.chats.create({
        model,
        config: {
            systemInstruction: getSystemInstruction(roleType, importData, initialData),
            temperature: 0.7,
        },
        history: history ? history.map(h => ({
            role: h.role,
            parts: [{ text: h.text }]
        })) : []
    });

    return chat;
};

// --- 3. Hint Generation ---

export const generateHint = async (chat: Chat): Promise<string> => {
    const prompt = "User needs help. Give a friendly example with specific numbers or details.";
    const response = await chat.sendMessage({ message: prompt });
    return response.text || "For example: 'Led a team of 5 engineers' or 'Increased revenue by 30%'";
};

// --- 4. Resume Parsing & Generation ---

export const parseResumeFromChat = async (history: Message[], importData?: ImportData): Promise<ResumeData> => {
    const ai = new GoogleGenAI({ apiKey: API_KEY });
    const model = 'gemini-3-flash-preview';

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
            return data;
        } catch (e) {
            console.error("Failed to parse JSON", e);
            throw new Error("Failed to parse resume data");
        }
    }
    throw new Error("No data generated");
};

// --- 5. Import Analyzer ---

export const analyzeImportedText = async (text: string): Promise<ImportData> => {
    const ai = new GoogleGenAI({ apiKey: API_KEY });
    const model = 'gemini-3-flash-preview';

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
    return {
        sourceText: text,
        parsedSummary: parsed.summary || "Imported Resume",
        extractionDate: Date.now()
    };
};

// --- 6. Resume Evaluator ---

export const evaluateResume = async (data: ResumeData, roleType: RoleType): Promise<EvaluationResult> => {
    const ai = new GoogleGenAI({ apiKey: API_KEY });
    const model = 'gemini-3-flash-preview';

    const prompt = `
    Evaluate this resume for ${roleType}.
    
    DATA: ${JSON.stringify(data)}
    
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
       - ${roleType === 'consultant'
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
    return {
        ...result,
        isPassing: (result.totalScore || 0) >= 80
    };
};
