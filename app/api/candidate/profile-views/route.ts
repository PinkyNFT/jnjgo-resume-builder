import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';
import { routeErrorResponse } from '../../../../lib/api-error';
import { connectToDatabase } from '../../../../lib/mongodb';
import { RecruiterPageViewModel, UserProfileModel } from '../../../../lib/models';
import { applyRateLimit, RATE_LIMITS } from '../../../../lib/rate-limit';

/**
 * GET /api/candidate/profile-views
 * Returns a summary of who viewed the authenticated candidate's profile.
 * - totalViews: all views (authenticated + anonymous)
 * - uniqueRecruiters: count of distinct authenticated recruiters
 * - viewers: list of identified recruiters, deduped, with most recent viewedAt
 * - anonymousCount: views where userId is null
 */
export async function GET(request: NextRequest) {
    try {
        const limited = applyRateLimit(request, 'candidate-profile-views', RATE_LIMITS.standard);
        if (limited) return limited;

        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const role = (session.user as any).role;
        if (role === 'recruiter' || role === 'pending_recruiter' || role === 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        await connectToDatabase();

        const candidateUserId = session.user.id;

        const [totals, viewerAgg] = await Promise.all([
            // Total views + anonymous breakdown
            RecruiterPageViewModel.aggregate<{ total: number; anonymousCount: number }>([
                { $match: { candidateUserId } },
                {
                    $group: {
                        _id: null,
                        total: { $sum: 1 },
                        anonymousCount: { $sum: { $cond: [{ $eq: ['$userId', null] }, 1, 0] } },
                    },
                },
            ]).then(r => r[0] || { total: 0, anonymousCount: 0 }),

            // Identified recruiters: most recent view per userId, with total view count
            RecruiterPageViewModel.aggregate<{ recruiterId: string; viewedAt: Date; totalViews: number }>([
                { $match: { candidateUserId, userId: { $ne: null } } },
                { $sort: { viewedAt: -1 } },
                {
                    $group: {
                        _id: '$userId',
                        recruiterId: { $first: '$userId' },
                        viewedAt: { $first: '$viewedAt' },
                        totalViews: { $sum: 1 },
                    },
                },
                { $sort: { viewedAt: -1 } },
                { $limit: 50 },
            ]),
        ]);

        const recruiterIds = viewerAgg.map(v => v.recruiterId);

        const recruiterProfiles = recruiterIds.length > 0
            ? await UserProfileModel.find(
                { userId: { $in: recruiterIds } },
                { userId: 1, fullName: 1 }
            ).lean()
            : [];

        const nameMap = new Map((recruiterProfiles as any[]).map(p => [p.userId, p.fullName]));

        const viewers = viewerAgg.map(v => ({
            recruiterId: v.recruiterId,
            recruiterName: nameMap.get(v.recruiterId) || null,
            viewedAt: v.viewedAt.getTime(),
            totalViews: v.totalViews,
        }));

        return NextResponse.json({
            totalViews: totals.total,
            anonymousCount: totals.anonymousCount,
            uniqueRecruiters: viewers.length,
            viewers,
        }, { status: 200, headers: { 'Cache-Control': 'private, max-age=60' } });
    } catch (error) {
        return routeErrorResponse(error, 'GET /api/candidate/profile-views');
    }
}
