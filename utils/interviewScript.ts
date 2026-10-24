/**
 * Scripted resume interview (beta). Role-specific questions in English and
 * Japanese, chosen in code from the answers so far, at no AI cost. The only AI
 * in this mode is an optional follow-up when an answer is thin (wantsFollowUp,
 * capped in config/interview.ts).
 *
 * It tries to listen like a person would: it skips what an answer already
 * covered (dates given with the job, a result given with the scope), answers a
 * question back with an example, accepts "skip" / "I don't know" without
 * pushing, and takes corrections without treating them as the answer.
 *
 * State lives in the saved history: every question the script asks carries a
 * `qid`, and the user's next real answer is its answer. Resuming a draft
 * rebuilds the position from the history, so nothing else needs to be stored.
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
    /** Shown first as a hint bubble (an example answer), so generation never takes it for the candidate's words. */
    example?: string;
}

/** A tap-to-answer option shown under the open question. */
export interface ScriptChoice {
    label: string;
    /** send: send the label as the answer · example: show the static example · generate: open generation. */
    action: 'send' | 'example' | 'generate';
}

export type ScriptSection = 'work' | 'details' | 'gaps' | 'education' | 'skills' | 'certifications';

/** Most recent roles that get the full deep dive (scope, result, decision); older roles get one summary question. */
export const DEEP_DIVE_JOBS = 1;
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
        opening: "I'm your career coach. We'll build your resume together in a short chat, about 10 questions. Answer in your own words: rough numbers are fine, you can skip anything, and you can save at any time.\n\nLet's start with your work history, most recent job first.",
        openingImport: "I've read the resume you imported, so I won't ask for anything that's already there. A few short questions to add depth: numbers and the reasons behind your decisions are what make a resume stand out. Rough numbers are fine, and you can skip anything.\n\nLet's start with your most recent role.",
        acks: ['Thanks!', 'Got it.', 'Thank you.', 'Understood.'],
        richAcks: ['Great detail, thank you.', "That's really helpful, thank you."],
        noProblem: 'No problem.',
        exampleLead: "Here's an example of what I'm looking for:",
        corrected: "Thanks, I'll use the corrected details.",
        firstRole: "What's your current (or most recent) company and job title, and when did you start? For example 'Rakuten, Senior Engineer, since Apr 2021'.",
        nextRole: "And before that? Company, job title and dates, for example 'Sony, Engineer, Jun 2018 – Mar 2021'. If that was your first job, just say so.",
        firstPeriod: "When did you start there? For example 'Apr 2021 – present'.",
        period: "When did you work there? For example 'Jun 2018 – Mar 2021'.",
        periodRetry: "Sorry, I couldn't read those dates. Could you write them like 'Jun 2018 – Mar 2021' (or 'Apr 2021 – present')?",
        summary: "In a sentence or two: what did you do there, and what's one result you're proud of?",
        gap: (from: string, to: string) => `Your timeline shows a break from ${from} to ${to}. What were you doing during that time? Anything is fine: study, family, travel, a job search.`,
        education: "What's your highest degree or qualification? School, field of study and graduation year. A bootcamp or self-taught is fine too.",
        moreSkills: 'Any others? 5 to 10 skills give recruiters a fuller picture.',
        certs: 'Do you have any professional certifications, licenses or language scores? For example AWS, PMP, JLPT or TOEIC.',
        previousRole: 'Now your previous role.',
        importGaps: (months: number) => `Were there any breaks of ${months} months or more between jobs? If so, when, and what were you doing? Anything is fine.`,
        importMissing: 'Is anything missing or out of date in the resume you imported? For example new skills, certifications, education or languages.',
        done: "Thank you! That's everything I need:\n✓ Work History ✓ Experience Details ✓ Education ✓ Skills ✓ Certifications ✓ Career Gaps\n\nReady to generate your resume? If you'd like anything else included (awards, side projects, languages), type it first.",
        doneHelp: "You can review and edit everything after it's generated. Tap 'Generate my resume' when you're ready, or type anything else you'd like included.",
        more: "Noted, I'll include that. Generate your resume whenever you're ready.",
        marks: {
            work: '✓ Work history captured!',
            details: '✓ Experience details covered!',
            gaps: '✓ Gaps noted.',
            education: '✓ Education noted!',
            skills: '✓ Skills recorded!',
        },
        hints: {
            role: "e.g. 'Rakuten, Senior Software Engineer, since Apr 2021'",
            period: "e.g. 'Apr 2021 – present' or 'Jun 2018 – Mar 2021'",
            summary: "e.g. 'Ran inside sales for the Kansai region and hit 120% of target two years running.'",
            gap: "e.g. 'Studied for the AWS certification and did some freelance work.' or 'Took time off for family.'",
            education: "e.g. 'BSc Computer Science, Osaka University, 2015'",
            certs: "e.g. 'AWS Solutions Architect – Associate (2023), TOEIC 900'",
            importGaps: "e.g. 'Mar to Aug 2020: studied for a certification'",
            importMissing: "e.g. 'Add TOEIC 900 (2024) and Kubernetes'",
            done: "Tap 'Generate my resume' when you're ready, or type anything else you'd like included.",
            followUp: 'A rough number is fine: team size, %, ¥, users, hours saved. Or say why you chose that approach.',
        },
        choices: {
            example: 'Show an example',
            skip: 'Skip',
            firstJob: 'That was my first job',
            noJobs: 'No work experience yet',
            none: 'None',
            thatsAll: "That's all",
            noDegree: 'No degree',
            ratherNot: "I'd rather not say",
            onlyOneJob: "I've had only one job",
            nothingToAdd: 'Nothing to add',
            generate: 'Generate my resume',
        },
    },
    ja: {
        hello: (name: string) => (name ? `こんにちは、${name}さん！` : 'こんにちは！'),
        opening: 'キャリアコーチです。10問ほどの短い会話で、一緒にレジュメを作成しましょう。ご自身の言葉でお答えください。数字はおおよそで大丈夫です。答えにくい質問はスキップでき、いつでも保存できます。\n\nまずは職務経歴について、直近のものから伺います。',
        openingImport: 'インポートしたレジュメを拝見しました。すでに記載されている内容はお聞きしません。数字や判断の理由を加えると、レジュメがぐっと伝わりやすくなります。数字はおおよそで大丈夫です。答えにくい質問はスキップできます。\n\nまずは直近の職務について伺います。',
        acks: ['ありがとうございます。', '承知しました。', 'なるほど、ありがとうございます。', 'ありがとうございます！'],
        richAcks: ['具体的で、とても分かりやすいです。', 'ありがとうございます。とても参考になります。'],
        noProblem: '大丈夫です。',
        exampleLead: '例えば、次のような内容です。',
        corrected: '承知しました。訂正内容を反映します。',
        firstRole: '現在（または直近）の会社名、役職、入社時期を教えてください。（例：「楽天グループ株式会社、シニアエンジニア、2021年4月から」）',
        nextRole: 'その前の職歴はいかがですか？会社名、役職、在籍期間を教えてください。（例：「ソニー株式会社、エンジニア、2018年6月～2021年3月」）最初の職歴であれば、そのようにお答えください。',
        firstPeriod: 'いつから在籍していますか？（例：「2021年4月～現在」）',
        period: '在籍期間を教えてください。（例：「2018年6月～2021年3月」）',
        periodRetry: 'すみません、日付を読み取れませんでした。「2018年6月～2021年3月」（在籍中なら「2021年4月～現在」）の形で教えていただけますか？',
        summary: 'その職務で担当したことと、誇れる成果を1つ、1～2文で教えてください。',
        gap: (from: string, to: string) => `${from}から${to}までの期間について、何をされていたか教えてください。学業、家庭の事情、旅行、転職活動など、どんな内容でも大丈夫です。`,
        education: '最終学歴を教えてください。学校名、専攻、卒業年をお願いします。（専門学校、ブートキャンプ、独学でも大丈夫です）',
        moreSkills: '他にもありますか？5～10個あると、採用担当者に伝わりやすくなります。',
        certs: '専門資格、免許、語学スコアはお持ちですか？（例：AWS認定、PMP、日本語能力試験、TOEIC）',
        previousRole: '次に、その前の職務について伺います。',
        importGaps: (months: number) => `職歴の間に${months}か月以上の空白期間はありますか？ある場合は、時期と何をされていたかを教えてください（どんな内容でも大丈夫です）。`,
        importMissing: 'インポートしたレジュメに、不足している情報や古くなっている情報はありますか？（新しいスキル、資格、学歴、語学など）',
        done: 'ありがとうございます！必要な情報がすべて揃いました：\n✓ 職務経歴 ✓ 経験詳細 ✓ 学歴 ✓ スキル ✓ 資格 ✓ キャリアギャップ\n\nレジュメを生成しますか？ほかに加えたい内容（受賞歴、個人プロジェクト、語学など）があれば、先に入力してください。',
        doneHelp: '生成後に、すべての内容を確認・編集できます。準備ができたら「レジュメを生成」をタップしてください。追加したい内容があれば入力してください。',
        more: '承知しました。内容に反映します。準備ができたら、レジュメを生成してください。',
        marks: {
            work: '✓ 職務経歴を確認しました！',
            details: '✓ 経験の詳細を伺いました！',
            gaps: '✓ ギャップを確認しました。',
            education: '✓ 学歴を記録しました！',
            skills: '✓ スキルを記録しました！',
        },
        hints: {
            role: '例：「楽天グループ株式会社、シニアソフトウェアエンジニア、2021年4月から」',
            period: '例：「2021年4月～現在」「2018年6月～2021年3月」',
            summary: '例：「関西エリアのインサイドセールスを担当し、2年連続で目標120%を達成」',
            gap: '例：「AWS資格の勉強をしながら、フリーランスで仕事をしていました」「家族の事情で休職していました」',
            education: '例：「大阪大学 工学部 情報科学科 2015年卒業」',
            certs: '例：「AWS認定ソリューションアーキテクト – アソシエイト（2023年）、TOEIC 900点」',
            importGaps: '例：「2020年3月～8月：資格の勉強」',
            importMissing: '例：「TOEIC 900点（2024年）とKubernetesを追加」',
            done: '準備ができたら「レジュメを生成」をタップしてください。追加したい内容があれば入力してください。',
            followUp: 'おおよその数字でも大丈夫です（チーム規模、％、金額、ユーザー数、削減時間など）。または、その方法を選んだ理由を教えてください。',
        },
        choices: {
            example: '例を見る',
            skip: 'スキップ',
            firstJob: 'これが最初の職歴です',
            noJobs: '職歴なし',
            none: 'なし',
            thatsAll: '以上です',
            noDegree: '学位なし',
            ratherNot: '回答を控えます',
            onlyOneJob: '職歴は1社のみです',
            nothingToAdd: '追加はありません',
            generate: 'レジュメを生成',
        },
    },
} as const;

const lang = (locale: string): Lang => (locale === 'ja' ? 'ja' : 'en');

// ===== Reading replies (deterministic) =====

const CJK = /[぀-ヿ㐀-鿿]/;

const norm = (s: string) => s.trim().toLowerCase().replace(/[’‘]/g, "'").replace(/\s+/g, ' ');
const stripEnd = (s: string) => s.replace(/[.!?。！？、,…]+$/u, '').trim();

const NONE_EN = /^(none|no|nope|nah|nothing|n\/?a|nil|not really|all good|no (more|other|others|previous|prior|gaps?|changes?|thanks)|no work experience( yet)?|nothing (else|more|to add|missing)|that'?s (all|it|everything)|(it|that|this) (was|is) my (first|only) (job|role|company|position)|my (first|only) (job|role)|(first|only) (job|role)|(i'?ve (had )?)?only (one|1) (job|role|company))$/;
const NONE_JA = /(なし|無し|ない|ないです|ありません|ございません|いいえ|以上|以上です|大丈夫|大丈夫です|それだけ|これだけ)$|最初の(会社|職場|仕事|職歴)|初めての(会社|職場|仕事|就職)|(1|一)社(のみ|だけ)/;

/** "none", "no", "that was my first job", 「なし」, 「特にありません」 … */
export function isNone(answer?: string): boolean {
    if (!answer) return false;
    const t = stripEnd(norm(answer));
    if (!t) return false;
    if (CJK.test(t)) return t.length <= 40 && NONE_JA.test(t);
    if (t.length > 60) return false;
    const rest = t.replace(/^(no|nope|none|nah)[,.!\s]+/, '');
    return NONE_EN.test(t) || (rest !== t && NONE_EN.test(rest));
}

const SKIP_EN = /^(skip( this| it| for now)?|(please )?skip|pass|next( question)?|i don'?t know|don'?t know|dunno|not sure|no idea|i (can'?t|don'?t) remember|can'?t remember|don'?t remember|i'?d rather not( say| answer)?|rather not say|prefer not to (say|answer)|no comment|let'?s skip( this| it)?)( sorry)?$/;
const SKIP_JA = /^(スキップ(で|します|してください)?|パス(で|します)?|わからない(です)?|分からない(です)?|わかりません|分かりません|覚えていない(です)?|覚えてない|覚えていません|回答を控えます|答えたくない(です)?|控えます|次へ|飛ばして(ください)?)$/;

/** "skip", "I don't know", "I'd rather not say", 「スキップ」, 「わかりません」: move on, no follow-up. */
export function isSkip(answer?: string): boolean {
    if (!answer) return false;
    const t = stripEnd(norm(answer)).replace(/,/g, '');
    return !!t && (SKIP_EN.test(t) || SKIP_JA.test(t));
}

const QUESTION_START = /^(what|how|why|which|who|where|when|sorry|pardon|huh|can (you|i)|could (you|i)|do (you|i)|does|should i|will|is|are|example|like what)\b/;
const QUESTION_ANY = /(what do you mean|what does .{1,40} mean|not sure what you mean|don'?t understand|give me an example|an example\?|for example\?)/;
const QUESTION_JA = /(どういう(意味|こと)|とは(何|なん)|意味が(わかりません|分かりません|わからない|分からない)|質問の意味|例を(教えて|ください|挙げて|見せて)|例えば[？?]|具体的には[？?])/;

/** A question back to the coach ("What do you mean by scope?") rather than an answer. */
function isQuestionBack(text: string): boolean {
    const t = norm(text);
    if (!t || t.length > 120) return false;
    if (t === '?' || t === '？' || QUESTION_ANY.test(t) || QUESTION_JA.test(t)) return true;
    const asks = /[?？]$/.test(t);
    return asks && (QUESTION_START.test(t) || /(何|どう|どの|どれ|なぜ|どんな)/.test(t));
}

const CORRECTION = /\b(?:i meant|correction\b|let me correct|i made a (?:mistake|typo)|that was a (?:mistake|typo)|that was wrong)|訂正|間違えました|間違いでした|間違っていました|の誤りです|書き間違え|正しくは/i;

export type ReplyKind = 'answer' | 'skip' | 'question' | 'correction';

/** How to treat a reply to the open question. */
export function replyKind(text: string): ReplyKind {
    if (CORRECTION.test(text)) return 'correction';
    if (isQuestionBack(text)) return 'question';
    if (isSkip(text)) return 'skip';
    return 'answer';
}

const NUMBER = /[0-9０-９]|[一二三四五六七八九十百千万億]+\s*(人|名|件|割|倍|社|か月|ヶ月|カ月|年|円|時間|日|週|%|％)|半分|半減|倍増|数十|数百|数千|数万|\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty|thirty|forty|fifty|hundreds?|thousands?|millions?|billions?|dozens?|half|double|doubled|twice|triple|tripled)\b/i;
const REASON = /\b(because|since|so that|so we|so i|so the|in order to|due to|as a result|which (meant|let|allowed|helped|reduced|cut|saved)|instead of|rather than|trade-?offs?|the reason|to (avoid|reduce|improve|save|cut|increase|lower|speed|keep|meet|support|enable|allow|prevent|handle|make))\b|ため|ので|から|理由|ように|ことで|目的|背景|判断/i;
const RESULT = /\b(cut|cutting|reduc\w*|increas\w*|grew|grow\w*|improv\w*|sav(ed|ing)|doubl\w*|tripl\w*|achiev\w*|deliver\w*|launch\w*|won|hit|exceed\w*|raised|boost\w*|lower\w*|shorten\w*)\b|削減|短縮|向上|増加|改善|達成|伸ば|増や|減ら|獲得|受賞/i;

/** An answer that already states a measurable result ("cut latency 75%"). */
export function hasResult(text?: string): boolean {
    return !!text && NUMBER.test(text) && RESULT.test(text);
}

const DEPTH_KINDS = new Set(['scope', 'result', 'decision', 'summary']);
const isDepth = (qid: string) => qid.startsWith('fu:') || (/^(job|imp):\d+:/.test(qid) && DEPTH_KINDS.has(qid.split(':')[2]));

/**
 * Whether an answer is thin enough to deserve an AI follow-up: very short, a
 * result with no number, or a decision with no reason. Only depth questions
 * qualify; dates, education, lists, skips and questions back never do.
 */
export function wantsFollowUp(qid: string, answer: string): boolean {
    if (qid.startsWith('fu:') || !isDepth(qid)) return false;
    const kind = qid.split(':')[2];
    const text = answer.trim();
    if (!text || replyKind(text) !== 'answer' || isNone(text)) return false;
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

const toHalfWidth = (s: string) => s.replace(/[０-９]/g, d => String.fromCharCode(d.charCodeAt(0) - 0xfee0));
const RANGE = /[–—―‒‐−\-~～〜|]|\s+to\s+/i;
const ONGOING = /(present|now|current|still|today|to date|現在|在職|在籍|今も|現職)/i;

/**
 * Turn a free-text period answer into something parsePeriod reads:
 * full-width digits, 「から」, "since 2019", "Apr 2021, still there".
 */
export function normalizePeriod(answer?: string): string {
    if (!answer) return '';
    let t = toHalfWidth(answer.trim())
        .replace(/(から|より)/g, '～')
        .replace(/\b(since|from)\s+/gi, '');
    if (!RANGE.test(t) && (ONGOING.test(t) || /\bsince\b/i.test(answer))) t += ' – present';
    return t;
}

const DATE_START = /(?:\b(?:since|from)\s+)?(?:\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sept?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?,?\s+|\b\d{1,2}\/)?(?:19|20)\d{2}/i;

/**
 * Dates mentioned inside a longer answer ("Rakuten, Senior Engineer, since Apr
 * 2021" → "Apr 2021 – present"). Only a range or an ongoing start counts, so
 * a lone year still gets the dates question.
 */
export function findPeriod(text?: string): string | null {
    if (!text) return null;
    const t = toHalfWidth(text);
    const m = DATE_START.exec(t);
    if (!m) return null;
    const period = normalizePeriod(t.slice(m.index));
    return RANGE.test(period) && parsePeriod(period) ? period : null;
}

/** The period an answer to a dates question gives, if readable. */
function readPeriod(answer?: string): string | null {
    if (!answer) return null;
    const found = findPeriod(answer);
    if (found) return found;
    const t = normalizePeriod(answer);
    return parsePeriod(t) ? t : null;
}

// ===== History =====

const isTerminal = (qid: string) => qid === 'done' || qid.startsWith('more:');

/**
 * Answers to scripted questions, keyed by qid (a follow-up's answer is under
 * fu:<qid>). Questions back and corrections are not answers: the question
 * stays open and is asked again.
 */
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
        const kind = replyKind(m.text);
        if (kind === 'question' || (kind === 'correction' && !isTerminal(asked))) continue;
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
function lastAsked(messages: Message[]): ScriptStep | null {
    for (let i = messages.length - 1; i >= 0; i--) {
        const m = messages[i];
        if (!m.isHint && m.role === 'model' && m.qid) return { qid: m.qid, text: m.text };
    }
    return null;
}

/** The user's latest message, if it is the newest one (i.e. not yet replied to). */
function lastReply(messages: Message[]): string | null {
    for (let i = messages.length - 1; i >= 0; i--) {
        const m = messages[i];
        if (m.isHint) continue;
        return m.role === 'user' ? m.text : null;
    }
    return null;
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

type Get = (qid: string) => string | undefined;

function* ending(): Generator<PlanItem> {
    yield { qid: 'done' };
    for (let k = 0; ; k++) yield { qid: `more:${k}` };
}

// Generators read an answer only after yielding its question, and callers stop
// at the first unanswered question, so every answer read here exists.
function* scratchPlan(get: Get, ctx: ScriptContext): Generator<PlanItem> {
    const jobs: { label: string; period: string }[] = [];
    for (let n = 0; n < MAX_JOBS; n++) {
        yield { qid: `job:${n}:role` };
        const role = get(`job:${n}:role`);
        if (isNone(role) || isSkip(role)) break;

        // Dates given with the job are not asked again.
        let period = findPeriod(role);
        if (!period) {
            yield { qid: `job:${n}:period` };
            const answer = get(`job:${n}:period`);
            period = isSkip(answer) ? '' : readPeriod(answer);
            if (period === null) {
                yield { qid: `job:${n}:period2` };
                period = readPeriod(get(`job:${n}:period2`)) ?? '';
            }
        }
        jobs.push({ label: role ?? '', period });

        if (n < DEEP_DIVE_JOBS) {
            yield { qid: `job:${n}:scope` };
            // A result already given with the scope is not asked again.
            if (!hasResult(get(`job:${n}:scope`))) yield { qid: `job:${n}:result` };
            yield { qid: `job:${n}:decision` };
        } else {
            yield { qid: `job:${n}:summary` };
        }
    }
    const gaps = findTimelineGaps(jobs, ctx.gapDays ?? DEFAULT_GAP_DAYS).slice(0, MAX_GAP_QUESTIONS);
    for (let i = 0; i < gaps.length; i++) yield { qid: `gap:${i}`, gap: gaps[i] };
    yield { qid: 'edu' };
    yield { qid: 'skills' };
    const skills = get('skills');
    if (!isSkip(skills) && countItems(skills) < MIN_SKILLS) yield { qid: 'skills2' };
    yield { qid: 'certs' };
    yield* ending();
}

function* importPlan(get: Get): Generator<PlanItem> {
    yield { qid: 'imp:0:result' };
    yield { qid: 'imp:0:decision' };
    yield { qid: 'imp:1:result' };
    const previous = get('imp:1:result');
    if (!isNone(previous) && !isSkip(previous)) yield { qid: 'imp:1:decision' };
    yield { qid: 'imp:gaps' };
    yield { qid: 'imp:missing' };
    yield* ending();
}

const plan = (get: Get, ctx: ScriptContext) => (ctx.imported ? importPlan(get) : scratchPlan(get, ctx));

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

/** Lead-in before the next question: a section ✓, or an acknowledgement that fits the reply. */
function compose(item: PlanItem, prev: string | undefined, answered: string | null, reply: string | null, count: number, ctx: ScriptContext): string {
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
    if (reply && isSkip(reply)) return `${c.noProblem}${sep}${q}`;

    const from = stageOf(prev);
    if (from !== stageOf(item.qid)) {
        const mark = from === 'work' ? (ctx.imported ? c.marks.details : c.marks.work)
            : from === 'gaps' ? c.marks.gaps
                : from === 'education' ? c.marks.education
                    : from === 'skills' ? c.marks.skills
                        : '';
        if (mark) return `${mark}\n\n${q}`;
    }
    // A detailed answer to a depth question gets a warmer acknowledgement.
    const rich = !!reply && !!answered && isDepth(answered) && NUMBER.test(reply) && reply.length >= (CJK.test(reply) ? 40 : 80);
    const acks = rich ? c.richAcks : c.acks;
    return `${acks[count % acks.length]}${sep}${q}`;
}

/** Strip "e.g. " / "例：" so a hint reads as an example after a lead-in. */
const asExample = (hint: string) => hint.replace(/^(e\.g\.\s*|例：)/, '');

/** The next scripted message for this history (the opening when it is empty). */
export function nextStep(messages: Message[], ctx: ScriptContext): ScriptStep {
    const L = lang(ctx.locale);
    const c = COPY[L];
    const a = scriptAnswers(messages);
    const asked = lastAsked(messages);
    const reply = lastReply(messages);
    const kind = reply ? replyKind(reply) : 'answer';
    const notAnswer = kind === 'question' || kind === 'correction';

    // A question back or a correction keeps the open question open.
    if (asked && reply && notAnswer) {
        if (isTerminal(asked.qid) && kind === 'question') return { qid: asked.qid, text: c.doneHelp };
        if (asked.qid.startsWith('fu:')) {
            return kind === 'question'
                ? { qid: asked.qid, text: asked.text, example: c.hints.followUp }
                : { qid: asked.qid, text: `${c.corrected}\n\n${asked.text}` };
        }
    }

    let prev: string | undefined;
    for (const item of plan(q => a.get(q), ctx)) {
        if (a.has(item.qid)) {
            prev = item.qid;
            continue;
        }
        if (asked && reply && notAnswer && item.qid === asked.qid) {
            const q = questionText(item, ctx);
            return kind === 'correction'
                ? { qid: item.qid, text: `${c.corrected}\n\n${q}` }
                : { qid: item.qid, text: q, example: `${c.exampleLead}\n${asExample(scriptHint(item.qid, ctx))}` };
        }
        return { qid: item.qid, text: compose(item, prev, asked?.qid ?? null, reply, a.size, ctx) };
    }
    return { qid: 'done', text: c.done }; // unreachable: ending() never runs out
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

/** Tap-to-answer options for the open question (the most common answers, plus an example). */
export function scriptChoices(qid: string | undefined, ctx: ScriptContext): ScriptChoice[] {
    if (!qid) return [];
    const c = COPY[lang(ctx.locale)].choices;
    const send = (label: string): ScriptChoice => ({ label, action: 'send' });
    const example: ScriptChoice = { label: c.example, action: 'example' };
    if (isTerminal(qid)) return [{ label: c.generate, action: 'generate' }];
    if (qid.startsWith('fu:')) return [example, send(c.skip)];
    const [head, n, kind] = qid.split(':');
    if (head === 'job') {
        if (kind === 'role') return [example, send(n === '0' ? c.noJobs : c.firstJob)];
        if (kind === 'period' || kind === 'period2') return [example];
        return [example, send(c.skip)];
    }
    if (qid === 'imp:1:result') return [example, send(c.onlyOneJob), send(c.skip)];
    if (qid === 'imp:gaps') return [send(c.none), example];
    if (qid === 'imp:missing') return [send(c.nothingToAdd), example];
    if (head === 'imp') return [example, send(c.skip)];
    if (head === 'gap') return [example, send(c.ratherNot)];
    switch (qid) {
        case 'edu': return [example, send(c.noDegree)];
        case 'skills': return [example];
        case 'skills2': return [send(c.thatsAll)];
        case 'certs': return [send(c.none), example];
        default: return [];
    }
}

/** A typical answer, for estimating what is left (two jobs with dates, no gaps). */
function typicalAnswer(qid: string): string {
    const [head, n, kind] = qid.split(':');
    if (head === 'job' && kind === 'role') return Number(n) < 2 ? 'Company, Title, Apr 2018 – Mar 2021' : 'none';
    if (qid === 'skills') return 'a, b, c, d, e';
    return 'A typical answer';
}

/** About how many questions are left, assuming typical answers from here (0 when done). */
export function questionsLeft(messages: Message[], ctx: ScriptContext): number {
    const a = scriptAnswers(messages);
    let left = 0;
    for (const item of plan(q => a.get(q) ?? typicalAnswer(q), ctx)) {
        if (isTerminal(item.qid) || left > 30) break;
        if (!a.has(item.qid)) left++;
    }
    return left;
}

/** Which interview sections are complete, from the script position alone. */
export function scriptProgress(messages: Message[], ctx: ScriptContext): { sections: Record<ScriptSection, boolean>; done: boolean } {
    const current = stageOf(lastAsked(messages)?.qid ?? nextStep(messages, ctx).qid);
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
