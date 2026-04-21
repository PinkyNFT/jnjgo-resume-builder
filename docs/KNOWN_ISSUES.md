# Known Issues — JNJGO Resume Builder (Beta)

> Last updated: 2026-04-21 (rev 3)
> Priority levels: P0 = crash/data loss · P1 = core flow broken · P2 = minor UI issue

---

## P0 — Critical

| ID | Description | Steps to Reproduce | Status |
|----|-------------|-------------------|--------|
| — | *(none logged)* | | |

---

## P1 — Major

| ID | Description | Steps to Reproduce | Status |
|----|-------------|-------------------|--------|
| P1-001 | **Rate limiter race condition (E11000)** — MongoDB TTL index has a ~60s deletion lag. When a rate-limit window expired by timestamp but the document wasn't yet deleted, a new upsert triggered a duplicate key error, causing the limiter to fail open (request allowed through uncounted). | Occurs under concurrent requests at window expiry boundary. | **Fixed 2026-04-19** — Replaced upsert logic with a single atomic aggregation pipeline `$cond` update. No separate document insert, no duplicate key possible. |

---

## P2 — Minor

| ID | Description | Steps to Reproduce | Status |
|----|-------------|-------------------|--------|
| P2-001 | **Mobile responsiveness** — Core flows (landing page hero mockup, resume editor two-column layout, interview view generate button) were desktop-only. Mobile users couldn't access the "Generate Resume" button in the interview flow, and the editor controls panel overflowed on narrow screens. | Open any page on a screen narrower than 768 px (e.g. iPhone). | **Fixed 2026-04-21** — Landing mockup hidden on mobile; editor layout stacks vertically on small screens; generate button extracted from `hidden md:flex` container; padding adjusted for mobile bottom nav bar. |

---

## How to report a bug

Contact: dev@kerofi.net — include the steps to reproduce, browser/device, and a screenshot if possible.
