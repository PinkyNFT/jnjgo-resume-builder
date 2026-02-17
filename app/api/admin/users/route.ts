import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { requireAdmin, requireSuperAdmin, logAdminAction, getClientIp, AdminContext } from '@/lib/admin-auth';
import { AdminUserModel } from '@/lib/admin-models';
import { UserProfileModel, ProjectModel } from '@/lib/models';

/**
 * GET /api/admin/users
 * Returns all users with their project counts
 * Query params: ?page=1&limit=20&search=email
 */
export async function GET(request: NextRequest) {
    const admin = await requireAdmin(request);
    if (admin instanceof NextResponse) return admin;

    try {
        await connectToDatabase();

        const { searchParams } = new URL(request.url);
        const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
        const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')));
        const search = searchParams.get('search') || '';

        // Build the aggregation pipeline for user profiles with project stats
        const matchStage: Record<string, unknown> = {};
        if (search) {
            matchStage.$or = [
                { fullName: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        const [users, totalCount] = await Promise.all([
            UserProfileModel.aggregate([
                { $match: matchStage },
                { $sort: { updatedAt: -1 } },
                { $skip: (page - 1) * limit },
                { $limit: limit },
                {
                    $lookup: {
                        from: 'projects',
                        localField: 'userId',
                        foreignField: 'userId',
                        pipeline: [
                            {
                                $group: {
                                    _id: null,
                                    count: { $sum: 1 },
                                    completed: {
                                        $sum: {
                                            $cond: [
                                                { $in: ['$status', ['completed', 'generated']] },
                                                1,
                                                0
                                            ]
                                        }
                                    },
                                    lastActivity: { $max: '$updatedAt' }
                                }
                            }
                        ],
                        as: 'projectStats'
                    }
                },
                {
                    $lookup: {
                        from: 'adminUsers',
                        localField: 'userId',
                        foreignField: 'userId',
                        as: 'adminInfo'
                    }
                },
                {
                    $project: {
                        userId: 1,
                        fullName: 1,
                        email: 1,
                        location: 1,
                        createdAt: 1,
                        updatedAt: 1,
                        projectStats: { $arrayElemAt: ['$projectStats', 0] },
                        isAdmin: { $gt: [{ $size: '$adminInfo' }, 0] },
                        adminRole: { $arrayElemAt: ['$adminInfo.role', 0] }
                    }
                }
            ]),
            UserProfileModel.countDocuments(matchStage)
        ]);

        return NextResponse.json({
            users,
            pagination: {
                page,
                limit,
                total: totalCount,
                totalPages: Math.ceil(totalCount / limit)
            }
        }, { status: 200 });
    } catch (error) {
        console.error('Error fetching users:', error);
        return NextResponse.json(
            { error: 'Failed to fetch users' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/admin/users
 * Grant or revoke admin role for a user
 * Body: { userId: string, email: string, name: string, action: 'grant_admin' | 'revoke_admin' | 'grant_super_admin' }
 */
export async function POST(request: NextRequest) {
    const admin = await requireSuperAdmin(request);
    if (admin instanceof NextResponse) return admin;

    try {
        await connectToDatabase();

        const { userId, email, name, action } = await request.json();

        if (!userId || !email || !action) {
            return NextResponse.json(
                { error: 'userId, email, and action are required' },
                { status: 400 }
            );
        }

        if (userId === (admin as AdminContext).userId && action === 'revoke_admin') {
            return NextResponse.json(
                { error: 'Cannot revoke your own admin access' },
                { status: 400 }
            );
        }

        if (action === 'grant_admin' || action === 'grant_super_admin') {
            const role = action === 'grant_super_admin' ? 'super_admin' : 'admin';
            await AdminUserModel.findOneAndUpdate(
                { userId },
                {
                    $set: {
                        email,
                        name: name || email,
                        role,
                        isActive: true,
                        createdBy: (admin as AdminContext).userId
                    }
                },
                { upsert: true }
            );

            logAdminAction(admin as AdminContext, 'user.role_change', `user:${userId}`, {
                action,
                targetEmail: email,
                role
            }, getClientIp(request));

            return NextResponse.json({ success: true, message: `Admin role granted to ${email}` }, { status: 200 });
        }

        if (action === 'revoke_admin') {
            await AdminUserModel.findOneAndUpdate(
                { userId },
                { $set: { isActive: false } }
            );

            logAdminAction(admin as AdminContext, 'user.role_change', `user:${userId}`, {
                action: 'revoke_admin',
                targetEmail: email
            }, getClientIp(request));

            return NextResponse.json({ success: true, message: `Admin role revoked from ${email}` }, { status: 200 });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error) {
        console.error('Error managing user:', error);
        return NextResponse.json(
            { error: 'Failed to manage user' },
            { status: 500 }
        );
    }
}
