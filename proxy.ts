import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

// Next.js 16+: "middleware" was renamed to "proxy". Export as proxy (or default).
const proxy = createMiddleware(routing);
export default proxy;

export const config = {
    // Match all pathnames except:
    // - /api (API routes)
    // - /c (public candidate pages — shared externally, no locale needed)
    // - /_next (Next.js internals)
    // - /favicon.ico, /robots.txt, etc.
    matcher: ['/((?!api|c|_next|favicon\\.ico|robots\\.txt|.*\\.).*)'],
};
