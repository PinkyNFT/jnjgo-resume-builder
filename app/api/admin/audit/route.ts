import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { requireAdmin } from '@/lib/admin-auth';
import { AuditLogModel } from '@/lib/admin-models';

/**
 * GET /api/admin/audit
 * Returns paginated audit logs with optional filtering
 * Query params: ?page=1&limit=30&action=settings.update&userId=xxx
 */
export async function GET(request: NextRequest) {
    const admin = await requireAdmin(request);
    if (admin instanceof NextResponse) return admin;

    try {
        await connectToDatabase();

        const { searchParams } = new URL(request.url);
        const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
        const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '30')));
        const action = searchParams.get('action');
        const userId = searchParams.get('userId');

        const filter: Record<string, unknown> = {};
        if (action) filter.action = { $regex: action, $options: 'i' };
        if (userId) filter.userId = userId;

        const [logs, totalCount] = await Promise.all([
            AuditLogModel.find(filter)
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            AuditLogModel.countDocuments(filter)
        ]);

        return NextResponse.json({
            logs,
            pagination: {
                page,
                limit,
                total: totalCount,
                totalPages: Math.ceil(totalCount / limit)
            }
        }, { status: 200 });
    } catch (error) {
        console.error('Error fetching audit logs:', error);
        return NextResponse.json(
            { error: 'Failed to fetch audit logs' },
            { status: 500 }
        );
    }
}
