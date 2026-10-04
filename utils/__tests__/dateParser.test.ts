/**
 * Month-accurate timeline parsing (client issue #1: bars must use month precision).
 * Run with: npm test
 */

import { parsePeriod, toStartFraction, toEndFraction, toSpan } from '../dateParser';
import { insertGapsInTimeline } from '../timelineGenerator';

const span = (period: string, now?: number) => {
    const p = parsePeriod(period);
    if (!p) throw new Error(`unparseable: ${period}`);
    return toSpan(p, now);
};

describe('parsePeriod — month precision', () => {
    it('a job ending July 2012 ends around mid-2012', () => {
        const p = parsePeriod('April 2010 – July 2012')!;
        expect(p).toMatchObject({ startYear: 2010, startMonth: 4, endYear: 2012, endMonth: 7, isOngoing: false });
        expect(toEndFraction(p.endYear, p.endMonth)).toBeCloseTo(2012 + 7 / 12);
        expect(toStartFraction(p.startYear, p.startMonth)).toBeCloseTo(2010 + 3 / 12);
    });

    it.each([
        ['Jul 2012 - Present'],
        ['July 2012 – Current'],
        ['2012年7月～現在'],
        ['2012年7月〜現在'],
        ['2012年7月 - 在籍中'],
        ['2012/07 ～ 現在'],
    ])('treats "%s" as ongoing with start month 7', (period) => {
        const p = parsePeriod(period)!;
        expect(p).toMatchObject({ startYear: 2012, startMonth: 7, endYear: null, isOngoing: true });
    });

    it.each([
        ['2015年4月～2018年3月'],
        ['2015年4月〜2018年3月'],
        ['2015年4月 — 2018年3月'],
        ['2015/04 ～ 2018/03'],
        ['04/2015 - 03/2018'],
        ['2015.04 - 2018.03'],
        ['2015-04 - 2018-03'],
        ['2015-04 – 2018-03'],
        ['Apr 2015 to Mar 2018'],
    ])('parses "%s" as Apr 2015 – Mar 2018', (period) => {
        expect(parsePeriod(period)).toMatchObject({ startYear: 2015, startMonth: 4, endYear: 2018, endMonth: 3, isOngoing: false });
    });

    it('keeps plain year ranges working', () => {
        expect(parsePeriod('2008-2012')).toMatchObject({ startYear: 2008, endYear: 2012, isOngoing: false, startMonth: undefined, endMonth: undefined });
        expect(parsePeriod('2018 - 2020 (2 years)')).toMatchObject({ startYear: 2018, endYear: 2020 });
    });

    it('does not mistake "Nov" for "now"', () => {
        expect(parsePeriod('Jan 2019 - Nov 2020')).toMatchObject({ endYear: 2020, endMonth: 11, isOngoing: false });
    });
});

describe('toSpan — visible, month-accurate bars', () => {
    const NOW = 2026 + 10 / 12; // end of October 2026

    it('same-year entries without months still get a visible (full-year) bar', () => {
        const s1 = span('2012');
        expect(s1.end - s1.start).toBeCloseTo(1);
        const s2 = span('2012 - 2012');
        expect(s2.end - s2.start).toBeCloseTo(1);
    });

    it('start month known, end month missing, same year → runs to end of that year', () => {
        const s = span('Jul 2012 - 2012');
        expect(s.start).toBeCloseTo(2012.5);
        expect(s.end).toBeCloseTo(2013);
    });

    it('start and end in the same month is one month wide', () => {
        const s = span('Jul 2012 - Jul 2012');
        expect(s.end - s.start).toBeCloseTo(1 / 12);
    });

    it('a single "Month YYYY" is one month wide', () => {
        const s = span('July 2012');
        expect(s.end - s.start).toBeCloseTo(1 / 12);
    });

    it('ongoing roles run to the end of the current month (incl. roles started this month)', () => {
        const s = span('Oct 2026 - Present', NOW);
        expect(s.start).toBeCloseTo(2026 + 9 / 12);
        expect(s.end).toBeCloseTo(NOW);
        expect(s.end - s.start).toBeCloseTo(1 / 12);
    });

    it('defaults "now" to the end of the current month', () => {
        const d = new Date();
        expect(toEndFraction(null)).toBeCloseTo(d.getFullYear() + (d.getMonth() + 1) / 12);
    });

    it('year-only multi-year ranges keep year-boundary behaviour (adjacent jobs abut)', () => {
        const a = span('2008 - 2012');
        const b = span('2012 - 2015');
        expect(a.end).toBeCloseTo(b.start);
    });
});

describe('insertGapsInTimeline', () => {
    const item = (id: string, period: string) => {
        const p = parsePeriod(period)!;
        return { id, label: id, startYear: p.startYear, endYear: p.endYear, startMonth: p.startMonth, endMonth: p.endMonth };
    };
    const gaps = (items: ReturnType<typeof item>[]) =>
        insertGapsInTimeline(items).filter((i): i is typeof i & { isGap: boolean } => 'isGap' in i && !!i.isGap);

    it('inserts a gap spanning exactly the months between two jobs', () => {
        const g = gaps([item('a', 'Jan 2010 - Jul 2012'), item('b', 'Mar 2013 - Present')]);
        expect(g).toHaveLength(1);
        // Gap = Aug 2012 .. Feb 2013 (does not overlap either job's months)
        expect(g[0]).toMatchObject({ startYear: 2012, startMonth: 8, endYear: 2013, endMonth: 2 });
        expect(toStartFraction(g[0].startYear, g[0].startMonth)).toBeCloseTo(2012 + 7 / 12);
        expect(toEndFraction(g[0].endYear, g[0].endMonth)).toBeCloseTo(2013 + 2 / 12);
    });

    it('handles a gap that ends in January (month rollover)', () => {
        const g = gaps([item('a', 'Jan 2010 - Jun 2012'), item('b', 'Feb 2013 - Present')]);
        expect(g[0]).toMatchObject({ startYear: 2012, startMonth: 7, endYear: 2013, endMonth: 1 });
    });

    it('does not report a gap that is covered by an overlapping longer job', () => {
        // A covers 2010-2020; B is a short side role inside it; C starts 2016.
        const g = gaps([item('A', '2010 - 2020'), item('B', '2012 - 2014'), item('C', '2016 - Present')]);
        expect(g).toHaveLength(0);
    });

    it('does not report gaps after an ongoing role started earlier', () => {
        const g = gaps([item('A', 'Jan 2015 - Present'), item('B', 'Jan 2016 - Jun 2016'), item('C', 'Jan 2019 - Present')]);
        expect(g).toHaveLength(0);
    });

    it('reports nothing for back-to-back jobs', () => {
        expect(gaps([item('a', 'Jan 2010 - Jul 2012'), item('b', 'Aug 2012 - Present')])).toHaveLength(0);
    });

    it('year-only gaps keep year granularity', () => {
        const g = gaps([item('a', '2008 - 2010'), item('b', '2012 - 2015')]);
        expect(g).toHaveLength(1);
        expect(g[0]).toMatchObject({ startYear: 2010, endYear: 2012, startMonth: undefined, endMonth: undefined });
    });
});
