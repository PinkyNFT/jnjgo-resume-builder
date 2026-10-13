/**
 * Scripted resume interview (beta). Role-specific questions in English and
 * Japanese, chosen in code from the answers so far, at no AI cost. The only AI
 * in this mode is an optional follow-up when an answer is thin (wantsFollowUp,
 * capped in config/interview.ts).
 *
 * State lives in the saved history: every question the script asks carries a
 * `qid`, and the user's next message is its answer. Resuming a draft rebuilds
 * the position from the history, so nothing else needs to be stored.
 *
 * Question ids:
 *   job:N:role | period | period2 | scope | result | decision | summary
 *   gap:I, edu, skills, skills2, certs                (from scratch)
 *   imp:N:result | decision, imp:gaps, imp:missing    (imported resume)
 *   done, more:K, and fu:<qid> for an AI follow-up
 */

import type { Message, RoleType } from '../types';
import { parsePeriod } from './dateParser';
import { findTimelineGaps, gapMonths, type TimelineGap } from './careerGaps';

type Lang = 'en' | 'ja';

export interface ScriptContext {
    roleType: RoleType;
    locale: string;
    /** The user imported a resume: ask for depth only, not for what it already has. */
    imported: boolean;
    fullName?: string;
    /** Breaks between jobs at least this long get a question. */
    gapDays?: number;
}

export interface ScriptStep {
    qid: string;
    text: string;
}

export type ScriptSection = 'work' | 'details' | 'gaps' | 'education' | 'skills' | 'certifications';

/** Most recent roles that get the full deep dive (scope, result, decision); older roles get one summary question. */
export const DEEP_DIVE_JOBS = 2;
export const MAX_JOBS = 8;
export const MAX_GAP_QUESTIONS = 3;
const DEFAULT_GAP_DAYS = 90;
const MIN_SKILLS = 3;

// ===== Copy =====

interface RoleCopy {
    scope: string;
    result: string;
    decision: string;
    skills: string;
    hint: { scope: string; result: string; decision: string; skills: string };
}

const ROLE_COPY: Record<RoleType, Record<Lang, RoleCopy>> = {
    senior_engineer: {
        en: {
            scope: 'What did you own in this role? Systems, team size, and the users or traffic you were responsible for.',
            result: "What's a result you're proud of in this role? Numbers make it concrete: latency, uptime, cost, users, release speed.",
            decision: 'Tell me about a technical decision or trade-off you made there. What did you choose, and why?',
            skills: 'Which languages, frameworks, cloud services and tools do you use most? Aim for 5 to 10.',
            hint: {
                scope: "e.g. 'Led a team of 4 building the payments API (2M requests a day) on AWS.'",
                result: "e.g. 'Cut p95 latency from 800 ms to 200 ms and saved $4k a month in compute.'",
                decision: "e.g. 'Chose PostgreSQL over DynamoDB because reporting needed joins; the migration took 3 weeks.'",
                skills: "e.g. 'TypeScript, React, Node.js, Go, PostgreSQL, AWS (ECS, Lambda), Terraform, Docker'",
            },
        },
        ja: {
            scope: 'この職務で担当していた範囲を教えてください。システム、チーム規模、ユーザー数やトラフィックなど。',
            result: '誇れる成果を1つ教えてください。数字があると伝わりやすくなります（レイテンシ、稼働率、コスト、ユーザー数、リリース頻度など）。',
            decision: '技術的な判断やトレードオフの経験を教えてください。何を選び、なぜそう判断しましたか？',
            skills: 'よく使う言語、フレームワーク、クラウド、ツールを教えてください。5～10個が目安です。',
            hint: {
                scope: '例：「4名のチームで決済API（1日200万リクエスト）をAWS上で開発・運用」',
                result: '例：「p95レイテンシを800msから200msに改善し、インフラ費を月40万円削減」',
                decision: '例：「レポートに結合が必要だったため、DynamoDBではなくPostgreSQLを採用。移行は3週間で完了」',
                skills: '例：「TypeScript、React、Node.js、Go、PostgreSQL、AWS（ECS・Lambda）、Terraform、Docker」',
            },
        },
    },
    consultant: {
        en: {
            scope: 'What was your scope? Clients, industries, project size and your role on the team.',
            result: "What's an outcome you delivered for a client? Numbers help: cost saved, revenue, time, adoption.",
            decision: 'Tell me about a recommendation you made to a client. What did you propose, and why?',
            skills: 'Which methods, industries and tools are you strongest in? Aim for 5 to 10.',
            hint: {
                scope: "e.g. 'PMO lead for a 30-person ERP rollout at a manufacturer (¥500M budget).'",
                result: "e.g. 'Redesigned the order process, cutting lead time by 40% and saving ¥120M a year.'",
                decision: "e.g. 'Recommended a phased rollout instead of big-bang to reduce risk; the client went live 2 months early.'",
                skills: "e.g. 'DX strategy, PMO, business process redesign, SAP S/4HANA, financial modelling, Excel, PowerPoint'",
            },
        },
        ja: {
            scope: '担当範囲を教えてください。クライアント、業界、プロジェクト規模、チーム内での役割など。',
            result: 'クライアントにもたらした成果を1つ教えてください。数字があると伝わりやすくなります（コスト削減、売上、期間短縮、定着率など）。',
            decision: 'クライアントへの提案の経験を教えてください。何を提案し、なぜそう判断しましたか？',
            skills: '得意な手法、業界、ツールを教えてください。5～10個が目安です。',
            hint: {
                scope: '例：「製造業のERP導入（予算5億円・30名体制）でPMOリーダーを担当」',
                result: '例：「受注プロセスを再設計し、リードタイムを40%短縮、年間1.2億円のコストを削減」',
                decision: '例：「リスクを抑えるため一括導入ではなく段階導入を提案し、予定より2か月早く稼働」',
                skills: '例：「DX戦略、PMO、業務改革、SAP S/4HANA、財務モデリング、Excel、PowerPoint」',
            },
        },
    },
    general: {
        en: {
            scope: 'What were you responsible for? Team size, budget, clients, products or regions.',
            result: "What's a result you're proud of in this role? Numbers help: %, ¥, customers, time saved.",
            decision: 'Tell me about a decision or initiative you led. What did you do, and why?',
            skills: 'What are your key skills and tools? Aim for 5 to 10.',
            hint: {
                scope: "e.g. 'Managed 3 key accounts worth ¥200M a year and a team of 5.'",
                result: "e.g. 'Grew repeat orders by 25% in one year by launching a customer follow-up program.'",
                decision: "e.g. 'Moved weekly reports from Excel to a shared dashboard so managers could act the same day.'",
                skills: "e.g. 'Account management, negotiation, Salesforce, Excel, data analysis, business English'",
            },
        },
        ja: {
            scope: '担当していた範囲を教えてください。チーム規模、予算、顧客、商品、地域など。',
            result: '誇れる成果を1つ教えてください。数字があると伝わりやすくなります（％、金額、顧客数、削減時間など）。',
            decision: '主導した判断や取り組みを教えてください。何を行い、なぜそうしましたか？',
            skills: '主なスキルやツールを教えてください。5～10個が目安です。',
            hint: {
                scope: '例：「年間2億円規模の主要顧客3社と、5名のチームを担当」',
                result: '例：「顧客フォロー施策を立ち上げ、1年でリピート受注を25%増加」',
                decision: '例：「週次レポートをExcelから共有ダッシュボードに移行し、管理職が当日中に判断できるようにした」',
                skills: '例：「法人営業、交渉、Salesforce、Excel、データ分析、ビジネス英語」',
            },
        },
    },
};

const COPY = {
    en: {
        hello: (name: string) => (name ? `Hi ${name}!` : 'Hi!'),
        opening: "I'm your career coach. We'll build your resume together in a short chat, about 10 minutes, and you can save anytime.\n\nLet's start with your work history, most recent job first.",
        openingImport: "I've read the resume you imported, so I won't ask for anything that's already there. A few short questions to add depth: numbers and the reasons behind your decisions are what make a resume stand out.\n\nLet's start with your most recent role.",
        acks: ['Thanks!', 'Got it.', 'Thank you.', 'Understood.'],
        firstRole: "What's your current (or most recent) company, and your job title there?",
        nextRole: "And before that? Company and job title, or say 'none' if that was your first job.",
        firstPeriod: "When did you start there, and are you still there? For example 'Apr 2021 – present'.",
        period: "When did you work there? For example 'Jun 2018 – Mar 2021'.",
        periodRetry: "Sorry, I couldn't read those dates. Could you write them like 'Jun 2018 – Mar 2021' (or 'Apr 2021 – present')?",
        summary: 'In a sentence or two, what did you do there and what did you achieve?',
        gap: (from: string, to: string) => `Your timeline shows a break from ${from} to ${to}. What were you doing during that time? Anything is fine: study, family, travel, a job search.`,
        education: "What's your highest degree or qualification? School, field of study and graduation year. A bootcamp or self-taught is fine too.",
        moreSkills: 'Any others? 5 to 10 skills give recruiters a fuller picture.',
        certs: "Do you have any professional certifications, licenses or language scores? For example AWS, PMP, JLPT or TOEIC. 'None' is fine.",
        previousRole: "Now your previous role (say 'none' if you've had only one).",
        importGaps: (months: number) => `Were there any breaks of ${months} months or more between jobs? If so, when, and what were you doing? Anything is fine. Say 'none' if not.`,
        importMissing: "Is anything missing or out of date in the resume you imported? For example new skills, certifications, education or languages. Say 'nothing' if it's all there.",
        done: "Thank you! That's everything I need:\n✓ Work History ✓ Experience Details ✓ Education ✓ Skills ✓ Certifications ✓ Career Gaps\n\nReady to generate your resume? If you'd like anything else included (awards, side projects, languages), type it first.",
        more: "Noted, I'll include that. Generate your resume whenever you're ready.",
        marks: {
            work: '✓ Work history captured!',
            details: '✓ Experience details covered!',
            gaps: '✓ Gaps noted.',
            education: '✓ Education noted!',
            skills: '✓ Skills recorded!',
        },
        hints: {
            role: "e.g. 'Rakuten, Senior Software Engineer'. If you haven't worked yet, say 'none'.",
            period: "e.g. 'Apr 2021 – present' or 'Jun 2018 – Mar 2021'",
            summary: "e.g. 'Ran inside sales for the Kansai region and hit 120% of target two years running.'",
            gap: "e.g. 'Studied for the AWS certification and did some freelance work.' or 'Took time off for family.'",
            education: "e.g. 'BSc Computer Science, Osaka University, 2015'",
            certs: "e.g. 'AWS Solutions Architect – Associate (2023), TOEIC 900' or 'None'",
            importGaps: "e.g. 'Mar to Aug 2020: studied for a certification' or 'None'",
            importMissing: "e.g. 'Add TOEIC 900 (2024) and Kubernetes' or 'Nothing'",
            done: "Press Generate Resume when you're ready, or type anything else you'd like included.",
            followUp: 'A rough number is fine: team size, %, ¥, users, hours saved. Or say why you chose that approach.',
        },
    },
    ja: {
        hello: (name: string) => (name ? `こんにちは、${name}さん！` : 'こんにちは！'),
        opening: 'キャリアコーチです。10分ほどの会話で、一緒にレジュメを作成しましょう。途中でいつでも保存できます。\n\nまずは職務経歴について、直近のものから伺います。',
        openingImport: 'インポートしたレジュメを拝見しました。すでに記載されている内容はお聞きしません。数字や判断の理由を加えると、レジュメがぐっと伝わりやすくなります。いくつか短い質問をさせてください。\n\nまずは直近の職務について伺います。',
        acks: ['ありがとうございます。', '承知しました。', 'なるほど、ありがとうございます。', 'ありがとうございます！'],
        firstRole: '現在（または直近）の会社名と役職を教えてください。',
        nextRole: 'その前の職歴はいかがですか？会社名と役職を教えてください。最初の職歴であれば「なし」とお答えください。',
        firstPeriod: 'いつから在籍していますか？現在も在籍中ですか？（例：「2021年4月～現在」）',
        period: '在籍期間を教えてください。（例：「2018年6月～2021年3月」）',
        periodRetry: 'すみません、日付を読み取れませんでした。「2018年6月～2021年3月」（在籍中なら「2021年4月～現在」）の形で教えていただけますか？',
        summary: 'その職務で担当したことと成果を、1～2文で教えてください。',
        gap: (from: string, to: string) => `${from}から${to}までの期間について、何をされていたか教えてください。学業、家庭の事情、旅行、転職活動など、どんな内容でも大丈夫です。`,
        education: '最終学歴を教えてください。学校名、専攻、卒業年をお願いします。（専門学校、ブートキャンプ、独学でも大丈夫です）',
        moreSkills: '他にもありますか？5～10個あると、採用担当者に伝わりやすくなります。',
        certs: '専門資格、免許、語学スコアはお持ちですか？（例：AWS認定、PMP、日本語能力試験、TOEIC）なければ「なし」で大丈夫です。',
        previousRole: '次に、その前の職務について伺います（職歴が1社のみの場合は「なし」とお答えください）。',
        importGaps: (months: number) => `職歴の間に${months}か月以上の空白期間はありますか？ある場合は、時期と何をされていたかを教えてください（どんな内容でも大丈夫です）。なければ「なし」とお答えください。`,
        importMissing: 'インポートしたレジュメに、不足している情報や古くなっている情報はありますか？（新しいスキル、資格、学歴、語学など）すべて揃っていれば「なし」とお答えください。',
        done: 'ありがとうございます！必要な情報がすべて揃いました：\n✓ 職務経歴 ✓ 経験詳細 ✓ 学歴 ✓ スキル ✓ 資格 ✓ キャリアギャップ\n\nレジュメを生成しますか？ほかに加えたい内容（受賞歴、個人プロジェクト、語学など）があれば、先に入力してください。',
        more: '承知しました。内容に反映します。準備ができたら、レジュメを生成してください。',
        marks: {
            work: '✓ 職務経歴を確認しました！',
            details: '✓ 経験の詳細を伺いました！',
            gaps: '✓ ギャップを確認しました。',
            education: '✓ 学歴を記録しました！',
            skills: '✓ スキルを記録しました！',
        },
        hints: {
            role: '例：「楽天グループ株式会社 シニアソフトウェアエンジニア」。職歴がない場合は「なし」とお答えください。',
            period: '例：「2021年4月～現在」「2018年6月～2021年3月」',
            summary: '例：「関西エリアのインサイドセールスを担当し、2年連続で目標120%を達成」',
            gap: '例：「AWS資格の勉強をしながら、フリーランスで仕事をしていました」「家族の事情で休職していました」',
            education: '例：「大阪大学 工学部 情報科学科 2015年卒業」',
            certs: '例：「AWS認定ソリューションアーキテクト – アソシエイト（2023年）、TOEIC 900点」または「なし」',
            importGaps: '例：「2020年3月～8月：資格の勉強」または「なし」',
            importMissing: '例：「TOEIC 900点（2024年）とKubernetesを追加」または「なし」',
            done: '準備ができたら「レジュメを生成」を押してください。追加したい内容があれば入力してください。',
            followUp: 'おおよその数字でも大丈夫です（チーム規模、％、金額、ユーザー数、削減時間など）。または、その方法を選んだ理由を教えてください。',
        },
    },
} as const;

const lang = (locale: string): Lang => (locale === 'ja' ? 'ja' : 'en');

// ===== Answer checks (deterministic) =====

const CJK = /[぀-ヿ㐀-鿿]/;

const NONE_EN = /^(none|no|nope|nah|nothing|n\/?a|nil|not really|all good|no (more|other|others|previous|prior|gaps?|changes?|thanks)|nothing (else|more|to add|missing)|that'?s (all|it|everything)|(it|that|this) (was|is) my (first|only) (job|role|company|position)|my (first|only) (job|role)|(first|only) (job|role))$/;
const NONE_JA = /(なし|無し|ない|ないです|ありません|ございません|いいえ|以上|以上です|大丈夫|大丈夫です|それだけ|これだけ)$|最初の(会社|職場|仕事|職歴)|初めての(会社|職場|仕事|就職)|(1|一)社(のみ|だけ)/;

/** "none", "no", "that was my first job", 「なし」, 「特にありません」 … */
export function isNone(answer?: string): boolean {
    if (!answer) return false;
    const t = answer.trim().toLowerCase().replace(/[.!?。！？、,]+$/u, '').replace(/\s+/g, ' ');
    if (!t) return false;
    if (CJK.test(t)) return t.length <= 40 && NONE_JA.test(t);
    if (t.length > 60) return false;
    const rest = t.replace(/^(no|nope|none|nah)[,.!\s]+/, '');
    return NONE_EN.test(t) || (rest !== t && NONE_EN.test(rest));
}

const NUMBER = /[0-9０-９]|[一二三四五六七八九十百千万億]+\s*(人|名|件|割|倍|社|か月|ヶ月|カ月|年|円|時間|日|週|%|％)|半分|半減|倍増|数十|数百|数千|数万|\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty|thirty|forty|fifty|hundreds?|thousands?|millions?|billions?|dozens?|half|double|doubled|twice|triple|tripled)\b/i;
const REASON = /\b(because|since|so that|so we|so i|so the|in order to|due to|as a result|which (meant|let|allowed|helped|reduced|cut|saved)|instead of|rather than|trade-?offs?|the reason|to (avoid|reduce|improve|save|cut|increase|lower|speed|keep|meet|support|enable|allow|prevent|handle|make))\b|ため|ので|から|理由|ように|ことで|目的|背景|判断/i;

const FOLLOW_UP_KINDS = new Set(['scope', 'result', 'decision', 'summary']);

/**
 * Whether an answer is thin enough to deserve an AI follow-up: very short, a
 * result with no number, or a decision with no reason. Only depth questions
 * qualify; dates, education and lists never do.
 */
export function wantsFollowUp(qid: string, answer: string): boolean {
    const [head, , kind] = qid.split(':');
    if ((head !== 'job' && head !== 'imp') || !FOLLOW_UP_KINDS.has(kind)) return false;
    const text = answer.trim();
    if (!text || isNone(text)) return false;
    if (text.length < (CJK.test(text) ? 15 : 30)) return true;
    if (kind === 'scope') return false;
    if (kind === 'decision') return !REASON.test(text);
    return !NUMBER.test(text);
}

/** Number of items in a list answer ("Python, Go and AWS" → 3). */
export function countItems(text?: string): number {
    if (!text) return 0;
    return text.split(/[,、，;；\n・/|]+|\s+and\s+|\s*&\s*|と/).map(s => s.trim()).filter(Boolean).length;
}

const RANGE = /[–—―‒‐−\-~～〜|]|\s+to\s+/i;
const ONGOING = /(present|now|current|still|today|to date|現在|在職|在籍|今も|現職)/i;

/**
 * Turn a free-text period answer into something parsePeriod reads:
 * full-width digits, 「から」, "since 2019", "Apr 2021, still there".
 */
export function normalizePeriod(answer?: string): string {
    if (!answer) return '';
    let t = answer
        .trim()
        .replace(/[０-９]/g, d => String.fromCharCode(d.charCodeAt(0) - 0xfee0))
        .replace(/(から|より)/g, '～')
        .replace(/\b(since|from)\s+/gi, '');
    if (!RANGE.test(t) && (ONGOING.test(t) || /\bsince\b/i.test(answer))) t += ' – present';
    return t;
}

// ===== History =====

/** Answers to scripted questions, keyed by qid (a follow-up's answer is under fu:<qid>). */
export function scriptAnswers(messages: Message[]): Map<string, string> {
    const answers = new Map<string, string>();
    let asked: string | undefined;
    for (const m of messages) {
        if (m.isHint) continue;
        if (m.role === 'model') {
            asked = m.qid;
            continue;
        }
        if (!asked) continue;
        const prev = answers.get(asked);
        answers.set(asked, prev ? `${prev}\n${m.text}` : m.text);
    }
    return answers;
}

/** A history the script wrote (vs. one from the AI interviewer). */
export function isScriptedHistory(messages: Message[]): boolean {
    return messages.some(m => m.role === 'model' && !!m.qid);
}

/** The scripted question waiting for an answer, if the last message is one. */
export function pendingQuestion(messages: Message[]): ScriptStep | null {
    for (let i = messages.length - 1; i >= 0; i--) {
        const m = messages[i];
        if (m.isHint) continue;
        return m.role === 'model' && m.qid ? { qid: m.qid, text: m.text } : null;
    }
    return null;
}

/** The last scripted question asked, answered or not. */
function lastAsked(messages: Message[]): string | undefined {
    for (let i = messages.length - 1; i >= 0; i--) {
        if (!messages[i].isHint && messages[i].role === 'model' && messages[i].qid) return messages[i].qid;
    }
    return undefined;
}

export function followUpsUsed(messages: Message[]): number {
    return messages.filter(m => m.role === 'model' && m.qid?.startsWith('fu:')).length;
}

/** What a follow-up should know about the role ("Rakuten, Senior Engineer"), without sending the whole chat. */
export function followUpContext(messages: Message[], qid: string): string {
    const [head, n] = qid.split(':');
    if (head !== 'job') return '';
    return (scriptAnswers(messages).get(`job:${n}:role`) ?? '').slice(0, 200);
}

// ===== Plan =====

interface PlanItem {
    qid: string;
    gap?: TimelineGap;
}

function* ending(): Generator<PlanItem> {
    yield { qid: 'done' };
    for (let k = 0; ; k++) yield { qid: `more:${k}` };
}

// Generators read an answer only after yielding its question, and nextStep
// stops at the first unanswered question, so every answer read here exists.
function* scratchPlan(a: Map<string, string>, ctx: ScriptContext): Generator<PlanItem> {
    const jobs: { label: string; period: string }[] = [];
    for (let n = 0; n < MAX_JOBS; n++) {
        yield { qid: `job:${n}:role` };
        if (isNone(a.get(`job:${n}:role`))) break;
        yield { qid: `job:${n}:period` };
        let period = normalizePeriod(a.get(`job:${n}:period`));
        if (!parsePeriod(period)) {
            yield { qid: `job:${n}:period2` };
            period = normalizePeriod(a.get(`job:${n}:period2`));
        }
        jobs.push({ label: a.get(`job:${n}:role`) ?? '', period });
        if (n < DEEP_DIVE_JOBS) {
            yield { qid: `job:${n}:scope` };
            yield { qid: `job:${n}:result` };
            yield { qid: `job:${n}:decision` };
        } else {
            yield { qid: `job:${n}:summary` };
        }
    }
    const gaps = findTimelineGaps(jobs, ctx.gapDays ?? DEFAULT_GAP_DAYS).slice(0, MAX_GAP_QUESTIONS);
    for (let i = 0; i < gaps.length; i++) yield { qid: `gap:${i}`, gap: gaps[i] };
    yield { qid: 'edu' };
    yield { qid: 'skills' };
    if (countItems(a.get('skills')) < MIN_SKILLS) yield { qid: 'skills2' };
    yield { qid: 'certs' };
    yield* ending();
}

function* importPlan(a: Map<string, string>): Generator<PlanItem> {
    yield { qid: 'imp:0:result' };
    yield { qid: 'imp:0:decision' };
    yield { qid: 'imp:1:result' };
    if (!isNone(a.get('imp:1:result'))) yield { qid: 'imp:1:decision' };
    yield { qid: 'imp:gaps' };
    yield { qid: 'imp:missing' };
    yield* ending();
}

type Stage = 'work' | 'gaps' | 'education' | 'skills' | 'certs' | 'missing' | 'done';

function stageOf(qid: string): Stage {
    const id = qid.replace(/^fu:/, '');
    if (id === 'imp:gaps' || id.startsWith('gap:')) return 'gaps';
    if (id === 'imp:missing') return 'missing';
    if (id.startsWith('job:') || id.startsWith('imp:')) return 'work';
    if (id === 'edu') return 'education';
    if (id.startsWith('skills')) return 'skills';
    if (id === 'certs') return 'certs';
    return 'done';
}

function questionText(item: PlanItem, ctx: ScriptContext): string {
    const L = lang(ctx.locale);
    const c = COPY[L];
    const r = ROLE_COPY[ctx.roleType]?.[L] ?? ROLE_COPY.general[L];
    const [head, nStr, kind] = item.qid.split(':');
    const n = Number(nStr);

    if (head === 'job') {
        switch (kind) {
            case 'role': return n === 0 ? c.firstRole : c.nextRole;
            case 'period': return n === 0 ? c.firstPeriod : c.period;
            case 'period2': return c.periodRetry;
            case 'summary': return c.summary;
            default: return r[kind as 'scope' | 'result' | 'decision'];
        }
    }
    if (item.qid === 'imp:gaps') return c.importGaps(Math.round((ctx.gapDays ?? DEFAULT_GAP_DAYS) / 30));
    if (item.qid === 'imp:missing') return c.importMissing;
    if (head === 'imp') {
        const q = r[kind as 'result' | 'decision'];
        return n === 1 && kind === 'result' ? `${c.previousRole}${L === 'ja' ? '' : ' '}${q}` : q;
    }
    if (head === 'gap' && item.gap) {
        const { from, to } = gapMonths(item.gap, L);
        return c.gap(from, to);
    }
    switch (item.qid) {
        case 'edu': return c.education;
        case 'skills': return r.skills;
        case 'skills2': return c.moreSkills;
        case 'certs': return c.certs;
        case 'done': return c.done;
        default: return c.more;
    }
}

function compose(item: PlanItem, prev: string | undefined, answered: number, ctx: ScriptContext): string {
    const L = lang(ctx.locale);
    const c = COPY[L];
    const q = questionText(item, ctx);
    const sep = L === 'ja' ? '' : ' ';

    if (!prev) {
        const name = ctx.fullName?.trim() ?? '';
        const greeting = c.hello(L === 'ja' ? name : name.split(/\s+/)[0] ?? '');
        return `${greeting}${sep}${ctx.imported ? c.openingImport : c.opening}\n\n${q}`;
    }
    // These carry their own lead-in.
    if (item.qid === 'done' || item.qid.startsWith('more:') || item.qid.endsWith(':period2')) return q;

    const from = stageOf(prev);
    if (from !== stageOf(item.qid)) {
        const mark = from === 'work' ? (ctx.imported ? c.marks.details : c.marks.work)
            : from === 'gaps' ? c.marks.gaps
                : from === 'education' ? c.marks.education
                    : from === 'skills' ? c.marks.skills
                        : '';
        if (mark) return `${mark}\n\n${q}`;
    }
    return `${c.acks[answered % c.acks.length]}${sep}${q}`;
}

/** The next scripted question for this history (the opening when it is empty). */
export function nextStep(messages: Message[], ctx: ScriptContext): ScriptStep {
    const a = scriptAnswers(messages);
    const plan = ctx.imported ? importPlan(a) : scratchPlan(a, ctx);
    let prev: string | undefined;
    for (const item of plan) {
        if (a.has(item.qid)) {
            prev = item.qid;
            continue;
        }
        return { qid: item.qid, text: compose(item, prev, a.size, ctx) };
    }
    return { qid: 'done', text: COPY[lang(ctx.locale)].done }; // unreachable: ending() never runs out
}

/** Static example answer for a question (no AI). */
export function scriptHint(qid: string | undefined, ctx: ScriptContext): string {
    const L = lang(ctx.locale);
    const h = COPY[L].hints;
    const r = (ROLE_COPY[ctx.roleType]?.[L] ?? ROLE_COPY.general[L]).hint;
    if (!qid) return h.done;
    if (qid.startsWith('fu:')) return h.followUp;
    const [head, , kind] = qid.split(':');
    if (head === 'job' || (head === 'imp' && kind)) {
        switch (kind) {
            case 'role': return h.role;
            case 'period':
            case 'period2': return h.period;
            case 'summary': return h.summary;
            default: return r[kind as 'scope' | 'result' | 'decision'];
        }
    }
    switch (qid) {
        case 'imp:gaps': return h.importGaps;
        case 'imp:missing': return h.importMissing;
        case 'edu': return h.education;
        case 'skills':
        case 'skills2': return r.skills;
        case 'certs': return h.certs;
        default: return head === 'gap' ? h.gap : h.done;
    }
}

/** Which interview sections are complete, from the script position alone. */
export function scriptProgress(messages: Message[], ctx: ScriptContext): { sections: Record<ScriptSection, boolean>; done: boolean } {
    const current = stageOf(lastAsked(messages) ?? nextStep(messages, ctx).qid);
    const order: Stage[] = ctx.imported
        ? ['work', 'gaps', 'missing', 'done']
        : ['work', 'gaps', 'education', 'skills', 'certs', 'done'];
    const at = order.indexOf(current);
    const past = (s: Stage) => at > order.indexOf(s);
    const done = current === 'done';

    if (ctx.imported) {
        return {
            done,
            sections: {
                work: true,
                details: past('work'),
                gaps: past('gaps'),
                education: past('missing'),
                skills: past('missing'),
                certifications: past('missing'),
            },
        };
    }
    const answers = scriptAnswers(messages);
    return {
        done,
        sections: {
            work: past('work'),
            details: past('work') || answers.has('job:0:decision'),
            gaps: past('gaps'),
            education: past('education'),
            skills: past('skills'),
            certifications: past('certs'),
        },
    };
}
