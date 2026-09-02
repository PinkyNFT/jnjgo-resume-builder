import * as Sentry from '@sentry/nextjs';

// No DSN configured yet — the SDK no-ops until NEXT_PUBLIC_SENTRY_DSN is set
// (see .env.local.example).
Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
