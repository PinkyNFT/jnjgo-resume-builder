import { GoogleGenAI } from "@google/genai";
import * as Sentry from "@sentry/nextjs";
import { CandidatePrivateProfile } from "../types";
import { RECRUITER_PROFILE_GENERATION_PROMPT } from "./profile-prompts";
import { GEMINI_MODEL } from "../config/models";
import { logAiUsage } from "./ai-usage";

const ROUTE = 'profile/private/generate';

/**
 * Generate a CandidatePrivateProfile draft using Gemini based on provided text data.
 * Uses the same @google/genai SDK and model as the rest of the application.
 */
export async function generateProfileDraftWithGemini(candidateContext: string, userId: string): Promise<Partial<CandidatePrivateProfile>> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not configured");
    }

    const ai = new GoogleGenAI({ apiKey });

    const prompt = RECRUITER_PROFILE_GENERATION_PROMPT.replace('{{CANDIDATE_DATA}}', candidateContext);

    try {
        const response = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents: prompt,
            config: {
                temperature: 0.2,
                responseMimeType: "application/json",
            },
        });
        logAiUsage({ route: ROUTE, model: GEMINI_MODEL, userId, response, success: true });

        const responseText = response.text;
        if (!responseText) {
            throw new Error("Empty response from Gemini");
        }

        const parsedDraft = JSON.parse(responseText) as Partial<CandidatePrivateProfile>;
        return parsedDraft;
    } catch (error) {
        console.error("Gemini profile generation failed:", error);
        logAiUsage({
            route: ROUTE, model: GEMINI_MODEL, userId, success: false,
            errorMessage: error instanceof Error ? error.message : String(error),
        });
        Sentry.captureException(error, { tags: { aiRoute: ROUTE, aiModel: GEMINI_MODEL } });
        throw new Error("Failed to generate profile draft with AI.");
    }
}
