import { NextRequest, NextResponse } from 'next/server';
import mammoth from 'mammoth';

// Hack for pdf-parse DOM/canvas requirement issues in Next.js Node environment
// We define a mock DOMMatrix if it doesn't exist before importing pdf-parse
if (typeof global !== 'undefined') {
    if (!global.DOMMatrix) {
        global.DOMMatrix = class DOMMatrix { } as any;
    }
}
const pdfParse = require('pdf-parse');

// 5MB limit for high-traffic optimization
const MAX_FILE_SIZE = 5 * 1024 * 1024;

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json({ error: 'File too large. Maximum size is 5MB.' }, { status: 413 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        let extractedText = '';

        if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
            try {
                // Parse PDF
                const data = await pdfParse(buffer);
                extractedText = data.text;
            } catch (err) {
                console.error("PDF Parsing Error:", err);
                return NextResponse.json({ error: 'Failed to process PDF file. Ensure it is a valid, readable PDF.' }, { status: 422 });
            }
        }
        else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
            file.type === 'application/msword' ||
            file.name.toLowerCase().endsWith('.docx')) {
            try {
                // Parse DOCX
                const result = await mammoth.extractRawText({ buffer });
                extractedText = result.value;
            } catch (err) {
                console.error("DOCX Parsing Error:", err);
                return NextResponse.json({ error: 'Failed to process DOCX file. Ensure it is a valid document.' }, { status: 422 });
            }
        }
        else {
            return NextResponse.json({ error: 'Unsupported file format. Please upload a PDF or DOCX file.' }, { status: 415 });
        }

        // Clean up text
        const cleanedText = extractedText
            .replace(/\r\n/g, '\n')
            .replace(/\n{3,}/g, '\n\n') // Normalize multiple line breaks
            .trim();

        if (!cleanedText) {
            return NextResponse.json({ error: 'No text could be extracted from the file. It might be a scanned image.' }, { status: 422 });
        }

        // Cap text size for the API prompt to optimize backend processing and avoid token limits
        // 50,000 characters is roughly 10-15 pages of dense text, more than enough for a standard resume.
        const truncatedText = cleanedText.substring(0, 50000);

        return NextResponse.json({ text: truncatedText });

    } catch (error) {
        console.error('File extraction error:', error);
        return NextResponse.json(
            { error: 'Failed to extract text from file', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
