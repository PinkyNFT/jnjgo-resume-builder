# AI usage for beta: only where it's necessary

Proposal, 13 Oct 2026. Status: **awaiting approval** for the items marked "Proposed".

## Principle

Use Gemini only for what code can't do: turning a person's own words into polished, structured, bilingual résumé content. Anything that can be a rule, a template or a lookup stays deterministic: free, instant, and the same answer every time.

## What the research says

- **Japan's convention is short structured input plus one generation.** doda's AI 職務経歴書 (Apr 2024) asks three questions — 職種, 役職, 仕事内容 — and generates once ("最短1分").
- **Established builders score with rules, not AI.** Teal's ATS checker runs 15 rule-based checks (structure, clarity, measurable results, keywords) for a 0–100% score; its AI bullet writer runs only when the user asks.
- **A chat format is worth keeping, an LLM per turn isn't required.** In a 2022 within-subject study, 69.9% preferred a chatbot over a web form for the same questions; it was slower and usability scores were not significantly different. Engagement comes from the conversational format.
- **The biggest savings are calls you don't make.** Cost guides agree: remove unnecessary calls and retries first, then route to cheaper models and trim prompts and outputs; batching suits offline work only.

## Calls per resume: today vs proposed

| AI call | Today | Proposal | Status |
|---|---|---|---|
| Analyze import | 1 per import; output never read | Removed | **Done (day 1)** |
| Export rewrite | Callable by anyone, no UI uses it | Off | **Done (day 1)** |
| Photo enhance | Off in UI, route still callable | Off, route 404 | **Done (day 1)** |
| Opening greeting | 1 per interview start (repeats if the user leaves) | Static text | Proposed |
| Interview turns | 1 per answer (10–25), full history re-sent each turn | Scripted, role-specific questions (JA/EN) with deterministic checks; optional ≤ 3 AI follow-ups when an answer has no numbers or decision | Proposed (needs your call) |
| Hints | 1 per click | Static examples per question | Proposed |
| Generation | 1, plus up to 5 retries | 1, minimal thinking, GA model, slimmer schema (no `timeline` / `careerOverview`); import path adds 1 refine | Proposed (day 2–3) |
| Score analysis | 1 per run, 1–5 runs (a passing score is required to save) | Deterministic rubric; improvement tips come from the generation call | Proposed |
| Recruiter profile draft | 1 per click | Prefilled from the resume in code; the user sets intent and salary (AI can't know them) | Proposed |

**Result:** about 15–35 calls per resume today → **1–2** (up to 5 with follow-ups).

## Proposed beta flow

- **From scratch:** role → personal info → scripted chat interview (per job: company, title, period, scope, key result with numbers, key decision; then education, skills, certifications; gaps detected from the dates) → **generate (1 call)** → editor with rule-based score → export.
- **From an existing resume:** upload or paste → **draft (1 call)** that also returns up to 5 questions about missing information → short form → **refine (1 call)** → editor.

## Decision needed

How the interview works:
1. **Fully scripted**, AI only at generation — cheapest, most predictable.
2. **Scripted + up to 3 AI follow-ups** where answers are thin — keeps the "AI interviewer" depth. *Recommended.*
3. **AI on every turn** (today), with thinking set low — most expensive and slowest.

## Order and effort (after approval)

1. Generation tuning: thinking level, GA model, slimmer schema, retry policy — 1 day incl. a quality check on real resumes
2. Deterministic score — 1–1.5 days
3. Static greeting and hints — 0.5 day
4. Scripted interview (option 1 or 2) — 2–3 days
5. Import draft → questions → refine — 1–1.5 days
6. Recruiter-profile prefill — 0.5 day

## Sources

- doda generative-AI 職務経歴書 (3 questions, 最短1分): https://aismiley.co.jp/ai_news/doda-generativeai-changejob-service/ · https://www.issoh.co.jp/tech/details/212/
- Teal ATS checker and AI bullets: https://www.stork.ai/en/teal · https://www.resumecoach.com/reviews/tealhq-resume-builder-review/
- Chatbot vs online form study (2022): https://pmc.ncbi.nlm.nih.gov/articles/PMC9606606
- LLM cost levers: https://morphllm.com/llm-cost-optimization · https://www.kunalganglani.com/blog/reduce-llm-api-costs-production
