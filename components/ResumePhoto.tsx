'use client';

import React, { useRef, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Upload, Sparkles, RotateCcw, Trash2, User, RefreshCcw } from 'lucide-react';
import { compressImageToDataUrl, isSupportedImageType, MAX_UPLOAD_BYTES } from '../utils/imageUtils';
import { generateProfessionalPhoto } from '../services/photoService';
import { PHOTO_ENHANCE_ENABLED } from '../config/models';

interface ResumePhotoProps {
    /** The committed photo shown on the resume (a data URL), if any. */
    photo?: string;
    /** Edit mode shows the controls; preview/PDF renders just the image. */
    editable: boolean;
    /** Commit a new photo (or undefined to remove it) up to the resume data. */
    onChange: (next?: string) => void;
    /**
     * If provided, a discreet "Add photo" button is shown in preview mode when no
     * photo exists (e.g. jump to the Edit tab). Excluded from the PDF export.
     */
    onAddRequest?: () => void;
}

/**
 * Resume headshot: upload a photo and — when PHOTO_ENHANCE_ENABLED (config/models)
 * is on — turn it into a professional headshot via "Nano Banana" without changing
 * the face. The AI enhancement is currently OFF, so only upload / change / remove
 * are shown; flip the flag to bring back Make Professional / Regenerate / Use
 * original. The original upload is kept in local state so those never lose it;
 * only the chosen image is committed via onChange (and thus saved + printed).
 */
export const ResumePhoto: React.FC<ResumePhotoProps> = ({ photo, editable, onChange, onAddRequest }) => {
    const t = useTranslations('Editor');
    const locale = useLocale();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Source photo (pre-AI) fed to the model. Initialized from the saved photo so
    // regenerate/revert work after a reload.
    const [originalPhoto, setOriginalPhoto] = useState<string | undefined>(photo);
    const [isGenerated, setIsGenerated] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const openPicker = () => fileInputRef.current?.click();

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = ''; // let the user re-select the same file later
        if (!file) return;
        setError(null);

        if (!isSupportedImageType(file.type)) { setError(t('photoInvalidType')); return; }
        if (file.size > MAX_UPLOAD_BYTES) { setError(t('photoTooLarge')); return; }

        try {
            const compressed = await compressImageToDataUrl(file, { square: true });
            setOriginalPhoto(compressed);
            setIsGenerated(false);
            onChange(compressed);
        } catch (err) {
            console.error('Image processing failed:', err);
            setError(t('photoErrorGeneric'));
        }
    };

    const handleGenerate = async () => {
        // Always feed the ORIGINAL upload to the model (re-editing an AI image drifts).
        const source = originalPhoto || photo;
        if (!source) return;
        setError(null);
        setIsGenerating(true);
        try {
            const result = await generateProfessionalPhoto(source, locale);
            // Normalize the AI output to a compact 1:1 square (it may come back larger / non-square).
            const squared = await compressImageToDataUrl(result, { square: true });
            setIsGenerated(true);
            onChange(squared);
        } catch (err) {
            console.error('Photo generation failed:', err);
            setError(err instanceof Error ? err.message : t('photoErrorGeneric'));
        } finally {
            setIsGenerating(false);
        }
    };

    const handleUseOriginal = () => {
        if (!originalPhoto) return;
        setIsGenerated(false);
        setError(null);
        onChange(originalPhoto);
    };

    const handleRemove = () => {
        setOriginalPhoto(undefined);
        setIsGenerated(false);
        setError(null);
        onChange(undefined);
    };

    // Preview / PDF: render just the photo. If there's no photo but editing is
    // available (live resume, preview tab), show a discreet "Add photo" button that
    // jumps to edit mode. It's data-export-exclude + print:hidden so it never lands
    // in the exported PDF or a print.
    if (!editable) {
        if (photo) {
            return (
                <div className="w-[35mm] h-[35mm] rounded-md overflow-hidden border border-slate-300 shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo} alt={t('photo')} className="w-full h-full object-cover" />
                </div>
            );
        }
        if (onAddRequest) {
            return (
                <button
                    type="button"
                    data-export-exclude
                    onClick={onAddRequest}
                    className="print:hidden w-[35mm] h-[35mm] rounded-md border-2 border-dashed border-slate-300 bg-slate-50/60 hover:border-indigo-400 hover:bg-indigo-50/60 text-slate-400 hover:text-indigo-600 flex flex-col items-center justify-center gap-1 transition-colors shrink-0"
                >
                    <User className="w-5 h-5" />
                    <span className="text-[8px] font-bold leading-tight text-center px-1">{t('photoAdd')}</span>
                </button>
            );
        }
        return null;
    }

    return (
        <div className="print:hidden w-[150px] shrink-0 flex flex-col items-center gap-2">
            <div className="relative w-[35mm] h-[35mm] rounded-md overflow-hidden border border-slate-300 bg-slate-100">
                {photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photo} alt={t('photo')} className="w-full h-full object-cover" />
                ) : (
                    <button
                        type="button"
                        onClick={openPicker}
                        className="w-full h-full flex flex-col items-center justify-center gap-1 text-slate-400 hover:bg-slate-50 transition-colors"
                    >
                        <User className="w-6 h-6" />
                        <span className="text-[9px] font-semibold">{t('photoUpload')}</span>
                    </button>
                )}
                {isGenerating && (
                    <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex flex-col items-center justify-center gap-1.5">
                        <RefreshCcw className="w-5 h-5 text-indigo-600 animate-spin" />
                        <span className="text-[8px] font-semibold text-indigo-700">{t('photoGenerating')}</span>
                    </div>
                )}
            </div>

            <div className="w-full flex flex-col gap-1.5">
                {PHOTO_ENHANCE_ENABLED && photo && (
                    <button
                        type="button"
                        onClick={handleGenerate}
                        disabled={isGenerating}
                        className="w-full inline-flex items-center justify-center gap-1 py-1.5 px-2 text-[10px] font-bold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                    >
                        <Sparkles className="w-3 h-3" /> {isGenerated ? t('photoRegenerate') : t('photoMakeProfessional')}
                    </button>
                )}

                {PHOTO_ENHANCE_ENABLED && isGenerated && originalPhoto && (
                    <button
                        type="button"
                        onClick={handleUseOriginal}
                        disabled={isGenerating}
                        className="w-full inline-flex items-center justify-center gap-1 py-1.5 px-2 text-[10px] font-semibold rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
                    >
                        <RotateCcw className="w-3 h-3" /> {t('photoUseOriginal')}
                    </button>
                )}

                <div className="flex gap-1.5">
                    <button
                        type="button"
                        onClick={openPicker}
                        disabled={isGenerating}
                        className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 px-1.5 text-[10px] font-semibold rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
                    >
                        <Upload className="w-3 h-3" /> {photo ? t('photoChange') : t('photoUpload')}
                    </button>
                    {photo && (
                        <button
                            type="button"
                            onClick={handleRemove}
                            disabled={isGenerating}
                            title={t('photoRemove')}
                            aria-label={t('photoRemove')}
                            className="inline-flex items-center justify-center py-1.5 px-2 text-[10px] font-semibold rounded-lg bg-white border border-slate-200 text-red-500 hover:bg-red-50 disabled:opacity-50 transition-colors"
                        >
                            <Trash2 className="w-3 h-3" />
                        </button>
                    )}
                </div>

                {error && <p className="text-[9px] text-red-600 leading-tight">{error}</p>}
                {PHOTO_ENHANCE_ENABLED && (
                    <p className="text-[8px] text-slate-400 leading-tight text-center">{t('photoHint')}</p>
                )}
            </div>

            <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleFileSelect}
            />
        </div>
    );
};
