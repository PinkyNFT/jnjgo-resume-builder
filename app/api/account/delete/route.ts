import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { routeErrorResponse } from '@/lib/api-error';
import { connectToDatabase } from '@/lib/mongodb';
import clientPromise from '@/lib/mongodb-client';
import {
    UserProfileModel,
    ProjectModel,
    ResumeVersionModel,
    CandidatePrivateProfileModel,
    CandidatePublicPageModel,
    ExportEventModel,
    RecruiterProfileModel,
    RecruiterActionModel,
    CandidateReplyModel,
    RecruiterPageViewModel,
} from '@/lib/models';
import { getUserId } from '@/lib/auth-helpers';

export async function DELETE(request: NextRequest) {
    try {
        // userId comes from the session — a user can only delete their own account.
        const userId = await getUserId(request);

        await connectToDatabase();
        const client = await clientPromise;
        const db = client.db();

        await Promise.all([
            // Application data
            UserProfileModel.deleteMany({ userId }),
            ProjectModel.deleteMany({ userId }),
            ResumeVersionModel.deleteMany({ userId }),
            CandidatePrivateProfileModel.deleteMany({ userId }),
            CandidatePublicPageModel.deleteMany({ userId }),
            ExportEventModel.deleteMany({ userId }),
            RecruiterProfileModel.deleteMany({ userId }),
            RecruiterActionModel.deleteMany({ $or: [{ recruiterId: userId }, { candidateUserId: userId }] }),
            CandidateReplyModel.deleteMany({ $or: [{ candidateUserId: userId }, { recruiterId: userId }] }),
            RecruiterPageViewModel.deleteMany({ $or: [{ userId }, { candidateUserId: userId }] }),
            // NextAuth auth records — removes the ability to sign back in with the same account
            db.collection('users').deleteOne({ _id: new ObjectId(userId) }),
            db.collection('accounts').deleteMany({ userId }),
            db.collection('sessions').deleteMany({ userId }),
        ]);

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        if (error instanceof NextResponse) return error;
        return routeErrorResponse(error, 'DELETE /api/account/delete');
    }
}
