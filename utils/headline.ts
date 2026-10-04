import { parsePeriod, toStartFraction } from './dateParser';

export interface HeadlineRole {
    employer: string;
    title?: string;
    period: string;
}

/**
 * Default headline: append the current employer to the first line of the
 * generated headline, e.g. "Senior Regional TA Business Partner at Deloitte SEA"
 * (JP: "… ／ Deloitte SEA"). Only used when a resume is generated/imported — the
 * field stays fully editable afterwards and is never rewritten on display.
 *
 * Employer choice: among ongoing roles (or all roles if none is ongoing), the
 * one whose title matches the headline wins — so a full-time role is picked over
 * a concurrent side business — otherwise the most recently started role.
 *
 * If the model returned no headline at all, the chosen role's title is used.
 */
export function withCurrentEmployer(currentRole: string | undefined, roles: HeadlineRole[], locale?: string): string {
    const candidates = roles
        .map(r => ({ ...r, parsed: parsePeriod(r.period) }))
        .filter((r): r is typeof r & { parsed: NonNullable<ReturnType<typeof parsePeriod>> } => !!r.employer?.trim() && !!r.parsed);
    if (!candidates.length) return currentRole ?? '';

    if (!currentRole?.trim()) {
        const ongoing = candidates.filter(c => c.parsed.isOngoing);
        const latest = [...(ongoing.length ? ongoing : candidates)].sort((a, b) =>
            toStartFraction(b.parsed.startYear, b.parsed.startMonth) - toStartFraction(a.parsed.startYear, a.parsed.startMonth)
        )[0];
        if (!latest.title?.trim()) return currentRole ?? '';
        currentRole = latest.title.trim();
    }

    const lines = currentRole.split('\n');
    const headline = lines[0].trim().toLowerCase();

    const ongoing = candidates.filter(c => c.parsed.isOngoing);
    const pool = ongoing.length ? ongoing : candidates;

    const titleMatches = (title?: string) => {
        const t = title?.trim().toLowerCase();
        return !!t && !!headline && (t === headline || headline.includes(t) || t.includes(headline));
    };
    const latest = [...pool].sort((a, b) =>
        toStartFraction(b.parsed.startYear, b.parsed.startMonth) - toStartFraction(a.parsed.startYear, a.parsed.startMonth)
    )[0];
    const employer = (pool.find(c => titleMatches(c.title)) ?? latest).employer.trim();

    // Already mentions the employer (e.g. the model or user wrote it) — leave as is.
    if (currentRole.toLowerCase().includes(employer.toLowerCase())) return currentRole;

    const connector = locale === 'ja' ? ' ／ ' : ' at ';
    lines[0] = `${lines[0].trim()}${connector}${employer}`;
    return lines.join('\n');
}
