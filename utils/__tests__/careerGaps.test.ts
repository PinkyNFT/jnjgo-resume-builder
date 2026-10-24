/**
 * Deterministic gap detection after generation (critical issue C12).
 * Run with: npm test
 */

import { escapeRegExp, explainedGaps, findTimelineGaps } from '../careerGaps';
import type { ResumeData } from '../../types';

const resume = (over: Partial<ResumeData>): ResumeData => ({
    fullName: 'Test', currentRole: '', careerSummary: '', contactInfo: { email: '', phone: '', location: '' },
    timeline: [], careerOverview: { totalExperience: '', numberOfEmployers: 0, averageTenure: '', areasOfExpertise: [], projectCount: '', typicalDuration: '' },
    projectPortfolio: { summary: [], representativeProjects: [], additionalEngagements: '' },
    careerGaps: [], workExperience: [], skillTimelines: [], education: [], skills: [], certifications: [],
    ...over,
} as unknown as ResumeData);

const job = (company: string, period: string) => ({ id: company, company, position: 'Role', period, responsibilities: [] });

describe('findTimelineGaps', () => {
    it('finds a month-accurate gap between jobs', () => {
        const gaps = findTimelineGaps([{ label: 'A', period: 'Apr 2015 - Jul 2020' }, { label: 'B', period: 'Jan 2021 - Present' }], 90);
        expect(gaps).toHaveLength(1);
        expect(gaps[0]).toMatchObject({ before: 'A', after: 'B' });
    });

    it('understands Japanese periods', () => {
        const gaps = findTimelineGaps([{ label: 'アクメ', period: '2015年4月～2020年7月' }, { label: 'Deloitte', period: '2021年1月～現在' }], 90);
        expect(gaps).toHaveLength(1);
    });

    it('ignores short gaps and gaps covered by an overlapping role', () => {
        expect(findTimelineGaps([{ label: 'A', period: 'Jan 2010 - Jun 2012' }, { label: 'B', period: 'Aug 2012 - Present' }], 90)).toHaveLength(0);
        expect(findTimelineGaps([{ label: 'A', period: '2010 - 2020' }, { label: 'B', period: '2012 - 2014' }, { label: 'C', period: '2016 - Present' }], 90)).toHaveLength(0);
    });

    it('stops at an ongoing role and skips unparseable periods', () => {
        expect(findTimelineGaps([{ label: 'A', period: 'Jan 2015 - Present' }, { label: 'B', period: 'Jan 2019 - Present' }], 90)).toHaveLength(0);
        expect(findTimelineGaps([{ label: 'A', period: 'sometime' }, { label: 'B', period: 'Jan 2019 - Present' }], 90)).toHaveLength(0);
    });
});

describe('explainedGaps', () => {
    const work = [job('C++ Labs', 'Apr 2015 - Jul 2020'), job('Deloitte SEA', 'Jan 2021 - Present')];

    it('does not crash on company names with regex characters (generation used to fail on "C++ Labs")', () => {
        expect(() => explainedGaps(resume({ workExperience: work }), 'I took six months off to relocate.', 90)).not.toThrow();
    });

    it('records a gap the interview explains, with a localized reason and period', () => {
        const en = explainedGaps(resume({ workExperience: work }), 'Between jobs I was relocating to Singapore.', 90, 'en');
        expect(en).toEqual([{ period: 'August 2020 – December 2020', reason: 'Relocation', isExplained: true }]);
        const ja = explainedGaps(resume({ workExperience: work }), 'その間は転居していました。', 90, 'ja');
        expect(ja).toEqual([{ period: '2020年8月～2020年12月', reason: '転居', isExplained: true }]);
    });

    it('uses overlapping education as the explanation', () => {
        const out = explainedGaps(resume({
            workExperience: work,
            education: [{ id: 'e', degree: 'MBA', institution: 'Keio', period: 'Sep 2020 - Dec 2020' }],
        } as Partial<ResumeData>), '', 90, 'en');
        expect(out[0]).toMatchObject({ reason: 'Pursuing MBA at Keio', isExplained: true });
    });

    it('adds nothing when the gap was not discussed', () => {
        expect(explainedGaps(resume({ workExperience: work }), 'I like recruiting.', 90)).toEqual([]);
    });

    it('skips gaps the model already listed', () => {
        const out = explainedGaps(resume({
            workExperience: work,
            careerGaps: [{ period: 'August 2020 - December 2020', reason: 'Relocation', isExplained: true }],
        }), 'between jobs I was relocating', 90);
        expect(out).toEqual([]);
    });
});

describe('escapeRegExp', () => {
    it('escapes every regex metacharacter', () => {
        const name = 'C++ (Japan) [K.K.] *? ^$ {x} | \\';
        expect(new RegExp(escapeRegExp(name)).test(`at ${name} now`)).toBe(true);
    });
});
