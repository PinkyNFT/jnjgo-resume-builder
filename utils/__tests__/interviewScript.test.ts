/**
 * Scripted interview (beta): question order, listening (skips what was already
 * said, questions back, skips, corrections), answer checks, choices, progress.
 * Run with: npm test
 */

import type { Message, RoleType } from '../../types';
import { parsePeriod } from '../dateParser';
import {
    countItems, findPeriod, followUpContext, followUpsUsed, hasResult, isNone, isScriptedHistory, isSkip, nextStep,
    normalizePeriod, pendingQuestion, questionsLeft, replyKind, scriptAnswers, scriptChoices, scriptHint, scriptProgress,
    ScriptContext, wantsFollowUp,
} from '../interviewScript';

const en: ScriptContext = { roleType: 'senior_engineer', locale: 'en', imported: false, fullName: 'Aiko Tanaka' };
const ja: ScriptContext = { ...en, locale: 'ja', fullName: '田中 愛子' };

/** Runs the script, answering each question from `answers` (by qid), until `stopAt` or `done`. */
function run(ctx: ScriptContext, answers: Record<string, string>, stopAt = 'done'): Message[] {
    const messages: Message[] = [];
    for (let i = 0; i < 60; i++) {
        const step = nextStep(messages, ctx);
        messages.push({ role: 'model', text: step.text, qid: step.qid });
        if (step.qid === stopAt) return messages;
        const answer = answers[step.qid];
        if (answer === undefined) throw new Error(`No answer for ${step.qid}`);
        messages.push({ role: 'user', text: answer });
    }
    throw new Error('Script did not finish');
}
const qids = (m: Message[]) => m.filter(x => x.role === 'model').map(x => x.qid);
const reply = (m: Message[], text: string) => [...m, { role: 'user', text } as Message];

const engineer: Record<string, string> = {
    'job:0:role': 'Rakuten, Senior Software Engineer',
    'job:0:period': 'Apr 2021 – present',
    'job:0:scope': 'I own the payments API with a team of 4 engineers.',
    'job:0:result': 'Cut p95 latency from 800ms to 200ms.',
    'job:0:decision': 'Moved reporting to PostgreSQL because we needed joins.',
    'job:1:role': 'Sony, Software Engineer',
    'job:1:period': 'Jun 2018 – Mar 2020',
    'job:1:summary': 'Built internal tools for the camera team; release time went from 2 days to 3 hours.',
    'job:2:role': 'none',
    'gap:0': 'I studied for the AWS certification and travelled.',
    edu: 'BSc Computer Science, Osaka University, 2018',
    skills: 'TypeScript, Go, AWS, PostgreSQL, Terraform',
    certs: 'AWS Solutions Architect Associate (2021)',
};

describe('from scratch', () => {
    it('deep-dives the latest job, one question for older ones, then gaps, education, skills, certifications', () => {
        expect(qids(run(en, engineer))).toEqual([
            'job:0:role', 'job:0:period', 'job:0:scope', 'job:0:result', 'job:0:decision',
            'job:1:role', 'job:1:period', 'job:1:summary',
            'job:2:role', 'gap:0', 'edu', 'skills', 'certs', 'done',
        ]);
    });

    it('opens with a greeting, reassurance and the first question in one message', () => {
        const first = nextStep([], en).text;
        expect(first).toMatch(/^Hi Aiko!/);
        expect(first).toContain('you can skip anything');
        expect(first).toContain('when did you start?');
        expect(nextStep([], ja).text).toMatch(/^こんにちは、田中 愛子さん！/);
    });

    it('does not ask for dates already given with the job', () => {
        const m = run(en, { ...engineer, 'job:0:role': "I've been a senior engineer at Rakuten since April 2021" }, 'job:0:scope');
        expect(qids(m)).toEqual(['job:0:role', 'job:0:scope']);
        const jaRun = run(ja, { ...engineer, 'job:0:role': '楽天グループ株式会社、シニアエンジニア、2021年4月から' }, 'job:0:scope');
        expect(qids(jaRun)).toEqual(['job:0:role', 'job:0:scope']);
    });

    it('does not ask for a result already given with the scope', () => {
        const m = run(en, { ...engineer, 'job:0:scope': 'I lead 4 engineers on the payments API and cut latency 75%, from 800ms to 200ms.' });
        expect(qids(m)).not.toContain('job:0:result');
        expect(qids(m)).toContain('job:0:decision');
    });

    it('names the gap months from the dates given', () => {
        const gap = run(en, engineer, 'gap:0').pop()!;
        expect(gap.text).toContain('April 2020 to March 2021');
        expect(gap.text.startsWith('✓ Work history captured!')).toBe(true);
    });

    it('re-asks unreadable dates once, then moves on', () => {
        const m = run(en, { ...engineer, 'job:0:period': 'about three years', 'job:0:period2': '2021年4月～現在' }, 'job:0:scope');
        expect(qids(m)).toEqual(['job:0:role', 'job:0:period', 'job:0:period2', 'job:0:scope']);
        const still = run(en, { ...engineer, 'job:0:period': 'a while', 'job:0:period2': 'not sure' }, 'job:0:scope');
        expect(qids(still)).toContain('job:0:scope');
        const skipped = run(en, { ...engineer, 'job:0:period': 'skip' }, 'job:0:scope');
        expect(qids(skipped)).not.toContain('job:0:period2');
    });

    it('asks for more skills once when fewer than three are given', () => {
        const m = run(en, { ...engineer, skills: 'Go and AWS', skills2: 'Docker' });
        expect(qids(m)).toEqual(expect.arrayContaining(['skills', 'skills2', 'certs']));
    });

    it('goes straight to education when there is no work history', () => {
        const m = run(en, { 'job:0:role': 'No work experience yet', edu: 'Student', skills: 'Python, SQL, Excel', certs: 'None' });
        expect(qids(m)).toEqual(['job:0:role', 'edu', 'skills', 'certs', 'done']);
    });

    it('acknowledges extra details after done', () => {
        const m = run(en, engineer);
        expect(nextStep(reply(m, 'I also won a hackathon in 2022.'), en).qid).toBe('more:0');
    });
});

describe('listening', () => {
    const atScope = () => run(en, engineer, 'job:0:scope');

    it('answers a question back with an example and asks again', () => {
        const step = nextStep(reply(atScope(), 'What do you mean by scope?'), en);
        expect(step.qid).toBe('job:0:scope');
        expect(step.example).toMatch(/^Here's an example of what I'm looking for:\n'Led a team of 4/);
        expect(step.text).toMatch(/^What did you own in this role\?/);
        expect(wantsFollowUp('job:0:scope', 'What do you mean by scope?')).toBe(false);
    });

    it('does not count a question back as the answer', () => {
        const m = reply(atScope(), 'What do you mean by scope?');
        const s = nextStep(m, en);
        m.push({ role: 'model', text: s.example!, isHint: true }, { role: 'model', text: s.text, qid: s.qid });
        m.push({ role: 'user', text: 'I own the payments API with a team of 4.' });
        expect(scriptAnswers(m).get('job:0:scope')).toBe('I own the payments API with a team of 4.');
        expect(nextStep(m, en).qid).toBe('job:0:result');
    });

    it('takes a skip without pushing and says "No problem."', () => {
        const m = run(en, engineer, 'job:0:result');
        const step = nextStep(reply(m, "I don't know"), en);
        expect(step.qid).toBe('job:0:decision');
        expect(step.text.startsWith('No problem.')).toBe(true);
        expect(wantsFollowUp('job:0:result', "I don't know")).toBe(false);
        expect(wantsFollowUp('job:0:result', 'skip')).toBe(false);
        expect(wantsFollowUp('job:0:result', 'わかりません')).toBe(false);
    });

    it('acknowledges a correction and keeps the open question', () => {
        const step = nextStep(reply(atScope(), 'Sorry, I meant April 2019'), en);
        expect(step.qid).toBe('job:0:scope');
        expect(step.text.startsWith("Thanks, I'll use the corrected details.")).toBe(true);
        const jaStep = nextStep(reply(run(ja, engineer, 'job:0:scope'), '訂正です。2019年4月からです'), ja);
        expect(jaStep.text.startsWith('承知しました。訂正内容を反映します。')).toBe(true);
    });

    it('handles a question back to an AI follow-up without moving on', () => {
        const m = run(en, engineer, 'job:0:result');
        m.push({ role: 'user', text: 'Made checkout faster.' }, { role: 'model', text: 'How much faster, roughly?', qid: 'fu:job:0:result' });
        const step = nextStep(reply(m, 'What do you mean?'), en);
        expect(step.qid).toBe('fu:job:0:result');
        expect(step.text).toBe('How much faster, roughly?');
        expect(step.example).toContain('A rough number is fine');
    });

    it('explains the next step when asked a question after done', () => {
        const step = nextStep(reply(run(en, engineer), 'Can I edit it later?'), en);
        expect(step.qid).toBe('done');
        expect(step.text).toContain('edit everything');
    });

    it('gives a warmer acknowledgement to a detailed answer', () => {
        const m = run(en, engineer, 'job:0:result');
        const step = nextStep(reply(m, 'Cut p95 latency from 800ms to 200ms, which saved about $4k a month in compute costs.'), en);
        expect(step.text).toMatch(/^(Great detail, thank you\.|That's really helpful, thank you\.)/);
    });
});

describe('imported resume', () => {
    it('asks for depth only, skipping the previous role when there is none', () => {
        const ctx: ScriptContext = { ...en, imported: true };
        const m = run(ctx, {
            'imp:0:result': 'Grew sign-ups by 30%.', 'imp:0:decision': 'Picked Stripe because of its Japan support.',
            'imp:1:result': "I've had only one job", 'imp:gaps': 'None', 'imp:missing': 'Nothing to add',
        });
        expect(qids(m)).toEqual(['imp:0:result', 'imp:0:decision', 'imp:1:result', 'imp:gaps', 'imp:missing', 'done']);
        expect(m[0].text).toContain("I've read the resume you imported");
    });
});

describe('Japanese copy', () => {
    const roles: RoleType[] = ['senior_engineer', 'consultant', 'general'];
    it.each(roles)('has no English sentences for %s', roleType => {
        const ctx: ScriptContext = { ...ja, roleType };
        const m = run(ctx, { ...engineer, 'job:2:role': 'これが最初の職歴です', skills: 'Go、AWS、Docker' });
        for (const msg of m.filter(x => x.role === 'model')) {
            expect(msg.text).toMatch(/[぀-ヿ一-鿿]/);
            expect(msg.text).not.toMatch(/\b(the|and|your|what|when|please|you)\b/i);
            expect(scriptHint(msg.qid, ctx)).not.toMatch(/\b(the|and|your|what|when|please|you)\b/i);
            for (const ch of scriptChoices(msg.qid, ctx)) expect(ch.label).not.toMatch(/[a-z]{3,}/i);
        }
        expect(m.find(x => x.qid === 'gap:0')!.text).toContain('2020年4月から2021年3月まで');
    });
});

describe('choices', () => {
    it('offers the common answers, and each one is understood', () => {
        for (const ctx of [en, ja]) {
            const labels = (qid: string) => scriptChoices(qid, ctx).filter(c => c.action === 'send').map(c => c.label);
            for (const l of [...labels('job:0:role'), ...labels('job:1:role'), ...labels('imp:1:result').slice(0, 1), ...labels('certs'), ...labels('imp:gaps'), ...labels('imp:missing'), ...labels('skills2')]) {
                expect([l, isNone(l)]).toEqual([l, true]);
            }
            for (const l of [...labels('job:0:result'), ...labels('gap:0'), ...labels('fu:job:0:result')]) {
                expect([l, isSkip(l)]).toEqual([l, true]);
            }
            expect(scriptChoices('job:0:scope', ctx)[0].action).toBe('example');
            expect(scriptChoices('done', ctx)).toEqual([{ label: expect.any(String), action: 'generate' }]);
        }
    });
});

describe('questions left', () => {
    it('starts near 10 and counts down to 0', () => {
        expect(questionsLeft([], en)).toBe(10);
        const mid = questionsLeft(run(en, engineer, 'edu'), en);
        expect(mid).toBe(3);
        expect(questionsLeft(run(en, engineer), en)).toBe(0);
    });
});

describe('reply checks', () => {
    it.each([
        'none', 'No.', 'nope', 'No, that was my first job', "that's all", 'Nothing else', 'N/A', 'なし', '特にありません', 'それが最初の会社です', 'No work experience yet',
    ])('treats %p as none', a => expect(isNone(a)).toBe(true));

    it.each(['No Brand Inc, Designer', 'Nokia, Engineer', 'No, I worked at Sony before that', '株式会社ナイン エンジニア'])('does not treat %p as none', a => {
        expect(isNone(a)).toBe(false);
    });

    it.each([
        ['What do you mean by scope?', 'question'], ['Can you give an example?', 'question'], ['?', 'question'],
        ['どういう意味ですか？', 'question'], ['質問の意味がわかりません', 'question'], ['Not sure what you mean', 'question'],
        ['skip', 'skip'], ["I don't know, sorry", 'skip'], ["I'd rather not say", 'skip'], ['スキップ', 'skip'], ['わかりません', 'skip'],
        ['Sorry, I meant April 2019', 'correction'], ['訂正：2019年です', 'correction'],
        ['Not sure, maybe 20%', 'answer'], ['Why we chose Go: builds were slow.', 'answer'], ['Around 30%?', 'answer'],
        ['一括導入ではなく段階導入を提案しました', 'answer'], ['Actually, I led a team of 5.', 'answer'],
    ])('reads %p as %s', (text, kind) => expect(replyKind(text)).toBe(kind));

    it('asks a follow-up for results without numbers and decisions without reasons', () => {
        expect(wantsFollowUp('job:0:result', 'Made the checkout much faster for customers.')).toBe(true);
        expect(wantsFollowUp('job:0:result', 'Cut checkout time by 40% for 2M users.')).toBe(false);
        expect(wantsFollowUp('job:0:result', 'Doubled the conversion rate on the pricing page.')).toBe(false);
        expect(wantsFollowUp('job:0:decision', 'We switched our database to PostgreSQL last year.')).toBe(true);
        expect(wantsFollowUp('job:0:decision', 'Switched to PostgreSQL because reporting needed joins.')).toBe(false);
        expect(wantsFollowUp('job:1:summary', 'Ran the support team and made customers happier.')).toBe(true);
        expect(wantsFollowUp('imp:0:result', '売上を大きく伸ばしました。チームで頑張りました。')).toBe(true);
        expect(wantsFollowUp('imp:0:result', '売上を前年比30%伸ばしました。チームで頑張りました。')).toBe(false);
        expect(wantsFollowUp('imp:0:decision', 'コスト削減のため、クラウドへの移行を提案しました。')).toBe(false);
    });

    it('asks a follow-up for very short depth answers only', () => {
        expect(wantsFollowUp('job:0:scope', 'Backend stuff')).toBe(true);
        expect(wantsFollowUp('job:0:scope', 'I owned the backend for the payments product.')).toBe(false);
        expect(wantsFollowUp('job:0:period', 'x')).toBe(false);
        expect(wantsFollowUp('edu', 'x')).toBe(false);
        expect(wantsFollowUp('fu:job:0:result', 'x')).toBe(false);
        expect(wantsFollowUp('imp:1:result', 'none')).toBe(false);
    });

    it('spots a result inside another answer', () => {
        expect(hasResult('I lead 4 engineers and cut latency 75%.')).toBe(true);
        expect(hasResult('Team of 4 handling 2M requests a day.')).toBe(false);
        expect(hasResult('検索の応答時間を60%短縮しました')).toBe(true);
    });

    it('finds dates inside a longer answer', () => {
        expect(parsePeriod(findPeriod('Rakuten, Senior Engineer, since Apr 2021')!)).toMatchObject({ startYear: 2021, startMonth: 4, isOngoing: true });
        expect(parsePeriod(findPeriod('Sony, Engineer, Jun 2018 – Mar 2021')!)).toMatchObject({ startYear: 2018, endYear: 2021, endMonth: 3 });
        expect(parsePeriod(findPeriod('楽天、エンジニア、2021年4月から')!)?.isOngoing).toBe(true);
        expect(findPeriod('Rakuten, Senior Engineer')).toBeNull();
        expect(findPeriod('Sony Engineer 2018')).toBeNull(); // a lone year still gets the dates question
    });

    it('reads common ways of writing dates', () => {
        expect(parsePeriod(normalizePeriod('2021年4月から'))?.isOngoing).toBe(true);
        expect(parsePeriod(normalizePeriod('since 2019'))?.isOngoing).toBe(true);
        expect(parsePeriod(normalizePeriod('Apr 2021, still there'))).toMatchObject({ startYear: 2021, startMonth: 4, isOngoing: true });
        expect(parsePeriod(normalizePeriod('２０１８年４月～２０２１年３月'))).toMatchObject({ startYear: 2018, endYear: 2021, endMonth: 3 });
        expect(parsePeriod(normalizePeriod('a few years'))).toBeNull();
    });

    it('counts list items in English and Japanese', () => {
        expect(countItems('Python, Go and AWS')).toBe(3);
        expect(countItems('Python、Go、AWS、Docker')).toBe(4);
        expect(countItems('')).toBe(0);
    });
});

describe('history helpers', () => {
    it('pairs answers with questions and skips hints', () => {
        const m: Message[] = [
            { role: 'model', text: 'Q1', qid: 'job:0:role' },
            { role: 'model', text: 'hint', isHint: true },
            { role: 'user', text: 'Rakuten, Engineer' },
            { role: 'model', text: 'Q2', qid: 'job:0:period' },
        ];
        expect(scriptAnswers(m).get('job:0:role')).toBe('Rakuten, Engineer');
        expect(pendingQuestion(m)).toEqual({ qid: 'job:0:period', text: 'Q2' });
        expect(pendingQuestion(m.slice(0, 3))).toBeNull();
        expect(followUpContext(m, 'job:0:result')).toBe('Rakuten, Engineer');
    });

    it('continues the script after a follow-up and counts follow-ups', () => {
        const m = run(en, engineer, 'job:0:result');
        m.push({ role: 'user', text: 'Made it faster.' });
        m.push({ role: 'model', text: 'How much faster, roughly?', qid: 'fu:job:0:result' });
        m.push({ role: 'user', text: 'About 4x.' });
        expect(followUpsUsed(m)).toBe(1);
        expect(scriptAnswers(m).get('fu:job:0:result')).toBe('About 4x.');
        expect(nextStep(m, en).qid).toBe('job:0:decision');
    });

    it('tells scripted drafts from AI-interviewer drafts', () => {
        expect(isScriptedHistory([{ role: 'model', text: 'Hi', qid: 'job:0:role' }])).toBe(true);
        expect(isScriptedHistory([{ role: 'model', text: 'Hi' }, { role: 'user', text: 'Hello' }])).toBe(false);
    });

    it('has a static hint for every question', () => {
        for (const roleType of ['senior_engineer', 'consultant', 'general'] as RoleType[]) {
            for (const locale of ['en', 'ja']) {
                const ctx = { ...en, roleType, locale };
                for (const q of qids(run(ctx, engineer))) expect(scriptHint(q, ctx).length).toBeGreaterThan(10);
                expect(scriptHint('fu:job:0:result', ctx).length).toBeGreaterThan(10);
            }
        }
    });
});

describe('progress', () => {
    it('completes sections as the script moves past them', () => {
        const at = (stop: string) => scriptProgress(run(en, engineer, stop), en);
        expect(at('job:0:scope').sections.work).toBe(false);
        expect(at('job:1:role').sections.details).toBe(true);
        expect(at('edu').sections).toMatchObject({ work: true, gaps: true, education: false });
        expect(at('certs').sections).toMatchObject({ skills: true, certifications: false });
        const end = at('done');
        expect(end.done).toBe(true);
        expect(Object.values(end.sections).every(Boolean)).toBe(true);
    });

    it('marks imported basics complete from the start', () => {
        const p = scriptProgress([], { ...en, imported: true });
        expect(p.sections).toMatchObject({ work: true, details: false, education: false });
        expect(p.done).toBe(false);
    });
});
