import { GoogleGenAI } from "@google/genai";
import { CandidatePrivateProfile } from "../types";
import { RECRUITER_PROFILE_GENERATION_PROMPT } from "./profile-prompts";
import { GEMINI_MODEL } from "../config/models";

/**
 * Generate a CandidatePrivateProfile draft using Gemini based on provided text data.
 * Uses the same @google/genai SDK and model as the rest of the application.
 */
export async function generateProfileDraftWithGemini(candidateContext: string): Promise<Partial<CandidatePrivateProfile>> {
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

        const responseText = response.text;
        if (!responseText) {
            throw new Error("Empty response from Gemini");
        }

        const parsedDraft = JSON.parse(responseText) as Partial<CandidatePrivateProfile>;
        return parsedDraft;
    } catch (error) {
        console.error("Gemini profile generation failed:", error);
        throw new Error("Failed to generate profile draft with AI.");
    }
}
