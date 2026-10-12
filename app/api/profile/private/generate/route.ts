import { NextRequest, NextResponse } from 'next/server';
import { applyRateLimitDB, RATE_LIMITS } from '../../../../../lib/rate-limit';
import { resumeForPrompt } from '../../../../../lib/ai-guards';
import { routeErrorResponse } from '../../../../../lib/api-error';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../../lib/auth';
import { connectToDatabase } from '../../../../../lib/mongodb';
import { ProjectModel } from '../../../../../lib/models';
import { generateProfileDraftWithGemini } from '../../../../../lib/gemini-server';

// Explicit cap so a stuck AI call ends instead of running to the platform limit. Recruiter-profile draft.
export const maxDuration = 60;

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = session.user.id;

        // AI call: rate-limited per user like the other AI routes.
        const limited = await applyRateLimitDB(req as NextRequest, 'profile-generate', RATE_LIMITS.ai, userId);
        if (limited) return limited;

        // Ensure database connection
        await connectToDatabase();

        // Fetch the user's latest completed/generated project to use as context
        const latestProject = await ProjectModel.findOne({
            userId,
            status: { $in: ['completed', 'generated'] }
        }).sort({ updatedAt: -1 });

        if (!latestProject) {
            return NextResponse.json(
                { error: 'No completed resume found. Please build a resume first to generate a profile.' },
                { status: 400 }
            );
        }

        // Prepare context for Gemini
        // We stringify the structured data to give Gemini all the clues it needs to infer intent/salary/orientation
        // The resume goes in without its photo (a base64 data URL worth 38k–77k tokens).
        const candidateContext = JSON.stringify({
            resumeData: JSON.parse(resumeForPrompt(latestProject.data)),
            chatHistory: latestProject.history.slice(-10) // Last 10 messages for context
        });

        // Call Gemini to generate the draft
        const draftProfile = await generateProfileDraftWithGemini(candidateContext, userId);

        if (!draftProfile) {
            throw new Error('Received empty draft from Gemini');
        }

        // Merge necessary fields to make the draft ready for the frontend, but we don't save it yet.
        // It's just a draft that the user needs to confirm on the client side.
        const responseData = {
            ...draftProfile,
            userId,
            status: 'draft',
        };

        return NextResponse.json(responseData);

    } catch (error) {
        return routeErrorResponse(error, 'POST /api/profile/private/generate');
    }
}
