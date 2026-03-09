import { handlers } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

const { GET: AuthGET, POST: AuthPOST } = handlers;

// Simple in-memory rate limiting
// Note: Limited effectiveness in serverless environments due to instance isolation,
// but provides baseline protection against rapid requests to the same instance.
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 20; // 20 requests per minute per IP for auth endpoints (higher for UX)

function applyRateLimit(req: NextRequest) {
    // Only rate limit specific aggressive actions if needed, or all.
    const ip = req.headers.get("x-forwarded-for") || "unknown-ip";
    const now = Date.now();

    const record = rateLimitMap.get(ip);

    if (record) {
        if (now > record.resetTime) {
            rateLimitMap.set(ip, { count: 1, resetTime: now + WINDOW_MS });
            return null;
        }

        if (record.count >= MAX_REQUESTS) {
            return new NextResponse("Too Many Requests", { status: 429 });
        }

        record.count += 1;
        return null;
    }

    rateLimitMap.set(ip, { count: 1, resetTime: now + WINDOW_MS });
    return null;
}

export async function GET(req: NextRequest, ctx: any) {
    const response = applyRateLimit(req);
    if (response) return response;
    return AuthGET(req, ctx);
}

export async function POST(req: NextRequest, ctx: any) {
    const response = applyRateLimit(req);
    if (response) return response;
    return AuthPOST(req, ctx);
}
