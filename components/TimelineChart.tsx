'use client';

import React from 'react';
import { toStartFraction, toEndFraction } from '../utils/dateParser';

// useLayoutEffect warns during SSR; fall back to useEffect on the server.
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? React.useLayoutEffect : React.useEffect;

/**
 * Represents a single timeline item with start/end years and a label
 */
export interface TimelineChartItem {
    id: string;
    label: string;
    startYear: number;
    endYear: number | null; // null means "Present" or ongoing
    startMonth?: number; // 1-12, for month-accurate bar start
    endMonth?: number; // 1-12, for month-accurate bar end
    color?: string; // Optional custom color for the bar
    isGap?: boolean; // Indicates if this is a gap period
}

/**
 * Props for the TimelineChart component
 */
interface TimelineChartProps {
    items: TimelineChartItem[];
    title?: string;
    minYear?: number;
    maxYear?: number;
    className?: string;
    editable?: boolean; // Enable inline editing of labels
    onItemLabelChange?: (itemId: string, newLabel: string) => void; // Callback when label changes
}

/**
 * TimelineChart - A Gantt-style timeline visualization component
 * 
 * Displays horizontal bars representing time periods for various items (employers, skills, etc.)
 * Follows the prototype design with clean, minimal aesthetics suitable for professional resumes.
 * 
 * @param items - Array of timeline items to display
 * @param title - Optional title for the chart
 * @param minYear - Optional minimum year (auto-calculated if not provided)
 * @param maxYear - Optional maximum year (defaults to current year if not provided)
 * @param className - Optional additional CSS classes
 */
export const TimelineChart: React.FC<TimelineChartProps> = ({
    items,
    title,
    minYear: providedMinYear,
    maxYear: providedMaxYear,
    className = '',
    editable = false,
    onItemLabelChange
}) => {
    // Track which (non-editable) labels overflow their bar so we can render the
    // full name beside the bar instead of truncating it. Japanese names vary a lot
    // in pixel width, so we measure rather than estimate from character count.
    const labelRefs = React.useRef<Map<string, HTMLSpanElement | null>>(new Map());
    const [overflowing, setOverflowing] = React.useState<Set<string>>(new Set());

    useIsomorphicLayoutEffect(() => {
        const next = new Set<string>();
        labelRefs.current.forEach((el, id) => {
            if (el && el.scrollWidth - el.clientWidth > 1) next.add(id);
        });
        setOverflowing(prev => {
            if (prev.size === next.size && [...next].every(id => prev.has(id))) return prev;
            return next;
        });
        // Re-measure whenever the items or their labels change.
    }, [items]);

    if (!items || items.length === 0) {
        return null;
    }

    const today = new Date();
    const currentYear = today.getFullYear();
    const nowFraction = currentYear + today.getMonth() / 12;

    // Fractional (month-accurate) start/end for each item
    const startFrac = (item: TimelineChartItem) => toStartFraction(item.startYear, item.startMonth);
    const endFrac = (item: TimelineChartItem) => toEndFraction(item.endYear, item.endMonth, nowFraction);

    // Calculate min and max years from data if not provided. Bounds use the
    // fractional extents (then snap out to whole years) so month-accurate bars
    // never overflow the track.
    const calculatedMinYear = Math.floor(Math.min(...items.map(startFrac)));
    const calculatedMaxYear = Math.ceil(Math.max(...items.map(endFrac), nowFraction));

    const minYear = providedMinYear || calculatedMinYear;
    const maxYear = providedMaxYear || calculatedMaxYear;
    const yearRange = Math.max(1, maxYear - minYear);

    // ── Axis ticks — always month-aware ──
    // The axis labels every tick as YYYY.MM so the month is shown regardless of how
    // many years the timeline spans. Everything works off an absolute month index
    // (year*12 + monthOffset). The step is picked to keep ~6-7 labels, and the step
    // values avoid multiples of 12 so the labeled month actually varies across the
    // axis (otherwise every tick would land on the same month, e.g. January).
    const spanMonths = Math.max(1, Math.round(yearRange * 12));
    const startAbs = minYear * 12;
    const endAbs = startAbs + spanMonths;
    const STEPS = [1, 2, 3, 4, 6, 9, 15, 18, 21, 30, 42, 54, 66, 90];
    let stepM = STEPS[STEPS.length - 1];
    for (const s of STEPS) {
        if (spanMonths / s <= 7) { stepM = s; break; }
    }

    const absToLeft = (abs: number) => ((abs - startAbs) / spanMonths) * 100;
    const absToLabel = (abs: number) => {
        const y = Math.floor(abs / 12);
        const mo = (abs % 12) + 1;
        const mm = mo < 10 ? `0${mo}` : `${mo}`;
        return `${mm}/${y}`; // Month/Year, e.g. 03/2015
    };

    const axisTicks: number[] = [];
    for (let m = startAbs; m <= endAbs + 0.5; m += stepM) axisTicks.push(m);
    // Ensure the right edge is labeled with the actual end (snap if the last tick is close).
    const lastTick = axisTicks[axisTicks.length - 1];
    if (endAbs - lastTick > stepM * 0.4) axisTicks.push(endAbs);
    else axisTicks[axisTicks.length - 1] = endAbs;

    /**
     * Calculate the position and width of a bar as percentages.
     * Uses month-accurate fractional years and clamps into [0, 100].
     */
    const calculateBarPosition = (item: TimelineChartItem) => {
        const rawLeft = ((startFrac(item) - minYear) / yearRange) * 100;
        const rawWidth = ((endFrac(item) - startFrac(item)) / yearRange) * 100;
        const leftPct = Math.min(100, Math.max(0, rawLeft));
        const widthPct = Math.max(0, Math.min(100 - leftPct, rawWidth));
        return { leftPct, widthPct, style: { left: `${leftPct}%`, width: `${widthPct}%` } };
    };

    /** Format a year + optional month for tooltips, e.g. "Jul 2012" or "2012". */
    const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const formatPoint = (year: number | null, month?: number): string => {
        if (year == null) return 'Present';
        return month ? `${MONTH_ABBR[month - 1]} ${year}` : `${year}`;
    };

    /**
     * Get default color based on index if no color provided
     */
    const getBarColor = (item: TimelineChartItem, index: number): string => {
        if (item.isGap) return 'bg-slate-200 border border-dashed border-slate-400';
        if (item.color) return item.color;

        const colors = [
            'bg-slate-700',
            'bg-slate-600',
            'bg-slate-500',
            'bg-slate-800',
            'bg-slate-650'
        ];

        return colors[index % colors.length];
    };

    return (
        <div className={`${className}`}>
            {title && (
                <h3 className="text-[10pt] font-bold text-slate-900 mb-3">
                    {title}
                </h3>
            )}

            <div className="relative">
                {/* Date-format hint so the axis labels are unambiguous */}
                <div className="flex justify-end mb-0.5">
                    <span className="text-[6.5pt] text-slate-400 leading-none tracking-wide">MM/YYYY</span>
                </div>

                {/* Month-aware timeline axis: tick marks + Month/Year labels, evenly spaced */}
                <div className="relative h-5">
                    <div className="absolute inset-0">
                        {axisTicks.map((abs) => (
                            <div
                                key={`tick-${abs}`}
                                className="flex flex-col items-center"
                                style={{
                                    position: 'absolute',
                                    left: `${absToLeft(abs)}%`,
                                    transform: 'translateX(-50%)'
                                }}
                            >
                                <div className="h-2 w-px bg-slate-300"></div>
                                <span className="text-[7pt] text-slate-600 mt-0.5 font-medium whitespace-nowrap tabular-nums">
                                    {absToLabel(abs)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
                {/* Axis rule sits below the labels with breathing room so they aren't cramped against the line */}
                <div className="border-b border-slate-300 mt-1.5 mb-1"></div>

                {/* Timeline items */}
                <div className="space-y-1">
                    {items.map((item, index) => {
                        const position = calculateBarPosition(item);
                        const barColor = getBarColor(item, index);
                        // When a non-editable label is wider than its bar, show the full
                        // name beside the bar instead of an ellipsis.
                        const showOutside = !editable && !item.isGap && overflowing.has(item.id);
                        // Place the outside label to the left when the bar ends near the
                        // right edge, otherwise to the right of the bar.
                        const outsideLeft = position.leftPct + position.widthPct > 72;

                        return (
                            <div
                                key={item.id}
                                className="flex items-center gap-2 h-6 group"
                            >
                                {/* Timeline bar container */}
                                <div className="flex-1 relative h-full">
                                    {/* Background track */}
                                    <div className="absolute inset-0 bg-slate-100 rounded-sm"></div>

                                    {/* Timeline bar */}
                                    <div
                                        className={`absolute h-full ${barColor} rounded-sm transition-all duration-300 group-hover:opacity-90 print:opacity-100 flex items-center px-2 overflow-hidden`}
                                        style={position.style}
                                    >
                                        {/* Label inside the bar */}
                                        {editable && onItemLabelChange ? (
                                            <input
                                                type="text"
                                                value={item.label || ''}
                                                onChange={(e) => onItemLabelChange(item.id, e.target.value)}
                                                className={`text-[8pt] font-medium leading-tight bg-transparent border-none outline-none focus:ring-1 focus:ring-white/50 rounded px-1 w-full ${item.isGap ? 'text-slate-500 italic' : 'text-white placeholder-white/60'
                                                    }`}
                                                placeholder={item.isGap ? 'Gap' : 'Label'}
                                            />
                                        ) : (
                                            <span
                                                ref={(el) => { labelRefs.current.set(item.id, el); }}
                                                className={`text-[8pt] font-medium leading-tight truncate ${showOutside ? 'invisible' : ''} ${item.isGap ? 'text-slate-500 italic' : 'text-white'
                                                    }`}>
                                                {item.label}
                                            </span>
                                        )}

                                        {/* Hover tooltip with exact dates */}
                                        {!editable && (
                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-slate-900 text-white text-[7pt] rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 shadow-lg print:hidden">
                                                {item.label}: {formatPoint(item.startYear, item.startMonth)} - {formatPoint(item.endYear, item.endMonth)}
                                            </div>
                                        )}
                                    </div>

                                    {/* Full label beside the bar when it doesn't fit inside */}
                                    {showOutside && (
                                        <span
                                            className="absolute top-1/2 -translate-y-1/2 text-[8pt] font-medium leading-tight text-slate-900 whitespace-nowrap pointer-events-none px-1"
                                            style={outsideLeft
                                                ? { right: `${100 - position.leftPct}%`, textAlign: 'right' }
                                                : { left: `${position.leftPct + position.widthPct}%` }}
                                        >
                                            {item.label}
                                        </span>
                                    )}

                                    {/* "Present" indicator for ongoing items */}
                                    {!item.endYear && !item.isGap && (
                                        <div
                                            className="absolute top-1/2 -translate-y-1/2 w-1 h-1 bg-slate-900 rounded-full print:bg-slate-900"
                                            style={{ left: `${Math.min(100, ((nowFraction - minYear) / yearRange) * 100)}%` }}
                                        ></div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
