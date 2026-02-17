# Admin Prompt Management — Manual Testing Checklist

> **Feature scope:** Layered prompt override system, version history, reset-to-default, dynamic gap threshold, and the AdminPrompts UI component.
>
> **Date created:** 2026-02-14

---

## Prerequisites

Before starting, ensure:

- [ ] MongoDB is running and accessible
- [ ] The app is running locally (`npm run dev`)
- [ ] You are logged in as an admin user (check via `/api/admin/check`)
- [ ] The admin dashboard is accessible at `/<locale>/admin`
- [ ] Browser DevTools → Network tab is open (to inspect API calls)

---

## 1. Initial State (No DB Overrides)

These tests verify the system works correctly when no prompt overrides exist in MongoDB.

| # | Test | Steps | Expected Result | Pass? |
|---|------|-------|-----------------|-------|
| 1.1 | Prompts tab loads with comparison view | Navigate to Admin → Prompts tab | All 4 prompts listed (System Instruction, Analyze Import, Evaluate Resume, Parse Resume) with green "Base default" badges | ☐ |
| 1.2 | Status legend is visible | Look at the top of the Prompts section | Three status indicators visible: green (base default), amber (admin override), red (disabled) | ☐ |
| 1.3 | Missing overrides notice | Check the info box above the prompt cards | Shows "4 prompt(s) running from base defaults (no DB override yet)" with "Create override" buttons for each | ☐ |
| 1.4 | Expand a base-default prompt | Click on any prompt card (e.g. System Instruction) | Expands to show the base default content in a read-only textarea. A "Create an override to edit" hint shows next to the label | ☐ |
| 1.5 | Read-only when no override | Try typing in the textarea of a base-default prompt | Textarea is read-only — no edits possible | ☐ |
| 1.6 | Language toggle works (base) | Toggle between English / 日本語 tabs | Content switches between EN and JA base defaults | ☐ |
| 1.7 | "Show Base" button works | Click "Show Base" on an expanded prompt | A second read-only textarea appears above the editor showing the base default from `prompt-defaults.ts` | ☐ |
| 1.8 | Variable reference panel | Click on the "Available Template Variables" dropdown inside an expanded prompt | Lists all `{{VARIABLE}}` placeholders for that prompt with descriptions. Verify `{{GAP_THRESHOLD_DAYS}}` is present for all 4 prompts | ☐ |
| 1.9 | Character count | Check the bottom-left of the expanded editor area | Shows accurate character count of the displayed content | ☐ |

**How to test:** Simply navigate to the Prompts tab with a fresh database (no `promptTemplates` collection, or empty). All prompts should be read-only and show base defaults.

---

## 2. Creating Overrides

| # | Test | Steps | Expected Result | Pass? |
|---|------|-------|-----------------|-------|
| 2.1 | Create override from notice | Click "Create override for [prompt name]" in the missing-templates info box | API call `POST /api/admin/prompts` fires with `useDefaults: true`. Prompt card changes from green "Base default" to green "Matches default". Textarea becomes editable | ☐ |
| 2.2 | Duplicate creation blocked | Try creating an override for the same prompt again (or check via API) | Returns 409 status. UI should not show the "Create override" button for that prompt anymore | ☐ |
| 2.3 | Override pre-populated from defaults | After creating, expand the prompt and check content | EN and JA content should match the base defaults from `prompt-defaults.ts` exactly | ☐ |
| 2.4 | Create all 4 overrides | Repeat for all 4 prompts | Missing-templates info box disappears when all 4 are created | ☐ |
| 2.5 | Audit log entry | Check Admin → Audit Log tab (or DB `auditLogs` collection) | A `prompt.create` entry exists for each created override, with your admin userId and the prompt slug | ☐ |

**How to test:** Click the "Create override" buttons one by one. Watch the Network tab to confirm `POST /api/admin/prompts` requests succeed with 201. After each, verify the prompt becomes editable.

---

## 3. Editing & Saving Prompts

| # | Test | Steps | Expected Result | Pass? |
|---|------|-------|-----------------|-------|
| 3.1 | Edit English content | Expand an override prompt, type in the textarea (English tab) | "Unsaved" badge appears on the card header. "Save Changes" button appears at the bottom-right | ☐ |
| 3.2 | Edit Japanese content | Switch to 日本語 tab, type in textarea | Same "Unsaved" + "Save Changes" behavior. English edits are preserved when switching back | ☐ |
| 3.3 | Save changes | Click "Save Changes" | Loading spinner on button → green "Saved" check appears briefly. Badge changes from "Matches default" to amber "Modified". Network tab shows `PUT /api/admin/prompts` with 200 | ☐ |
| 3.4 | Version increments | Check the version badge on the prompt card after saving | Version should increment (e.g. v1 → v2) | ☐ |
| 3.5 | "Last updated" timestamp | Check the metadata bar below the toolbar | Shows accurate timestamp and version number | ☐ |
| 3.6 | Modification indicator per language | After modifying only EN content, check the metadata bar | Shows "Modified from base: EN". If JA is also modified, shows "EN, JA" | ☐ |
| 3.7 | Content persists on refresh | Save a change, refresh the browser, re-open the prompt | The modified content is still there (loaded from DB) | ☐ |
| 3.8 | History snapshot on save | After saving, click "History" button | At least one history entry should exist with the *previous* content (before the save) | ☐ |
| 3.9 | Audit log for update | Check Audit Log | A `prompt.update` entry with the correct slug, fields updated, and new version | ☐ |
| 3.10 | Only changed fields sent | In Network tab, inspect the PUT request body when only EN is edited | Body should contain `contentEn` but NOT `contentJa` (partial update) | ☐ |

**How to test:** Make distinct edits to EN and JA separately, save each time, and verify via Network tab that the right fields are sent. Check version bumps and history entries after each save.

---

## 4. Show Base / Comparison View

| # | Test | Steps | Expected Result | Pass? |
|---|------|-------|-----------------|-------|
| 4.1 | Show Base displays read-only default | Click "Show Base" on a modified prompt | A read-only textarea appears above the editor showing the original base default content from `prompt-defaults.ts` | ☐ |
| 4.2 | Base tracks language toggle | Toggle between EN/JA while "Show Base" is open | Base content switches to the corresponding language | ☐ |
| 4.3 | Visual comparison possible | With "Show Base" open, compare to the editor textarea | You can visually compare base vs. current override side-by-side (vertically stacked) | ☐ |
| 4.4 | Hide Base | Click "Hide Base" (or the X button on the Base panel) | Base panel collapses. Button text toggles back to "Show Base" | ☐ |
| 4.5 | Unmodified override shows same content | On a prompt where override matches base, open "Show Base" | Base and current content should be identical | ☐ |

**How to test:** Create an override, modify it, then use "Show Base" to visually inspect what changed. Toggle languages to verify both EN and JA base content is correct.

---

## 5. Version History & Restore

| # | Test | Steps | Expected Result | Pass? |
|---|------|-------|-----------------|-------|
| 5.1 | History button appears for overrides | On a prompt with a DB override, check toolbar | "History" button is visible | ☐ |
| 5.2 | History button hidden for base-only | On a prompt with no override, check toolbar | "History" button is NOT visible | ☐ |
| 5.3 | Open history panel | Click "History" on a prompt that has been edited at least once | History panel opens below toolbar with version entries (version number, timestamp, change reason) | ☐ |
| 5.4 | Multiple history entries | Edit and save the same prompt 3 times | History panel shows 3 entries (v1, v2, v3) in reverse chronological order | ☐ |
| 5.5 | History shows correct versions | Inspect history entries | Each entry's version number should match the version at the time of snapshot (the *previous* version before the update that created it) | ☐ |
| 5.6 | Restore button loads content | Click "Restore" on a history entry | History panel closes. The textarea is populated with that version's content. "Unsaved" badge appears | ☐ |
| 5.7 | Restore doesn't auto-save | After clicking Restore, check the prompt card | Content is loaded as unsaved edits — must still click "Save Changes" to persist | ☐ |
| 5.8 | Restore + Save works | After restoring, click "Save Changes" | Content is persisted. A new history snapshot of the *pre-restore* content is created | ☐ |
| 5.9 | Close history panel | Click the X button or re-click "History" | Panel collapses/toggles off | ☐ |
| 5.10 | History empty state | Create a brand new override (never edited), open History | Shows "No version history yet. History is recorded when prompts are updated." | ☐ |

**How to test:** Edit a prompt multiple times (making note of each version's content). Open History, verify entries, then restore an older version and confirm the textarea updates without auto-saving. Save and verify a new history snapshot was created.

---

## 6. Reset to Default

| # | Test | Steps | Expected Result | Pass? |
|---|------|-------|-----------------|-------|
| 6.1 | Reset button visibility | On a modified override prompt, check toolbar | "Reset to Default" button (orange) is visible | ☐ |
| 6.2 | Reset button hidden when not modified | On an override that matches the base, check toolbar | "Reset to Default" button is NOT visible | ☐ |
| 6.3 | Confirmation dialog | Click "Reset to Default" | Shows inline confirmation: "Reset to base?" with "Confirm" and "Cancel" buttons | ☐ |
| 6.4 | Cancel reset | Click "Cancel" in the confirmation | Confirmation disappears. No changes made | ☐ |
| 6.5 | Confirm reset | Click "Confirm" | API call `PUT /api/admin/prompts` with `{ slug, reset: true }`. Content reverts to base default. Badge changes from "Modified" back to "Matches default" | ☐ |
| 6.6 | History snapshot on reset | After resetting, open History | A new snapshot entry exists with the *pre-reset* content and reason "Reset to default" | ☐ |
| 6.7 | Version increments on reset | Check the version badge after reset | Version number should increment (reset is a version-tracked change) | ☐ |
| 6.8 | Reset clears unsaved edits | Have unsaved edits, then reset | Both unsaved edits and DB content are reverted to base default | ☐ |
| 6.9 | Audit log for reset | Check Audit Log | A `prompt.reset` entry with previous version and reason | ☐ |
| 6.10 | Reset when no override exists | Via API: `PUT /api/admin/prompts` with `{ slug: "system_instruction", reset: true }` when no DB override exists | Returns 200 with `{ wasReset: false, message: "...already using base defaults" }` | ☐ |

**How to test:** Modify a prompt, then reset it. Verify content reverts by comparing with "Show Base". Check history for the pre-reset snapshot. Test the cancel flow to ensure it's non-destructive.

---

## 7. Enable / Disable Override

| # | Test | Steps | Expected Result | Pass? |
|---|------|-------|-----------------|-------|
| 7.1 | Disable override | On an active override, click "Disable Override" | Badge changes to red "Disabled". API: `PUT` with `{ slug, isActive: false }` | ☐ |
| 7.2 | Disabled prompt falls back to base | While an override is disabled, trigger the actual feature that uses this prompt (e.g. start a chat session for system_instruction) | The AI should use the base default prompt, not the disabled override | ☐ |
| 7.3 | Enable override | On a disabled override, click "Enable Override" | Badge changes back to amber "Modified" (or green "Matches default"). API: `PUT` with `{ slug, isActive: true }` | ☐ |
| 7.4 | Disable/Enable toggle label | Check "Disable Override" becomes "Enable Override" and vice versa | Button label and icon toggle correctly | ☐ |

**How to test:** Create an override with custom content. Disable it, then test the feature that uses that prompt to verify it falls back to the base default. Re-enable and verify the override content is used again.

---

## 8. Dynamic Gap Threshold (`{{GAP_THRESHOLD_DAYS}}`)

| # | Test | Steps | Expected Result | Pass? |
|---|------|-------|-----------------|-------|
| 8.1 | Default threshold is 90 | Without changing admin settings, start a new chat with an imported resume that has a gap > 90 days | The AI asks about the gap. Internally, `{{GAP_THRESHOLD_DAYS}}` resolves to `90` | ☐ |
| 8.2 | Change threshold in Admin Settings | Go to Admin → Settings, change `gap_detection_threshold_days` to `180` | Setting saved successfully | ☐ |
| 8.3 | Prompts reflect new threshold | After changing the setting, start a new chat with a resume that has a 120-day gap | The AI should NOT ask about the gap (120 < 180). Previously with 90, it would have asked | ☐ |
| 8.4 | All 4 prompts receive threshold | Check via API or logs that all prompt functions inject the new threshold value | `getSystemInstruction`, `getAnalyzeImportPrompt`, `getEvaluateResumePrompt`, `getParseResumePrompt` all use the updated value | ☐ |
| 8.5 | Variable visible in prompt templates | Open any prompt in admin, expand "Available Template Variables" | `{{GAP_THRESHOLD_DAYS}}` is listed with description "Gap detection threshold in days (from Admin Settings)" | ☐ |
| 8.6 | Template content contains placeholder | Open "Show Base" and search for `{{GAP_THRESHOLD_DAYS}}` in the base content | The placeholder appears in the base default text (not a hardcoded number) | ☐ |
| 8.7 | Fallback when setting missing | Delete `gap_detection_threshold_days` from the DB `adminSettings` collection | Prompts should fall back to 90 days (the `DEFAULT_GAP_THRESHOLD` constant) | ☐ |

**How to test:** The most reliable way is:
1. Start with default settings → run a chat with a resume with a 100-day gap → AI should ask about it.
2. Change `gap_detection_threshold_days` to 180 in Admin Settings.
3. Start a *new* chat with the same resume → AI should NOT mention the gap.
4. Verify via browser DevTools (or add a `console.log` in `getGapThreshold()`) that the correct value is being read.

---

## 9. API Endpoint Tests

These can be tested directly via browser address bar (for GET) or tools like Postman / `curl` / browser DevTools console.

| # | Test | Endpoint | Expected Result | Pass? |
|---|------|----------|-----------------|-------|
| 9.1 | List DB overrides | `GET /api/admin/prompts` | Returns `{ prompts: [...] }` with all DB prompt overrides | ☐ |
| 9.2 | List base defaults | `GET /api/admin/prompts?defaults=true` | Returns `{ defaults: [...] }` with all 4 base templates from `prompt-defaults.ts` | ☐ |
| 9.3 | Comparison view | `GET /api/admin/prompts?compare=true` | Returns `{ comparisons: [...] }` with `baseEn`, `baseJa`, `currentEn`, `currentJa`, `hasOverride`, `isModifiedEn`, `isModifiedJa` for each prompt | ☐ |
| 9.4 | Version history | `GET /api/admin/prompts?history=system_instruction` | Returns `{ history: [...] }` array sorted by version descending | ☐ |
| 9.5 | History limit | `GET /api/admin/prompts?history=system_instruction&limit=5` | Returns at most 5 history entries | ☐ |
| 9.6 | Create prompt | `POST /api/admin/prompts` with `{ slug, name, contentEn, contentJa }` | Returns 201 with created prompt | ☐ |
| 9.7 | Create with defaults | `POST /api/admin/prompts` with `{ slug: "system_instruction", useDefaults: true }` | Returns 201 with content pre-populated from `prompt-defaults.ts` | ☐ |
| 9.8 | Duplicate slug rejected | `POST` with an already-existing slug | Returns 409 | ☐ |
| 9.9 | Update prompt | `PUT /api/admin/prompts` with `{ slug, contentEn: "new content" }` | Returns 200, version incremented, cache invalidated | ☐ |
| 9.10 | Reset prompt | `PUT /api/admin/prompts` with `{ slug, reset: true }` | Returns 200 with `wasReset: true`, content matches base default | ☐ |
| 9.11 | Missing slug error | `PUT /api/admin/prompts` with `{}` (no slug) | Returns 400: "Prompt slug is required" | ☐ |
| 9.12 | Non-existent prompt update | `PUT /api/admin/prompts` with `{ slug: "nonexistent", contentEn: "test" }` | Returns 404 | ☐ |

**How to test:** Use browser DevTools console with `fetch()`:
```js
// Example: Fetch comparison view
const res = await fetch('/api/admin/prompts?compare=true');
const data = await res.json();
console.log(data);

// Example: Reset a prompt
const res = await fetch('/api/admin/prompts', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ slug: 'system_instruction', reset: true })
});
console.log(await res.json());
```

---

## 10. Auth & Security

| # | Test | Steps | Expected Result | Pass? |
|---|------|-------|-----------------|-------|
| 10.1 | Non-admin blocked from API | Log out (or use a non-admin account) and call `GET /api/admin/prompts` | Returns 401 or 403 | ☐ |
| 10.2 | Non-admin can't see admin UI | Navigate to `/<locale>/admin` as a non-admin user | Redirected or shown an access denied message | ☐ |
| 10.3 | Audit logs capture admin identity | After any prompt action, check audit log | `userId` / `email` of the admin who performed the action is recorded | ☐ |
| 10.4 | Client IP logged | Check audit log entries | `clientIp` field is populated | ☐ |

**How to test:** Open an incognito window (no session) and try hitting the API endpoints. Verify 401/403 responses. Then repeat as an admin and confirm audit logs have correct identity info.

---

## 11. Caching Behavior

| # | Test | Steps | Expected Result | Pass? |
|---|------|-------|-----------------|-------|
| 11.1 | Prompt cache invalidation on save | Edit and save a prompt. Immediately trigger the feature using that prompt | The updated content is used (not stale cached version) | ☐ |
| 11.2 | Prompt cache invalidation on reset | Reset a prompt. Immediately trigger the feature | Base default content is used | ☐ |
| 11.3 | Settings cache (gap threshold) | Change `gap_detection_threshold_days`. Wait ~60s (settings cache TTL). Test | New value is reflected in prompt output after cache expires | ☐ |

**How to test:** The prompt cache (`getCachedPrompt`) has a 5-minute TTL but is explicitly invalidated on save/reset via `invalidatePromptCache()`. Settings cache (`getCachedSetting`) has a 60-second TTL. To test settings cache, change the threshold and verify behavior after waiting.

---

## 12. Edge Cases

| # | Test | Steps | Expected Result | Pass? |
|---|------|-------|-----------------|-------|
| 12.1 | Empty content rejected | Via API, try `POST /api/admin/prompts` with `contentEn: ""` | Returns 400: required fields missing | ☐ |
| 12.2 | Very large prompt content | Paste ~50KB of text into the editor and save | Should save successfully (MongoDB document limit is 16MB) | ☐ |
| 12.3 | Special characters in content | Include `{{`, `}}`, backticks, quotes, newlines, unicode (日本語) in content | Content saved and retrieved correctly without corruption | ☐ |
| 12.4 | Unknown template variable | Add `{{NON_EXISTENT_VAR}}` in prompt content | Should remain as literal text `{{NON_EXISTENT_VAR}}` in the final resolved prompt (not substituted, not stripped) | ☐ |
| 12.5 | Concurrent edits | Open admin in two browser tabs, edit the same prompt differently, save both | Second save should succeed (last-write-wins). Version should increment correctly | ☐ |
| 12.6 | DB connection failure | Stop MongoDB while the admin UI is open, try to save | UI should show an error message (not crash). Prompts should fall back to base defaults at runtime | ☐ |
| 12.7 | Prompt slug case sensitivity | Via API, try creating `System_Instruction` vs `system_instruction` | Slugs should be treated as-is — the system uses exact match on lowercase slugs | ☐ |

**How to test:** These require specific setup. For 12.6 (DB failure), temporarily stop MongoDB and verify graceful degradation. For 12.5 (concurrency), use two browser tabs. For 12.4, add a fake variable and check the final AI prompt output.

---

## 13. End-to-End Integration

These verify that admin prompt changes actually affect the AI behavior.

| # | Test | Steps | Expected Result | Pass? |
|---|------|-------|-----------------|-------|
| 13.1 | Modified system instruction affects chat | Edit `system_instruction` to add a distinctive phrase (e.g. "Always greet the user by saying PINEAPPLE"). Start a new chat | The AI's behavior reflects the modified prompt (e.g. says PINEAPPLE) | ☐ |
| 13.2 | Modified analyze_import affects import | Edit `analyze_import` prompt. Import a resume | The import analysis reflects the modified prompt instructions | ☐ |
| 13.3 | Modified evaluate_resume affects scoring | Edit `evaluate_resume` (e.g. change max score or criteria). Generate and evaluate a resume | Evaluation output reflects modified rubric | ☐ |
| 13.4 | Modified parse_resume affects generation | Edit `parse_resume` prompt. Generate a resume | Output structure or style reflects the modified prompt | ☐ |
| 13.5 | Disabled override falls back | Disable `system_instruction` override. Start a new chat | AI uses the base default system instruction, not the modified override | ☐ |
| 13.6 | Reset override falls back | Reset `system_instruction` to default. Start a new chat | AI behavior matches base default (no custom modifications) | ☐ |

**How to test:** The most effective approach — add something unmistakable to the prompt (e.g. "You must start every sentence with the word BANANA") and verify the AI follows it. Then disable/reset and confirm the behavior returns to normal.

---

## Testing Tips

1. **Browser DevTools is your best friend:** Keep the Network tab open to inspect all API requests/responses during UI interactions.

2. **Direct API testing:** For API-level tests (Section 9), use the browser console:
   ```js
   // authenticated GET
   const r = await fetch('/api/admin/prompts?compare=true');
   console.log(await r.json());
   ```

3. **MongoDB shell for verification:** Connect directly to verify data:
   ```bash
   mongosh
   use <your-db-name>
   db.promptTemplates.find().pretty()
   db.promptHistory.find().sort({ version: -1 }).pretty()
   db.auditLogs.find({ action: /^prompt\./ }).sort({ timestamp: -1 }).pretty()
   db.adminSettings.findOne({ key: 'gap_detection_threshold_days' })
   ```

4. **Clean state reset:** To start fresh, drop the collections:
   ```bash
   db.promptTemplates.drop()
   db.promptHistory.drop()
   ```

5. **Cache bypass:** If testing cache behavior, restart the dev server to clear in-memory caches, or wait for TTL expiry (60s for settings, 5min for prompts).

6. **Test order suggestion:** Follow the sections in order (1 → 13). Each section builds on assumptions established by previous sections. Start with a clean DB for Section 1, then progressively create overrides and test modifications.
