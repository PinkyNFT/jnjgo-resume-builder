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

/**
 * GET /api/recruiter/candidates
 * Returns all published candidate profiles that recruiters can browse.
 * Only accessible by authenticated recruiters.
 * Query params: ?page=1&limit=12&search=keyword
 */
export async function GET(request: NextRequest) {
    try {
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
        const search = searchParams.get('search') || '';

        // Find all published private profiles
        const matchStage: Record<string, unknown> = {
            status: 'published',
            'visibilityFlags.isRecruiterOnly': true,
        };

        const [profiles, totalCount] = await Promise.all([
            CandidatePrivateProfileModel.find(matchStage)
                .sort({ updatedAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            CandidatePrivateProfileModel.countDocuments(matchStage),
        ]);

        // Get userIds from published profiles
        const userIds = profiles.map(p => p.userId);

        // Fetch user profile info (name, location, etc.) and public page slugs in parallel
        const [userProfiles, publicPages, highlightedProjects] = await Promise.all([
            UserProfileModel.find({ userId: { $in: userIds } }).lean(),
            CandidatePublicPageModel.find({ userId: { $in: userIds }, isActive: true }).lean(),
            // Fetch highlighted project resume data if any
            (async () => {
                const profilesWithHighlight = profiles.filter(p => p.highlightedProjectId);
                if (profilesWithHighlight.length === 0) return [];
                const projectIds = profilesWithHighlight
                    .map(p => p.highlightedProjectId)
                    .filter((id): id is string => !!id);
                return ProjectModel.find(
                    { id: { $in: projectIds } },
                    { 'data.fullName': 1, 'data.currentRole': 1, 'data.careerSummary': 1, 'data.skills': 1, 'data.contactInfo.location': 1, id: 1, userId: 1 }
                ).lean();
            })(),
        ]);

        // Build lookup maps
        const userProfileMap = new Map(userProfiles.map(u => [u.userId, u]));
        const publicPageMap = new Map(publicPages.map(p => [p.userId, p]));
        const highlightedProjectMap = new Map(
            highlightedProjects.map((p: any) => [p.id, p])
        );

        // Compose candidate cards
        let candidates = profiles.map(profile => {
            const userProfile = userProfileMap.get(profile.userId);
            const publicPage = publicPageMap.get(profile.userId);
            const highlightedProject = profile.highlightedProjectId
                ? highlightedProjectMap.get(profile.highlightedProjectId)
                : null;

            return {
                userId: profile.userId,
                // Basic info from user profile
                fullName: userProfile?.fullName || highlightedProject?.data?.fullName || null,
                location: userProfile?.location || highlightedProject?.data?.contactInfo?.location || null,
                // From private profile
                orientation: profile.orientation || null,
                jobChangeIntent: profile.jobChangeIntent || null,
                aiObjectiveReview: profile.aiObjectiveReview || null,
                desiredSalary: profile.desiredSalary || null,
                desiredRoles: profile.desiredRoles || [],
                // Highlighted resume data (limited — just enough for card display)
                highlightedResume: highlightedProject ? {
                    currentRole: highlightedProject.data?.currentRole || null,
                    careerSummary: highlightedProject.data?.careerSummary
                        ? highlightedProject.data.careerSummary.substring(0, 200) + (highlightedProject.data.careerSummary.length > 200 ? '...' : '')
                        : null,
                    skills: (highlightedProject.data?.skills || []).slice(0, 8),
                } : null,
                // Public page slug for linking
                slug: publicPage?.pageSlug || null,
                updatedAt: (profile as any).updatedAt instanceof Date
                    ? (profile as any).updatedAt.getTime()
                    : (profile as any).updatedAt,
            };
        });

        // Apply search filter on composed data (name, roles, orientation, skills)
        if (search) {
            const searchLower = search.toLowerCase();
            candidates = candidates.filter(c => {
                const searchableText = [
                    c.fullName,
                    c.orientation,
                    c.aiObjectiveReview,
                    c.highlightedResume?.currentRole,
                    c.highlightedResume?.careerSummary,
                    ...(c.highlightedResume?.skills || []),
                    ...(c.desiredRoles?.map((r: any) => r.role) || []),
                ].filter(Boolean).join(' ').toLowerCase();
                return searchableText.includes(searchLower);
            });
        }

        return NextResponse.json({
            candidates,
            pagination: {
                page,
                limit,
                total: search ? candidates.length : totalCount,
                totalPages: Math.ceil((search ? candidates.length : totalCount) / limit),
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
