import { auth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Get the authenticated user ID from the session.
 * Throws a Response (401) if the user is not authenticated.
 * @param request - Next.js request object
 * @returns User ID
 */
export async function getUserId(request: NextRequest): Promise<string> {
    const session = await auth();
    if (!session?.user?.id) {
        throw NextResponse.json(
            { error: 'Authentication required' },
            { status: 401 }
        );
    }
    return session.user.id;
}
