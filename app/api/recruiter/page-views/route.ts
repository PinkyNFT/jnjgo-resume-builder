import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';
import { connectToDatabase } from '../../../../lib/mongodb';
import {
    RecruiterPageViewModel,
    CandidatePublicPageModel,
    CandidatePrivateProfileModel,
    UserProfileModel,
    ProjectModel,
} from '../../../../lib/models';
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
 * - Default: Returns count of unique candidate profiles viewed by the authenticated recruiter.
 * - ?type=recent&limit=12: Returns a paginated list of recently viewed candidate cards,
 *   deduped by candidateUserId (most recent view per candidate), enriched with profile data.
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

        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type');

        // ── Recently viewed list ──────────────────────────────────────────────
        if (type === 'recent') {
            const limit = Math.min(20, Math.max(1, parseInt(searchParams.get('limit') || '12')));

            // Aggregate: most recent view per unique candidateUserId
            const recentViews = await RecruiterPageViewModel.aggregate([
                { $match: { userId: session.user.id } },
                { $sort: { viewedAt: -1 } },
                {
                    $group: {
                        _id: '$candidateUserId',
                        candidateUserId: { $first: '$candidateUserId' },
                        viewedAt: { $first: '$viewedAt' },
                    },
                },
                { $sort: { viewedAt: -1 } },
                { $limit: limit },
            ]);

            if (recentViews.length === 0) {
                return NextResponse.json({ candidates: [] }, { status: 200 });
            }

            const userIds = recentViews.map((v: any) => v.candidateUserId);

            // Fetch all profile data in parallel
            const [privateProfiles, userProfiles, publicPages] = await Promise.all([
                CandidatePrivateProfileModel.find(
                    { userId: { $in: userIds }, status: 'published', 'visibilityFlags.isRecruiterOnly': true },
                    {
                        userId: 1, orientation: 1, jobChangeIntent: 1,
                        aiObjectiveReview: 1, desiredSalary: 1, desiredRoles: 1,
                        highlightedProjectId: 1, updatedAt: 1,
                    }
                ).lean(),
                UserProfileModel.find({ userId: { $in: userIds } }, { userId: 1, fullName: 1, location: 1 }).lean(),
                CandidatePublicPageModel.find(
                    { userId: { $in: userIds }, isActive: true },
                    { userId: 1, pageSlug: 1 }
                ).lean(),
            ]);

            // Fetch highlighted projects
            const projectIds = privateProfiles
                .map((p: any) => p.highlightedProjectId)
                .filter((id: any): id is string => !!id);

            const highlightedProjects = projectIds.length > 0
                ? await ProjectModel.find(
                    { id: { $in: projectIds } },
                    { 'data.currentRole': 1, 'data.skills': 1, 'data.contactInfo.location': 1, id: 1, userId: 1 }
                ).lean()
                : [];

            // Build lookup maps
            const profileMap = new Map((privateProfiles as any[]).map(p => [p.userId, p]));
            const userProfileMap = new Map((userProfiles as any[]).map(u => [u.userId, u]));
            const publicPageMap = new Map((publicPages as any[]).map(p => [p.userId, p]));
            const projectMap = new Map((highlightedProjects as any[]).map((p: any) => [p.id, p]));
            // Map viewedAt by userId for ordering
            const viewedAtMap = new Map(recentViews.map((v: any) => [v.candidateUserId, v.viewedAt]));

            // Compose candidate cards in viewedAt order
            const candidates = userIds
                .map((uid: string) => {
                    const profile = profileMap.get(uid);
                    if (!profile) return null; // profile unpublished/deleted
                    const userProfile = userProfileMap.get(uid);
                    const publicPage = publicPageMap.get(uid);
                    const project = (profile as any).highlightedProjectId
                        ? projectMap.get((profile as any).highlightedProjectId)
                        : null;

                    return {
                        userId: uid,
                        fullName: (userProfile as any)?.fullName || (project as any)?.data?.fullName || null,
                        location: (userProfile as any)?.location || (project as any)?.data?.contactInfo?.location || null,
                        orientation: (profile as any).orientation || null,
                        jobChangeIntent: (profile as any).jobChangeIntent || null,
                        aiObjectiveReview: (profile as any).aiObjectiveReview || null,
                        desiredSalary: (profile as any).desiredSalary || null,
                        desiredRoles: (profile as any).desiredRoles || [],
                        highlightedResume: project ? {
                            currentRole: (project as any).data?.currentRole || null,
                            skills: ((project as any).data?.skills || []).slice(0, 8),
                        } : null,
                        slug: (publicPage as any)?.pageSlug || null,
                        viewedAt: (viewedAtMap.get(uid) as Date)?.getTime?.() ?? null,
                    };
                })
                .filter(Boolean);

            return NextResponse.json({ candidates }, { status: 200 });
        }

        // ── Default: unique profile count ─────────────────────────────────────
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
