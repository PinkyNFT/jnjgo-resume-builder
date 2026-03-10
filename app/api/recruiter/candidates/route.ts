import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';
import { connectToDatabase } from '../../../../lib/mongodb';
import {
    CandidatePrivateProfileModel,
    CandidatePublicPageModel,
    UserProfileModel,
    ProjectModel,
} from '../../../../lib/models';
import { applyRateLimit, RATE_LIMITS } from '../../../../lib/rate-limit';

/**
 * GET /api/recruiter/candidates
 * Returns all published candidate profiles that recruiters can browse.
 * Only accessible by authenticated recruiters.
 * Query params: ?page=1&limit=12&search=keyword
 * 
 * Search is performed at the DB level using $regex on orientation,
 * desiredRoles, and aiObjectiveReview fields from the private profile.
 */
export async function GET(request: NextRequest) {
    try {
        const limited = applyRateLimit(request, 'recruiter-candidates', RATE_LIMITS.standard);
        if (limited) return limited;

        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Only recruiters can browse candidates
        if ((session.user as any).role !== 'recruiter') {
            return NextResponse.json({ error: 'Recruiter access required' }, { status: 403 });
        }

        await connectToDatabase();

        const { searchParams } = new URL(request.url);
        const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
        const limit = Math.min(20, Math.max(1, parseInt(searchParams.get('limit') || '12')));
        const search = searchParams.get('search')?.trim() || '';

        // Build match stage with optional search filter at DB level
        const matchStage: Record<string, unknown> = {
            status: 'published',
            'visibilityFlags.isRecruiterOnly': true,
        };

        if (search) {
            // Escape regex special chars for safe DB query
            const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            matchStage.$or = [
                { orientation: { $regex: escaped, $options: 'i' } },
                { aiObjectiveReview: { $regex: escaped, $options: 'i' } },
                { 'desiredRoles.role': { $regex: escaped, $options: 'i' } },
                { jobChangeReasonSummary: { $regex: escaped, $options: 'i' } },
            ];
        }

        // Use projection to exclude heavy fields we don't need for the listing
        const profileProjection = {
            userId: 1,
            orientation: 1,
            jobChangeIntent: 1,
            aiObjectiveReview: 1,
            desiredSalary: 1,
            desiredRoles: 1,
            highlightedProjectId: 1,
            updatedAt: 1,
        };

        const [profiles, totalCount] = await Promise.all([
            CandidatePrivateProfileModel.find(matchStage)
                .select(profileProjection)
                .sort({ updatedAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            CandidatePrivateProfileModel.countDocuments(matchStage),
        ]);

        if (profiles.length === 0) {
            return NextResponse.json({
                candidates: [],
                pagination: { page, limit, total: totalCount, totalPages: Math.ceil(totalCount / limit) },
            });
        }

        // Get userIds from published profiles
        const userIds = profiles.map(p => p.userId);

        // Collect highlighted project IDs
        const projectIds = profiles
            .map(p => p.highlightedProjectId)
            .filter((id): id is string => !!id);

        // Fetch related data in parallel with projections
        const [userProfiles, publicPages, highlightedProjects] = await Promise.all([
            UserProfileModel.find({ userId: { $in: userIds } })
                .select('userId fullName location')
                .lean(),
            CandidatePublicPageModel.find({ userId: { $in: userIds }, isActive: true })
                .select('userId pageSlug')
                .lean(),
            projectIds.length > 0
                ? ProjectModel.find(
                    { id: { $in: projectIds } },
                    { 'data.fullName': 1, 'data.currentRole': 1, 'data.careerSummary': 1, 'data.skills': 1, 'data.contactInfo.location': 1, id: 1, userId: 1 }
                ).lean()
                : Promise.resolve([]),
        ]);

        // Build lookup maps
        const userProfileMap = new Map(userProfiles.map(u => [u.userId, u]));
        const publicPageMap = new Map(publicPages.map(p => [p.userId, p]));
        const highlightedProjectMap = new Map(
            highlightedProjects.map((p: any) => [p.id, p])
        );

        // Compose candidate cards
        const candidates = profiles.map(profile => {
            const userProfile = userProfileMap.get(profile.userId);
            const publicPage = publicPageMap.get(profile.userId);
            const highlightedProject = profile.highlightedProjectId
                ? highlightedProjectMap.get(profile.highlightedProjectId)
                : null;

            return {
                userId: profile.userId,
                fullName: userProfile?.fullName || highlightedProject?.data?.fullName || null,
                location: userProfile?.location || highlightedProject?.data?.contactInfo?.location || null,
                orientation: profile.orientation || null,
                jobChangeIntent: profile.jobChangeIntent || null,
                aiObjectiveReview: profile.aiObjectiveReview || null,
                desiredSalary: profile.desiredSalary || null,
                desiredRoles: profile.desiredRoles || [],
                highlightedResume: highlightedProject ? {
                    currentRole: highlightedProject.data?.currentRole || null,
                    careerSummary: highlightedProject.data?.careerSummary
                        ? highlightedProject.data.careerSummary.substring(0, 200) + (highlightedProject.data.careerSummary.length > 200 ? '...' : '')
                        : null,
                    skills: (highlightedProject.data?.skills || []).slice(0, 8),
                } : null,
                slug: publicPage?.pageSlug || null,
                updatedAt: (profile as any).updatedAt instanceof Date
                    ? (profile as any).updatedAt.getTime()
                    : (profile as any).updatedAt,
            };
        });

        return NextResponse.json({
            candidates,
            pagination: {
                page,
                limit,
                total: totalCount,
                totalPages: Math.ceil(totalCount / limit),
            },
        });
    } catch (error) {
        console.error('Error fetching candidates:', error);
        return NextResponse.json(
            { error: 'Failed to fetch candidates' },
            { status: 500 }
        );
    }
}
