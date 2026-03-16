import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';
import { connectToDatabase } from '../../../../lib/mongodb';
import { RecruiterPageViewModel, CandidatePublicPageModel } from '../../../../lib/models';
import { applyRateLimit, RATE_LIMITS } from '../../../../lib/rate-limit';

const ANONYMOUS_ID_REGEX = /^[a-zA-Z0-9_-]{8,64}$/;
const SLUG_REGEX = /^[a-zA-Z0-9_-]{1,100}$/;
const MAX_SOURCE_LENGTH = 200;

function sanitizeSource(val: unknown): string | undefined {
    if (typeof val !== 'string' || val.length === 0) return undefined;
    return val.slice(0, MAX_SOURCE_LENGTH);
}

/**
 * GET /api/recruiter/page-views
 * Returns the count of unique candidate profiles viewed by the authenticated recruiter.
 */
export async function GET(request: NextRequest) {
    try {
        const limited = applyRateLimit(request, 'page-views-stats', RATE_LIMITS.standard);
        if (limited) return limited;

        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectToDatabase();

        // Use aggregation pipeline for efficient counting at scale
        // This counts in the database rather than fetching all IDs to memory
        const result = await RecruiterPageViewModel.aggregate([
            { $match: { userId: session.user.id } },
            { $group: { _id: '$candidateUserId' } },
            { $count: 'total' },
        ]);

        const profilesViewed = result[0]?.total ?? 0;

        return NextResponse.json(
            { profilesViewed },
            { status: 200, headers: { 'Cache-Control': 'private, max-age=60' } }
        );
    } catch (error) {
        console.error('Error fetching page view stats:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

/**
 * POST /api/recruiter/page-views
 * Records an anonymous or authenticated page view on a candidate landing page.
 */
export async function POST(request: NextRequest) {
    try {
        const limited = applyRateLimit(request, 'page-views', RATE_LIMITS.standard);
        if (limited) return limited;

        const body = await request.json();
        const { anonymousId, candidatePageSlug, source } = body;

        if (!anonymousId || !ANONYMOUS_ID_REGEX.test(anonymousId)) {
            return NextResponse.json({ error: 'Invalid anonymousId' }, { status: 400 });
        }
        if (!candidatePageSlug || !SLUG_REGEX.test(candidatePageSlug)) {
            return NextResponse.json({ error: 'Invalid candidatePageSlug' }, { status: 400 });
        }

        await connectToDatabase();

        // Look up candidateUserId from the slug
        const publicPage = await CandidatePublicPageModel.findOne(
            { pageSlug: candidatePageSlug, isActive: true },
            { userId: 1 }
        ).lean();

        if (!publicPage) {
            return NextResponse.json({ error: 'Candidate page not found' }, { status: 404 });
        }

        const session = await getServerSession(authOptions);
        const userId = session?.user?.id || null;

        await RecruiterPageViewModel.create({
            userId,
            anonymousId,
            candidatePageSlug,
            candidateUserId: publicPage.userId,
            source: {
                ref: sanitizeSource(source?.ref),
                site: sanitizeSource(source?.site),
                utm_campaign: sanitizeSource(source?.utm_campaign),
                utm_medium: sanitizeSource(source?.utm_medium),
            },
            isAuthenticated: !!userId,
            viewedAt: new Date(),
        });

        return NextResponse.json({ ok: true }, { status: 201 });
    } catch (error) {
        console.error('Error recording page view:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

/**
 * PATCH /api/recruiter/page-views
 * Claims anonymous page views by attaching a userId to all records with a matching anonymousId.
 * Called after recruiter login/signup to enable pre-gate attribution.
 */
export async function PATCH(request: NextRequest) {
    try {
        const limited = applyRateLimit(request, 'page-views-claim', RATE_LIMITS.write);
        if (limited) return limited;

        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { anonymousId } = body;

        if (!anonymousId || !ANONYMOUS_ID_REGEX.test(anonymousId)) {
            return NextResponse.json({ error: 'Invalid anonymousId' }, { status: 400 });
        }

        await connectToDatabase();

        const result = await RecruiterPageViewModel.updateMany(
            { anonymousId, userId: null },
            { $set: { userId: session.user.id, isAuthenticated: true } }
        );

        return NextResponse.json({ claimed: result.modifiedCount }, { status: 200 });
    } catch (error) {
        console.error('Error claiming page views:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
