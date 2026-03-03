import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { requireAdmin, requireSuperAdmin, logAdminAction, getClientIp, AdminContext } from '@/lib/admin-auth';
import { AdminUserModel } from '@/lib/admin-models';
import clientPromise from '@/lib/mongodb-client';

/**
 * GET /api/admin/users
 * Returns all users with their project counts
 * Query params: ?page=1&limit=20&search=email
 * 
 * Queries the NextAuth `users` collection as the primary source so that
 * all registered users are shown, even those who haven't created a profile yet.
 */
export async function GET(request: NextRequest) {
    const admin = await requireAdmin(request);
    if (admin instanceof NextResponse) return admin;

    try {
        const client = await clientPromise;
        const db = client.db();
        const usersCollection = db.collection('users');

        const { searchParams } = new URL(request.url);
        const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
        const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')));
        const search = searchParams.get('search') || '';

        // Match stage: search against name/email in the NextAuth users collection
        const matchStage: Record<string, unknown> = {};
        if (search) {
            matchStage.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        const pipeline: object[] = [
            { $match: matchStage },
            // Convert _id to string for joining with other collections
            {
                $addFields: {
                    userIdStr: { $toString: '$_id' }
                }
            },
            // Lookup profile data from userProfiles
            {
                $lookup: {
                    from: 'userProfiles',
                    localField: 'userIdStr',
                    foreignField: 'userId',
                    pipeline: [
                        { $sort: { updatedAt: -1 } },
                        { $limit: 1 }
                    ],
                    as: 'profile'
                }
            },
            // Lookup project stats
            {
                $lookup: {
                    from: 'projects',
                    localField: 'userIdStr',
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
            // Lookup recruiter profile
            {
                $lookup: {
                    from: 'recruiterProfiles',
                    localField: 'userIdStr',
                    foreignField: 'userId',
                    as: 'recruiterDetails'
                }
            },
            // Lookup admin info
            {
                $lookup: {
                    from: 'adminUsers',
                    localField: 'userIdStr',
                    foreignField: 'userId',
                    as: 'adminInfo'
                }
            },
            // Project final shape
            {
                $project: {
                    userId: '$userIdStr',
                    fullName: {
                        $ifNull: [
                            { $arrayElemAt: ['$profile.fullName', 0] },
                            '$name'
                        ]
                    },
                    email: 1,
                    location: { $ifNull: [{ $arrayElemAt: ['$profile.location', 0] }, ''] },
                    createdAt: { $ifNull: [{ $arrayElemAt: ['$profile.createdAt', 0] }, '$_id'] },
                    updatedAt: { $ifNull: [{ $arrayElemAt: ['$profile.updatedAt', 0] }, null] },
                    duplicateCount: { $size: '$profile' },
                    projectStats: { $arrayElemAt: ['$projectStats', 0] },
                    isAdmin: { $gt: [{ $size: '$adminInfo' }, 0] },
                    adminRole: { $arrayElemAt: ['$adminInfo.role', 0] },
                    userRole: { $ifNull: ['$role', null] },
                    recruiterProfile: { $arrayElemAt: ['$recruiterDetails', 0] }
                }
            },
            { $sort: { updatedAt: -1, email: 1 } },
            { $skip: (page - 1) * limit },
            { $limit: limit }
        ];

        const countPipeline: object[] = [
            { $match: matchStage },
            { $count: 'total' }
        ];

        const [users, countResult] = await Promise.all([
            usersCollection.aggregate(pipeline).toArray(),
            usersCollection.aggregate(countPipeline).toArray()
        ]);

        const totalCount = countResult[0]?.total || 0;

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
 * Grant or revoke admin role, or change user role (candidate/recruiter)
 * Body: { userId: string, email: string, name: string, action: 'grant_admin' | 'revoke_admin' | 'grant_super_admin' | 'change_user_role', role?: string }
 */
export async function POST(request: NextRequest) {
    const admin = await requireSuperAdmin(request);
    if (admin instanceof NextResponse) return admin;

    try {
        await connectToDatabase();

        const { userId, email, name, action, role: newUserRole } = await request.json();

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

        // Change user role (candidate/recruiter/pending_recruiter)
        if (action === 'change_user_role') {
            const validRoles = ['candidate', 'recruiter', 'pending_recruiter'];
            if (!newUserRole || !validRoles.includes(newUserRole)) {
                return NextResponse.json(
                    { error: 'Valid role (candidate or recruiter) is required' },
                    { status: 400 }
                );
            }

            const client = await clientPromise;
            const db = client.db();
            const { ObjectId } = await import('mongodb');

            const result = await db.collection('users').updateOne(
                { _id: new ObjectId(userId) },
                { $set: { role: newUserRole } }
            );

            if (result.matchedCount === 0) {
                return NextResponse.json(
                    { error: 'User not found in auth system' },
                    { status: 404 }
                );
            }

            logAdminAction(admin as AdminContext, 'user.role_change', `user:${userId}`, {
                action: 'change_user_role',
                targetEmail: email,
                newRole: newUserRole
            }, getClientIp(request));

            return NextResponse.json({ success: true, message: `User role changed to ${newUserRole} for ${email}` }, { status: 200 });
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
