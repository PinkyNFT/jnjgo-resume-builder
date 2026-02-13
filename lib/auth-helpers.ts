import { auth } from '@/lib/auth';
import { NextRequest } from 'next/server';

/**
 * Get the authenticated user ID from the session
 * @param request - Next.js request object
 * @returns User ID or null if not authenticated
 */
export async function getUserIdFromSession(request: NextRequest): Promise<string | null> {
    const session = await auth();
    return session?.user?.id || null;
}

/**
 * Get user ID from request header or session (with fallback)
 * @param request - Next.js request object
 * @returns User ID
 */
export async function getUserId(request: NextRequest): Promise<string> {
    // First try to get from session
    const sessionUserId = await getUserIdFromSession(request);
    if (sessionUserId) {
        return sessionUserId;
    }

    // Fallback to header (for backward compatibility during migration)
    const headerUserId = request.headers.get('x-user-id');
    if (headerUserId && headerUserId !== 'default-user') {
        return headerUserId;
    }

    // Return anonymous for unauthenticated users
    return 'anonymous';
}
