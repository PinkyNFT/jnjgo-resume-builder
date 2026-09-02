import { NextRequest, NextResponse } from 'next/server';
import { routeErrorResponse } from '@/lib/api-error';
import { connectToDatabase } from '@/lib/mongodb';
import { requireAdmin } from '@/lib/admin-auth';
import { AiUsageEventModel, UserProfileModel } from '@/lib/models';

/**
 * GET /api/admin/ai-usage
 * Aggregated Gemini token usage and estimated cost, keyed by user/route/model.
 * See lib/ai-pricing.ts for the pricing assumptions behind estimatedCostUsd.
 */
export async function GET(request: NextRequest) {
    const admin = await requireAdmin(request);
    if (admin instanceof NextResponse) return admin;

    try {
        await connectToDatabase();

        const now = Date.now();
        const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
        const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

        const costSum = { $sum: { $ifNull: ['$estimatedCostUsd', 0] } };

        const [totalsAgg, last7dAgg, byRoute, byModel, topUsersAgg, timelineAgg] = await Promise.all([
            AiUsageEventModel.aggregate([
                {
                    $group: {
                        _id: null,
                        calls: { $sum: 1 },
                        successCalls: { $sum: { $cond: ['$success', 1, 0] } },
                        inputTokens: { $sum: '$inputTokens' },
                        outputTokens: { $sum: '$outputTokens' },
                        estimatedCostUsd: costSum,
                    }
                }
            ]),
            AiUsageEventModel.aggregate([
                { $match: { createdAt: { $gte: sevenDaysAgo } } },
                { $group: { _id: null, calls: { $sum: 1 }, estimatedCostUsd: costSum } }
            ]),
            AiUsageEventModel.aggregate<{ _id: string; calls: number; successCalls: number; estimatedCostUsd: number }>([
                { $match: { createdAt: { $gte: thirtyDaysAgo } } },
                {
                    $group: {
                        _id: '$route',
                        calls: { $sum: 1 },
                        successCalls: { $sum: { $cond: ['$success', 1, 0] } },
                        estimatedCostUsd: costSum,
                    }
                },
                { $sort: { estimatedCostUsd: -1 } },
            ]),
            AiUsageEventModel.aggregate<{ _id: string; calls: number; inputTokens: number; outputTokens: number; estimatedCostUsd: number }>([
                { $match: { createdAt: { $gte: thirtyDaysAgo } } },
                {
                    $group: {
                        _id: '$model',
                        calls: { $sum: 1 },
                        inputTokens: { $sum: '$inputTokens' },
                        outputTokens: { $sum: '$outputTokens' },
                        estimatedCostUsd: costSum,
                    }
                },
                { $sort: { estimatedCostUsd: -1 } },
            ]),
            AiUsageEventModel.aggregate<{ _id: string; calls: number; estimatedCostUsd: number }>([
                { $match: { createdAt: { $gte: thirtyDaysAgo }, userId: { $ne: null } } },
                { $group: { _id: '$userId', calls: { $sum: 1 }, estimatedCostUsd: costSum } },
                { $sort: { estimatedCostUsd: -1 } },
                { $limit: 10 },
            ]),
            AiUsageEventModel.aggregate<{ _id: string; calls: number; estimatedCostUsd: number }>([
                { $match: { createdAt: { $gte: thirtyDaysAgo } } },
                {
                    $group: {
                        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                        calls: { $sum: 1 },
                        estimatedCostUsd: costSum,
                    }
                },
                { $sort: { _id: 1 } },
            ]),
        ]);

        const totals = totalsAgg[0] || { calls: 0, successCalls: 0, inputTokens: 0, outputTokens: 0, estimatedCostUsd: 0 };
        const last7d = last7dAgg[0] || { calls: 0, estimatedCostUsd: 0 };

        // Resolve top-user ids to display names (best-effort — a profile may not exist).
        const topUserIds = topUsersAgg.map(u => u._id);
        const profiles = topUserIds.length
            ? await UserProfileModel.find({ userId: { $in: topUserIds } }, { userId: 1, fullName: 1, email: 1 }).lean()
            : [];
        const profileMap = new Map(profiles.map(p => [p.userId, p]));

        const topUsers = topUsersAgg.map(u => ({
            userId: u._id,
            name: profileMap.get(u._id)?.fullName || null,
            email: profileMap.get(u._id)?.email || null,
            calls: u.calls,
            estimatedCostUsd: u.estimatedCostUsd,
        }));

        // Fill every day in the 30-day window so the client can render a gap-free chart.
        const timelineMap: Record<string, { calls: number; estimatedCostUsd: number }> = {};
        for (let i = 29; i >= 0; i--) {
            const key = new Date(now - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            timelineMap[key] = { calls: 0, estimatedCostUsd: 0 };
        }
        timelineAgg.forEach(d => {
            if (timelineMap[d._id]) timelineMap[d._id] = { calls: d.calls, estimatedCostUsd: d.estimatedCostUsd };
        });
        const timeline = Object.entries(timelineMap).map(([date, data]) => ({ date, ...data }));

        return NextResponse.json({
            totals: {
                calls: totals.calls,
                successCalls: totals.successCalls,
                successRate: totals.calls > 0 ? Math.round((totals.successCalls / totals.calls) * 1000) / 10 : 100,
                inputTokens: totals.inputTokens,
                outputTokens: totals.outputTokens,
                estimatedCostUsd: totals.estimatedCostUsd,
            },
            last7d,
            byRoute: byRoute.map(r => ({ route: r._id, calls: r.calls, successCalls: r.successCalls, estimatedCostUsd: r.estimatedCostUsd })),
            byModel: byModel.map(m => ({ model: m._id, calls: m.calls, inputTokens: m.inputTokens, outputTokens: m.outputTokens, estimatedCostUsd: m.estimatedCostUsd })),
            topUsers,
            timeline,
        });
    } catch (error) {
        return routeErrorResponse(error, 'GET /api/admin/ai-usage');
    }
}
