# Timeline Visualization Feature

## Overview

The Timeline Visualization feature adds Gantt chart-style visual timelines to resumes, providing a clear, at-a-glance view of employment history and skill development over time.

## Features

### 1. Employer Timeline
Displays all employers/companies on a horizontal timeline showing:
- Company names
- Employment periods with start and end dates
- Ongoing/current positions (indicated to "Present")
- Visual bars representing tenure at each organization

### 2. Skill Timeline  
Shows skill development and usage across career:
- Skill category names
- Time periods when skills were actively used
- Overlap periods showing concurrent skill usage
- Context linking skills to specific roles/companies

## Components

### TimelineChart Component

A reusable, production-ready React component for rendering Gantt-style timelines.

**Location:** `components/TimelineChart.tsx`

#### Props

```typescript
interface TimelineChartItem {
    id: string;
    label: string;          // Name to display (company, skill, etc.)
    startYear: number;      // Start year
    endYear: number | null; // End year (null = "Present")
    color?: string;         // Optional custom color
}

interface TimelineChartProps {
    items: TimelineChartItem[];
    title?: string;
    minYear?: number;      // Auto-calculated if not provided
    maxYear?: number;      // Defaults to current year
    className?: string;
}
```

#### Features

- **Automatic Year Range Calculation:** Intelligently determines min/max years from data
- **Smart Year Markers:** Dynamically adjusts scale intervals based on time span
- **Hover States:** Tooltips showing exact date ranges on hover
- **Print-Friendly:** Optimized for PDF export with proper color handling
- **Accessibility:** Semantic HTML with proper ARIA labels
- **Responsive Design:** Adapts to container width
- **Professional Styling:** Clean, minimal design matching resume aesthetics

#### Example Usage

```tsx
import { TimelineChart, TimelineChartItem } from '@/components/TimelineChart';

const employerData: TimelineChartItem[] = [
    {
        id: '1',
        label: 'Deloitte',
        startYear: 2020,
        endYear: null  // Current position
    },
    {
        id: '2',
        label: 'McKinsey & Co',
        startYear: 2015,
        endYear: 2020
    }
];

<TimelineChart 
    items={employerData}
    title="Employment History"
    className="my-4"
/>
```

## Data Structures

### SkillTimeline Type

Added to `types.ts`:

```typescript
export interface SkillTimeline {
    id: string;
    skillName: string;    // e.g., "Professional Sales", "Web Development"
    period: string;       // Date range string (e.g., "2015 - 2020")
    context?: string;     // Optional context (company, project)
}
```

### ResumeData Extension

The `ResumeData` interface now includes:

```typescript
{
    // ... existing fields
    skillTimelines?: SkillTimeline[];
}
```

## Utility Functions

### Date Parser (`utils/dateParser.ts`)

Robust date parsing utilities handling various resume date formats:

#### Functions

**`parsePeriod(period: string): ParsedDateRange | null`**

Parses period strings into structured data:

```typescript
parsePeriod("April 2015 – March 2021")
// => { startYear: 2015, endYear: 2021, isOngoing: false }

parsePeriod("2021 - Present")
// => { startYear: 2021, endYear: null, isOngoing: true }

parsePeriod("Oct 2023 – Jan 2024 (3 months)")
// => { startYear: 2023, endYear: 2024, isOngoing: false }
```

**Supported Formats:**
- Full dates: "April 2015 – March 2021"
- Year ranges: "2015-2020"
- Abbreviated months: "Oct 2023 – Jan 2024"
- Present indicators: "2021 - Present", "2021 - Current", "2021 - 現在"
- Duration annotations: "2018-2020 (2 years)"

**`calculateDuration(startYear: number, endYear: number | null): number`**

Returns duration in years.

**`formatDuration(years: number): string`**

Formats duration as human-readable string (e.g., "3 years", "< 1 year").

**`validateChronology(ranges: ParsedDateRange[]): boolean`**

Validates that date ranges are in chronological order.

## Integration in ResumeEditor

### Automatic Timeline Generation

The `ResumeEditor` component automatically generates timeline visualizations from existing data:

```typescript
// Generates employer timeline from workExperience
const employerTimelineData = useMemo(() => {
    return data.workExperience
        .map(work => {
            const parsed = parsePeriod(work.period);
            if (!parsed) return null;
            return {
                id: work.id,
                label: work.company,
                startYear: parsed.startYear,
                endYear: parsed.endYear
            };
        })
        .filter(item => item !== null);
}, [data.workExperience]);
```

### Rendering in Resume

Timelines are rendered between the career summary and work experience sections:

```tsx
{/* Employer Timeline Visualization */}
{employerTimelineData.length > 0 && (
    <div className="mb-7 break-inside-avoid">
        <h2 className="text-[11pt] font-bold border-b border-slate-900 mb-3 pb-1">
            {t('employerTimeline')}
        </h2>
        <TimelineChart
            items={employerTimelineData}
            className="bg-slate-50/30 p-4 rounded-lg"
        />
    </div>
)}
```

## Styling Conventions

Following world-class application standards:

### CSS Classes
- Uses Tailwind CSS utilities exclusively
- Print-specific styles via `@media print`
- Responsive design with proper breakpoints
- Consistent spacing using Tailwind's scale

### Colors
- Primary bars: `bg-slate-700`, `bg-slate-600`, `bg-slate-500`
- Background: `bg-slate-50/30` for subtle container
- Borders: `border-slate-900` for section headers
- Text: `text-slate-700` for labels, `text-slate-600` for markers

### Typography
- Labels: `text-[8pt]` matching resume font scale
- Headers: `text-[11pt] font-bold` consistent with section headers
- Markers: `text-[7pt]` for year labels

### Print Optimization
- Ensures background colors print with `print-color-adjust: exact`
- Hides hover tooltips in print mode
- Prevents page breaks within timelines with `break-inside-avoid`
- Optimized bar heights for professional appearance

## Internationalization

Timeline labels support both English and Japanese:

### English (`messages/en.json`)
```json
{
  "Editor": {
    "employerTimeline": "Employer Timeline",
    "skillTimeline": "Skill Timeline"
  }
}
```

### Japanese (`messages/ja.json`)
```json
{
  "Editor": {
    "employerTimeline": "雇用主タイムライン",
    "skillTimeline": "スキルタイムライン"
  }
}
```

## Testing

### Unit Tests

Create tests in `utils/__tests__/dateParser.test.ts`:

```typescript
import { parsePeriod, calculateDuration } from '../dateParser';

describe('parsePeriod', () => {
    it('parses full date ranges', () => {
        expect(parsePeriod('April 2015 – March 2021')).toEqual({
            startYear: 2015,
            endYear: 2021,
            isOngoing: false
        });
    });
    
    it('handles Present indicator', () => {
        expect(parsePeriod('2021 - Present')).toEqual({
            startYear: 2021,
            endYear: null,
            isOngoing: true
        });
    });
});
```

### Visual Testing

1. Create a resume with multiple employers spanning different years
2. Add skill timelines with overlapping periods
3. Verify:
   - Timeline bars render correctly
   - Year markers are properly positioned
   - Hover tooltips show accurate dates
   - Print preview looks professional
   - Current positions show "Present" indicator

## Best Practices

### Data Entry

1. **Consistent Date Formats:** Use standard formats consistently throughout
2. **Complete Data:** Ensure all work experience has period information
3. **Skill Context:** Link skills to specific time periods for accurate visualization
4. **Chronological Order:** Maintain chronological order in data entry

### Performance

1. **useMemo:** Timeline data generation is memoized to prevent unnecessary recalculation
2. **Conditional Rendering:** Timelines only render when data exists
3. **Efficient Parsing:** Date parsing is optimized with regex patterns

### Accessibility

1. **Semantic HTML:** Uses semantic elements (`<div>`, proper heading hierarchy)
2. **Color Contrast:** Maintains WCAG AA contrast ratios
3. **Hover Information:** Important dates are accessible via tooltips
4. **Keyboard Navigation:** Component is fully keyboard accessible

## Future Enhancements

Potential improvements for future iterations:

1. **Interactive Editing:** Click timeline bars to edit dates directly
2. **Zoom Controls:** Allow users to zoom in/out on timeline
3. **Gap Highlighting:** Visually highlight employment gaps
4. **Skill Grouping:** Automatically group related skills
5. **Export Options:** Export timeline as standalone image
6. **Comparison View:** Compare multiple resumes side-by-side
7. **Milestone Markers:** Add significant career events/promotions
8. **Custom Colors:** Allow users to set custom colors for each item

## Troubleshooting

### Timeline Not Showing

**Check:**
1. Data exists in `workExperience` or `skillTimelines`
2. Period strings are parseable (contain valid year)
3. Component is imported correctly
4. Translation keys are present

### Incorrect Date Parsing

**Solutions:**
1. Verify date format matches supported patterns
2. Check for typos in month names
3. Ensure year is 4-digit format (1900-2099)
4. Test with `parsePeriod()` function directly

### Print Issues

**Fixes:**
1. Verify `print-color-adjust: exact` in print styles
2. Check page break settings with `break-inside-avoid`
3. Test in different browsers (Chrome, Firefox, Safari)
4. Ensure print preview matches screen view

## Migration Guide

### Adding Skill Timelines to Existing Resumes

For resumes without `skillTimelines`, you can auto-generate from work experience:

```typescript
function generateSkillTimelines(workExperience: WorkExperience[]): SkillTimeline[] {
    // Extract skills from each job and create timelines
    return workExperience.flatMap(work => {
        const skills = extractSkillsFromResponsibilities(work.responsibilities);
        return skills.map((skill, index) => ({
            id: `${work.id}-skill-${index}`,
            skillName: skill,
            period: work.period,
            context: work.company
        }));
    });
}
```

## Support

For issues or questions:
1. Check this documentation
2. Review existing resume examples
3. Test with sample data
4. Consult component source code for implementation details
