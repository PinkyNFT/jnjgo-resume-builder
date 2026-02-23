import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../../lib/auth';
import { connectToDatabase } from '../../../../../lib/mongodb';
import { ProjectModel } from '../../../../../lib/models';
import { generateProfileDraftWithGemini } from '../../../../../lib/gemini-server';

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = session.user.id;

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
        const candidateContext = JSON.stringify({
            resumeData: latestProject.data,
            chatHistory: latestProject.history.slice(-10) // Last 10 messages for context
        });

        // Call Gemini to generate the draft
        const draftProfile = await generateProfileDraftWithGemini(candidateContext);

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
        console.error('Error generating Private Profile Draft:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error while generating profile draft.' },
            { status: 500 }
        );
    }
}
