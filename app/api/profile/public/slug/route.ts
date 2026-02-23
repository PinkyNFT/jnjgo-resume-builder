import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../../lib/auth';
import { connectToDatabase } from '../../../../../lib/mongodb';
import { CandidatePublicPageModel } from '../../../../../lib/models';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) return NextResponse.json({ slug: null });

        await connectToDatabase();
        const pubPage = await CandidatePublicPageModel.findOne({ userId: session.user.id, isActive: true });

        return NextResponse.json({ slug: pubPage ? pubPage.pageSlug : null });
    } catch {
        return NextResponse.json({ slug: null });
    }
}
