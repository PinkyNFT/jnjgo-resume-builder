# Risk Report — JNJGO Resume Builder (Beta)

> Last updated: 2026-04-25 (rev 4)
> Status: Beta — for internal review and external stakeholder visibility

---

## Legal Risks

| ID | Risk | Severity | Notes |
|----|------|----------|-------|
| L1 | ~~**AI output liability**~~ — **Resolved (2026-04-21).** ToS section 4 now contains an explicit AI-output disclaimer clause with a highlighted red warning box. The disclaimer expressly disclaims all liability for employment disputes, misrepresentation claims, or reputational harm. Users acknowledge this on every ToS view. | ~~High~~ Resolved | See [app/[locale]/terms/page.tsx](../app/%5Blocale%5D/terms/page.tsx) and `messages/en.json` → `Terms.s4Disclaimer`. |
| L2 | ~~**No account deletion flow**~~ — **Resolved (2026-04-21).** Self-serve account deletion implemented. Users can delete all their data from Profile → Danger Zone → Delete Account. Requires typing `DELETE` to confirm. Deletes all collections (projects, resumes, profiles, messages, recruiter data) atomically. Signs the user out after completion. | ~~High~~ Resolved | See [app/api/account/delete/route.ts](../app/api/account/delete/route.ts). Privacy Policy updated to reference self-serve deletion. |
| L3 | **Privacy Policy scope** — The current privacy page is a beta placeholder. It does not specify retention periods, third-party processors (Google Gemini, MongoDB Atlas), or cross-border data transfer notices. | Medium | Needs legal review before public launch. |
| L4 | **Terms of Service enforceability** — ToS is marked Beta and lacks governing law, jurisdiction, and dispute resolution clauses. | Medium | Acceptable for closed beta; must be resolved before open launch. |

---

## Operational Risks

| ID | Risk | Severity | Notes |
|----|------|----------|-------|
| O1 | ~~**In-memory rate limiter**~~ — **Resolved (2026-04-19).** AI endpoints (`/api/chat`, `/api/parse`, `/api/analyze`) now use a MongoDB-backed rate limiter (`applyRateLimitDB`) enforced across all serverless instances. Uses a single atomic aggregation pipeline `$cond` update — no race conditions, no duplicate key errors. Limits are configurable by admins via Settings → Limits. Non-AI endpoints retain the in-memory limiter (acceptable for low-risk CRUD). $0 additional infrastructure cost. | ~~High~~ Resolved | See [lib/rate-limit.ts](../lib/rate-limit.ts). |
| O2 | ~~**No data backup policy**~~ — **Documented (2026-04-21).** Backup policy and restoration procedure documented. Atlas M10+ with Continuous Cloud Backup required before public launch. Current M0 free tier has no backup support — covered by beta disclaimer. Quarterly restore tests mandated. | ~~High~~ Action Required | See [docs/BACKUP_POLICY.md](./BACKUP_POLICY.md). Requires Atlas tier upgrade before open launch. |
| O3 | **No support/feedback channel** — The how-to-test page lists `dev@kerofi.net` as the contact. There is no ticketing system, response SLA, or escalation path. | Medium | Acceptable for closed beta with known testers. |
| O4 | ~~**Abuse via recruiter role**~~ — **Resolved (2026-04-25).** Every profile view is recorded in `recruiterPageViews` (recruiter ID, candidate ID, timestamp, source). Candidates can now see identified recruiters who viewed their profile via the "Who viewed your profile" section on their private profile page. Anonymous views are counted separately. Data is retained for 1 year. | ~~Medium~~ Resolved | See [app/api/candidate/profile-views/route.ts](../app/api/candidate/profile-views/route.ts) and `components/profile/PrivateProfileEditor.tsx`. |

---

## Technical Risks

| ID | Risk | Severity | Notes |
|----|------|----------|-------|
| T1 | ~~**Single AI provider dependency**~~ — **Resolved (2026-04-21).** Gemini retry wrapper (`lib/gemini-client.ts`) added with exponential backoff (3 retries, up to 10s delay). All three AI routes (`/api/chat`, `/api/parse`, `/api/analyze`) now use `callWithRetry`. Returns a structured error response after all retries exhausted so users see a clear failure message rather than an unhandled crash. | ~~High~~ Resolved | See [lib/gemini-client.ts](../lib/gemini-client.ts). Provider fallback (e.g. OpenAI) remains a future item. |
| T2 | **MongoDB cold connection** — The MongoDB connection uses pooling (`lib/mongodb.ts`) but there is no visible user-facing error state if the DB is unreachable at runtime. Users may see unhandled failures. | Medium | Health check endpoint exists at `/api/health` but is not surfaced to end users. |
| T3 | ~~**In-memory rate limiter does not scale**~~ — **Resolved (2026-04-19).** See O1. | ~~High~~ Resolved | Resolved alongside O1. |
| T4 | **No error monitoring / observability** — There is no Sentry, Datadog, or equivalent. Errors in production are only visible in server logs, which are ephemeral on serverless hosts. | Medium | Identified in [PRODUCTION_ROADMAP.md](./PRODUCTION_ROADMAP.md) as a future item. |
| T5 | **localStorage migration residue** — The app migrates legacy localStorage data to MongoDB on first load (`utils/dataMigration.ts`). If migration fails silently, users may lose data without knowing. | Low | Migration path has logging but no user-visible failure notification. |

---

## Summary

| Category | High | Medium | Low | Resolved / Action Required |
|----------|------|--------|-----|---------|
| Legal | 0 | 2 | 0 | 2 |
| Operational | 0 | 1 | 0 | 3 (O2 requires Atlas upgrade) |
| Technical | 0 | 2 | 1 | 3 |
| **Total** | **0** | **5** | **1** | **8** |

**Resolved this sprint (2026-04-21):** L1 (AI disclaimer), L2 (account deletion), O2 (backup policy documented), T1 (Gemini retry logic).
**Resolved (2026-04-25):** O4 (recruiter access audit — candidate-facing profile views + `recruiterPageViews` collection).
**Blockers for open/public launch:** O2 (Atlas M10 upgrade required for actual backups), L3 + L4 (legal review).
**Acceptable for closed beta:** All remaining Medium/Low items, provided testers are informed via the beta disclaimer.
