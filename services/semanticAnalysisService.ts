/**
 * AI-powered semantic analysis service
 * Uses Gemini to validate conversation completeness
 * Production-grade approach for world-class applications
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { Message } from '../types';

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || '');

export interface SemanticGapAnalysis {
    hasUnresolvedGaps: boolean;
    confidence: number;
    summary: string;
    unansweredQuestions: string[];
    recommendations: string[];
}

/**
 * Uses AI to analyze if gap questions were adequately answered
 * Much more accurate than keyword matching
 */
export async function analyzeGapQualityWithAI(
    messages: Message[]
): Promise<SemanticGapAnalysis> {
    try {
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.0-flash-exp',
            generationConfig: {
                temperature: 0.1, // Low temperature for consistent analysis
                maxOutputTokens: 500,
            }
        });

        // Build conversation context
        const conversationText = messages
            .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.text}`)
            .join('\n\n');

        const prompt = `Analyze this resume interview conversation for employment gap coverage.

CONVERSATION:
${conversationText}

TASK: Determine if any employment/career gap questions were asked and not adequately answered.

A gap question is adequately answered if the user provides:
- Specific reason for the gap (medical, family, education, job search, etc.)
- Approximate duration or timeframe
- Any relevant activities during that time

Return ONLY a JSON object with this exact structure:
{
  "hasUnresolvedGaps": boolean,
  "confidence": number (0-1),
  "summary": "brief explanation",
  "unansweredQuestions": ["list of questions not adequately answered"],
  "recommendations": ["what still needs to be covered"]
}

Be lenient - if user provided reasonable explanation, mark as resolved.`;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        // Parse JSON response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('Invalid AI response format');
        }

        const analysis = JSON.parse(jsonMatch[0]) as SemanticGapAnalysis;

        // Validate response structure
        if (
            typeof analysis.hasUnresolvedGaps !== 'boolean' ||
            typeof analysis.confidence !== 'number' ||
            typeof analysis.summary !== 'string'
        ) {
            throw new Error('Invalid analysis structure');
        }

        return analysis;
    } catch (error) {
        console.error('Semantic gap analysis failed:', error);

        // Fallback to conservative estimate
        return {
            hasUnresolvedGaps: false, // Fail open - don't block users
            confidence: 0.5,
            summary: 'Unable to perform AI analysis, assuming gaps are covered',
            unansweredQuestions: [],
            recommendations: [],
        };
    }
}

/**
 * Cached analysis to avoid redundant API calls
 */
const analysisCache = new Map<string, {
    analysis: SemanticGapAnalysis;
    timestamp: number;
}>();

const CACHE_TTL = 60000; // 1 minute

function getCacheKey(messages: Message[]): string {
    // Create deterministic hash of conversation
    return JSON.stringify(messages.map(m => ({ r: m.role, t: m.text.substring(0, 100) })));
}

/**
 * Cached version of AI analysis
 * Prevents redundant API calls for same conversation
 */
export async function analyzeGapQualityWithAICached(
    messages: Message[]
): Promise<SemanticGapAnalysis> {
    const key = getCacheKey(messages);
    const cached = analysisCache.get(key);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.analysis;
    }

    const analysis = await analyzeGapQualityWithAI(messages);
    analysisCache.set(key, { analysis, timestamp: Date.now() });

    return analysis;
}

/**
 * Batch analysis for multiple conversations
 * More efficient than individual calls
 */
export async function batchAnalyzeGapQuality(
    conversationSets: Message[][]
): Promise<SemanticGapAnalysis[]> {
    return Promise.all(
        conversationSets.map(messages => analyzeGapQualityWithAICached(messages))
    );
}

/**
 * Real-time streaming analysis for immediate feedback
 * Shows progress as AI processes the conversation
 */
export async function streamGapAnalysis(
    messages: Message[],
    onProgress: (partial: Partial<SemanticGapAnalysis>) => void
): Promise<SemanticGapAnalysis> {
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

        const conversationText = messages
            .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.text}`)
            .join('\n\n');

        const prompt = `Analyze this conversation for employment gap coverage and return JSON...
${conversationText}`;

        const result = await model.generateContentStream(prompt);
        let fullText = '';

        for await (const chunk of result.stream) {
            fullText += chunk.text();

            // Try to parse partial JSON
            const jsonMatch = fullText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                try {
                    const partial = JSON.parse(jsonMatch[0]);
                    onProgress(partial);
                } catch {
                    // Not complete JSON yet
                }
            }
        }

        const jsonMatch = fullText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('Invalid response');
        }

        return JSON.parse(jsonMatch[0]);
    } catch (error) {
        console.error('Stream analysis failed:', error);
        return {
            hasUnresolvedGaps: false,
            confidence: 0.5,
            summary: 'Analysis failed',
            unansweredQuestions: [],
            recommendations: [],
        };
    }
}
