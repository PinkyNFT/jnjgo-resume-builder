import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';
import { withSentryConfig } from '@sentry/nextjs/config';

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  // Keep native/binary server-only packages external so the compiler doesn't bundle them:
  // - pdf-parse v2 -> pdfjs-dist + native @napi-rs/canvas (resume import)
  // - puppeteer-core + @sparticuz/chromium (server-side text-PDF export)
  serverExternalPackages: ['pdf-parse', '@napi-rs/canvas', 'puppeteer-core', '@sparticuz/chromium'],
  images: {
    remotePatterns: [
      {
        // Google OAuth profile images (e.g. lh3.googleusercontent.com)
        protocol: 'https',
        hostname: '*.googleusercontent.com',
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default withSentryConfig(withNextIntl(nextConfig), {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  // Only upload source maps / create releases when an auth token is present
  // (e.g. in CI) — silent locally so a dev without Sentry set up sees no noise.
  silent: !process.env.SENTRY_AUTH_TOKEN,
  widenClientFileUpload: true,
});
