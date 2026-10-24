import { GoogleGenAI } from "@google/genai";
import { CandidatePrivateProfile } from "../types";
import { RECRUITER_PROFILE_GENERATION_PROMPT } from "./profile-prompts";
import { getAdminAIConfig } from "./admin-settings-reader";
import { BetaLimitError } from "./ai-errors";
import { callWithRetry, isCompleteJson, structuredOutput } from "./gemini-client";

const ROUTE = 'profile/private/generate';

/**
 * Generate a CandidatePrivateProfile draft using Gemini based on provided text data.
 * Goes through callWithRetry like every other AI call, so it uses the admin-set
 * model, draws on the shared beta credits, and is logged for usage.
 */
export async function generateProfileDraftWithGemini(candidateContext: string, userId: string): Promise<Partial<CandidatePrivateProfile>> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not configured");
    }

    const ai = new GoogleGenAI({ apiKey });
    const { model } = await getAdminAIConfig();
    const prompt = RECRUITER_PROFILE_GENERATION_PROMPT.replace('{{CANDIDATE_DATA}}', candidateContext);

    try {
        const response = await callWithRetry(() => ai.models.generateContent({
            model,
            contents: prompt,
            config: {
                ...structuredOutput(model),
                temperature: 0.2,
                responseMimeType: "application/json",
            },
        }), ROUTE, { route: ROUTE, model, userId }, { maxAttempts: 2 });

        if (!isCompleteJson(response.text)) {
            throw new Error("Empty or incomplete response from Gemini");
        }
        return JSON.parse(response.text!) as Partial<CandidatePrivateProfile>;
    } catch (error) {
        // Out of beta credits: let the route say so instead of a generic failure.
        if (error instanceof BetaLimitError) throw error;
        console.error("Gemini profile generation failed:", error);
        throw new Error("Failed to generate profile draft with AI.");
    }
}
