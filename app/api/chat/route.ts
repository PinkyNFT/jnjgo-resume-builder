import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { Message, RoleType, ImportData, ResumeData } from '@/types';
import { GEMINI_MODEL } from '@/config/models';
import { getSystemInstruction } from '@/lib/prompts';
import { getAdminAIConfig } from '@/lib/admin-settings-reader';
import { applyRateLimitDB, RATE_LIMITS } from '@/lib/rate-limit';
import { callWithRetry } from '@/lib/gemini-client';
import { auth } from '@/lib/auth';
import { aiErrorPayload } from '@/lib/ai-errors';

// Validate API key exists
const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
    console.error('GEMINI_API_KEY environment variable is not set');
}

/**
 * Detect which sections the agent marked as complete (✓) in its response,
 * and whether it's offering to generate the resume (overall readiness).
 */
function detectAgentProgress(text: string): { completedSections: string[]; agentReady: boolean } {
    const completedSections: string[] = [];

    // Detect ✓-marked sections (English + Japanese)
    const sectionPatterns: [RegExp, string][] = [
        [/✓\s*(work\s*history|work|職務経歴|職歴)/i, 'work'],
        [/✓\s*(experience\s*detail|detail|project|経験.*詳細|詳細)/i, 'details'],
        [/✓\s*(education|学歴)/i, 'education'],
        [/✓\s*(skill|スキル)/i, 'skills'],
        [/✓\s*(cert|certification|資格)/i, 'certifications'],
        [/✓\s*(gap|career\s*gap|ギャップ)/i, 'gaps'],
    ];

    for (const [pattern, id] of sectionPatterns) {
        if (pattern.test(text)) {
            completedSections.push(id);
        }
    }

    // Detect overall readiness: agent offering to generate with multiple ✓ marks
    const checkmarkCount = (text.match(/✓/g) || []).length;
    const readyPatterns = [
        /i have everything.*need/i,
        /ready to generate/i,
        /generate.*resume\??/i,
        /shall\s*(i|we)\s*generate/i,
        /want me to generate/i,
        /すべて.*揃いました/,
        /生成しますか/,
        /レジュメ.*生成/,
    ];
    const hasReadyPhrase = readyPatterns.some(p => p.test(text));
    const agentReady = (checkmarkCount >= 4 && hasReadyPhrase) || (checkmarkCount >= 5);

    return { completedSections, agentReady };
}

export async function POST(request: NextRequest) {
    let locale: string | undefined;
    try {
        // Rate limit AI calls — these are the most expensive operations
        const limited = await applyRateLimitDB(request, 'chat', RATE_LIMITS.ai);
        if (limited) return limited;

        const body = await request.json();
        const { action, message, history, roleType, importData, initialData } = body;
        locale = body.locale;

        if (!API_KEY) {
            const { body: errBody, status } = aiErrorPayload(null, locale, 'config');
            return NextResponse.json(errBody, { status });
        }

        const ai = new GoogleGenAI({ apiKey: API_KEY });

        // Read model and temperature from admin settings (cached, fast)
        const aiConfig = await getAdminAIConfig();
        const model = aiConfig.model;
        const temperature = aiConfig.temperature;

        // Best-effort attribution for cost logging — this route has no auth gate,
        // so userId is null (falls back to IP) for anonymous callers.
        const session = await auth().catch(() => null);
        const userId = session?.user?.id ?? null;

        // Handle different chat actions
        if (action === 'sendMessage') {
            // Resolve system instruction from DB (or fallback)
            const systemInstruction = await getSystemInstruction(roleType, importData, initialData, locale || 'en');

            // Create chat with history
            const chat = ai.chats.create({
                model,
                config: {
                    systemInstruction,
                    temperature,
                },
                history: history ? history.map((h: Message) => ({
                    role: h.role,
                    parts: [{ text: h.text }]
                })) : []
            });

            const response = await callWithRetry(() => chat.sendMessage({ message }), 'chat/sendMessage', {
                route: 'chat/sendMessage', model, userId, request,
            });

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

            // Detect agent-reported section progress and readiness
            const { completedSections, agentReady } = detectAgentProgress(responseText || '');

            return NextResponse.json({
                text: responseText,
                phase: isConfirmation ? 'confirmation' : undefined,
                completedSections,
                agentReady,
            });

        } else if (action === 'generateHint') {
            // Resolve system instruction from DB (or fallback)
            const systemInstruction = await getSystemInstruction(roleType, importData, initialData, locale || 'en');

            // Generate helpful hint
            const chat = ai.chats.create({
                model,
                config: {
                    systemInstruction,
                    temperature,
                },
                history: history ? history.map((h: Message) => ({
                    role: h.role,
                    parts: [{ text: h.text }]
                })) : []
            });

            const hintPrompt = locale === 'ja'
                ? "ユーザーが助けを求めています。具体的な数字や詳細を含むフレンドリーな例を挙げてください。"
                : "User needs help. Give a friendly example with specific numbers or details.";

            const response = await callWithRetry(() => chat.sendMessage({ message: hintPrompt }), 'chat/generateHint', {
                route: 'chat/generateHint', model, userId, request,
            });
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
        const { body: errBody, status } = aiErrorPayload(error, locale);
        return NextResponse.json(errBody, { status });
    }
}
