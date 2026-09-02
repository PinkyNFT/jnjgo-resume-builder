import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';

export function isDBError(error: unknown): boolean {
    return error instanceof Error && (error as any).code === 'DB_UNAVAILABLE';
}

export function routeErrorResponse(error: unknown, context = 'API'): NextResponse {
    if (isDBError(error)) {
        console.error(`[${context}] DB unavailable:`, (error as Error).message);
        Sentry.captureException(error, { level: 'warning', tags: { context, kind: 'db_unavailable' } });
        return NextResponse.json(
            { error: 'Service temporarily unavailable. Please try again shortly.' },
            { status: 503 }
        );
    }
    console.error(`[${context}] Unhandled error:`, error);
    Sentry.captureException(error, { tags: { context } });
    return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
    );
}
