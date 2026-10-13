/**
 * Scripted interview (beta): question order, answer checks, progress.
 * Run with: npm test
 */

import type { Message, RoleType } from '../../types';
import { parsePeriod } from '../dateParser';
import {
    countItems, followUpContext, followUpsUsed, isNone, isScriptedHistory, nextStep, normalizePeriod,
    pendingQuestion, scriptAnswers, scriptHint, scriptProgress, ScriptContext, wantsFollowUp,
} from '../interviewScript';

const en: ScriptContext = { roleType: 'senior_engineer', locale: 'en', imported: false, fullName: 'Aiko Tanaka' };

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

const engineer: Record<string, string> = {
    'job:0:role': 'Rakuten, Senior Software Engineer',
    'job:0:period': 'Apr 2021 – present',
    'job:0:scope': 'I own the payments API with a team of 4 engineers.',
    'job:0:result': 'Cut p95 latency from 800ms to 200ms.',
    'job:0:decision': 'Moved reporting to PostgreSQL because we needed joins.',
    'job:1:role': 'Sony, Software Engineer',
    'job:1:period': 'Jun 2018 – Mar 2020',
    'job:1:scope': 'Built internal tools for the camera firmware team.',
    'job:1:result': 'Release time went from 2 days to 3 hours.',
    'job:1:decision': 'Chose Go over Python since builds had to be fast.',
    'job:2:role': 'none',
    'gap:0': 'I studied for the AWS certification and travelled.',
    edu: 'BSc Computer Science, Osaka University, 2018',
    skills: 'TypeScript, Go, AWS, PostgreSQL, Terraform',
    certs: 'AWS Solutions Architect Associate (2021)',
};

describe('from scratch', () => {
    it('asks per job, then gaps, education, skills, certifications', () => {
        const m = run(en, engineer);
        expect(qids(m)).toEqual([
            'job:0:role', 'job:0:period', 'job:0:scope', 'job:0:result', 'job:0:decision',
            'job:1:role', 'job:1:period', 'job:1:scope', 'job:1:result', 'job:1:decision',
            'job:2:role', 'gap:0', 'edu', 'skills', 'certs', 'done',
        ]);
    });

    it('opens with a greeting and the first question in one message', () => {
        const first = nextStep([], en).text;
        expect(first).toMatch(/^Hi Aiko!/);
        expect(first).toContain('most recent) company');
        const ja = nextStep([], { ...en, locale: 'ja', fullName: '田中 愛子' }).text;
        expect(ja).toMatch(/^こんにちは、田中 愛子さん！/);
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
    });

    it('asks older roles one summary question instead of the deep dive', () => {
        const m = run(en, {
            ...engineer,
            'job:2:role': 'Fujitsu, Engineer', 'job:2:period': 'Apr 2016 – May 2018', 'job:2:summary': 'Maintained billing systems for 2 banks.',
            'job:3:role': 'that was my first job',
        });
        expect(qids(m)).toEqual(expect.arrayContaining(['job:2:period', 'job:2:summary', 'job:3:role']));
        expect(qids(m)).not.toContain('job:2:scope');
    });

    it('asks for more skills once when fewer than three are given', () => {
        const m = run(en, { ...engineer, skills: 'Go and AWS', skills2: 'Docker' });
        expect(qids(m)).toEqual(expect.arrayContaining(['skills', 'skills2', 'certs']));
    });

    it('goes straight to education when there is no work history', () => {
        const m = run(en, { 'job:0:role': 'none', edu: 'Student', skills: 'Python, SQL, Excel', certs: 'None' });
        expect(qids(m)).toEqual(['job:0:role', 'edu', 'skills', 'certs', 'done']);
    });

    it('acknowledges extra details after done', () => {
        const m = run(en, engineer);
        m.push({ role: 'user', text: 'I also won a hackathon in 2022.' });
        expect(nextStep(m, en).qid).toBe('more:0');
    });
});

describe('imported resume', () => {
    const ctx: ScriptContext = { ...en, imported: true };
    it('asks for depth only, skipping the previous role when there is none', () => {
        const m = run(ctx, {
            'imp:0:result': 'Grew sign-ups by 30%.', 'imp:0:decision': 'Picked Stripe because of its Japan support.',
            'imp:1:result': 'none', 'imp:gaps': 'none', 'imp:missing': 'nothing',
        });
        expect(qids(m)).toEqual(['imp:0:result', 'imp:0:decision', 'imp:1:result', 'imp:gaps', 'imp:missing', 'done']);
        expect(m[0].text).toContain("I've read the resume you imported");
    });
});

describe('Japanese copy', () => {
    const roles: RoleType[] = ['senior_engineer', 'consultant', 'general'];
    it.each(roles)('has no English sentences for %s', roleType => {
        const ctx: ScriptContext = { roleType, locale: 'ja', imported: false, fullName: '田中 愛子' };
        const m = run(ctx, { ...engineer, 'job:2:role': 'なし', skills: 'Go、AWS、Docker' });
        for (const msg of m.filter(x => x.role === 'model')) {
            expect(msg.text).toMatch(/[぀-ヿ一-鿿]/);
            expect(msg.text).not.toMatch(/\b(the|and|your|what|when|please|you)\b/i);
            expect(scriptHint(msg.qid, ctx)).not.toMatch(/\b(the|and|your|what|when|please|you)\b/i);
        }
        expect(m.find(x => x.qid === 'gap:0')!.text).toContain('2020年4月から2021年3月まで');
    });
});

describe('answer checks', () => {
    it.each([
        'none', 'No.', 'nope', 'No, that was my first job', "that's all", 'Nothing else', 'N/A', 'なし', '特にありません', 'それが最初の会社です',
    ])('treats %p as none', a => expect(isNone(a)).toBe(true));

    it.each(['No Brand Inc, Designer', 'Nokia, Engineer', 'No, I worked at Sony before that', '株式会社ナイン エンジニア'])('does not treat %p as none', a => {
        expect(isNone(a)).toBe(false);
    });

    it('asks a follow-up for results without numbers and decisions without reasons', () => {
        expect(wantsFollowUp('job:0:result', 'Made the checkout much faster for customers.')).toBe(true);
        expect(wantsFollowUp('job:0:result', 'Cut checkout time by 40% for 2M users.')).toBe(false);
        expect(wantsFollowUp('job:0:result', 'Doubled the conversion rate on the pricing page.')).toBe(false);
        expect(wantsFollowUp('job:1:decision', 'We switched our database to PostgreSQL last year.')).toBe(true);
        expect(wantsFollowUp('job:1:decision', 'Switched to PostgreSQL because reporting needed joins.')).toBe(false);
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
        const m = run(en, engineer, 'job:0:decision').slice(0, -1); // up to the result question
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
