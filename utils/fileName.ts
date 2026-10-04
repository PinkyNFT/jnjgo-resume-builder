/**
 * File-name helpers for the resume PDF export (shared by the editor and the
 * /api/export/pdf route so the browser-suggested and server-sent names match).
 */

// Characters Windows/macOS don't allow in file names, plus control characters.
const UNSAFE_FILENAME_CHARS = /[\\/:*?"<>|\x00-\x1F\x7F]/g;

export function sanitizeFileName(s: string): string {
    // Whitespace first, so tabs/newlines become spaces instead of being stripped as control chars.
    return s.replace(/\s+/g, ' ').replace(UNSAFE_FILENAME_CHARS, '').replace(/\s+/g, ' ').trim();
}

/** "Resume <Candidate Name>" (no extension), or just "Resume" when there's no usable name. */
export function resumeFileName(fullName?: string | null): string {
    return sanitizeFileName(`Resume ${fullName || ''}`) || 'Resume';
}

/**
 * Content-Disposition for a PDF download whose name may contain non-ASCII
 * characters (e.g. Japanese names). HTTP header values must be Latin-1, so the
 * real name goes in the RFC 5987 `filename*` parameter with an ASCII fallback.
 */
export function pdfAttachmentDisposition(baseName: string): string {
    const name = sanitizeFileName(baseName) || 'Resume';
    const ascii = sanitizeFileName(name.replace(/[^\x20-\x7E]/g, '')) || 'Resume';
    const encoded = encodeURIComponent(`${name}.pdf`).replace(/['()*]/g, c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
    return `attachment; filename="${ascii}.pdf"; filename*=UTF-8''${encoded}`;
}
