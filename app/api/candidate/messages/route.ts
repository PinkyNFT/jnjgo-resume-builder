import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';
import { connectToDatabase } from '../../../../lib/mongodb';
import { RecruiterActionModel, RecruiterProfileModel, CandidateReplyModel } from '../../../../lib/models';
import { applyRateLimit, RATE_LIMITS } from '../../../../lib/rate-limit';

/**
 * GET /api/candidate/messages
 * Returns all contact_request messages received by the authenticated candidate.
 * Joins recruiter profile info (company, title) for display.
 * Query params: ?page=1&limit=20
 */
export async function GET(request: NextRequest) {
    try {
        const limited = applyRateLimit(request, 'candidate-messages-read', RATE_LIMITS.standard);
        if (limited) return limited;

        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectToDatabase();

        const { searchParams } = new URL(request.url);
        const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
        const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')));

        const candidateUserId = session.user.id;

        // If actionId is provided, fetch the reply thread instead of the inbox list
        const actionId = searchParams.get('actionId');
        if (actionId) {
            const replies = await CandidateReplyModel.find({
                actionId,
                candidateUserId // ensure they own this thread
            })
                .sort({ createdAt: 1 })
                .lean();

            // Mark recruiter replies as read by candidate
            const unreadRecruiterReplyIds = replies
                .filter(r => r.isFromCandidate === false && !r.isReadByCandidate)
                .map(r => (r as any)._id);
            if (unreadRecruiterReplyIds.length > 0) {
                await CandidateReplyModel.updateMany(
                    { _id: { $in: unreadRecruiterReplyIds } },
                    { $set: { isReadByCandidate: true } }
                );
            }

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

        const [messages, totalCount, unreadCount] = await Promise.all([
            RecruiterActionModel.find({
                candidateUserId,
                actionType: 'contact_request',
            })
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            RecruiterActionModel.countDocuments({
                candidateUserId,
                actionType: 'contact_request',
            }),
            RecruiterActionModel.countDocuments({
                candidateUserId,
                actionType: 'contact_request',
                isReadByCandidate: false,
            }),
        ]);

        // Pull unique recruiter IDs to join profile data
        const recruiterIds = [...new Set(messages.map((m) => m.recruiterId))];

        const recruiterProfiles = recruiterIds.length > 0
            ? await RecruiterProfileModel.find({ userId: { $in: recruiterIds } })
                .select('userId companyName jobTitle')
                .lean()
            : [];

        const recruiterMap = new Map(recruiterProfiles.map((r) => [r.userId, r]));

        const formattedMessages = messages.map((msg) => {
            const recruiter = recruiterMap.get(msg.recruiterId);
            return {
                id: (msg as any)._id.toString(),
                recruiterId: msg.recruiterId,
                recruiterCompany: recruiter?.companyName || null,
                recruiterTitle: recruiter?.jobTitle || null,
                message: msg.message || '',
                isRead: !!(msg as any).isReadByCandidate,
                createdAt: (msg as any).createdAt instanceof Date
                    ? (msg as any).createdAt.getTime()
                    : (msg as any).createdAt,
            };
        });

        return NextResponse.json({
            messages: formattedMessages,
            unreadCount,
            pagination: {
                page,
                limit,
                total: totalCount,
                totalPages: Math.ceil(totalCount / limit),
            },
        }, { headers: { 'Cache-Control': 'private, max-age=10, stale-while-revalidate=60' } });
    } catch (error) {
        console.error('[GET /api/candidate/messages] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

/**
 * PATCH /api/candidate/messages
 * Marks one or all messages as read.
 * Body: { messageId?: string } — if omitted, marks all as read.
 */
export async function PATCH(request: NextRequest) {
    try {
        const limited = applyRateLimit(request, 'candidate-messages-write', RATE_LIMITS.write);
        if (limited) return limited;

        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectToDatabase();

        const { messageId } = await request.json().catch(() => ({}));
        const candidateUserId = session.user.id;

        const filter: Record<string, unknown> = {
            candidateUserId,
            actionType: 'contact_request',
            isReadByCandidate: false,
        };

        if (messageId && typeof messageId === 'string') {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const { Types } = require('mongoose');
            if (!Types.ObjectId.isValid(messageId)) {
                return NextResponse.json({ error: 'Invalid messageId' }, { status: 400 });
            }
            filter._id = messageId;
        }

        const result = await RecruiterActionModel.updateMany(filter, {
            $set: { isReadByCandidate: true },
        });

        return NextResponse.json({ updatedCount: result.modifiedCount });
    } catch (error) {
        console.error('[PATCH /api/candidate/messages] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

/**
 * POST /api/candidate/messages
 * Sends a newly authored reply from the candidate to the scout message.
 * Body: { actionId: string, message: string }
 */
export async function POST(request: NextRequest) {
    try {
        const limited = applyRateLimit(request, 'candidate-messages-reply', RATE_LIMITS.reply);
        if (limited) return limited;

        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { actionId, message } = await request.json().catch(() => ({}));

        if (!actionId || !message || typeof message !== 'string' || message.trim().length === 0) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        if (message.length > 3000) {
            return NextResponse.json({ error: 'Message exceeds maximum length' }, { status: 400 });
        }

        await connectToDatabase();
        const candidateUserId = session.user.id;

        // Verify the action belongs to this candidate
        const action = await RecruiterActionModel.findOne({
            _id: actionId,
            candidateUserId,
            actionType: 'contact_request'
        }).lean();

        if (!action) {
            return NextResponse.json({ error: 'Scout message not found' }, { status: 404 });
        }

        // Create the reply
        const reply = await CandidateReplyModel.create({
            actionId: (action as any)._id,
            recruiterId: action.recruiterId,
            candidateUserId,
            message: message.trim(),
            isReadByRecruiter: false
        });

        // Mark the original scout message as read automatically when replying
        if (!action.isReadByCandidate) {
            await RecruiterActionModel.updateOne(
                { _id: actionId },
                { $set: { isReadByCandidate: true } }
            );
        }

        return NextResponse.json({
            success: true,
            reply: {
                id: reply._id.toString(),
                message: reply.message,
                isFromCandidate: true,
                createdAt: reply.createdAt instanceof Date ? reply.createdAt.getTime() : reply.createdAt
            }
        });
    } catch (error) {
        console.error('[POST /api/candidate/messages] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
