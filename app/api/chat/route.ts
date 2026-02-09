import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { Message, RoleType, ImportData, ResumeData } from '@/types';
import { GEMINI_MODEL } from '@/config/models';
import { getSystemInstruction } from '@/lib/prompts';

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
        const { action, message, history, roleType, importData, initialData, locale } = body;

        const ai = new GoogleGenAI({ apiKey: API_KEY });

        const model = GEMINI_MODEL;

        // Handle different chat actions
        if (action === 'sendMessage') {
            // Create chat with history
            const chat = ai.chats.create({
                model,
                config: {
                    systemInstruction: getSystemInstruction(roleType, importData, initialData, locale || 'en'),
                    temperature: 0.7,
                },
                history: history ? history.map((h: Message) => ({
                    role: h.role,
                    parts: [{ text: h.text }]
                })) : []
            });

            const response = await chat.sendMessage({ message });

            // Auto-detect confirmation phase based on response content
            const responseText = response.text;
            const isConfirmation = responseText && (
                responseText.includes('Is this correct?') ||
                responseText.includes('Is this complete?') ||
                responseText.includes('Would you like to add') ||
                responseText.includes('before we') ||
                responseText.includes('Any other') ||
                (responseText.includes('Got it!') && responseText.includes('?')) ||
                (responseText.includes('So you have:') || responseText.includes('Here\'s what I have')) ||
                // Japanese detection
                responseText.includes('よろしいでしょうか') ||
                responseText.includes('合っていますか') ||
                responseText.includes('追加したい') ||
                responseText.includes('生成しますか')
            );

            return NextResponse.json({
                text: responseText,
                phase: isConfirmation ? 'confirmation' : undefined
            });

        } else if (action === 'generateHint') {
            // Generate helpful hint
            const chat = ai.chats.create({
                model,
                config: {
                    systemInstruction: getSystemInstruction(roleType, importData, initialData, locale || 'en'),
                    temperature: 0.7,
                },
                history: history ? history.map((h: Message) => ({
                    role: h.role,
                    parts: [{ text: h.text }]
                })) : []
            });

            const hintPrompt = locale === 'ja'
                ? "ユーザーが助けを求めています。具体的な数字や詳細を含むフレンドリーな例を挙げてください。"
                : "User needs help. Give a friendly example with specific numbers or details.";

            const response = await chat.sendMessage({ message: hintPrompt });
            return NextResponse.json({
                hint: response.text || (locale === 'ja'
                    ? "例：「5人のエンジニアチームを率いた」や「収益を30%増加させた」"
                    : "For example: 'Led a team of 5 engineers' or 'Increased revenue by 30%'")
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
