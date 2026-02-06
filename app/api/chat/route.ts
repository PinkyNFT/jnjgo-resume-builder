import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { Message, RoleType, ImportData, ResumeData } from '@/types';
import { GEMINI_MODEL } from '@/config/models';

// Validate API key exists
const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
    console.error('GEMINI_API_KEY environment variable is not set');
}

// Helper to generate system instructions
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

export async function POST(request: NextRequest) {
    try {
        if (!API_KEY) {
            return NextResponse.json(
                { error: 'Server configuration error: API key not configured' },
                { status: 500 }
            );
        }

        const body = await request.json();
        const { action, message, history, roleType, importData, initialData } = body;

        const ai = new GoogleGenAI({ apiKey: API_KEY });

        const model = GEMINI_MODEL;

        // Handle different chat actions
        if (action === 'sendMessage') {
            // Create chat with history
            const chat = ai.chats.create({
                model,
                config: {
                    systemInstruction: getSystemInstruction(roleType, importData, initialData),
                    temperature: 0.7,
                },
                history: history ? history.map((h: Message) => ({
                    role: h.role,
                    parts: [{ text: h.text }]
                })) : []
            });

            const response = await chat.sendMessage({ message });
            return NextResponse.json({ text: response.text });

        } else if (action === 'generateHint') {
            // Generate helpful hint
            const chat = ai.chats.create({
                model,
                config: {
                    systemInstruction: getSystemInstruction(roleType, importData, initialData),
                    temperature: 0.7,
                },
                history: history ? history.map((h: Message) => ({
                    role: h.role,
                    parts: [{ text: h.text }]
                })) : []
            });

            const hintPrompt = "User needs help. Give a friendly example with specific numbers or details.";
            const response = await chat.sendMessage({ message: hintPrompt });
            return NextResponse.json({
                hint: response.text || "For example: 'Led a team of 5 engineers' or 'Increased revenue by 30%'"
            });

        } else {
            return NextResponse.json(
                { error: 'Invalid action' },
                { status: 400 }
            );
        }

    } catch (error) {
        console.error('Chat API error:', error);
        return NextResponse.json(
            { error: 'Failed to process chat request', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
