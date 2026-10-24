# Beta launch checklist

For the beta launch on https://jnjgo.vercel.app (24 Oct 2026). Work top to bottom; each step says how to check it.

## 1. Before deploying

**Code**
- [ ] Push branch `beta0/day1-critical-fixes` and merge it into the branch Vercel deploys to production (usually `master`).

**Vercel → Settings → Environment Variables (Production)**

| Variable | Value | Notes |
|---|---|---|
| `GEMINI_API_KEY` | key from the Google project the beta runs on | Free tier. Local dev on the same key uses the same daily quota; a separate project for dev avoids that |
| `MONGODB_URI` | new cluster (`cluster0.4weu136`) | `mongodb+srv://` works on Vercel |
| `NEXTAUTH_URL` | `https://jnjgo.vercel.app` | Local `.env.local` keeps `http://localhost:3000` |
| `NEXTAUTH_SECRET` | new random value, not shared with dev | `openssl rand -base64 32` |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | OAuth client | Rotate the secret before real users (it appeared in a pasted log) |
| `ADMIN_EMAILS` | your Google email | Without it, nobody can open Admin |
| `NEXT_PUBLIC_SENTRY_DSN` | recommended | Without it there is no error monitoring in production |

Do not set `NEXTAUTH_DEBUG` in production (it logs secrets).

**MongoDB Atlas (new cluster)**
- [ ] Network Access → `0.0.0.0/0`, not marked temporary (Vercel has no fixed IPs).
- [ ] The database user's password is new. The old cluster's password was exposed in a session log; change it or delete that cluster.

**Google Cloud → Google Auth Platform**
- [ ] Audience / OAuth consent screen is **In production**. In "Testing", only listed test users can sign in.
- [ ] Authorized origins and redirect URIs include both `https://jnjgo.vercel.app` (+ `/api/auth/callback/google`) and `http://localhost:3000` (+ callback).

**AI Studio → Rate limits**
- [ ] Note the requests-per-day for `gemini-3.1-flash-lite` on this project. After deploying, set Admin → Settings → "Beta AI credits per day (shared)" to that number (default 500).

Then redeploy (env changes only apply to new deployments).

## 2. Smoke test after deploying (about 10 minutes)

1. `https://jnjgo.vercel.app/api/health` shows `"status":"healthy"`.
2. Sign in with Google in a private window, ideally with an account that was never a test user.
3. The navbar shows the AI credit meter (e.g. "500 / 500 left").
4. New resume → Japanese interview → Generate. The resume appears in about 5–15 seconds and the meter goes down.
5. Run score analysis: the score is 100 or less.
6. **Export PDF from a Japanese resume and open it.** Japanese text must show (no empty boxes). This is the first run on Vercel's Chromium.
7. Sign out and open `https://jnjgo.vercel.app/beta`: the beta status page loads.
8. Sign in with the `ADMIN_EMAILS` account → Admin → Settings: "Beta AI credits per day (shared)" is listed; set it per step 1.

If something fails, the beta banner and `/beta` already tell users it's an early version; Admin → Settings → maintenance mode can pause the app.

## 3. Risks accepted for the beta

- **Gemini free tier and personal data.** Google's terms for unpaid use say not to submit personal information, and Google may use free-tier content to improve its products (human reviewers may read it). Users are told on the new-resume screen, the privacy policy and `/beta`. The fix is enabling billing on the Gemini project: Flash-Lite costs well under a cent per AI request, Google then stops using the content, and the credit limit can be raised. Have the privacy text (APPI) reviewed.
- **Shared daily AI pool.** About 500 requests a day for everyone (a resume uses 1–5). When it runs out, users see when it resets and their work stays saved.
- **New, empty database.** Data in the old cluster was not migrated.
- **Recruiter sign-ups need approval** (`require_recruiter_verification` is on): approve them in Admin.

## 4. What changed for the beta (for reference)

- Scripted interview with up to 3 AI follow-ups (`config/interview.ts`), tap-to-answer suggestions, "about N questions left".
- Shared AI credit meter and out-of-credit handling (`lib/ai-credits.ts`), model `gemini-3.1-flash-lite` (`config/models.ts`).
- Beta status page `/beta` (content in `messages/*.json` → `BetaStatus`; review the target dates).
- Photo crop only; AI headshot and export rewrite switched off (`docs/COMING_SOON.md`).
- Security: AI routes need sign-in, rate limits per user, input caps, no admin bootstrap, SSRF fix in PDF export.
