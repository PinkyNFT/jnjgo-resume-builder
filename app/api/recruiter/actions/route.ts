import { NextRequest, NextResponse } from 'next/server';
import { routeErrorResponse } from '../../../../lib/api-error';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';
import { connectToDatabase } from '../../../../lib/mongodb';
import {
    RecruiterActionModel,
    CandidatePublicPageModel,
    CandidatePrivateProfileModel,
    UserProfileModel,
    ProjectModel,
    CandidateReplyModel,
} from '../../../../lib/models';
import { applyRateLimit, RATE_LIMITS } from '../../../../lib/rate-limit';
import { RecruiterActionType } from '../../../../types';

const VALID_ACTION_TYPES: RecruiterActionType[] = ['save', 'unsave', 'contact_request'];
const MAX_MESSAGE_LENGTH = 2000;

/**
 * POST /api/recruiter/actions
 * Record a recruiter action (save, unsave, contact_request) on a candidate.
 */
export async function POST(request: NextRequest) {
    try {
        const limited = applyRateLimit(request, 'recruiter-actions', RATE_LIMITS.write);
        if (limited) return limited;

        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if ((session.user as any).role !== 'recruiter') {
            return NextResponse.json({ error: 'Recruiter access required' }, { status: 403 });
        }

        const body = await request.json();
        const { candidatePageSlug, actionType, message, actionId } = body;

        // ── Recruiter reply to an existing thread ──
        if (actionId && message && !candidatePageSlug) {
            if (typeof message !== 'string' || message.trim().length === 0) {
                return NextResponse.json({ error: 'Message is required', code: 'MESSAGE_REQUIRED' }, { status: 400 });
            }
            if (message.length > 3000) {
                return NextResponse.json({ error: 'Message exceeds maximum length', code: 'MESSAGE_TOO_LONG' }, { status: 400 });
            }

            await connectToDatabase();
            const recruiterId = session.user.id;

            // Verify the recruiter owns this action thread
            const action = await RecruiterActionModel.findOne({
                _id: actionId,
                recruiterId,
                actionType: 'contact_request',
            }).lean();

            if (!action) {
                return NextResponse.json({ error: 'Thread not found or unauthorized' }, { status: 404 });
            }

            const reply = await CandidateReplyModel.create({
                actionId: (action as any)._id.toString(),
                recruiterId,
                candidateUserId: action.candidateUserId,
                message: message.trim(),
                isFromCandidate: false,
                isReadByRecruiter: true,
                isReadByCandidate: false,
            });

            return NextResponse.json({
                success: true,
                reply: {
                    id: reply._id.toString(),
                    message: reply.message,
                    isFromCandidate: false,
                    createdAt: reply.createdAt instanceof Date ? reply.createdAt.getTime() : reply.createdAt,
                },
            }, { status: 201 });
        }

        if (!candidatePageSlug || typeof candidatePageSlug !== 'string') {
            return NextResponse.json({ error: 'candidatePageSlug is required', code: 'MISSING_SLUG' }, { status: 400 });
        }
        if (!VALID_ACTION_TYPES.includes(actionType)) {
            return NextResponse.json({ error: `Invalid actionType. Must be one of: ${VALID_ACTION_TYPES.join(', ')}`, code: 'INVALID_ACTION' }, { status: 400 });
        }
        if (actionType === 'contact_request' && (!message || typeof message !== 'string' || message.trim().length === 0)) {
            return NextResponse.json({ error: 'Message is required for contact requests', code: 'MESSAGE_REQUIRED' }, { status: 400 });
        }
        if (message && message.length > MAX_MESSAGE_LENGTH) {
            return NextResponse.json({ error: `Message must be ${MAX_MESSAGE_LENGTH} characters or less`, code: 'MESSAGE_TOO_LONG' }, { status: 400 });
        }

        await connectToDatabase();

        // Verify the candidate page exists
        const publicPage = await CandidatePublicPageModel.findOne({
            pageSlug: candidatePageSlug,
            isActive: true,
        }).lean();

        if (!publicPage) {
            return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
        }

        const recruiterId = session.user.id;
        const candidateUserId = publicPage.userId;

        // Prevent self-actions (in production, roles are exclusive so this rarely triggers)
        if (recruiterId === candidateUserId) {
            return NextResponse.json({ error: 'Cannot perform actions on your own profile', code: 'SELF_ACTION' }, { status: 409 });
        }

        // Handle save/unsave toggle logic
        if (actionType === 'save') {
            const existingSave = await RecruiterActionModel.findOne({
                recruiterId,
                candidateUserId,
                actionType: 'save',
            }).lean();

            // Check if there's a later unsave
            const latestUnsave = await RecruiterActionModel.findOne({
                recruiterId,
                candidateUserId,
                actionType: 'unsave',
                ...(existingSave ? { createdAt: { $gt: existingSave.createdAt } } : {}),
            }).lean();

            // Already saved and not unsaved
            if (existingSave && !latestUnsave) {
                return NextResponse.json({ message: 'Already saved', isSaved: true });
            }
        }

        const action = await RecruiterActionModel.create({
            recruiterId,
            candidateUserId,
            candidatePageSlug,
            actionType,
            ...(message ? { message: message.trim() } : {}),
        });

        return NextResponse.json({
            id: action._id.toString(),
            actionType,
            isSaved: actionType === 'save',
            message: actionType === 'contact_request' ? 'Contact request sent' : 'Action recorded',
        }, { status: 201 });
    } catch (error) {
        return routeErrorResponse(error, 'POST /api/recruiter/actions');
    }
}

/**
 * GET /api/recruiter/actions
 * Get recruiter's saved candidates or contact history.
 * Query params: ?type=saved | ?type=contacts | ?candidateSlug=xxx
 */
export async function GET(request: NextRequest) {
    try {
        const limited = applyRateLimit(request, 'recruiter-actions-read', RATE_LIMITS.standard);
        if (limited) return limited;

        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if ((session.user as any).role !== 'recruiter') {
            return NextResponse.json({ error: 'Recruiter access required' }, { status: 403 });
        }

        await connectToDatabase();

        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type') || 'saved';
        const candidateSlug = searchParams.get('candidateSlug');
        const recruiterId = session.user.id;

        // If checking status for a specific candidate
        if (candidateSlug) {
            const publicPage = await CandidatePublicPageModel.findOne({
                pageSlug: candidateSlug,
                isActive: true,
            }).lean();

            if (!publicPage) {
                return NextResponse.json({ isSaved: false, hasContacted: false });
            }

            const [latestSave, latestUnsave, contactRequest] = await Promise.all([
                RecruiterActionModel.findOne({
                    recruiterId,
                    candidateUserId: publicPage.userId,
                    actionType: 'save',
                }).sort({ createdAt: -1 }).lean(),
                RecruiterActionModel.findOne({
                    recruiterId,
                    candidateUserId: publicPage.userId,
                    actionType: 'unsave',
                }).sort({ createdAt: -1 }).lean(),
                RecruiterActionModel.findOne({
                    recruiterId,
                    candidateUserId: publicPage.userId,
                    actionType: 'contact_request',
                }).sort({ createdAt: -1 }).lean(),
            ]);

            const isSaved = latestSave && (!latestUnsave || latestSave.createdAt > latestUnsave.createdAt);

            return NextResponse.json({
                isSaved: !!isSaved,
                hasContacted: !!contactRequest,
                lastContactedAt: contactRequest?.createdAt || null,
                contactActionId: contactRequest?._id?.toString() || null,
            });
        }

        // If actionId is provided, fetch the reply thread
        const actionId = searchParams.get('actionId');
        if (actionId) {
            const replies = await CandidateReplyModel.find({
                actionId,
                recruiterId // ensure they own this thread
            })
                .sort({ createdAt: 1 })
                .lean();

            return NextResponse.json({
                replies: replies.map(r => ({
                    id: (r as any)._id?.toString(),
                    message: r.message,
                    isFromCandidate: r.isFromCandidate !== false,
                    createdAt: (r as any).createdAt instanceof Date
                        ? (r as any).createdAt.getTime()
                        : (r as any).createdAt
                }))
            }, { headers: { 'Cache-Control': 'private, max-age=5, stale-while-revalidate=30' } });
        }

        // Return stats summary for the recruiter dashboard
        if (type === 'stats') {
            const [contactsSent, totalSaves, totalUnsaves] = await Promise.all([
                RecruiterActionModel.countDocuments({ recruiterId, actionType: 'contact_request' }),
                RecruiterActionModel.countDocuments({ recruiterId, actionType: 'save' }),
                RecruiterActionModel.countDocuments({ recruiterId, actionType: 'unsave' }),
            ]);
            return NextResponse.json({
                contactsSent,
                savedCount: Math.max(0, totalSaves - totalUnsaves),
            });
        }

        // List saved candidates
        if (type === 'saved') {
            // Get all save/unsave actions for this recruiter, determine net saved
            const actions = await RecruiterActionModel.find({
                recruiterId,
                actionType: { $in: ['save', 'unsave'] },
            }).sort({ createdAt: -1 }).lean();

            // Build a map of candidateUserId -> isSaved (latest action wins)
            const savedMap = new Map<string, boolean>();
            for (const action of actions) {
                if (!savedMap.has(action.candidateUserId)) {
                    savedMap.set(action.candidateUserId, action.actionType === 'save');
                }
            }

            const savedUserIds = Array.from(savedMap.entries())
                .filter(([, isSaved]) => isSaved)
                .map(([userId]) => userId);

            if (savedUserIds.length === 0) {
                return NextResponse.json({ candidates: [] });
            }

            // Fetch candidate data for saved users
            const [profiles, publicPages, userProfiles] = await Promise.all([
                CandidatePrivateProfileModel.find({
                    userId: { $in: savedUserIds },
                    status: 'published',
                }).select({
                    userId: 1, orientation: 1, jobChangeIntent: 1,
                    aiObjectiveReview: 1, desiredSalary: 1, desiredRoles: 1,
                    highlightedProjectId: 1,
                }).lean(),
                CandidatePublicPageModel.find({
                    userId: { $in: savedUserIds },
                    isActive: true,
                }).lean(),
                UserProfileModel.find({
                    userId: { $in: savedUserIds },
                }).select({ userId: 1, fullName: 1, location: 1 }).lean(),
            ]);

            const projectIds = profiles
                .map(p => p.highlightedProjectId)
                .filter((id): id is string => !!id);

            const highlightedProjects = projectIds.length > 0
                ? await ProjectModel.find({ id: { $in: projectIds } })
                    .select({ id: 1, 'data.currentRole': 1, 'data.skills': 1 }).lean()
                : [];

            const slugMap = new Map(publicPages.map(p => [p.userId, p.pageSlug]));
            const userMap = new Map(userProfiles.map(u => [u.userId, u]));
            const projectMap = new Map(highlightedProjects.map(p => [p.id, p]));

            const candidates = profiles.map(profile => {
                const user = userMap.get(profile.userId);
                const project = profile.highlightedProjectId
                    ? projectMap.get(profile.highlightedProjectId)
                    : null;

                return {
                    userId: profile.userId,
                    fullName: user?.fullName || null,
                    location: user?.location || null,
                    orientation: profile.orientation || null,
                    jobChangeIntent: profile.jobChangeIntent || null,
                    aiObjectiveReview: profile.aiObjectiveReview || null,
                    desiredSalary: profile.desiredSalary || null,
                    desiredRoles: profile.desiredRoles || [],
                    highlightedResume: project ? {
                        currentRole: (project as any).data?.currentRole || null,
                        skills: (project as any).data?.skills || [],
                    } : null,
                    slug: slugMap.get(profile.userId) || null,
                };
            });

            return NextResponse.json({ candidates });
        }

        // List contact requests
        if (type === 'contacts') {
            const contacts = await RecruiterActionModel.find({
                recruiterId,
                actionType: 'contact_request',
            }).sort({ createdAt: -1 }).limit(50).lean();

            const actionIds = contacts.map(c => c._id);

            // Count unread replies for each contact
            const unreadCounts = await CandidateReplyModel.aggregate([
                { $match: { actionId: { $in: actionIds.map(id => id.toString()) }, isReadByRecruiter: false } },
                { $group: { _id: '$actionId', count: { $sum: 1 } } }
            ]);

            const countMap = new Map(unreadCounts.map(u => [u._id, u.count]));

            return NextResponse.json({
                contacts: contacts.map(c => ({
                    id: c._id.toString(),
                    candidatePageSlug: c.candidatePageSlug,
                    message: c.message,
                    createdAt: c.createdAt instanceof Date ? c.createdAt.getTime() : c.createdAt,
                    unreadReplies: countMap.get(c._id.toString()) || 0
                })),
            }, { headers: { 'Cache-Control': 'private, max-age=10, stale-while-revalidate=60' } });
        }

        return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 });
    } catch (error) {
        return routeErrorResponse(error, 'GET /api/recruiter/actions');
    }
}

/**
 * PATCH /api/recruiter/actions
 * Marks candidate replies on a specific contact thread as read by the recruiter.
 */
export async function PATCH(request: NextRequest) {
    try {
        const limited = applyRateLimit(request, 'recruiter-actions-write', RATE_LIMITS.write);
        if (limited) return limited;

        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if ((session.user as any).role !== 'recruiter') {
            return NextResponse.json({ error: 'Recruiter access required' }, { status: 403 });
        }

        await connectToDatabase();

        const { actionId } = await request.json().catch(() => ({}));

        if (!actionId || typeof actionId !== 'string') {
            return NextResponse.json({ error: 'actionId is required' }, { status: 400 });
        }

        const recruiterId = session.user.id;

        // Verify the recruiter actually owns this action thread
        const action = await RecruiterActionModel.findOne({
            _id: actionId,
            recruiterId,
        }).lean();

        if (!action) {
            return NextResponse.json({ error: 'Action not found or unauthorized' }, { status: 404 });
        }

        const result = await CandidateReplyModel.updateMany(
            { actionId, recruiterId, isReadByRecruiter: false },
            { $set: { isReadByRecruiter: true } }
        );

        return NextResponse.json({ updatedCount: result.modifiedCount });
    } catch (error) {
        return routeErrorResponse(error, 'PATCH /api/recruiter/actions');
    }
}
