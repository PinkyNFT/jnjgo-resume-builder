'use client';

import React from 'react';

/**
 * Represents a single timeline item with start/end years and a label
 */
export interface TimelineChartItem {
    id: string;
    label: string;
    startYear: number;
    endYear: number | null; // null means "Present" or ongoing
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
    if (!items || items.length === 0) {
        return null;
    }

    const currentYear = new Date().getFullYear();

    // Calculate min and max years from data if not provided
    const calculatedMinYear = Math.min(...items.map(item => item.startYear));
    const calculatedMaxYear = Math.max(
        ...items.map(item => item.endYear || currentYear),
        currentYear
    );

    const minYear = providedMinYear || calculatedMinYear;
    const maxYear = providedMaxYear || calculatedMaxYear;
    const yearRange = maxYear - minYear;

    // Generate year markers for the x-axis
    const yearMarkers: number[] = [];
    const interval = yearRange > 20 ? 4 : yearRange > 10 ? 2 : 1;

    for (let year = minYear; year <= maxYear; year += interval) {
        yearMarkers.push(year);
    }

    // Always include the max year if not already included
    if (yearMarkers[yearMarkers.length - 1] !== maxYear) {
        yearMarkers.push(maxYear);
    }

    /**
     * Calculate the position and width of a bar as percentages
     */
    const calculateBarPosition = (item: TimelineChartItem) => {
        const effectiveEndYear = item.endYear || currentYear;
        const left = ((item.startYear - minYear) / yearRange) * 100;
        const width = ((effectiveEndYear - item.startYear) / yearRange) * 100;

        return { left: `${left}%`, width: `${width}%` };
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
                {/* Timeline axis with year markers */}
                <div className="relative h-6 border-b border-slate-300 mb-2">
                    <div className="absolute inset-0 flex justify-between items-end">
                        {yearMarkers.map((year) => (
                            <div
                                key={year}
                                className="flex flex-col items-center"
                                style={{
                                    position: 'absolute',
                                    left: `${((year - minYear) / yearRange) * 100}%`,
                                    transform: 'translateX(-50%)'
                                }}
                            >
                                <div className="h-2 w-px bg-slate-300"></div>
                                <span className="text-[7pt] text-slate-600 mt-0.5 font-medium">
                                    {year}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Timeline items */}
                <div className="space-y-2">
                    {items.map((item, index) => {
                        const position = calculateBarPosition(item);
                        const barColor = getBarColor(item, index);

                        return (
                            <div
                                key={item.id}
                                className="flex items-center gap-3 h-7 group"
                            >
                                {/* Timeline bar container */}
                                <div className="flex-1 relative h-full">
                                    {/* Background track */}
                                    <div className="absolute inset-0 bg-slate-100 rounded-sm"></div>

                                    {/* Timeline bar */}
                                    <div
                                        className={`absolute h-full ${barColor} rounded-sm transition-all duration-300 group-hover:opacity-90 print:opacity-100 flex items-center px-2 overflow-hidden`}
                                        style={position}
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
                                            <span className={`text-[8pt] font-medium leading-tight truncate ${item.isGap ? 'text-slate-500 italic' : 'text-white'
                                                }`}>
                                                {item.label}
                                            </span>
                                        )}

                                        {/* Hover tooltip with exact dates */}
                                        {!editable && (
                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-slate-900 text-white text-[7pt] rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 shadow-lg print:hidden">
                                                {item.label}: {item.startYear} - {item.endYear || 'Present'}
                                            </div>
                                        )}
                                    </div>

                                    {/* "Present" indicator for ongoing items */}
                                    {!item.endYear && !item.isGap && (
                                        <div
                                            className="absolute top-1/2 -translate-y-1/2 w-1 h-1 bg-slate-900 rounded-full print:bg-slate-900"
                                            style={{ left: `${((currentYear - minYear) / yearRange) * 100}%` }}
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
