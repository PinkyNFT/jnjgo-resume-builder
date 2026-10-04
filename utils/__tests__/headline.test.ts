/**
 * Default "Title at Employer" headline (client issue #3) and multi-role headlines (#4).
 * Run with: npm test
 */

import { withCurrentEmployer } from '../headline';

describe('withCurrentEmployer', () => {
    const deloitte = { employer: 'Deloitte SEA', title: 'Senior Regional TA Business Partner', period: 'Jan 2021 - Present' };
    const past = { employer: 'Acme KK', title: 'Recruiter', period: 'Apr 2015 - Dec 2020' };

    it('appends the current employer: "Title at Employer"', () => {
        expect(withCurrentEmployer('Senior Regional TA Business Partner', [deloitte, past], 'en'))
            .toBe('Senior Regional TA Business Partner at Deloitte SEA');
    });

    it('uses the Japanese connector in JA mode', () => {
        expect(withCurrentEmployer('シニア地域TAビジネスパートナー', [{ ...deloitte, title: 'シニア地域TAビジネスパートナー', period: '2021年1月～現在' }], 'ja'))
            .toBe('シニア地域TAビジネスパートナー ／ Deloitte SEA');
    });

    it('picks the full-time role over a later-started concurrent side business', () => {
        const owner = { employer: 'Jinjiworks', title: 'Owner', period: 'Jun 2023 - Present' };
        expect(withCurrentEmployer('Senior Regional TA Business Partner', [owner, deloitte, past], 'en'))
            .toBe('Senior Regional TA Business Partner at Deloitte SEA');
    });

    it('falls back to the most recently started ongoing role when no title matches', () => {
        const owner = { employer: 'Jinjiworks', title: 'Owner', period: 'Jun 2023 - Present' };
        expect(withCurrentEmployer('Talent Leader', [deloitte, owner], 'en')).toBe('Talent Leader at Jinjiworks');
    });

    it('falls back to the most recent role when none is ongoing', () => {
        expect(withCurrentEmployer('Recruiter', [past, { employer: 'Old Co', period: '2010 - 2014' }], 'en'))
            .toBe('Recruiter at Acme KK');
    });

    it('does not duplicate an employer that is already in the headline', () => {
        expect(withCurrentEmployer('Senior Partner at Deloitte SEA', [deloitte], 'en')).toBe('Senior Partner at Deloitte SEA');
        expect(withCurrentEmployer('senior partner, DELOITTE sea', [deloitte], 'en')).toBe('senior partner, DELOITTE sea');
    });

    it('only touches the first line of a multi-line headline', () => {
        expect(withCurrentEmployer('Senior Regional TA Business Partner\nOwner of Jinjiworks', [deloitte], 'en'))
            .toBe('Senior Regional TA Business Partner at Deloitte SEA\nOwner of Jinjiworks');
    });

    it('leaves the headline alone without usable roles', () => {
        expect(withCurrentEmployer('Engineer', [], 'en')).toBe('Engineer');
        expect(withCurrentEmployer('Engineer', [{ employer: '', period: '2020 - Present' }], 'en')).toBe('Engineer');
        expect(withCurrentEmployer('Engineer', [{ employer: 'X', period: 'sometime' }], 'en')).toBe('Engineer');
        expect(withCurrentEmployer(undefined, [], 'en')).toBe('');
    });

    it('builds the headline from the current role when the model returned none', () => {
        expect(withCurrentEmployer(undefined, [past, deloitte], 'en')).toBe('Senior Regional TA Business Partner at Deloitte SEA');
        expect(withCurrentEmployer('  ', [past, deloitte], 'en')).toBe('Senior Regional TA Business Partner at Deloitte SEA');
        expect(withCurrentEmployer('', [{ employer: 'X', period: '2020 - Present' }], 'en')).toBe(''); // no title to use
    });

    it('handles Japanese periods when picking the ongoing role', () => {
        const jp = [
            { employer: '株式会社アクメ', title: 'リクルーター', period: '2015年4月～2020年7月' },
            { employer: 'Deloitte SEA', title: 'シニア地域TAビジネスパートナー', period: '2021年1月～現在' },
        ];
        expect(withCurrentEmployer('シニア地域TAビジネスパートナー', jp, 'ja')).toBe('シニア地域TAビジネスパートナー ／ Deloitte SEA');
    });
});
