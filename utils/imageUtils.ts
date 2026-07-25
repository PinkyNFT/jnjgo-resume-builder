/**
 * Browser-only image helpers for the resume photo feature.
 *
 * Photos are stored inline in the resume as a compressed JPEG data URL, so we
 * downscale + re-encode on the client before storing or sending to the API.
 * Keeping the long edge ≈512px is plenty for the ~30×40mm print size (~300 dpi)
 * while keeping the base64 payload small (~30–80KB) for MongoDB + PDF export.
 *
 * These functions use the DOM (canvas / Image / createImageBitmap) and must only
 * be called client-side (from event handlers in 'use client' components).
 */

export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

/** Max raw upload size accepted from the file picker (mirrors the API route). */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export interface CompressOptions {
    /** Max length of the longest edge, in pixels. */
    maxSize?: number;
    /** JPEG quality, 0..1. */
    quality?: number;
    /** Output MIME type. */
    mimeType?: string;
    /** Center-crop to a 1:1 square. */
    square?: boolean;
}

const DEFAULTS: Required<CompressOptions> = {
    maxSize: 512,
    quality: 0.82,
    mimeType: 'image/jpeg',
    square: false,
};

export function isSupportedImageType(type: string): boolean {
    return (ACCEPTED_IMAGE_TYPES as readonly string[]).includes(type);
}

/**
 * Downscale + re-encode an image (File/Blob or data URL) into a compact data URL.
 * Transparent areas are flattened onto white so PNGs don't turn black as JPEG.
 */
export async function compressImageToDataUrl(
    source: File | Blob | string,
    options: CompressOptions = {}
): Promise<string> {
    const { maxSize, quality, mimeType, square } = { ...DEFAULTS, ...options };
    const bitmap = await loadBitmap(source);
    try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas 2D context unavailable');

        if (square) {
            // Center-crop the largest square from the source, then scale to a square canvas.
            const side = Math.min(bitmap.width, bitmap.height);
            const sx = Math.floor((bitmap.width - side) / 2);
            const sy = Math.floor((bitmap.height - side) / 2);
            const target = Math.min(maxSize, side);
            canvas.width = target;
            canvas.height = target;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, target, target);
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(bitmap as CanvasImageSource, sx, sy, side, side, 0, 0, target, target);
        } else {
            const { width, height } = fitWithin(bitmap.width, bitmap.height, maxSize);
            canvas.width = width;
            canvas.height = height;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, width, height);
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(bitmap as CanvasImageSource, 0, 0, width, height);
        }
        return canvas.toDataURL(mimeType, quality);
    } finally {
        if (typeof (bitmap as ImageBitmap).close === 'function') {
            (bitmap as ImageBitmap).close();
        }
    }
}

/** Split a data URL into its raw base64 payload and MIME type (for API calls). */
export function splitDataUrl(dataUrl: string): { base64: string; mimeType: string } | null {
    const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.*)$/);
    if (!match) return null;
    return { mimeType: match[1], base64: match[2] };
}

/* ── internals ─────────────────────────────────────────── */

function fitWithin(w: number, h: number, max: number): { width: number; height: number } {
    if (w <= max && h <= max) return { width: w, height: h };
    const scale = Math.min(max / w, max / h);
    return { width: Math.max(1, Math.round(w * scale)), height: Math.max(1, Math.round(h * scale)) };
}

async function loadBitmap(source: File | Blob | string): Promise<ImageBitmap | HTMLImageElement> {
    // Prefer createImageBitmap so EXIF orientation (mobile photos) is applied.
    if (typeof createImageBitmap === 'function') {
        try {
            const blob = typeof source === 'string' ? await (await fetch(source)).blob() : source;
            return await createImageBitmap(blob, { imageOrientation: 'from-image' } as ImageBitmapOptions);
        } catch {
            // Fall through to the <img> path.
        }
    }
    const url = typeof source === 'string' ? source : URL.createObjectURL(source);
    try {
        return await loadImageElement(url);
    } finally {
        if (typeof source !== 'string') URL.revokeObjectURL(url);
    }
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = src;
    });
}
