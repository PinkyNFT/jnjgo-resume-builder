import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { applyRateLimitDB, RATE_LIMITS } from '@/lib/rate-limit';
import { launchBrowser } from '@/lib/pdf-browser';
import { pdfAttachmentDisposition } from '@/utils/fileName';

// Headless Chromium is native + needs the Node runtime; allow extra time for cold starts.
export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * POST /api/export/pdf
 *
 * Renders the already-styled resume HTML (sent by the client) into a TRUE
 * text-layer PDF via headless Chromium, so the output is always selectable /
 * machine-readable — never a rasterized image (unlike "Microsoft Print to PDF").
 *
 * Body: { headHtml, bodyHtml, fileName } (a client-sent `origin` is ignored)
 * - headHtml: document.head innerHTML (Next CSS + next/font @font-face)
 * - bodyHtml: the #resume-preview outerHTML (already rendered, incl. timeline)
 * - <base href> and the asset allowlist use this server's own origin, so assets/fonts load
 * - fileName: suggested download name, e.g. "Resume Atsuro Banno"
 */
export async function POST(request: NextRequest) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const limited = await applyRateLimitDB(request, 'export-pdf', RATE_LIMITS.write);
    if (limited) return limited;

    const { headHtml, bodyHtml, fileName } = await request.json();
    // Our own origin, never a client-supplied one: the renderer may only load
    // assets from this host, so trusting the body would let a caller point the
    // server's Chromium at any internal or external host (SSRF).
    const origin = request.nextUrl.origin;

    if (!bodyHtml) {
        return NextResponse.json({ error: 'Missing content' }, { status: 400 });
    }

    let allowedHost: string;
    try {
        allowedHost = new URL(origin).host;
    } catch {
        return NextResponse.json({ error: 'Invalid origin' }, { status: 400 });
    }

    // Strip any <script> so nothing executes when we render the snapshot.
    const stripScripts = (s: string) => String(s || '').replace(/<script[\s\S]*?<\/script>/gi, '');
    const safeHead = stripScripts(headHtml);
    const safeBody = stripScripts(bodyHtml);

    // Serverless Chromium ships no CJK fonts, so Japanese text would render as
    // empty boxes. Load Noto Sans JP (already in the .resume-doc font stack);
    // Google Fonts only serves the unicode-range subsets the page actually uses.
    const html = `<!doctype html><html><head><base href="${origin}/">${safeHead}
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&display=block">
<style>
  html, body { margin: 0; padding: 0; background: #fff; }
  /* Per-page margins come from page.pdf() so every page (incl. ones created by a
     page break) gets a consistent top/bottom/side margin. So here we strip the
     element's own A4 framing: remove its 15mm padding, drop the fixed 210mm width
     down to the printable content width, and clear the min-height that would
     otherwise force a near-full page and leak a blank page. */
  #resume-preview {
    box-shadow: none !important;
    margin: 0 auto !important;
    width: 180mm !important;     /* 210mm A4 - 2 x 15mm page margin */
    min-height: 0 !important;
    padding: 0 !important;
  }
</style>
</head><body>${safeBody}</body></html>`;


    let browser;
    try {
        browser = await launchBrowser();
        const page = await browser.newPage();

        // No JS needed (snapshot is fully rendered) and it removes an attack surface.
        await page.setJavaScriptEnabled(false);

        // Only allow assets from our own origin (plus Google avatar/font hosts).
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            const url = req.url();
            if (url.startsWith('data:') || url.startsWith('about:')) return req.continue();
            try {
                const host = new URL(url).host;
                const ok =
                    host === allowedHost ||
                    host.endsWith('googleusercontent.com') ||
                    host.endsWith('gstatic.com') ||
                    host.endsWith('googleapis.com');
                return ok ? req.continue() : req.abort();
            } catch {
                return req.abort();
            }
        });

        await page.setContent(html, { waitUntil: 'load', timeout: 30000 });
        // Let stylesheets, fonts and images finish loading before snapshotting.
        await page.waitForNetworkIdle({ idleTime: 500, timeout: 15000 }).catch(() => { });
        // Serverless Chromium has no Japanese fonts: make sure Noto Sans JP is ready
        // before printing, or Japanese text comes out as empty boxes.
        await page.evaluate(() => document.fonts.ready).catch(() => { });
        // Use the on-screen look (not print-media hacks); backgrounds still print.
        await page.emulateMediaType('screen');

        const pdf = await page.pdf({
            format: 'A4',
            printBackground: true,
            // Applied to every page, so content after a page break keeps a top margin.
            margin: { top: '15mm', right: '15mm', bottom: '15mm', left: '15mm' },
        });

        return new NextResponse(Buffer.from(pdf), {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': pdfAttachmentDisposition(String(fileName || '')),
                'Cache-Control': 'no-store',
            },
        });
    } catch (error) {
        console.error('PDF export error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to generate PDF' },
            { status: 500 }
        );
    } finally {
        if (browser) await browser.close();
    }
}
