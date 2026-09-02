/**
 * Environment Variables Type Definitions
 * 
 * This file provides type definitions for environment variables used in the application.
 * It ensures type safety and provides IntelliSense support for environment variables.
 * 
 * @module env.d.ts
 */

declare global {
    namespace NodeJS {
        interface ProcessEnv {
            /**
             * Gemini API Key for AI features
             * @required Server-side only
             */
            GEMINI_API_KEY: string;

            /**
             * MongoDB connection URI
             * Format: mongodb+srv://username:password@cluster.mongodb.net/database
             * @required Server-side only
             */
            MONGODB_URI: string;

            /**
             * NextAuth.js configuration
             * @required Server-side only
             */
            NEXTAUTH_URL: string;
            NEXTAUTH_SECRET: string;

            /**
             * Google OAuth credentials
             * @required for Google sign-in
             */
            GOOGLE_CLIENT_ID: string;
            GOOGLE_CLIENT_SECRET: string;

            /**
             * Node environment
             * @default 'development'
             */
            NODE_ENV: 'development' | 'production' | 'test';

            /**
             * Application base URL
             * Used for generating absolute URLs
             * @optional
             */
            NEXT_PUBLIC_APP_URL?: string;

            /**
             * Enable debug mode
             * @optional
             * @default 'false'
             */
            NEXT_PUBLIC_DEBUG?: string;

            /**
             * Comma-separated list of admin email addresses (for initial bootstrap)
             * @optional
             */
            ADMIN_EMAILS?: string;

            /**
             * Sentry DSN for error monitoring. Read on both client and server.
             * Leave unset to no-op the SDK (safe for local dev).
             * @optional
             */
            NEXT_PUBLIC_SENTRY_DSN?: string;

            /**
             * Sentry org/project slugs and auth token — used only at build time
             * to upload source maps and create a release. Omit locally; set in
             * CI so stack traces in Sentry show real source instead of minified
             * bundles.
             * @optional
             */
            SENTRY_ORG?: string;
            SENTRY_PROJECT?: string;
            SENTRY_AUTH_TOKEN?: string;
        }
    }
}

export { };
