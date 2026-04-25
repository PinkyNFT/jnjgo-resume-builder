import { NextResponse } from 'next/server';
import { routeErrorResponse } from '../../../../lib/api-error';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';
import clientPromise from '../../../../lib/mongodb-client';
import { ObjectId } from 'mongodb';
import { UserRole } from '../../../../types';
import { getAdminSetting } from '../../../../lib/admin-settings-reader';

const VALID_ROLES: UserRole[] = ['candidate', 'recruiter'];

/**
 * GET /api/auth/role
 * Returns the current user's role
 */
export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const client = await clientPromise;
        const db = client.db();
        const user = await db.collection('users').findOne(
            { _id: new ObjectId(session.user.id) },
            { projection: { role: 1 } }
        );

        return NextResponse.json({
            role: user?.role || null,
            hasRole: !!user?.role,
        });
    } catch (error) {
        return routeErrorResponse(error, 'GET /api/auth/role');
    }
}

/**
 * POST /api/auth/role
 * Sets the user's role (only if not already set — one-time operation)
 */
export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { role } = await req.json();

        if (!role || !VALID_ROLES.includes(role)) {
            return NextResponse.json(
                { error: 'Invalid role. Must be "candidate" or "recruiter".' },
                { status: 400 }
            );
        }

        const client = await clientPromise;
        const db = client.db();

        // Check if role is already set and get email
        const user = await db.collection('users').findOne(
            { _id: new ObjectId(session.user.id) },
            { projection: { role: 1, email: 1 } }
        );

        // 1. Prevent role changes
        if (user?.role) {
            return NextResponse.json(
                { error: 'Your role is already set and cannot be changed. Please contact support if you need assistance.' },
                { status: 400 }
            );
        }

        // 2. Prevent personal emails for recruiter accounts
        if (role === 'recruiter' && user?.email) {
            const emailPart = user.email.toLowerCase().split('@')[1];
            const personalDomains = [
                'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com',
                'icloud.com', 'mail.com', 'protonmail.com', 'proton.me', 'zoho.com',
                'yandex.com', 'live.com', 'msn.com', 'me.com', 'mac.com'
            ];

            if (emailPart && personalDomains.includes(emailPart)) {
                return NextResponse.json(
                    { error: 'Please use a professional work email address. Personal email providers are not allowed for recruiter accounts.' },
                    { status: 400 }
                );
            }
        }

        // Check verification setting
        const requireVerification = await getAdminSetting('require_recruiter_verification', false);
        const finalRole = (role === 'recruiter' && requireVerification) ? 'pending_recruiter' : role;

        // Set the role
        await db.collection('users').updateOne(
            { _id: new ObjectId(session.user.id) },
            { $set: { role: finalRole, roleSetAt: new Date(), requestedRole: role } }
        );

        return NextResponse.json({ role: finalRole, success: true, changed: false });
    } catch (error) {
        return routeErrorResponse(error, 'POST /api/auth/role');
    }
}
