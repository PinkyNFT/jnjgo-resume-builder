'use client';

import * as Sentry from '@sentry/nextjs';
import NextError from 'next/error';
import { useEffect } from 'react';

/**
 * Catches errors that escape the root layout or any nested error.tsx
 * boundary (e.g. app/[locale]/error.tsx). Next.js requires this file to
 * render its own <html>/<body> since it may replace the entire tree.
 */
export default function GlobalError({
    error,
}: {
    error: Error & { digest?: string };
}) {
    useEffect(() => {
        Sentry.captureException(error);
    }, [error]);

    return (
        <html>
            <body>
                <NextError statusCode={0} />
            </body>
        </html>
    );
}
