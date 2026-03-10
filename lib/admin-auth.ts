import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { AdminUserModel, AuditLogModel } from '@/lib/admin-models';

export interface AdminContext {
    userId: string;
    email: string;
    name: string;
    role: 'admin' | 'super_admin';
}

/**
 * Verifies the current user has admin privileges.
 * Uses session-based auth with a DB check against adminUsers collection.
 * Results are NOT cached per-request since admin checks are security-critical.
 */
export async function requireAdmin(request: NextRequest): Promise<AdminContext | NextResponse> {
    const session = await auth();

    if (!session?.user?.id || !session?.user?.email) {
        return NextResponse.json(
            { error: 'Authentication required' },
            { status: 401 }
        );
    }

    await connectToDatabase();

    // Look up by userId first, then fall back to email to survive user-ID churn
    // (e.g. account re-linking or role switching that creates a new user record).
    let adminUser = await AdminUserModel.findOne({
        userId: session.user.id,
        isActive: true
    }).lean();

    if (!adminUser) {
        adminUser = await AdminUserModel.findOne({
            email: session.user.email,
            isActive: true
        }).lean();

        if (adminUser) {
            // Auto-heal: update the stale userId so future lookups are fast
            AdminUserModel.updateOne(
                { _id: adminUser._id },
                { $set: { userId: session.user.id } }
            ).exec().catch(() => { /* ignore */ });
        }
    }

    if (!adminUser) {
        return NextResponse.json(
            { error: 'Insufficient permissions. Admin access required.' },
            { status: 403 }
        );
    }

    // Update last login timestamp (fire-and-forget, non-blocking)
    AdminUserModel.updateOne(
        { _id: adminUser._id },
        { $set: { lastLogin: new Date(), userId: session.user.id } }
    ).exec().catch(() => { /* ignore */ });

    return {
        userId: session.user.id,
        email: session.user.email || adminUser.email,
        name: session.user.name || adminUser.name,
        role: adminUser.role
    };
}

/**
 * Requires super_admin role for destructive operations.
 */
export async function requireSuperAdmin(request: NextRequest): Promise<AdminContext | NextResponse> {
    const result = await requireAdmin(request);

    if (result instanceof NextResponse) return result;

    if (result.role !== 'super_admin') {
        return NextResponse.json(
            { error: 'Super admin access required for this operation.' },
            { status: 403 }
        );
    }

    return result;
}

/**
 * Creates an audit log entry. Non-blocking to avoid slowing down API responses.
 */
export function logAdminAction(
    admin: AdminContext,
    action: string,
    resource: string,
    details: Record<string, unknown> = {},
    ipAddress?: string
): void {
    AuditLogModel.create({
        userId: admin.userId,
        userEmail: admin.email,
        action,
        resource,
        details,
        ipAddress
    }).catch(err => {
        console.error('Failed to write audit log:', err);
    });
}

/**
 * Extract client IP from request headers
 */
export function getClientIp(request: NextRequest): string {
    return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        || request.headers.get('x-real-ip')
        || 'unknown';
}
