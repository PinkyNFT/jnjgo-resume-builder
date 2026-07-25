import type { Browser } from 'puppeteer-core';

/**
 * Launches a headless Chromium for server-side PDF rendering.
 *
 * - On serverless/production (Vercel/Lambda) it uses @sparticuz/chromium, a
 *   Chromium build packaged for those environments.
 * - Locally it uses an installed Chrome/Edge. Set CHROME_PATH in
 *   .env.development.local to override, otherwise common install paths are tried.
 *
 * The caller is responsible for `await browser.close()`.
 */
const COMMON_CHROME_PATHS = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
];

export async function launchBrowser(): Promise<Browser> {
    const puppeteer = await import('puppeteer-core');
    const isServerless = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME;

    if (isServerless) {
        const chromium = (await import('@sparticuz/chromium')).default;
        return puppeteer.launch({
            args: chromium.args,
            executablePath: await chromium.executablePath(),
            headless: true,
        });
    }

    // Local development: use a locally installed Chrome/Edge.
    const fs = await import('fs');
    const executablePath =
        process.env.CHROME_PATH ||
        COMMON_CHROME_PATHS.find(p => {
            try { return fs.existsSync(p); } catch { return false; }
        });

    if (!executablePath) {
        throw new Error(
            'No local Chrome/Edge found for PDF export. Set CHROME_PATH in .env.development.local to your browser executable.'
        );
    }

    return puppeteer.launch({
        executablePath,
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
}
