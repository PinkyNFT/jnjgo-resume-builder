import { NextRequest, NextResponse } from 'next/server';
import mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';
import { requireAiUser } from '@/lib/ai-guards';
import { applyRateLimitDB, RATE_LIMITS } from '@/lib/rate-limit';

// pdf-parse v2 wraps pdfjs-dist + @napi-rs/canvas (native), so this route must run
// on the Node.js runtime (not edge) and the package must stay external (see next.config.ts).
export const runtime = 'nodejs';

// 5MB limit for high-traffic optimization
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Localized error messages, mirroring the inline-t() pattern used in app/api/analyze/route.ts.
const ERRORS = {
    noFile: { en: 'No file provided', ja: 'ファイルが選択されていません' },
    tooLarge: { en: 'File too large. Maximum size is 5MB.', ja: 'ファイルサイズが大きすぎます。最大5MBまでです。' },
    pdf: { en: 'Failed to process PDF file. Ensure it is a valid, readable PDF.', ja: 'PDFファイルを処理できませんでした。有効で読み取り可能なPDFかご確認ください。' },
    docx: { en: 'Failed to process DOCX file. Ensure it is a valid document.', ja: 'DOCXファイルを処理できませんでした。有効な文書かご確認ください。' },
    unsupported: { en: 'Unsupported file format. Please upload a PDF or DOCX file.', ja: '対応していないファイル形式です。PDFまたはDOCXファイルをアップロードしてください。' },
    noText: { en: 'No text could be extracted from the file. It might be a scanned image.', ja: 'ファイルからテキストを抽出できませんでした。スキャン画像の可能性があります。' },
    generic: { en: 'Failed to extract text from file', ja: 'ファイルからのテキスト抽出に失敗しました' },
} as const;

export async function POST(request: NextRequest) {
    let locale: 'en' | 'ja' = 'en';
    const t = (key: keyof typeof ERRORS) => ERRORS[key][locale];

    try {
        // Parsing is CPU-heavy: signed-in users only, rate-limited per user.
        const userId = await requireAiUser(request.nextUrl.searchParams.get('locale') ?? undefined);
        if (userId instanceof NextResponse) return userId;
        const limited = await applyRateLimitDB(request, 'extract-file', RATE_LIMITS.write, userId);
        if (limited) return limited;

        const formData = await request.formData();
        const file = formData.get('file') as File;
        locale = formData.get('locale') === 'ja' ? 'ja' : 'en';

        if (!file) {
            return NextResponse.json({ error: t('noFile') }, { status: 400 });
        }

        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json({ error: t('tooLarge') }, { status: 413 });
        }

        const bytes = await file.arrayBuffer();

        let extractedText = '';

        if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
            const parser = new PDFParse({ data: new Uint8Array(bytes) });
            try {
                // Parse PDF (pdf-parse v2 class API).
                // pageJoiner '' disables the "-- N of M --" page markers so that an
                // image-only PDF (e.g. "Microsoft Print to PDF" output, which is a
                // rasterized JPEG with no text layer) yields empty text and correctly
                // falls through to the "scanned image" message below — instead of
                // returning the markers as if they were extracted content.
                const result = await parser.getText({ pageJoiner: '\n\n' });
                extractedText = result.text;
            } catch (err) {
                console.error("PDF Parsing Error:", err);
                return NextResponse.json({ error: t('pdf') }, { status: 422 });
            } finally {
                await parser.destroy();
            }
        }
        // Legacy binary .doc (application/msword) isn't supported by mammoth — it
        // falls through to the "unsupported format" message below.
        else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
            file.name.toLowerCase().endsWith('.docx')) {
            try {
                // Parse DOCX
                const result = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
                extractedText = result.value;
            } catch (err) {
                console.error("DOCX Parsing Error:", err);
                return NextResponse.json({ error: t('docx') }, { status: 422 });
            }
        }
        else {
            return NextResponse.json({ error: t('unsupported') }, { status: 415 });
        }

        // Clean up text
        const cleanedText = extractedText
            .replace(/\r\n/g, '\n')
            .replace(/\n{3,}/g, '\n\n') // Normalize multiple line breaks
            .trim();

        if (!cleanedText) {
            return NextResponse.json({ error: t('noText') }, { status: 422 });
        }

        // Cap text size for the API prompt to optimize backend processing and avoid token limits
        // 50,000 characters is roughly 10-15 pages of dense text, more than enough for a standard resume.
        const truncatedText = cleanedText.substring(0, 50000);

        return NextResponse.json({ text: truncatedText });

    } catch (error) {
        console.error('File extraction error:', error);
        return NextResponse.json(
            { error: t('generic'), details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
