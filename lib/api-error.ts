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
    // Data the schema rejected (e.g. a field the AI left out): say which fields,
    // instead of a bare 500 that hides the cause. Field paths only, no values.
    const name = (error as { name?: string } | null)?.name;
    if (name === 'ValidationError' || name === 'CastError') {
        const fields = Object.keys((error as { errors?: Record<string, unknown> }).errors ?? {}).slice(0, 10);
        console.error(`[${context}] Rejected data:`, name, fields);
        Sentry.captureException(error, { level: 'warning', tags: { context, kind: 'validation' } });
        return NextResponse.json(
            { error: 'Some of this data could not be saved.', code: 'VALIDATION_ERROR', fields },
            { status: 422 }
        );
    }
    console.error(`[${context}] Unhandled error:`, error);
    Sentry.captureException(error, { tags: { context } });
    return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
    );
}
