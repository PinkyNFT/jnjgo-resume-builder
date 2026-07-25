/**
 * Client-side photo service.
 *
 * Routes the "Make Professional" request through the Next API so the Gemini API
 * key stays server-side. Sends the (already compressed) photo and returns a new
 * professional-headshot data URL. Mirrors the fetch/error pattern used in
 * services/geminiService.ts.
 */

import { splitDataUrl } from '../utils/imageUtils';

/**
 * Turn a user photo into a professional headshot via the "Nano Banana" image model.
 * @param imageDataUrl - the source photo as a data URL (compressed client-side first)
 * @param locale - 'en' | 'ja' for localized error messages
 * @returns a new professional-headshot data URL
 */
export async function generateProfessionalPhoto(
    imageDataUrl: string,
    locale: string = 'en'
): Promise<string> {
    const split = splitDataUrl(imageDataUrl);

    const response = await fetch('/api/generate-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            image: split ? split.base64 : imageDataUrl,
            mimeType: split ? split.mimeType : 'image/jpeg',
            locale,
        }),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to generate photo');
    }

    const result = await response.json();
    return result.image as string;
}
