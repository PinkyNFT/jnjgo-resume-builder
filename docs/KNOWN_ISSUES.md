# Known Issues — JNJGO Resume Builder (Beta)

> Last updated: 2026-04-19 (rev 2)
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
| — | *(none logged)* | | |

---

## How to report a bug

Contact: dev@kerofi.net — include the steps to reproduce, browser/device, and a screenshot if possible.
