import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { RateLimitModel } from '@/lib/models';
import { getAdminSetting } from '@/lib/admin-settings-reader';

interface RateLimitEntry {
    count: number;
    resetAt: number;
}

// In-memory sliding window rate limiter
// For production at scale, replace with Redis-backed limiter
const rateLimitStore = new Map<string, RateLimitEntry>();

// Periodic cleanup to prevent memory leaks
const CLEANUP_INTERVAL = 60_000; // 1 minute
let lastCleanup = Date.now();

function cleanup() {
    const now = Date.now();
    if (now - lastCleanup < CLEANUP_INTERVAL) return;
    lastCleanup = now;
    for (const [key, entry] of rateLimitStore) {
        if (entry.resetAt <= now) {
            rateLimitStore.delete(key);
        }
    }
}

interface RateLimitConfig {
    /** Max requests allowed in the window */
    limit: number;
    /** Window duration in seconds */
    windowSeconds: number;
}

// Default tier configs
export const RATE_LIMITS = {
    /** Standard API endpoints (profile, projects CRUD) */
    standard: { limit: 60, windowSeconds: 60 } as RateLimitConfig,
    /** AI endpoints (chat, parse, analyze) — expensive calls */
    ai: { limit: 15, windowSeconds: 60 } as RateLimitConfig,
    /** Admin endpoints — lower volume expected */
    admin: { limit: 30, windowSeconds: 60 } as RateLimitConfig,
    /** Write-heavy endpoints (saves, creates) */
    write: { limit: 30, windowSeconds: 60 } as RateLimitConfig,
    /** Strict limits for candidate/recruiter messaging to prevent spam */
    reply: { limit: 10, windowSeconds: 60 } as RateLimitConfig,
} as const;

/**
 * Extracts a stable identifier for rate limiting.
 * Uses forwarded IP, then falls back to connecting IP.
 */
function getClientKey(request: NextRequest, prefix: string): string {
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded?.split(',')[0]?.trim() || 'unknown';
    return `${prefix}:${ip}`;
}

/**
 * Applies rate limiting to an API route handler.
 * Returns null if the request is allowed, or a 429 response if rate limited.
 *
 * @example
 * export async function POST(request: NextRequest) {
 *   const limited = applyRateLimit(request, 'chat', RATE_LIMITS.ai);
 *   if (limited) return limited;
 *   // ... handle request
 * }
 */
export function applyRateLimit(
    request: NextRequest,
    routeKey: string,
    config: RateLimitConfig
): NextResponse | null {
    cleanup();

    const key = getClientKey(request, routeKey);
    const now = Date.now();
    const entry = rateLimitStore.get(key);

    if (!entry || entry.resetAt <= now) {
        // New window
        rateLimitStore.set(key, { count: 1, resetAt: now + config.windowSeconds * 1000 });
        return null;
    }

    entry.count++;

    if (entry.count > config.limit) {
        const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
        return NextResponse.json(
            { error: 'Too many requests. Please try again later.' },
            {
                status: 429,
                headers: {
                    'Retry-After': String(retryAfter),
                    'X-RateLimit-Limit': String(config.limit),
                    'X-RateLimit-Remaining': '0',
                    'X-RateLimit-Reset': String(entry.resetAt),
                },
            }
        );
    }

    return null;
}

/**
 * MongoDB-backed rate limiter for AI endpoints.
 * Works correctly across all serverless instances.
 * Limit and window are configurable via the admin panel (Settings → Limits).
 * Falls back to allowing the request if DB is unreachable.
 */
export async function applyRateLimitDB(
    request: NextRequest,
    routeKey: string,
    config: RateLimitConfig,
    /** Signed-in user id: limits per account instead of per IP (shared office IPs). */
    userId?: string
): Promise<NextResponse | null> {
    try {
        await connectToDatabase();

        // Admin-overridable limits — cached for 5 min, no per-request DB cost
        const limit = await getAdminSetting<number>('rate_limit_ai_requests', config.limit);
        const windowSeconds = await getAdminSetting<number>('rate_limit_ai_window_seconds', config.windowSeconds);

        const key = userId ? `${routeKey}:u:${userId}` : getClientKey(request, routeKey);
        const now = new Date();
        const resetAt = new Date(now.getTime() + windowSeconds * 1000);

        const entry = await RateLimitModel.findOneAndUpdate(
            { key },
            [{
                $set: {
                    count: {
                        $cond: [{ $gt: ['$resetAt', now] }, { $add: ['$count', 1] }, 1]
                    },
                    resetAt: {
                        $cond: [{ $gt: ['$resetAt', now] }, '$resetAt', resetAt]
                    }
                }
            }],
            { upsert: true, returnDocument: 'after', updatePipeline: true } as any
        ) as unknown as import('./models').IRateLimitDocument | null;

        if (entry && entry.count > limit) {
            const retryAfter = Math.ceil((entry.resetAt.getTime() - now.getTime()) / 1000);
            return NextResponse.json(
                { error: 'Too many requests. Please try again later.' },
                {
                    status: 429,
                    headers: {
                        'Retry-After': String(retryAfter),
                        'X-RateLimit-Limit': String(limit),
                        'X-RateLimit-Remaining': '0',
                        'X-RateLimit-Reset': String(entry.resetAt.getTime()),
                    },
                }
            );
        }

        return null;
    } catch (err) {
        // DB unavailable — fail open to avoid blocking users, log for monitoring
        console.error('[RateLimitDB] MongoDB rate limit check failed, allowing request:', err);
        return null;
    }
}
