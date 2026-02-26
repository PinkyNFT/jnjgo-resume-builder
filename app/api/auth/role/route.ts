import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';
import clientPromise from '../../../../lib/mongodb-client';
import { ObjectId } from 'mongodb';
import { UserRole } from '../../../../types';

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
        console.error('Error fetching role:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
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

        // Check if role is already set
        const user = await db.collection('users').findOne(
            { _id: new ObjectId(session.user.id) },
            { projection: { role: 1 } }
        );

        const isRoleChange = !!user?.role && user.role !== role;

        // Set or update the role
        await db.collection('users').updateOne(
            { _id: new ObjectId(session.user.id) },
            { $set: { role, roleSetAt: new Date(), ...(isRoleChange ? { roleChangedAt: new Date(), previousRole: user.role } : {}) } }
        );

        return NextResponse.json({ role, success: true, changed: isRoleChange });
    } catch (error) {
        console.error('Error setting role:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
