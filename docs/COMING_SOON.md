# Coming soon (saved for after beta)

Features that are built (or partly built) but switched off for beta, plus planned ones. Nothing here runs or costs anything while off.

## Built, switched off

| Feature | How it's switched off | Where the code lives | To bring back |
|---|---|---|---|
| AI professional headshot ("Make Professional", Regenerate, Use original) | `PHOTO_ENHANCE_ENABLED = false` in `config/models.ts`; `/api/generate-photo` returns 404 | `components/ResumePhoto.tsx` (gated buttons), `services/photoService.ts`, `app/api/generate-photo/route.ts`, `getProfessionalHeadshotPrompt` in `lib/prompts.ts`, `GEMINI_IMAGE_MODEL` | Flip the flag; confirm the image model is enabled for the key |
| AI short/long rewrite of export text (per platform) | `EXPORT_REWRITE_ENABLED = false` in `config/models.ts`; `/api/export/rewrite` returns 404 | `app/api/export/rewrite/route.ts`, dormant `components/ExportTemplates.tsx` | Flip the flag and mount the component in the export hub |

## Beta photo scope

Upload, **crop** (square, drag + zoom) and remove. Everything else above is later.

## Planned

- Photo editing beyond crop (rotate, brightness, background clean-up)
- 履歴書 (JIS format) export with photo
- 職務経歴書 PDF template (職務要約, 職務経歴, 活かせる経験・知識・スキル, 資格, 自己PR)
- Job matching / recommendations (the dashboard shows "Coming soon" cards today)
- GitHub and LinkedIn sign-in (shown as "coming soon" on the sign-in page)
- Voice interview
- Payments and a recruiter paid tier
- 藍 (Ai) theme, GSAP motion and design system — see `docs/MVP_BLUEPRINT.md`

AI features proposed to move here for beta are listed in `docs/AI_USAGE_PLAN.md`.
