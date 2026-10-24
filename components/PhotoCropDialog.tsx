'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import { X, ZoomIn, ZoomOut } from 'lucide-react';
import { CropState, MAX_ZOOM, MIN_ZOOM, cropRect, initialCrop, panBy, zoomTo } from '../utils/imageCrop';
import { cropToDataUrl } from '../utils/imageUtils';

interface PhotoCropDialogProps {
    /** Image to crop (a data URL, already EXIF-oriented and downscaled). */
    source: string;
    /** Receives the cropped square photo as a JPEG data URL. */
    onApply: (dataUrl: string) => void;
    onCancel: () => void;
}

/** Square viewport size in CSS px (shrinks on narrow screens). */
const VIEW_MAX = 288;

/**
 * Crop a photo to the resume's 1:1 frame: drag to reposition, slider / wheel /
 * keyboard to zoom. Nothing is saved until "Apply". The only photo edit in beta.
 */
export function PhotoCropDialog({ source, onApply, onCancel }: PhotoCropDialogProps) {
    const t = useTranslations('Editor');
    const tCommon = useTranslations('Common');
    const imgRef = useRef<HTMLImageElement | null>(null);
    const drag = useRef<{ id: number; x: number; y: number } | null>(null);
    const fitView = () => (typeof window === 'undefined' ? VIEW_MAX : Math.min(VIEW_MAX, window.innerWidth - 80));
    const [view, setView] = useState(fitView);
    const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
    const naturalRef = useRef<{ w: number; h: number } | null>(null);
    const [crop, setCrop] = useState<CropState>({ zoom: 1, x: 0, y: 0 });

    // Fit the viewport to small screens (re-centring on rotation); Escape closes
    // wherever focus is (it may still be on the button that opened the dialog);
    // lock page scroll while open.
    const cancelRef = useRef(onCancel);
    useEffect(() => { cancelRef.current = onCancel; }, [onCancel]);
    useEffect(() => {
        const onResize = () => {
            const v = fitView();
            setView(v);
            const n = naturalRef.current;
            if (n) setCrop(initialCrop(n.w, n.h, v));
        };
        const onEscape = (e: KeyboardEvent) => { if (e.key === 'Escape') cancelRef.current(); };
        window.addEventListener('resize', onResize);
        window.addEventListener('keydown', onEscape);
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            window.removeEventListener('resize', onResize);
            window.removeEventListener('keydown', onEscape);
            document.body.style.overflow = prev;
        };
    }, []);

    const loaded = (img: HTMLImageElement) => {
        if (naturalRef.current || !img.naturalWidth) return;
        const n = { w: img.naturalWidth, h: img.naturalHeight };
        naturalRef.current = n;
        setNatural(n);
        setCrop(initialCrop(n.w, n.h, view));
    };
    // A cached data URL can finish loading before React attaches onLoad.
    const setImg = (el: HTMLImageElement | null) => {
        imgRef.current = el;
        if (el?.complete) loaded(el);
    };

    const setZoom = useCallback((z: number, ax?: number, ay?: number) => {
        if (!natural) return;
        setCrop(c => zoomTo(c, z, natural.w, natural.h, view, ax, ay));
    }, [natural, view]);

    const pan = useCallback((dx: number, dy: number) => {
        if (!natural) return;
        setCrop(c => panBy(c, dx, dy, natural.w, natural.h, view));
    }, [natural, view]);

    const onPointerDown = (e: React.PointerEvent) => {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
    };
    const onPointerMove = (e: React.PointerEvent) => {
        const d = drag.current;
        if (!d || d.id !== e.pointerId) return;
        pan(e.clientX - d.x, e.clientY - d.y);
        drag.current = { id: d.id, x: e.clientX, y: e.clientY };
    };
    const onPointerUp = () => { drag.current = null; };

    const onWheel = (e: React.WheelEvent) => {
        const box = (e.currentTarget as HTMLElement).getBoundingClientRect();
        setZoom(crop.zoom * (e.deltaY < 0 ? 1.08 : 1 / 1.08), e.clientX - box.left, e.clientY - box.top);
    };

    const onKeyDown = (e: React.KeyboardEvent) => {
        const step = e.shiftKey ? 30 : 10;
        const keys: Record<string, () => void> = {
            ArrowLeft: () => pan(step, 0),
            ArrowRight: () => pan(-step, 0),
            ArrowUp: () => pan(0, step),
            ArrowDown: () => pan(0, -step),
            '+': () => setZoom(crop.zoom + 0.1),
            '=': () => setZoom(crop.zoom + 0.1),
            '-': () => setZoom(crop.zoom - 0.1),
        };
        if (keys[e.key]) { e.preventDefault(); keys[e.key](); }
    };

    const apply = () => {
        const img = imgRef.current;
        if (!img || !natural) return;
        onApply(cropToDataUrl(img, cropRect(crop, natural.w, natural.h, view)));
    };

    const scale = natural ? (view / Math.min(natural.w, natural.h)) * crop.zoom : 1;

    return createPortal(
        <div className="fixed inset-0 z-200 flex items-center justify-center p-4" onKeyDown={onKeyDown}>
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onCancel} />
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="photo-crop-title"
                className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl shadow-slate-900/20 p-5 animate-[scale-in_0.2s_ease-out]"
            >
                <button onClick={onCancel} aria-label={tCommon('close')} className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all">
                    <X className="w-4 h-4" />
                </button>
                <h3 id="photo-crop-title" className="text-base font-bold text-slate-900">{t('photoCropTitle')}</h3>
                <p className="text-xs text-slate-500 mt-1 mb-4">{t('photoCropHint')}</p>

                {/* Square viewport: drag to pan, wheel to zoom. Thirds grid helps framing. */}
                <div
                    className="relative mx-auto overflow-hidden rounded-md bg-slate-100 touch-none select-none cursor-grab active:cursor-grabbing focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                    style={{ width: view, height: view }}
                    tabIndex={0}
                    // Focus the crop area on open so arrow keys / +/- work immediately.
                    autoFocus
                    aria-label={t('photoCropHint')}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onPointerCancel={onPointerUp}
                    onWheel={onWheel}
                >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        ref={setImg}
                        src={source}
                        alt=""
                        draggable={false}
                        onLoad={e => loaded(e.currentTarget)}
                        className="absolute top-0 left-0 max-w-none pointer-events-none"
                        style={natural ? { width: natural.w * scale, height: natural.h * scale, transform: `translate(${crop.x}px, ${crop.y}px)` } : { opacity: 0 }}
                    />
                    <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3">
                        {Array.from({ length: 9 }).map((_, i) => <div key={i} className="border border-white/30" />)}
                    </div>
                    <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-black/10 rounded-md" />
                </div>

                <div className="flex items-center gap-3 mt-4">
                    <button type="button" onClick={() => setZoom(crop.zoom - 0.25)} aria-label={t('photoZoomOut')} className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg">
                        <ZoomOut className="w-4 h-4" />
                    </button>
                    <input
                        id="photo-crop-zoom"
                        type="range"
                        min={MIN_ZOOM}
                        max={MAX_ZOOM}
                        step={0.01}
                        value={crop.zoom}
                        onChange={e => setZoom(Number(e.target.value))}
                        aria-label={t('photoZoom')}
                        className="flex-1 accent-indigo-600"
                    />
                    <button type="button" onClick={() => setZoom(crop.zoom + 0.25)} aria-label={t('photoZoomIn')} className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg">
                        <ZoomIn className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex gap-3 justify-end mt-5">
                    <button type="button" onClick={onCancel} className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-all">
                        {tCommon('cancel')}
                    </button>
                    <button
                        type="button"
                        onClick={apply}
                        disabled={!natural}
                        className="px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all active:scale-[0.98] shadow-sm disabled:opacity-50"
                    >
                        {t('photoCropApply')}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
