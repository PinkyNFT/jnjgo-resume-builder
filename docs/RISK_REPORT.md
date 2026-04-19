# Risk Report — JNJGO Resume Builder (Beta)

> Last updated: 2026-04-19 (rev 2)
> Status: Beta — for internal review and external stakeholder visibility

---

## Legal Risks

| ID | Risk | Severity | Notes |
|----|------|----------|-------|
| L1 | **AI output liability** — Resume content is AI-generated. If a candidate submits inaccurate or embellished content and it leads to a dispute, there is no explicit liability disclaimer beyond the beta banner. | High | Terms of Service page exists but does not yet contain an explicit AI-output disclaimer clause. |
| L2 | **No account deletion flow** — Users have no self-serve way to request deletion of their data (resumes, profile, chat history). This is a GDPR / Act on Protection of Personal Information (Japan) obligation. | High | Privacy page references data ownership but no deletion mechanism is implemented. |
| L3 | **Privacy Policy scope** — The current privacy page is a beta placeholder. It does not specify retention periods, third-party processors (Google Gemini, MongoDB Atlas), or cross-border data transfer notices. | Medium | Needs legal review before public launch. |
| L4 | **Terms of Service enforceability** — ToS is marked Beta and lacks governing law, jurisdiction, and dispute resolution clauses. | Medium | Acceptable for closed beta; must be resolved before open launch. |

---

## Operational Risks

| ID | Risk | Severity | Notes |
|----|------|----------|-------|
| O1 | ~~**In-memory rate limiter**~~ — **Resolved (2026-04-19).** AI endpoints (`/api/chat`, `/api/parse`, `/api/analyze`) now use a MongoDB-backed rate limiter (`applyRateLimitDB`) enforced across all serverless instances. Uses a single atomic aggregation pipeline `$cond` update — no race conditions, no duplicate key errors. Limits are configurable by admins via Settings → Limits. Non-AI endpoints retain the in-memory limiter (acceptable for low-risk CRUD). $0 additional infrastructure cost. | ~~High~~ Resolved | See [lib/rate-limit.ts](../lib/rate-limit.ts). |
| O2 | **No data backup policy** — There is no documented backup schedule for the MongoDB Atlas database. If the Atlas free tier is used, point-in-time recovery is not available. | High | Beta disclaimer mentions data may be lost — but no actual backup process exists. |
| O3 | **No support/feedback channel** — The how-to-test page lists `dev@kerofi.net` as the contact. There is no ticketing system, response SLA, or escalation path. | Medium | Acceptable for closed beta with known testers. |
| O4 | **Abuse via recruiter role** — The recruiter role can view candidate profiles. There is no audit log of who accessed whose profile. | Medium | Low risk for beta; becomes critical at scale. |

---

## Technical Risks

| ID | Risk | Severity | Notes |
|----|------|----------|-------|
| T1 | **Single AI provider dependency** — All AI features depend exclusively on Google Gemini (`@google/genai`). If the API is unavailable or the key is revoked, the core interview and resume generation flows are fully blocked with no fallback. | High | No retry logic or provider fallback is in place. |
| T2 | **MongoDB cold connection** — The MongoDB connection uses pooling (`lib/mongodb.ts`) but there is no visible user-facing error state if the DB is unreachable at runtime. Users may see unhandled failures. | Medium | Health check endpoint exists at `/api/health` but is not surfaced to end users. |
| T3 | ~~**In-memory rate limiter does not scale**~~ — **Resolved (2026-04-19).** See O1. | ~~High~~ Resolved | Resolved alongside O1. |
| T4 | **No error monitoring / observability** — There is no Sentry, Datadog, or equivalent. Errors in production are only visible in server logs, which are ephemeral on serverless hosts. | Medium | Identified in [PRODUCTION_ROADMAP.md](./PRODUCTION_ROADMAP.md) as a future item. |
| T5 | **localStorage migration residue** — The app migrates legacy localStorage data to MongoDB on first load (`utils/dataMigration.ts`). If migration fails silently, users may lose data without knowing. | Low | Migration path has logging but no user-visible failure notification. |

---

## Summary

| Category | High | Medium | Low | Resolved |
|----------|------|--------|-----|---------|
| Legal | 2 | 2 | 0 | 0 |
| Operational | 1 | 2 | 0 | 1 |
| Technical | 1 | 2 | 1 | 1 |
| **Total** | **4** | **6** | **1** | **2** |

**Blockers for open/public launch:** L2 (no account deletion / GDPR), T1 (single AI provider, no fallback).
**Resolved this sprint:** O1 + T3 — MongoDB-backed rate limiter, atomic, admin-configurable, $0 cost.
**Acceptable for closed beta:** All remaining items, provided testers are informed via the beta disclaimer.
