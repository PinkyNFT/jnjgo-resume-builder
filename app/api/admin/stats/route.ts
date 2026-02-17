import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { requireAdmin } from '@/lib/admin-auth';
import { ProjectModel, UserProfileModel } from '@/lib/models';
import { AdminUserModel, AuditLogModel } from '@/lib/admin-models';

/**
 * GET /api/admin/stats
 * Returns aggregated dashboard statistics
 * Uses MongoDB aggregation pipelines for efficient single-pass computation
 */
export async function GET(request: NextRequest) {
    const admin = await requireAdmin(request);
    if (admin instanceof NextResponse) return admin;

    try {
        await connectToDatabase();

        // Run all stats queries in parallel for maximum efficiency
        const [
            userCount,
            adminCount,
            projectStats,
            recentActivity,
            roleDistribution
        ] = await Promise.all([
            UserProfileModel.countDocuments(),
            AdminUserModel.countDocuments({ isActive: true }),
            ProjectModel.aggregate([
                {
                    $group: {
                        _id: null,
                        total: { $sum: 1 },
                        completed: {
                            $sum: {
                                $cond: [{ $in: ['$status', ['completed', 'generated']] }, 1, 0]
                            }
                        },
                        draft: {
                            $sum: {
                                $cond: [{ $eq: ['$status', 'draft'] }, 1, 0]
                            }
                        },
                        interviewing: {
                            $sum: {
                                $cond: [{ $eq: ['$status', 'interviewing'] }, 1, 0]
                            }
                        },
                        avgScore: {
                            $avg: {
                                $cond: [
                                    { $gt: ['$evaluation.totalScore', 0] },
                                    '$evaluation.totalScore',
                                    null
                                ]
                            }
                        }
                    }
                }
            ]),
            // Last 7 days activity: projects created per day
            ProjectModel.aggregate([
                {
                    $match: {
                        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
                    }
                },
                {
                    $group: {
                        _id: {
                            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
                        },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { _id: 1 } }
            ]),
            // Role type distribution
            ProjectModel.aggregate([
                {
                    $group: {
                        _id: '$roleType',
                        count: { $sum: 1 }
                    }
                }
            ])
        ]);

        const stats = projectStats[0] || { total: 0, completed: 0, draft: 0, interviewing: 0, avgScore: 0 };

        return NextResponse.json({
            stats: {
                users: {
                    total: userCount,
                    admins: adminCount
                },
                projects: {
                    total: stats.total,
                    completed: stats.completed,
                    draft: stats.draft,
                    interviewing: stats.interviewing,
                    avgScore: Math.round(stats.avgScore || 0)
                },
                recentActivity,
                roleDistribution: roleDistribution.reduce((acc: Record<string, number>, r: { _id: string; count: number }) => {
                    acc[r._id] = r.count;
                    return acc;
                }, {})
            }
        }, { status: 200 });
    } catch (error) {
        console.error('Error fetching admin stats:', error);
        return NextResponse.json(
            { error: 'Failed to fetch statistics' },
            { status: 500 }
        );
    }
}
