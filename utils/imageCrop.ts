/**
 * Pure math for the square photo cropper (no DOM). The image is shown inside a
 * square viewport of `view` px; at zoom 1 it just covers the viewport. `x`/`y`
 * are the image's top-left offset inside the viewport (always ≤ 0, so the
 * viewport never shows empty space).
 */

export interface CropState {
    zoom: number;
    x: number;
    y: number;
}

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 4;

/** Scale at which the image exactly covers the viewport. */
export function coverScale(width: number, height: number, view: number): number {
    return view / Math.min(width, height);
}

/** Keep the image covering the viewport at the given scale. */
export function clampOffset(x: number, y: number, width: number, height: number, scale: number, view: number): { x: number; y: number } {
    const minX = view - width * scale;
    const minY = view - height * scale;
    return { x: Math.min(0, Math.max(minX, x)), y: Math.min(0, Math.max(minY, y)) };
}

/** Initial state: zoom 1, image centred. */
export function initialCrop(width: number, height: number, view: number): CropState {
    const s = coverScale(width, height, view);
    return { zoom: 1, x: (view - width * s) / 2, y: (view - height * s) / 2 };
}

/** Change zoom while keeping the point under (anchorX, anchorY) fixed (defaults to the centre). */
export function zoomTo(state: CropState, zoom: number, width: number, height: number, view: number, anchorX = view / 2, anchorY = view / 2): CropState {
    const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
    const base = coverScale(width, height, view);
    const s0 = base * state.zoom;
    const s1 = base * next;
    // Source-pixel point currently under the anchor stays under it.
    const px = (anchorX - state.x) / s0;
    const py = (anchorY - state.y) / s0;
    const { x, y } = clampOffset(anchorX - px * s1, anchorY - py * s1, width, height, s1, view);
    return { zoom: next, x, y };
}

/** Move by (dx, dy) viewport px, clamped. */
export function panBy(state: CropState, dx: number, dy: number, width: number, height: number, view: number): CropState {
    const s = coverScale(width, height, view) * state.zoom;
    return { zoom: state.zoom, ...clampOffset(state.x + dx, state.y + dy, width, height, s, view) };
}

/** The square region of the source image (in source px) currently visible. */
export function cropRect(state: CropState, width: number, height: number, view: number): { sx: number; sy: number; side: number } {
    const s = coverScale(width, height, view) * state.zoom;
    const side = Math.min(view / s, width, height);
    const sx = Math.min(Math.max(0, -state.x / s), width - side);
    const sy = Math.min(Math.max(0, -state.y / s), height - side);
    return { sx, sy, side };
}
