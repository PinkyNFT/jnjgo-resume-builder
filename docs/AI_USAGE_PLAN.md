# AI usage for beta: only where it's necessary

Proposal, 13 Oct 2026. Interview decision made the same day: **option 2** (scripted + up to 3 AI follow-ups), built and switchable. Items marked "Proposed" are next.

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
| Opening greeting | 1 per interview start (repeats if the user leaves) | Static text | **Done** |
| Interview turns | 1 per answer (10–25), full history re-sent each turn | Scripted, role-specific questions (JA/EN) with deterministic checks; ≤ 3 AI follow-ups when an answer has no number or no reason, sent as one question + answer (~160 tokens) | **Done** (option 2) |
| Hints | 1 per click | Static examples per question and role | **Done** |
| Generation | 1, plus up to 5 retries | 1, minimal thinking, GA model, slimmer schema (no `timeline` / `careerOverview`); import path adds 1 refine | **Partly done (beta):** `gemini-3.1-flash-lite`, low thinking + 8k cap, one retry only for cut-off JSON, no client retry. Slimmer schema still proposed |
| Score analysis | 1 per run, 1–5 runs (a passing score is required to save) | Deterministic rubric; improvement tips come from the generation call | Proposed |
| Recruiter profile draft | 1 per click | Prefilled from the resume in code; the user sets intent and salary (AI can't know them) | Proposed |

**Result:** about 15–35 calls per resume today → **1–2** (up to 5 with follow-ups). The interview part is live: 0–3 small calls instead of 10–25 growing ones.

## Proposed beta flow

- **From scratch:** role → personal info → scripted chat interview (per job: company, title, period, scope, key result with numbers, key decision; then education, skills, certifications; gaps detected from the dates) → **generate (1 call)** → editor with rule-based score → export.
- **From an existing resume:** upload or paste → **draft (1 call)** that also returns up to 5 questions about missing information → short form → **refine (1 call)** → editor.

## Interview: how it works now (option 2)

One switch in `config/interview.ts`:

| Option | Setting |
|---|---|
| 1. Fully scripted, AI only at generation | `MAX_AI_FOLLOWUPS = 0` |
| **2. Scripted + up to 3 AI follow-ups (current)** | `INTERVIEW_MODE = 'scripted'`, `MAX_AI_FOLLOWUPS = 3` |
| 3. AI on every turn (pre-beta) | `INTERVIEW_MODE = 'ai'` |

- **Script** (`utils/interviewScript.ts`): per job, company + title + dates in one question (dates asked separately only if missing, re-asked once if unreadable); scope, a result and a decision for the most recent role, one combined "what you did and a result" question for older roles; then gaps found from the dates, education, skills (asks for more under 3), certifications. About 10 answers for two jobs. Imported resumes get a short depth-only script (results and decisions for two roles, gaps, anything missing). Engineer, consultant and general wording in English and Japanese.
- **Listening** (all in code, no AI): skips what an answer already covered (dates given with the job, a result given with the scope); a question back ("What do you mean?", 「どういう意味ですか？」) gets an example and the same question again; "skip", "I don't know", 「わかりません」 move on with "No problem." and no follow-up; "I meant…", 「訂正」 is acknowledged and the open question stays; detailed answers get a warmer acknowledgement.
- **Easy to answer:** tap-to-answer chips for the common answers ("That was my first job", "None", "Skip", "I'd rather not say", "Show an example", "Generate my resume") and "About N questions left" on every screen size.
- **Examples never become facts:** examples are shown as hint bubbles, which generation ignores, and generation is told that interviewer lines are questions and examples. Checked on a messy transcript (question back, skip, vague answers): no example content in the resume across 2 runs.
- **Follow-up trigger** (deterministic): a result with no number, a decision with no reason, or a very short depth answer. Never for dates, education or lists.
- **Follow-up call:** `/api/chat` action `followUp`, admin-editable prompt `interview_followup`, minimal thinking, 2 attempts, 10 s client timeout. On any failure the script moves on, so the interview never waits on the AI.
- **Model:** `FOLLOW_UP_MODEL = 'gemini-3.6-flash'`. Measured on the real prompt: 1.2–1.9 s; `gemini-3-flash-preview` took 13–17 s with 503s; `gemini-3.5-flash-lite` timed out under load. About $0.0004 per follow-up.
- **Drafts** started with the AI interviewer keep it when resumed. Scripted drafts store a question id on each question (`Message.qid`) and resume where they stopped.
- **Generation check:** a 17-answer scripted Japanese transcript produced both jobs with correct dates, education, all skills, certifications, the explained gap and the extra award, from 1,417 input tokens.

## Order and effort (after approval)

1. Generation tuning: thinking level, GA model, slimmer schema, retry policy — 1 day incl. a quality check on real resumes
2. Deterministic score — 1–1.5 days
3. ~~Static greeting and hints~~ — done
4. ~~Scripted interview (option 2)~~ — done
5. Import draft → questions → refine — 1–1.5 days
6. Recruiter-profile prefill — 0.5 day

## Sources

- doda generative-AI 職務経歴書 (3 questions, 最短1分): https://aismiley.co.jp/ai_news/doda-generativeai-changejob-service/ · https://www.issoh.co.jp/tech/details/212/
- Teal ATS checker and AI bullets: https://www.stork.ai/en/teal · https://www.resumecoach.com/reviews/tealhq-resume-builder-review/
- Chatbot vs online form study (2022): https://pmc.ncbi.nlm.nih.gov/articles/PMC9606606
- Gemini pricing (3.5 Flash-Lite, 3.6 Flash): https://ai.google.dev/gemini-api/docs/pricing · https://cloud.google.com/gemini-enterprise-agent-platform/generative-ai/pricing
- LLM cost levers: https://morphllm.com/llm-cost-optimization · https://www.kunalganglani.com/blog/reduce-llm-api-costs-production

## Beta credits (24 Oct 2026)

The beta runs on the Gemini free tier, so all AI calls draw on one shared daily pool (`lib/ai-credits.ts`): 1 credit = 1 request, reset at midnight Pacific, limit in Admin → Settings → "Beta AI credits per day (shared)" (default 500, the measured free-tier figure for `gemini-3.1-flash-lite`). Google's daily-quota error empties the pool until the reset. Users see a meter in the navbar, banners when credits run low or out, and `/beta` explains it. Measured on the real routes: follow-up 1.9–2.6 s, generation about 6 s, scoring about 4 s; one full interview with a follow-up, generation and a score used 3 credits.
