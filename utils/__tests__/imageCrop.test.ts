/**
 * Square photo cropper math (beta photo feature: crop only).
 * Run with: npm test
 */

import { clampOffset, coverScale, cropRect, initialCrop, MAX_ZOOM, MIN_ZOOM, panBy, zoomTo } from '../imageCrop';

const VIEW = 300;

describe('initial state', () => {
    it('covers the square viewport and centres a landscape photo', () => {
        const s = initialCrop(1600, 1200, VIEW);
        expect(s.zoom).toBe(1);
        expect(coverScale(1600, 1200, VIEW)).toBeCloseTo(0.25);
        expect(s.x).toBeCloseTo(-50); // (300 - 400) / 2
        expect(s.y).toBeCloseTo(0);
        expect(cropRect(s, 1600, 1200, VIEW)).toEqual({ sx: 200, sy: 0, side: 1200 });
    });

    it('centres a portrait photo vertically', () => {
        const s = initialCrop(1000, 1600, VIEW);
        expect(cropRect(s, 1000, 1600, VIEW)).toEqual({ sx: 0, sy: 300, side: 1000 });
    });
});

describe('panning', () => {
    it('never shows empty space past the image edges', () => {
        const s = initialCrop(1600, 1200, VIEW);
        expect(panBy(s, 500, 500, 1600, 1200, VIEW)).toMatchObject({ x: 0, y: 0 });
        expect(panBy(s, -500, -500, 1600, 1200, VIEW)).toMatchObject({ x: -100, y: 0 });
    });

    it('clampOffset keeps the image covering the viewport', () => {
        expect(clampOffset(10, -999, 1600, 1200, 0.25, VIEW)).toEqual({ x: 0, y: 0 });
    });
});

describe('zooming', () => {
    it('is bounded between MIN_ZOOM and MAX_ZOOM', () => {
        const s = initialCrop(1600, 1200, VIEW);
        expect(zoomTo(s, 99, 1600, 1200, VIEW).zoom).toBe(MAX_ZOOM);
        expect(zoomTo(s, 0.1, 1600, 1200, VIEW).zoom).toBe(MIN_ZOOM);
    });

    it('zooms around the centre by default, keeping the subject centred', () => {
        const s = initialCrop(1200, 1200, VIEW);
        const z = zoomTo(s, 2, 1200, 1200, VIEW);
        expect(cropRect(z, 1200, 1200, VIEW)).toEqual({ sx: 300, sy: 300, side: 600 });
    });

    it('keeps the point under the cursor fixed when zooming at an anchor', () => {
        const s = initialCrop(1200, 1200, VIEW);
        const z = zoomTo(s, 2, 1200, 1200, VIEW, 0, 0); // anchor at the top-left corner
        expect(cropRect(z, 1200, 1200, VIEW)).toEqual({ sx: 0, sy: 0, side: 600 });
    });
});

describe('cropRect', () => {
    it('always returns a square inside the source image', () => {
        let s = initialCrop(1600, 900, VIEW);
        s = zoomTo(s, 3.3, 1600, 900, VIEW, 280, 20);
        s = panBy(s, -1000, 1000, 1600, 900, VIEW);
        const r = cropRect(s, 1600, 900, VIEW);
        expect(r.sx).toBeGreaterThanOrEqual(0);
        expect(r.sy).toBeGreaterThanOrEqual(0);
        expect(r.sx + r.side).toBeLessThanOrEqual(1600 + 1e-9);
        expect(r.sy + r.side).toBeLessThanOrEqual(900 + 1e-9);
        expect(r.side).toBeCloseTo(900 / 3.3);
    });
});
