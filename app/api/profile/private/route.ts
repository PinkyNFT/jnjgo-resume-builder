import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';
import { connectToDatabase } from '../../../../lib/mongodb';
import { CandidatePrivateProfileModel, CandidatePublicPageModel } from '../../../../lib/models';
import { CandidatePrivateProfile } from '../../../../types';

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectToDatabase();

        const profile = await CandidatePrivateProfileModel.findOne({ userId: session.user.id }).lean();

        if (!profile) return NextResponse.json(null);

        // Serialize for client: _id -> id, Date -> number
        const serialized = {
            ...profile,
            id: (profile as any)._id?.toString(),
            userId: profile.userId,
            createdAt: (profile as any).createdAt instanceof Date ? (profile as any).createdAt.getTime() : (profile as any).createdAt,
            updatedAt: (profile as any).updatedAt instanceof Date ? (profile as any).updatedAt.getTime() : (profile as any).updatedAt,
        };
        delete (serialized as any)._id;
        delete (serialized as any).__v;
        return NextResponse.json(serialized);
    } catch (error) {
        console.error('Error fetching private profile:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    return handleSaveOrUpdate(req);
}

export async function PUT(req: Request) {
    return handleSaveOrUpdate(req);
}

async function handleSaveOrUpdate(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const raw = await req.json();
        const userId = session.user.id;

        await connectToDatabase();

        // Strip server-controlled and unsafe fields; drop undefined so we don't overwrite with undefined
        const data: Partial<CandidatePrivateProfile> = { ...raw };
        delete (data as any).userId;
        delete (data as any).id;
        delete (data as any)._id;
        delete (data as any).createdAt;
        delete (data as any).updatedAt;
        Object.keys(data).forEach(k => { if ((data as any)[k] === undefined) delete (data as any)[k]; });

        // Upsert the profile: update if exists, insert if it doesn't
        const updatedProfile = await CandidatePrivateProfileModel.findOneAndUpdate(
            { userId },
            { $set: data },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );

        // FEAT C: Guarantee a permanent Public Page slug if published (for link injection)
        if (updatedProfile?.status === 'published' || data.status === 'published') {
            const existingPublicPage = await CandidatePublicPageModel.findOne({ userId });

            if (!existingPublicPage) {
                // Generate a random 8-character numeric slug
                const generateSlug = () => Math.floor(10000000 + Math.random() * 90000000).toString();
                let newSlug = generateSlug();

                // Ensure unique
                while (await CandidatePublicPageModel.findOne({ pageSlug: newSlug })) {
                    newSlug = generateSlug();
                }

                await CandidatePublicPageModel.create({
                    userId,
                    pageSlug: newSlug,
                    isActive: true,
                });
            } else if (!existingPublicPage.isActive) {
                existingPublicPage.isActive = true;
                await existingPublicPage.save();
            }
        }

        // Serialize response for client
        const doc = typeof updatedProfile!.toObject === 'function' ? updatedProfile!.toObject() : updatedProfile!;
        const out: Record<string, unknown> = { ...doc, id: (doc as any)._id?.toString(), userId: doc.userId };
        delete out._id;
        delete out.__v;
        if ((out as any).createdAt instanceof Date) (out as any).createdAt = (out as any).createdAt.getTime();
        if ((out as any).updatedAt instanceof Date) (out as any).updatedAt = (out as any).updatedAt.getTime();
        return NextResponse.json(out);
    } catch (error) {
        console.error('Error saving private profile:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
