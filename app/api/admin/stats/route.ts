import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/mongodb';
import { requireAdmin } from '@/lib/admin-auth';
import {
    ProjectModel,
    UserProfileModel,
    ExportEventModel,
    RecruiterActionModel,
    RecruiterPageViewModel,
} from '@/lib/models';
import { AdminUserModel } from '@/lib/admin-models';

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

        const now = Date.now();
        const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
        const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

        // Run all stats queries in parallel for maximum efficiency
        const [
            userCount,
            adminCount,
            projectStats,
            recentActivity,
            roleDistribution,
            // Funnel metrics
            exportStats,
            pageViewStats,
            recruiterCounts,
            actionCounts,
            // Funnel timeline (30 days)
            exportTimeline,
            pageViewTimeline,
            scoutTimeline,
            // Platform breakdown
            platformBreakdown,
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
                        createdAt: { $gte: sevenDaysAgo }
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
            ]),
            // Export stats (total, with link, 7d, 30d)
            ExportEventModel.aggregate([
                {
                    $group: {
                        _id: null,
                        total: { $sum: 1 },
                        withLink: { $sum: { $cond: ['$linkIncluded', 1, 0] } },
                        last7d: { $sum: { $cond: [{ $gte: ['$copiedAt', sevenDaysAgo] }, 1, 0] } },
                        last30d: { $sum: { $cond: [{ $gte: ['$copiedAt', thirtyDaysAgo] }, 1, 0] } },
                    }
                }
            ]),
            // Page view stats
            RecruiterPageViewModel.aggregate<{
                total: number;
                authenticated: number;
                last7d: number;
                last30d: number;
                uniqueRecruiters: number;
            }>([
                {
                    $facet: {
                        totals: [
                            {
                                $group: {
                                    _id: null,
                                    total: { $sum: 1 },
                                    authenticated: { $sum: { $cond: ['$isAuthenticated', 1, 0] } },
                                    last7d: { $sum: { $cond: [{ $gte: ['$viewedAt', sevenDaysAgo] }, 1, 0] } },
                                    last30d: { $sum: { $cond: [{ $gte: ['$viewedAt', thirtyDaysAgo] }, 1, 0] } },
                                }
                            }
                        ],
                        uniqueRecruiters: [
                            { $match: { userId: { $ne: null } } },
                            { $group: { _id: '$userId' } },
                            { $count: 'count' },
                        ],
                    }
                },
                {
                    $project: {
                        total: { $ifNull: [{ $arrayElemAt: ['$totals.total', 0] }, 0] },
                        authenticated: { $ifNull: [{ $arrayElemAt: ['$totals.authenticated', 0] }, 0] },
                        last7d: { $ifNull: [{ $arrayElemAt: ['$totals.last7d', 0] }, 0] },
                        last30d: { $ifNull: [{ $arrayElemAt: ['$totals.last30d', 0] }, 0] },
                        uniqueRecruiters: { $ifNull: [{ $arrayElemAt: ['$uniqueRecruiters.count', 0] }, 0] },
                    }
                }
            ]).then(result => result[0] || { total: 0, authenticated: 0, last7d: 0, last30d: 0, uniqueRecruiters: 0 }),
            // Recruiter signups from users collection
            mongoose.connection.db!.collection('users').aggregate([
                {
                    $match: {
                        role: { $in: ['recruiter', 'pending_recruiter'] }
                    }
                },
                {
                    $group: {
                        _id: '$role',
                        count: { $sum: 1 }
                    }
                }
            ]).toArray() as Promise<Array<{ _id: string; count: number }>>,
            // Recruiter action counts
            RecruiterActionModel.aggregate<{ _id: string; count: number }>([
                {
                    $group: {
                        _id: '$actionType',
                        count: { $sum: 1 }
                    }
                }
            ]),
            // Export timeline (30 days)
            ExportEventModel.aggregate<{ _id: string; count: number; withLink: number }>([
                { $match: { copiedAt: { $gte: thirtyDaysAgo } } },
                {
                    $group: {
                        _id: { $dateToString: { format: '%Y-%m-%d', date: '$copiedAt' } },
                        count: { $sum: 1 },
                        withLink: { $sum: { $cond: ['$linkIncluded', 1, 0] } },
                    }
                },
                { $sort: { _id: 1 } }
            ]),
            // Page view timeline (30 days)
            RecruiterPageViewModel.aggregate<{ _id: string; count: number }>([
                { $match: { viewedAt: { $gte: thirtyDaysAgo } } },
                {
                    $group: {
                        _id: { $dateToString: { format: '%Y-%m-%d', date: '$viewedAt' } },
                        count: { $sum: 1 },
                    }
                },
                { $sort: { _id: 1 } }
            ]),
            // Scout actions timeline (30 days)
            RecruiterActionModel.aggregate<{ _id: string; count: number }>([
                {
                    $match: {
                        actionType: 'contact_request',
                        createdAt: { $gte: thirtyDaysAgo }
                    }
                },
                {
                    $group: {
                        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                        count: { $sum: 1 },
                    }
                },
                { $sort: { _id: 1 } }
            ]),
            // Platform breakdown for exports
            ExportEventModel.aggregate<{ _id: string; total: number; withLink: number }>([
                {
                    $group: {
                        _id: '$siteKey',
                        total: { $sum: 1 },
                        withLink: { $sum: { $cond: ['$linkIncluded', 1, 0] } },
                    }
                },
                { $sort: { total: -1 } }
            ]),
        ]);

        const stats = projectStats[0] || { total: 0, completed: 0, draft: 0, interviewing: 0, avgScore: 0 };
        const exports = exportStats[0] || { total: 0, withLink: 0, last7d: 0, last30d: 0 };
        const pageViews = pageViewStats || { total: 0, authenticated: 0, uniqueRecruiters: 0, last7d: 0, last30d: 0 };

        // Parse recruiter counts
        const recruiterSignups = recruiterCounts.reduce((acc: number, r: { _id: string; count: number }) => acc + r.count, 0);
        const pendingRecruiters = recruiterCounts.find((r: { _id: string }) => r._id === 'pending_recruiter')?.count || 0;
        const approvedRecruiters = recruiterCounts.find((r: { _id: string }) => r._id === 'recruiter')?.count || 0;

        // Parse action counts
        const scoutActions = actionCounts.find((a: { _id: string }) => a._id === 'contact_request')?.count || 0;
        const saveActions = actionCounts.find((a: { _id: string }) => a._id === 'save')?.count || 0;

        // Compute conversion rates (avoid division by zero)
        const exportToClickRate = exports.total > 0 ? (exports.withLink / exports.total) * 100 : 0;
        const clickToViewRate = exports.withLink > 0 ? (pageViews.total / exports.withLink) * 100 : 0;
        const viewToSignupRate = pageViews.total > 0 ? (recruiterSignups / pageViews.total) * 100 : 0;
        const signupToScoutRate = approvedRecruiters > 0 ? (scoutActions / approvedRecruiters) * 100 : 0;

        // Build timeline map for the last 30 days
        const timelineMap: Record<string, { exports: number; exportsWithLink: number; pageViews: number; scouts: number }> = {};
        for (let i = 29; i >= 0; i--) {
            const date = new Date(now - i * 24 * 60 * 60 * 1000);
            const key = date.toISOString().split('T')[0];
            timelineMap[key] = { exports: 0, exportsWithLink: 0, pageViews: 0, scouts: 0 };
        }
        exportTimeline.forEach((d: { _id: string; count: number; withLink: number }) => {
            if (timelineMap[d._id]) {
                timelineMap[d._id].exports = d.count;
                timelineMap[d._id].exportsWithLink = d.withLink;
            }
        });
        pageViewTimeline.forEach((d: { _id: string; count: number }) => {
            if (timelineMap[d._id]) timelineMap[d._id].pageViews = d.count;
        });
        scoutTimeline.forEach((d: { _id: string; count: number }) => {
            if (timelineMap[d._id]) timelineMap[d._id].scouts = d.count;
        });

        const funnelTimeline = Object.entries(timelineMap).map(([date, data]) => ({
            date,
            ...data,
        }));

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
            },
            funnelMetrics: {
                exports: {
                    total: exports.total,
                    withLink: exports.withLink,
                    last7d: exports.last7d,
                    last30d: exports.last30d,
                },
                pageViews: {
                    total: pageViews.total,
                    authenticated: pageViews.authenticated,
                    uniqueRecruiters: pageViews.uniqueRecruiters,
                    last7d: pageViews.last7d,
                    last30d: pageViews.last30d,
                },
                recruiters: {
                    total: recruiterSignups,
                    approved: approvedRecruiters,
                    pending: pendingRecruiters,
                },
                actions: {
                    scouts: scoutActions,
                    saves: saveActions,
                },
                conversionRates: {
                    exportToClickRate: Math.round(exportToClickRate * 10) / 10,
                    clickToViewRate: Math.round(clickToViewRate * 10) / 10,
                    viewToSignupRate: Math.round(viewToSignupRate * 10) / 10,
                    signupToScoutRate: Math.round(signupToScoutRate * 10) / 10,
                },
                platformBreakdown: platformBreakdown.map((p: { _id: string; total: number; withLink: number }) => ({
                    platform: p._id,
                    total: p.total,
                    withLink: p.withLink,
                    linkRate: p.total > 0 ? Math.round((p.withLink / p.total) * 1000) / 10 : 0,
                })),
                funnelTimeline,
            },
        }, { status: 200 });
    } catch (error) {
        console.error('Error fetching admin stats:', error);
        return NextResponse.json(
            { error: 'Failed to fetch statistics' },
            { status: 500 }
        );
    }
}
