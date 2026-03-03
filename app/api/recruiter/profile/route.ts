import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';
import { connectToDatabase } from '../../../../lib/mongodb';
import { RecruiterProfileModel } from '../../../../lib/models';
import clientPromise from '../../../../lib/mongodb-client';
import { ObjectId } from 'mongodb';

/**
 * GET /api/recruiter/profile
 * Returns the current recruiter's profile
 */
export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Verify user is a recruiter
        const client = await clientPromise;
        const db = client.db();
        const user = await db.collection('users').findOne(
            { _id: new ObjectId(session.user.id) },
            { projection: { role: 1 } }
        );

        if (user?.role !== 'recruiter' && user?.role !== 'pending_recruiter') {
            return NextResponse.json({ error: 'Recruiter access required' }, { status: 403 });
        }

        await connectToDatabase();

        const profile = await RecruiterProfileModel.findOne({ userId: session.user.id }).lean();

        if (!profile) {
            return NextResponse.json(null);
        }

        const serialized = {
            ...profile,
            id: (profile as any)._id?.toString(),
            createdAt: (profile as any).createdAt instanceof Date ? (profile as any).createdAt.getTime() : (profile as any).createdAt,
            updatedAt: (profile as any).updatedAt instanceof Date ? (profile as any).updatedAt.getTime() : (profile as any).updatedAt,
        };
        delete (serialized as any)._id;
        delete (serialized as any).__v;

        return NextResponse.json(serialized);
    } catch (error) {
        console.error('Error fetching recruiter profile:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

/**
 * POST /api/recruiter/profile
 * Create or update recruiter profile (used during onboarding & later edits)
 */
export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Verify user is a recruiter
        const client = await clientPromise;
        const db = client.db();
        const user = await db.collection('users').findOne(
            { _id: new ObjectId(session.user.id) },
            { projection: { role: 1 } }
        );

        if (user?.role !== 'recruiter' && user?.role !== 'pending_recruiter') {
            return NextResponse.json({ error: 'Recruiter access required' }, { status: 403 });
        }

        const raw = await req.json();
        const userId = session.user.id;

        await connectToDatabase();

        // Sanitize input
        const data: Record<string, any> = {};
        const allowedFields = ['companyName', 'jobTitle', 'phone', 'companyWebsite', 'companySize', 'industry', 'bio', 'onboardingCompleted'];
        for (const field of allowedFields) {
            if (raw[field] !== undefined) {
                data[field] = raw[field];
            }
        }

        // Validate required fields
        if (!data.companyName || !data.jobTitle) {
            return NextResponse.json(
                { error: 'Company name and job title are required.' },
                { status: 400 }
            );
        }

        const updatedProfile = await RecruiterProfileModel.findOneAndUpdate(
            { userId },
            { $set: data },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );

        const serialized = {
            ...updatedProfile.toObject(),
            id: updatedProfile._id.toString(),
            createdAt: updatedProfile.createdAt instanceof Date ? updatedProfile.createdAt.getTime() : updatedProfile.createdAt,
            updatedAt: updatedProfile.updatedAt instanceof Date ? updatedProfile.updatedAt.getTime() : updatedProfile.updatedAt,
        };
        delete (serialized as any)._id;
        delete (serialized as any).__v;

        return NextResponse.json(serialized);
    } catch (error) {
        console.error('Error saving recruiter profile:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
