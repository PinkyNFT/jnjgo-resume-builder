'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, FileText } from 'lucide-react';
import { TimelineChart, TimelineChartItem } from './TimelineChart';
import { parsePeriod } from '../utils/dateParser';
import { insertGapsInTimeline } from '../utils/timelineGenerator';

/* ─── Types (subset of ResumeData) ─────────────────────── */

interface ResumePreviewData {
    fullName?: string;
    currentRole?: string;
    contactInfo?: {
        email?: string;
        phone?: string;
        location?: string;
        linkedin?: string;
        age?: string;
        department?: string;
    };
    careerSummary?: string;
    timeline?: Array<{
        id?: string;
        type?: string;
        period?: string;
        organization?: string;
        role?: string;
        duration?: string;
    }>;
    careerOverview?: {
        totalExperience?: string;
        numberOfEmployers?: number;
        averageTenure?: string;
        projectCount?: string;
    };
    careerGaps?: Array<{
        period?: string;
        reason?: string;
        isExplained?: boolean;
    }>;
    workExperience?: Array<{
        id?: string;
        company?: string;
        position?: string;
        period?: string;
        responsibilities?: string[];
    }>;
    skillTimelines?: Array<{
        id?: string;
        skillName?: string;
        period?: string;
        context?: string;
    }>;
    education?: Array<{
        id?: string;
        degree?: string;
        institution?: string;
        period?: string;
        notes?: string;
    }>;
    skills?: string[];
    certifications?: string[];
    projectPortfolio?: {
        summary?: string[];
        representativeProjects?: Array<{
            id?: string;
            title?: string;
            period?: string;
            clientType?: string;
            theme?: string;
            teamStructure?: string;
            role?: string;
            context?: string;
            contribution?: string;
            challenges?: string;
        }>;
        additionalEngagements?: string;
    };
}

interface ResumePreviewCardProps {
    data: ResumePreviewData;
    defaultExpanded?: boolean;
}

/* ─── Color palette for timeline bars ──────────────────── */

const TIMELINE_COLORS = [
    '#334155', '#475569', '#64748b', '#94a3b8', '#6366f1',
    '#818cf8', '#4f46e5', '#7c3aed', '#8b5cf6',
];

/* ─── Component ────────────────────────────────────────── */

export function ResumePreviewCard({ data, defaultExpanded = false }: ResumePreviewCardProps) {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);

    /* ── Compute employer timeline data ── */
    const employerTimelineData = useMemo<TimelineChartItem[]>(() => {
        // Prefer workExperience, fall back to timeline work entries
        if (data.workExperience?.length) {
            const items = data.workExperience
                .map((work) => {
                    if (!work.period) return null;
                    const parsed = parsePeriod(work.period);
                    if (!parsed) return null;
                    return {
                        id: work.id || `emp-${data.workExperience!.indexOf(work)}`,
                        label: work.company || 'Unknown',
                        startYear: parsed.startYear,
                        endYear: parsed.endYear,
                    };
                })
                .filter((item): item is TimelineChartItem => item !== null);
            return insertGapsInTimeline(items);
        }
        // Fallback: use timeline entries with type 'work'
        const workEntries = data.timeline?.filter(t => t.type === 'work') || [];
        if (!workEntries.length) return [];
        const items = workEntries
            .map((entry) => {
                if (!entry.period) return null;
                const parsed = parsePeriod(entry.period);
                if (!parsed) return null;
                return {
                    id: entry.id || `emp-${workEntries.indexOf(entry)}`,
                    label: entry.organization || 'Unknown',
                    startYear: parsed.startYear,
                    endYear: parsed.endYear,
                };
            })
            .filter((item): item is TimelineChartItem => item !== null);
        return insertGapsInTimeline(items);
    }, [data.workExperience, data.timeline]);

    /* ── Compute skill timeline data ── */
    const skillTimelineData = useMemo<TimelineChartItem[]>(() => {
        if (!data.skillTimelines?.length) return [];
        const items = data.skillTimelines
            .map((st) => {
                if (!st.period) return null;
                const parsed = parsePeriod(st.period);
                if (!parsed) return null;
                return {
                    id: st.id || `skill-${data.skillTimelines!.indexOf(st)}`,
                    label: st.skillName || '',
                    startYear: parsed.startYear,
                    endYear: parsed.endYear,
                };
            })
            .filter((item): item is TimelineChartItem => item !== null);
        return insertGapsInTimeline(items);
    }, [data.skillTimelines]);

    /* ── Collapsed preview (always visible) ── */
    const CollapsedPreview = (
        <div className="flex items-start gap-4">
            <div className="flex-1 min-w-0">
                {data.fullName && (
                    <h4 className="text-lg font-bold text-slate-900">{data.fullName}</h4>
                )}
                {data.currentRole && (
                    <p className="text-sm text-slate-500 mt-0.5">{data.currentRole}</p>
                )}
                {data.careerSummary && (
                    <p className="text-sm text-slate-600 mt-2 line-clamp-2 leading-relaxed">
                        {data.careerSummary}
                    </p>
                )}
                {data.skills && data.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                        {data.skills.slice(0, 6).map((skill, i) => (
                            <span key={i} className="text-xs font-medium bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg border border-indigo-100">
                                {skill}
                            </span>
                        ))}
                        {data.skills.length > 6 && (
                            <span className="text-xs font-medium text-slate-400 px-2 py-1">
                                +{data.skills.length - 6} more
                            </span>
                        )}
                    </div>
                )}
                {/* Fallback: show portfolio summary tags when no skills */}
                {(!data.skills || data.skills.length === 0) && data.projectPortfolio?.representativeProjects && data.projectPortfolio.representativeProjects.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                        {data.projectPortfolio.representativeProjects.slice(0, 4).map((proj, i) => (
                            <span key={i} className="text-xs font-medium bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg border border-indigo-100">
                                {proj.title}
                            </span>
                        ))}
                        {data.projectPortfolio.representativeProjects.length > 4 && (
                            <span className="text-xs font-medium text-slate-400 px-2 py-1">
                                +{data.projectPortfolio.representativeProjects.length - 4} more projects
                            </span>
                        )}
                    </div>
                )}
            </div>
        </div>
    );

    /* ── Full A4-style resume preview ── */
    const FullResume = (
        <div className="bg-white border border-slate-200 rounded-xl shadow-inner mt-4 overflow-hidden">
            <div className="p-6 sm:p-8 text-slate-900 font-sans text-[9.5pt] leading-relaxed max-w-none">
                {/* Header */}
                <div className="border-b-2 border-slate-900 pb-4 mb-6">
                    <div className="mb-3">
                        {data.fullName && (
                            <h1 className="text-[28pt] font-bold tracking-tight text-slate-900 mb-2 leading-none">
                                {data.fullName}
                            </h1>
                        )}
                        {data.currentRole && (
                            <div className="text-[11pt] text-slate-700 leading-tight mb-1">
                                {data.currentRole}
                            </div>
                        )}
                        {data.contactInfo?.department && (
                            <div className="text-[10pt] italic text-slate-600">
                                {data.contactInfo.department}
                            </div>
                        )}
                    </div>
                    <div className="text-[9pt] text-slate-700 leading-tight flex gap-2 flex-wrap items-center">
                        {data.contactInfo?.email && (
                            <>
                                <span>Email: {data.contactInfo.email}</span>
                                <span className="text-slate-400">|</span>
                            </>
                        )}
                        {data.contactInfo?.phone && (
                            <>
                                <span>Phone: {data.contactInfo.phone}</span>
                                <span className="text-slate-400">|</span>
                            </>
                        )}
                        {data.contactInfo?.location && (
                            <span>{data.contactInfo.location}</span>
                        )}
                    </div>
                </div>

                {/* Professional Summary */}
                {data.careerSummary && (
                    <div className="mb-7">
                        <h2 className="text-[11pt] font-bold border-b border-slate-900 mb-3 pb-1 tracking-tight uppercase">
                            Professional Summary
                        </h2>
                        <div className="text-[9.5pt] text-slate-800 leading-relaxed whitespace-pre-line">
                            {data.careerSummary}
                        </div>
                    </div>
                )}

                {/* Employer Timeline */}
                {employerTimelineData.length > 0 && (
                    <div className="mb-7">
                        <h2 className="text-[11pt] font-bold border-b border-slate-900 mb-3 pb-1 tracking-tight uppercase">
                            Employer Timeline
                        </h2>
                        <TimelineChart
                            items={employerTimelineData}
                            className="bg-slate-50/30 p-4 rounded-lg"
                        />
                    </div>
                )}

                {/* Skill Timeline */}
                {skillTimelineData.length > 0 && (
                    <div className="mb-7">
                        <h2 className="text-[11pt] font-bold border-b border-slate-900 mb-3 pb-1 tracking-tight uppercase">
                            Skill Timeline
                        </h2>
                        <TimelineChart
                            items={skillTimelineData}
                            className="bg-slate-50/30 p-4 rounded-lg"
                        />
                    </div>
                )}

                {/* Career Summary / Timeline */}
                {data.timeline && data.timeline.length > 0 && (
                    <div className="mb-7">
                        <h2 className="text-[11pt] font-bold border-b border-slate-900 mb-3 pb-1 tracking-tight uppercase">
                            Career Summary
                        </h2>
                        <div className="space-y-2 text-[9.5pt] mb-4">
                            {data.timeline.filter(t => t.type === 'work').map((item, i) => (
                                <div key={i} className="flex gap-2 leading-snug">
                                    <span className="text-slate-900 font-bold">•</span>
                                    <div className="flex-1">
                                        {item.period && (
                                            <span className="font-medium text-slate-900">{item.period}</span>
                                        )}
                                        {item.organization && (
                                            <>
                                                <span className="mx-1.5 text-slate-500">:</span>
                                                <span className="text-slate-900 font-semibold">{item.organization}</span>
                                            </>
                                        )}
                                        {item.role && (
                                            <span className="text-slate-700"> {item.role}</span>
                                        )}
                                        {item.duration && (
                                            <span className="text-slate-600 ml-1">{item.duration}</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Career Overview Stats */}
                        {data.careerOverview && (
                            <div className="pt-3 border-t border-slate-200 text-[9pt] text-slate-700">
                                <div className="flex gap-5 flex-wrap">
                                    {data.careerOverview.totalExperience && (
                                        <span>Total career: <strong className="text-slate-900">{data.careerOverview.totalExperience}</strong></span>
                                    )}
                                    {(data.careerOverview.numberOfEmployers ?? 0) > 0 && (
                                        <span>Employers: <strong className="text-slate-900">{data.careerOverview.numberOfEmployers}</strong></span>
                                    )}
                                    {data.careerOverview.averageTenure && (
                                        <span>Average tenure: <strong className="text-slate-900">{data.careerOverview.averageTenure}</strong></span>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Career Gaps */}
                        {data.careerGaps && data.careerGaps.some(g => g.isExplained) && (
                            <div className="mt-4 pt-3 border-t border-slate-200">
                                <div className="text-[9pt] font-semibold text-slate-700 mb-2">Career Notes</div>
                                <div className="space-y-1.5">
                                    {data.careerGaps.filter(g => g.isExplained).map((gap, i) => (
                                        <div key={i} className="flex gap-2 text-[9pt] text-slate-700">
                                            <span className="text-slate-900 font-bold">•</span>
                                            <div className="flex-1">
                                                <span className="font-medium text-slate-900">{gap.period}</span>
                                                <span className="mx-1.5 text-slate-500">:</span>
                                                <span className="text-slate-700">{gap.reason}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Work Experience */}
                {data.workExperience && data.workExperience.length > 0 && (
                    <div className="mb-8">
                        <h2 className="text-[11pt] font-bold border-b border-slate-900 mb-4 pb-1 tracking-tight uppercase">
                            Work Experience
                        </h2>
                        <div className="space-y-8">
                            {data.workExperience.map((work, i) => (
                                <div key={work.id || i}>
                                    <div className="mb-3">
                                        <div className="flex justify-between items-start mb-1">
                                            <h3 className="font-bold text-[10.5pt] text-slate-900 flex-1">
                                                {work.company || 'Company'}
                                                {' | '}
                                                {work.position || 'Position'}
                                            </h3>
                                            {work.period && (
                                                <span className="text-[9pt] italic text-slate-600 ml-4 whitespace-nowrap">
                                                    {work.period}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    {work.responsibilities && work.responsibilities.length > 0 && (
                                        <div className="mb-3">
                                            <div className="font-bold text-[9pt] text-slate-900 mb-2">■ Responsibilities</div>
                                            <ul className="space-y-1.5">
                                                {work.responsibilities.map((resp, j) => (
                                                    <li key={j} className="flex gap-2 text-[9.5pt] text-slate-800 leading-relaxed ml-4">
                                                        <span className="text-slate-900 font-bold mt-0.5">•</span>
                                                        <span className="flex-1 whitespace-pre-line">{resp}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Education */}
                {data.education && data.education.length > 0 && (
                    <div className="mb-8">
                        <h2 className="text-[11pt] font-bold border-b border-slate-900 mb-4 pb-1 tracking-tight uppercase">
                            Education
                        </h2>
                        <div className="space-y-4">
                            {data.education.map((edu, i) => (
                                <div key={edu.id || i}>
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            {edu.degree && (
                                                <h3 className="font-bold text-[10pt] text-slate-900">{edu.degree}</h3>
                                            )}
                                            {edu.institution && (
                                                <div className="text-[9.5pt] text-slate-700">{edu.institution}</div>
                                            )}
                                        </div>
                                        {edu.period && (
                                            <span className="text-[9pt] italic text-slate-600 ml-4">{edu.period}</span>
                                        )}
                                    </div>
                                    {edu.notes && (
                                        <div className="text-[9pt] text-slate-600 mt-1 ml-2">{edu.notes}</div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Education from timeline (fallback when education array is empty) */}
                {(!data.education || data.education.length === 0) && data.timeline?.some(t => t.type === 'education') && (
                    <div className="mb-8">
                        <h2 className="text-[11pt] font-bold border-b border-slate-900 mb-4 pb-1 tracking-tight uppercase">
                            Education
                        </h2>
                        <div className="space-y-4">
                            {data.timeline.filter(t => t.type === 'education').map((edu, i) => (
                                <div key={edu.id || i}>
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            {edu.role && (
                                                <h3 className="font-bold text-[10pt] text-slate-900">{edu.role}</h3>
                                            )}
                                            {edu.organization && (
                                                <div className="text-[9.5pt] text-slate-700">{edu.organization}</div>
                                            )}
                                        </div>
                                        {edu.period && (
                                            <span className="text-[9pt] italic text-slate-600 ml-4">{edu.period}</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Project Portfolio */}
                {data.projectPortfolio && (
                    <div className="mb-8">
                        <h2 className="text-[11pt] font-bold border-b border-slate-900 mb-4 pb-1 tracking-tight uppercase">
                            Project Portfolio
                        </h2>

                        {/* Portfolio Summary */}
                        {data.projectPortfolio.summary && data.projectPortfolio.summary.length > 0 && (
                            <div className="mb-5">
                                <ul className="space-y-1.5">
                                    {data.projectPortfolio.summary.map((item, i) => (
                                        <li key={i} className="flex gap-2 text-[9.5pt] text-slate-800 leading-relaxed">
                                            <span className="text-slate-900 font-bold mt-0.5">•</span>
                                            <span className="flex-1">{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Representative Projects */}
                        {data.projectPortfolio.representativeProjects && data.projectPortfolio.representativeProjects.length > 0 && (
                            <div className="space-y-6">
                                {data.projectPortfolio.representativeProjects.map((project, i) => (
                                    <div key={project.id || i} className="border-l-2 border-indigo-300 pl-4">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex-1">
                                                <h3 className="font-bold text-[10.5pt] text-slate-900">
                                                    {project.title || 'Project'}
                                                    {project.theme && (
                                                        <span className="font-normal text-[9pt] text-indigo-600 ml-2">({project.theme})</span>
                                                    )}
                                                </h3>
                                                {project.role && (
                                                    <div className="text-[9.5pt] text-slate-700">{project.role}</div>
                                                )}
                                                {project.clientType && (
                                                    <div className="text-[9pt] text-slate-500">Client: {project.clientType}</div>
                                                )}
                                            </div>
                                            {project.period && (
                                                <span className="text-[9pt] italic text-slate-600 ml-4 whitespace-nowrap">
                                                    {project.period}
                                                </span>
                                            )}
                                        </div>
                                        {project.teamStructure && (
                                            <div className="text-[9pt] text-slate-600 mb-2">
                                                <span className="font-semibold text-slate-700">Team:</span> {project.teamStructure}
                                            </div>
                                        )}
                                        {project.context && (
                                            <div className="text-[9.5pt] text-slate-800 leading-relaxed mb-2">
                                                {project.context}
                                            </div>
                                        )}
                                        {project.contribution && (
                                            <div className="mb-2">
                                                <div className="font-bold text-[9pt] text-slate-900 mb-1">■ Contributions</div>
                                                <p className="text-[9.5pt] text-slate-800 leading-relaxed ml-4 whitespace-pre-line">{project.contribution}</p>
                                            </div>
                                        )}
                                        {project.challenges && (
                                            <div>
                                                <div className="font-bold text-[9pt] text-slate-900 mb-1">■ Challenges</div>
                                                <p className="text-[9.5pt] text-slate-800 leading-relaxed ml-4 whitespace-pre-line">{project.challenges}</p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Additional Engagements */}
                        {data.projectPortfolio.additionalEngagements && (
                            <div className="mt-4 pt-3 border-t border-slate-200 text-[9pt] text-slate-500 whitespace-pre-line">
                                {data.projectPortfolio.additionalEngagements}
                            </div>
                        )}
                    </div>
                )}

                {/* Skills */}
                {data.skills && data.skills.length > 0 && (
                    <div className="mb-8">
                        <h2 className="text-[11pt] font-bold border-b border-slate-900 mb-4 pb-1 tracking-tight uppercase">
                            Skills
                        </h2>
                        <div className="flex flex-wrap gap-2">
                            {data.skills.map((skill, i) => (
                                <span key={i} className="px-3 py-1.5 bg-slate-100 text-slate-800 text-[9pt] rounded-lg border border-slate-200">
                                    {skill}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Certifications */}
                {data.certifications && data.certifications.length > 0 && (
                    <div className="mb-4">
                        <h2 className="text-[11pt] font-bold border-b border-slate-900 mb-4 pb-1 tracking-tight uppercase">
                            Certifications
                        </h2>
                        <div className="space-y-2">
                            {data.certifications.map((cert, i) => (
                                <div key={i} className="flex gap-2 text-[9.5pt] text-slate-800">
                                    <span className="text-slate-900 font-bold">•</span>
                                    <span className="flex-1">{cert}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-sm">
            {/* Section Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center">
                        <FileText className="w-4.5 h-4.5 text-indigo-600" />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-900 text-sm">Resume</h3>
                        <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                            Candidate-selected showcase
                        </p>
                    </div>
                </div>
                <motion.button
                    type="button"
                    onClick={() => setIsExpanded(!isExpanded)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 px-3.5 py-2 rounded-xl hover:bg-indigo-100 transition-colors"
                >
                    {isExpanded ? (
                        <>
                            <ChevronUp className="w-3.5 h-3.5" />
                            Collapse
                        </>
                    ) : (
                        <>
                            <ChevronDown className="w-3.5 h-3.5" />
                            View full resume
                        </>
                    )}
                </motion.button>
            </div>

            {/* Collapsed: summary view */}
            {CollapsedPreview}

            {/* Expanded: full resume */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
                        className="overflow-hidden"
                    >
                        {FullResume}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
