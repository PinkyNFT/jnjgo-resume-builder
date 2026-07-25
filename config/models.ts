// Centralized Gemini model configuration
// export const GEMINI_MODEL = "gemma-3-12b-it";

// Alternative models (commented for reference)
export const GEMINI_MODEL = "gemini-3-flash-preview";

// Image generation / editing model ("Nano Banana"). One-line switch to
// "gemini-3-pro-image-preview" (Nano Banana Pro) for tighter identity fidelity.
export const GEMINI_IMAGE_MODEL = "gemini-2.5-flash-image";

// ── Feature flag: AI "Make Professional" headshot enhancement (Nano Banana) ──
// Currently OFF because the image model isn't available. This is the SINGLE
// switch for the whole feature: flip it to `true` to bring back the
// upload → enhance → regenerate/use-original flow in the UI. The API route
// (app/api/generate-photo), client service, and prompt all stay in place, so no
// other change is needed to re-enable it. Plain photo upload is unaffected.
export const PHOTO_ENHANCE_ENABLED = false;
