# JNJGO MVP Blueprint (main plan)

Proposal v1 · 8 Oct 2026 · Interactive version with the live theme preview: https://claude.ai/artifact/LAKyD2BgEDrYAbX68guFQq (private; share from its Share menu)

## Current sequencing (agreed 8 Oct 2026)

1. **Beta-0 (now):** keep the current theme. Improve only the core feature, resume generation, for minimum token use and maximum efficiency, and fix the critical issues from the engineering audit.
2. **Test, then release a beta.**
3. **When there is demand:** run the "proper" next beta following this blueprint (藍 theme, GSAP motion, design system, marketing site, 職務経歴書 template, evals).

## Who we design for

- **Candidates:** Japanese mid-career professionals (~28–45): consultants, PMs, engineers, and now sales, marketing, HR. Many search while employed (discretion matters); many bilingual.
- **Recruiters:** in-house and agency recruiters who want verified signal (salary, intent, deal-breakers) before the first call.
- **Design partner:** Atsuro (regional TA business partner).

Market facts: 3.31M job changers in Japan in 2024 (+300k, third yearly rise; 30–50 band growing). Hiring peaks Feb–Mar for April starts; many start searching over 年末年始. doda added generative-AI 職務経歴書 drafting in Apr 2024; BizReach's GPT résumé generator lifted scouts ~40%. **Drafting speed is commoditized** — we win on depth, a record the candidate owns and exports anywhere, and recruiter-only trust signals.

## Theme decision (deferred until after beta demand): 藍 (Ai)

Evolve today's indigo; no rebuild. 藍 = "Japan Blue" (R. W. Atkinson, 1870s; Tokyo 2020 emblem color); also reads as "AI".

Principles: trust before flash · story becomes structure · two voices (明朝 for the document, ゴシック for the tool).

| Token | Light | Dark | Role |
|---|---|---|---|
| 藍 Ai | #165E83 | #6DB3DE | Primary actions, links (white on it 7.1:1) |
| 紺 Kon | #223A70 | — | Stages, hero bands |
| 墨 Sumi | #0E1A2E | #E6ECF5 | Text (16.2:1) |
| 紙 Kami | #F5F7FA | #0B1424 | Page ground (cool, never cream) |
| 蛍光 Marker | #F8C84A | #F8C84A | Only on numbers that prove impact |
| 鼠 Nezu | #4A5A72 | #9AACC6 | Secondary text |

Type: IBM Plex Sans JP (body 16px / 1.7, per Digital Agency guidance) · Newsreader + Shippori Mincho (display) · IBM Plex Mono (data). Replace Latin-only Inter and the 🚀 emoji logo.

Motion: GSAP 3.15 only (all plugins free for commercial use since 2025; only no-code animation builders competing with Webflow are excluded). `@gsap/react` `useGSAP`, `gsap.matchMedia` for reduced motion, transforms/opacity only, content complete before JS runs. Remove Framer Motion screen by screen. Signature moments: Story → Structure hero, month-precise timeline draw, impact marker, score count-up, export Flip, generation choreography.

## Product thesis

doda and BizReach draft a 職務経歴書 in a minute and keep it on their platforms. JNJGO is the one master record a candidate owns: built from an interview that captures decisions and measurable impact, in Japanese and English, exported to every platform, with recruiter-only conditions the candidate controls.

**North-star metric:** interview-ready resumes per week (score ≥ 80 and exported at least once). Supporting: median sign-up → first resume < 20 min; interview completion ≥ 60%; ≥ 50% of generated resumes exported.

**In the MVP:** import (PDF/DOCX/paste) · AI interview JA/EN with streamed replies · generation, editor with autosave, versions · score with fix links · exports: Master Resume PDF, 職務経歴書 PDF, LinkedIn, BizReach · recruiter-only profile link; recruiter browse + messages (approval-gated).
**After the MVP:** 履歴書 (JIS) export · job matching (hide "Coming soon") · payments / recruiter tier · voice interview · recruiter features beyond today.

## Roadmap (10 weeks once the blueprint starts)

| Phase | Weeks | Exit criteria |
|---|---|---|
| Launch blockers (keys, secrets, DB split, APPI consent, CI) | 1 | Prod smoke test passes EN + JA |
| Definition + design system | 1–2 | CEO signs spec; /design page shows tokens + components |
| Brand + marketing site | 3–4 | Lighthouse mobile ≥ 90; reduced-motion reviewed |
| Core experience | 4–7 | 5 testers finish unaided; median < 20 min; no P0 |
| Quality + trust (Playwright, LLM evals, WCAG 2.2 AA, OWASP) | 7–9 | RC tagged; tests + evals green 3 days |
| Private beta → public beta | 9–10 | ≥ 40% of beta users reach an interview-ready resume |

Definition of done (every ticket): EN + JA strings via next-intl · works at 390px and 1440px, keyboard reachable · reduced motion respected · unit tests for logic, E2E updated for flow changes · analytics event for new actions · within performance budget, no new lint errors · reviewed PR, preview deploy checked in both languages.

## Risks

Gemini latency/cost → stream, route short tasks to a faster model, timeouts, cost-per-resume dashboard · invented facts → grounded prompts, confirmation before export, nightly evals · APPI cross-border → consent naming each overseas processor, paid Gemini tier, counsel review · Japanese fonts → sliced files, swap, metric-matched fallback · two motion libraries → GSAP only · recruiter scope creep → frozen · shared prod/dev data → split.

## Skills for the lead

GSAP · design systems + Japanese typography · LLM product engineering (structured output, streaming, evals, cost) · Next.js performance · Playwright · accessibility (WCAG 2.2) · privacy + security (APPI, OWASP) · product discovery + analytics. Later: system design, CI/CD + observability, technical leadership, EN/JA UX writing.

## Decisions needed from the CEO

Approve the theme (evolution) · approve scope cuts · part-time designer (~6 weeks) · owner for Gemini billing + production DB · Japanese privacy counsel · Atsuro to recruit 30–50 beta testers.
