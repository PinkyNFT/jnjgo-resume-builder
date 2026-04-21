# MongoDB Atlas Backup Policy

> Status: Required before public launch (Risk O2)
> Tier target: Atlas M10+ (Continuous Cloud Backup available)

---

## Current State (Beta)

The app runs on MongoDB Atlas free tier (M0). M0 does **not** support continuous or scheduled backups. The beta disclaimer informs users that data may be lost.

---

## Required Actions Before Public Launch

### 1. Upgrade to Atlas M10 or higher

Continuous Cloud Backup (point-in-time recovery) is available from M10 ($57/month).

Steps:
1. In the Atlas console, go to **Database → your cluster → ... → Edit Configuration**
2. Select **M10** tier or higher
3. Enable **Continuous Cloud Backup** under the Backup section
4. Set retention period to **7 days minimum** (30 days recommended)

### 2. Enable Scheduled Snapshots (interim measure on M2/M5)

If staying on a smaller tier, enable on-demand snapshots and schedule them manually:

```
Atlas Console → Backup → Schedule → Daily at 02:00 UTC
Retention: 7 days
```

### 3. Configure Backup Alerts

Set Atlas alerts to notify `dev@kerofi.net` if:
- Backup job fails
- Cluster storage exceeds 70% capacity

### 4. Verify Restoration Process (quarterly)

Test restoration to a temporary cluster to confirm backups are valid:
1. Go to Atlas → Backup → Snapshots → Restore
2. Restore to a new M0 cluster (test only)
3. Verify document counts match production
4. Delete the test cluster

---

## Collections and Data Classification

| Collection | Sensitivity | Backup Priority |
|---|---|---|
| `projects` | High (career data) | Critical |
| `userProfiles` | High (PII) | Critical |
| `candidatePrivateProfiles` | High (salary, PII) | Critical |
| `resumeVersions` | High (career data) | High |
| `recruiterProfiles` | Medium | High |
| `recruiterActions` | Medium | Medium |
| `candidateReplies` | Medium | Medium |
| `candidatePublicPages` | Low (public data) | Medium |
| `exportEvents` | Low | Low |
| `rateLimits` | None (ephemeral) | None |
| `recruiterPageViews` | Low (TTL: 1yr) | Low |

---

## Incident Response

If data loss is detected:
1. Immediately notify affected users via `dev@kerofi.net`
2. Halt write operations if loss is ongoing
3. Restore from most recent snapshot
4. Post-incident: review backup frequency and retention period

---

## Compliance Note (GDPR / 個人情報保護法)

When a user requests account deletion via the self-serve flow (`DELETE /api/account/delete`), all their data is removed from the live database. However, backup snapshots may retain their data for up to the retention period (7–30 days). This must be disclosed in the Privacy Policy if retention exceeds 30 days.
