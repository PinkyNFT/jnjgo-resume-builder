/**
 * PDF export file name (client issue #5): "Resume <Candidate Name>.pdf".
 * Run with: npm test
 */

import { resumeFileName, pdfAttachmentDisposition } from '../fileName';

describe('resumeFileName', () => {
    it.each([
        ['Atsuro Banno', 'Resume Atsuro Banno'],
        ['坂野 敦朗', 'Resume 坂野 敦朗'],
        ['坂野　敦朗', 'Resume 坂野 敦朗'], // full-width space normalized
        ['José Müller', 'Resume José Müller'],
        ["Mary O'Brien-Smith", "Resume Mary O'Brien-Smith"],
        ['A/B: "C" <D>|E?*', 'Resume AB C DE'], // characters invalid in Windows/macOS file names
        ['  Jane\tDoe  ', 'Resume Jane Doe'],
    ])('%j → %j', (name, expected) => {
        expect(resumeFileName(name)).toBe(expected);
    });

    it.each([[''], [undefined], [null], ['   '], ['<>:"/\\|?*']])('falls back to "Resume" for %j', (name) => {
        expect(resumeFileName(name)).toBe('Resume');
    });
});

describe('pdfAttachmentDisposition', () => {
    // Must be a valid HTTP header value (Latin-1 only) — Node throws otherwise.
    const assertValidHeader = (value: string) =>
        expect(() => new Headers({ 'Content-Disposition': value })).not.toThrow();

    it('ASCII names', () => {
        const v = pdfAttachmentDisposition('Resume Atsuro Banno');
        assertValidHeader(v);
        expect(v).toBe(`attachment; filename="Resume Atsuro Banno.pdf"; filename*=UTF-8''Resume%20Atsuro%20Banno.pdf`);
    });

    it.each([['Resume 坂野 敦朗'], ['Resume O’Brien'], ['Resume José Müller']])('non-ASCII name %j stays a valid header with a UTF-8 filename*', (name) => {
        const v = pdfAttachmentDisposition(name);
        assertValidHeader(v);
        const encoded = v.match(/filename\*=UTF-8''(.+)$/)![1];
        expect(decodeURIComponent(encoded)).toBe(`${name}.pdf`);
        expect(v).toMatch(/filename="[\x20-\x7E]+\.pdf"/);
    });

    it('a Japanese-only name gets an ASCII "Resume.pdf" fallback', () => {
        expect(pdfAttachmentDisposition('坂野敦朗')).toMatch(/^attachment; filename="Resume\.pdf"; /);
    });

    it("encodes characters that are special in RFC 5987 values", () => {
        expect(pdfAttachmentDisposition("Resume Mary O'Brien (Jr)")).toContain("filename*=UTF-8''Resume%20Mary%20O%27Brien%20%28Jr%29.pdf");
    });
});
