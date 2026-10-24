/**
 * Saving a generated resume. gemini-3.1-flash-lite left out project
 * role/context on Japanese resumes, the schema required them, and every save of
 * the generated resume failed with a 500. A partial AI resume must save and
 * keep its entries; only junk is dropped. Run with: npm test
 */

import type { Project, ResumeData } from '../../types';
import { INITIAL_RESUME_DATA } from '../../types';
import { ProjectModel } from '../models';
import { sanitizeProject } from '../validator';
import { toGenerationError, waitText } from '../../utils/generationError';
import { AiRequestError, readAiError } from '../ai-errors';

const partialAiResume = {
    ...INITIAL_RESUME_DATA,
    fullName: '佐藤 健',
    currentRole: 'シニアバックエンドエンジニア',
    workExperience: [
        { id: 'work_0', company: '株式会社メルカリ', position: 'シニアバックエンドエンジニア', period: '2021年4月 - 現在', responsibilities: ['検索APIを改善'] },
        { id: 'work_1', company: 'LINE株式会社', position: 'エンジニア' }, // no period
        { id: 'work_2' }, // nothing worth keeping
    ],
    projectPortfolio: {
        summary: [],
        additionalEngagements: '',
        representativeProjects: [{ id: 'proj_0', title: '検索基盤の刷新' }], // no period/role/context/contribution
    },
    timeline: [{ id: 'time_0', organization: '株式会社メルカリ', role: 'エンジニア', period: '2021 - 現在', type: 'job' }], // type outside the enum
    careerGaps: [{ period: '2020年4月 - 2021年3月', reason: '語学留学' }], // no isExplained
    education: [{ id: 'edu_0', institution: '東京工業大学' }], // no degree/period
    skillTimelines: [{ id: 'skill_0', skillName: 'Go' }],
} as unknown as ResumeData;

const project = (data: ResumeData): Project => ({
    id: '1792866390738zh0zbw3p0', title: 'シニアバックエンドエンジニア Resume', roleType: 'senior_engineer',
    updatedAt: Date.now(), status: 'generated', history: [], data,
});

describe('saving a partial AI-generated resume', () => {
    const saved = sanitizeProject(project(partialAiResume));

    it('passes the database schema', () => {
        const err = new ProjectModel({ ...saved, userId: 'u1' }).validateSync();
        expect(err?.errors ? Object.keys(err.errors) : []).toEqual([]);
    });

    it('keeps entries with content and fills missing fields with empty text', () => {
        expect(saved.data!.workExperience.map(w => w.id)).toEqual(['work_0', 'work_1']);
        expect(saved.data!.workExperience[1]).toMatchObject({ period: '', responsibilities: [] });
        expect(saved.data!.projectPortfolio.representativeProjects[0]).toMatchObject({ title: '検索基盤の刷新', role: '', context: '', contribution: '', period: '' });
        expect(saved.data!.education[0]).toMatchObject({ institution: '東京工業大学', degree: '', period: '' });
        expect(saved.data!.timeline[0].type).toBe('work');
        expect(saved.data!.careerGaps[0]).toMatchObject({ isExplained: false, reason: '語学留学' });
    });

    it('still drops entries with nothing in them', () => {
        expect(saved.data!.workExperience.find(w => w.id === 'work_2')).toBeUndefined();
        const junk = sanitizeProject(project({ ...partialAiResume, skillTimelines: [{ id: 's1', skillName: ' ' }] } as unknown as ResumeData));
        expect(junk.data!.skillTimelines).toEqual([]);
    });
});

describe('generation errors shown to the user', () => {
    it('reads the code and reset time from an AI error response', async () => {
        const res = new Response(JSON.stringify({ error: 'used up', code: 'AI_BETA_LIMIT', resetAt: '2026-10-25T07:00:00.000Z' }), { status: 429 });
        const err = await readAiError(res, 'en');
        expect(err).toBeInstanceOf(AiRequestError);
        expect(err).toMatchObject({ code: 'AI_BETA_LIMIT', status: 429, resetAt: '2026-10-25T07:00:00.000Z', message: 'used up' });
    });

    it('sorts errors into credits / busy / failed', () => {
        expect(toGenerationError(new AiRequestError('x', 'AI_BETA_LIMIT', 429, '2026-10-25T07:00:00.000Z'), 'fb', 1)).toEqual({ kind: 'credits', message: 'x', resetAt: '2026-10-25T07:00:00.000Z', at: 1 });
        expect(toGenerationError(new AiRequestError('y', 'AI_QUOTA', 429), 'fb', 1).kind).toBe('busy');
        expect(toGenerationError(new AiRequestError('z', undefined, 429), 'fb', 1).kind).toBe('busy');
        expect(toGenerationError(new AiRequestError('w', 'AI_TIMEOUT', 504), 'fb', 1)).toMatchObject({ kind: 'failed', message: 'w' });
        expect(toGenerationError(null, 'fallback', 1)).toMatchObject({ kind: 'failed', message: 'fallback' });
    });

    it('says how long to wait in English and Japanese', () => {
        const now = Date.parse('2026-10-24T22:40:00Z');
        expect(waitText('2026-10-25T07:00:00.000Z', 'en', now)).toBe('8 h 20 min');
        expect(waitText('2026-10-25T07:00:00.000Z', 'ja', now)).toBe('8時間20分');
        expect(waitText('2026-10-24T22:52:30.000Z', 'en', now)).toBe('13 min');
        expect(waitText('2026-10-24T23:40:00.000Z', 'ja', now)).toBe('1時間');
    });
});
