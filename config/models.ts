// Centralized Gemini model configuration
// export const GEMINI_MODEL = "gemma-3-12b-it";

// Beta (free tier): gemini-3.1-flash-lite. Measured 24 Oct 2026 on the real
// generation prompt with low thinking: 3–14 s, complete EN + JA resumes, and
// about 500 free requests a day vs about 20 for gemini-3-flash-preview (which
// took up to 104 s and dropped a job in the same test). Admins can override it
// in Admin → Settings → AI Model.
export const GEMINI_MODEL = "gemini-3.1-flash-lite";

// Beta AI credits: AI requests per day shared by all users (lib/ai-credits.ts).
// Match it to the model's free-tier requests-per-day in AI Studio → Rate limits;
// Admin → Settings → "Beta AI credits per day" overrides it without a deploy.
export const BETA_DAILY_AI_CREDITS = 500;

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

// ── Feature flag: AI short/long rewrite of export text ──
// OFF for beta (cut AI calls to what the core flow needs). The route
// (app/api/export/rewrite) and the dormant ExportTemplates component stay in
// place; flip to `true` to bring it back. See docs/COMING_SOON.md.
export const EXPORT_REWRITE_ENABLED = false;
