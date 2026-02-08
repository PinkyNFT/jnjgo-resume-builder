'use client';

import React, { useState } from 'react';
import { ResumeData, Project, EvaluationResult, WorkExperience, Education } from '../types';
import { evaluateResume } from '../services/geminiService';
import { saveProject } from '../services/storageService';
import { Printer, Save, BarChart3, AlertTriangle, RefreshCcw, ArrowLeft, CheckCircle2 } from 'lucide-react';

interface ResumeEditorProps {
    project: Project;
    onUpdate: (data: ResumeData) => void;
    onBack: () => void;
}

const ScoreBar = ({ label, score, max, colorClass, description }: { label: string, score: number, max: number, colorClass: string, description?: string }) => (
    <div className="group relative">
        <div className="flex justify-between items-end mb-1">
            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tight">{label}</span>
            <span className="text-[10px] font-medium text-slate-500">{score}/{max}</span>
        </div>
        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div
                className={`h-full rounded-full transition-all duration-1000 ease-out ${colorClass}`}
                style={{ width: `${Math.min((score / max) * 100, 100)}%` }}
            />
        </div>
        {/* Tooltip on hover */}
        {description && (
            <div className="absolute bottom-full left-0 mb-2 w-48 p-2 bg-slate-800 text-white text-[9px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-xl leading-tight">
                {description}
                <div className="absolute top-full left-4 -mt-1 border-4 border-transparent border-t-slate-800"></div>
            </div>
        )}
    </div>
);

export const ResumeEditor: React.FC<ResumeEditorProps> = ({ project, onUpdate, onBack }) => {
    const [data, setData] = useState<ResumeData>(project.data!);
    const [evaluation, setEvaluation] = useState<EvaluationResult | undefined>(project.evaluation);
    const [isEvaluating, setIsEvaluating] = useState(false);
    const [activeTab, setActiveTab] = useState<'preview' | 'edit'>('preview');

    const handleRunEvaluation = async () => {
        setIsEvaluating(true);
        try {
            const result = await evaluateResume(data, project.roleType);
            setEvaluation(result);
            const updatedProject = { ...project, evaluation: result, data: data };
            saveProject(updatedProject);
        } catch (e) {
            console.error(e);
            alert("Evaluation failed.");
        } finally {
            setIsEvaluating(false);
        }
    };

    const handleSaveComplete = () => {
        const updatedProject = {
            ...project,
            data,
            evaluation,
            status: 'completed' as const,
            updatedAt: Date.now()
        };
        saveProject(updatedProject);
        alert("Saved!");
        onBack();
    };

    const handlePrint = () => {
        window.print();
    };

    // --- Render Helpers ---

    const renderEditableText = (value: string, onChange: (val: string) => void, multiline = false, className = "", placeholder = "") => {
        if (activeTab === 'preview') {
            return <div className={`whitespace-pre-wrap ${className}`}>{value || <span className="text-slate-300 italic">{placeholder}</span>}</div>;
        }
        if (multiline) {
            return (
                <textarea
                    className={`w-full border border-indigo-200 bg-indigo-50/50 rounded p-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-slate-800 ${className}`}
                    value={value || ""}
                    onChange={(e) => onChange(e.target.value)}
                    rows={Math.max(2, (value || "").split('\n').length)}
                    placeholder={placeholder}
                />
            );
        }
        return (
            <input
                className={`w-full border border-indigo-200 bg-indigo-50/50 rounded px-1.5 py-0.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-slate-800 ${className}`}
                value={value || ""}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
            />
        );
    };

    return (
        <div className="max-w-7xl mx-auto pb-20 flex gap-8">
            {/* Print Styles */}
            <style>{`
        @media print {
          @page { margin: 0; size: auto; }
          body * { visibility: hidden; }
          #resume-preview, #resume-preview * { visibility: visible; }
          #resume-preview {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 15mm;
            background: white;
            box-shadow: none;
            overflow: visible;
          }
          /* Ensure background colors print */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          /* Hide placeholders in print */
          input::placeholder, textarea::placeholder { color: transparent; }
        }
      `}</style>

            {/* LEFT COLUMN: Controls */}
            <div className="w-80 shrink-0 space-y-6 print:hidden h-fit sticky top-6">
                <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-medium text-sm mb-2 transition-colors">
                    <ArrowLeft className="w-4 h-4" /> Back to Dashboard
                </button>

                <div className="bg-white p-5 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100">
                    <div className="flex gap-2 mb-6 bg-slate-100 p-1.5 rounded-xl">
                        <button onClick={() => setActiveTab('preview')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'preview' ? 'bg-white shadow-sm text-slate-900 ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700'}`}>Preview</button>
                        <button onClick={() => setActiveTab('edit')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'edit' ? 'bg-white shadow-sm text-slate-900 ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700'}`}>Edit Data</button>
                    </div>

                    <div className="space-y-3">
                        <button onClick={handleRunEvaluation} disabled={isEvaluating} className="w-full py-3 bg-indigo-50 text-indigo-700 font-bold text-sm rounded-xl hover:bg-indigo-100 transition-all flex items-center justify-center gap-2 group border border-indigo-100 shadow-sm">
                            {isEvaluating ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <BarChart3 className="w-4 h-4 group-hover:scale-110 transition-transform" />}
                            Run Score Analysis
                        </button>

                        {evaluation && (
                            <div className="mt-4 bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm animate-in fade-in slide-in-from-top-2">
                                {/* Score Header */}
                                <div className={`p-4 border-b border-slate-100 flex justify-between items-center ${evaluation.isPassing ? 'bg-green-50/50' : 'bg-amber-50/50'}`}>
                                    <div>
                                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Quality Score</div>
                                        <div className={`text-3xl font-black flex items-baseline ${evaluation.isPassing ? 'text-green-600' : 'text-amber-600'}`}>
                                            {evaluation.totalScore}<span className="text-sm text-slate-400 font-medium ml-1">/100</span>
                                        </div>
                                    </div>
                                    <div className={`px-3 py-1 rounded-full text-[10px] font-bold border flex items-center gap-1 ${evaluation.isPassing ? 'bg-green-100 text-green-700 border-green-200' : 'bg-amber-100 text-amber-700 border-amber-200'}`}>
                                        {evaluation.isPassing ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                                        {evaluation.isPassing ? 'PASSING' : 'NEEDS WORK'}
                                    </div>
                                </div>

                                {/* Detailed Breakdown */}
                                <div className="p-4 space-y-4 bg-white">
                                    <ScoreBar
                                        label="Structure"
                                        score={evaluation.breakdown.structure}
                                        max={50}
                                        colorClass="bg-blue-500"
                                        description="Chronological, no gaps, quantified achievements, bullet style."
                                    />

                                    {/* Detailed Structure Breakdown if available */}
                                    {evaluation.detailedBreakdown?.structure && (
                                        <div className="ml-4 p-3 bg-slate-50 rounded-lg space-y-2 border border-slate-100">
                                            <div className="text-[9px] font-bold text-slate-500 uppercase mb-2">Structure Details</div>
                                            <div className="grid grid-cols-2 gap-2 text-[9px]">
                                                <div className="flex justify-between">
                                                    <span className="text-slate-600">Basic Profile:</span>
                                                    <span className="font-semibold text-slate-800">{evaluation.detailedBreakdown.structure.basicProfile}/5</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-slate-600">Chronological:</span>
                                                    <span className="font-semibold text-slate-800">{evaluation.detailedBreakdown.structure.chronological}/10</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-slate-600">Role Info:</span>
                                                    <span className="font-semibold text-slate-800">{evaluation.detailedBreakdown.structure.roleInfo}/10</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-slate-600">Achievements:</span>
                                                    <span className={`font-semibold ${evaluation.detailedBreakdown.structure.quantifiedAchievements === 0 ? 'text-red-600' : 'text-slate-800'}`}>
                                                        {evaluation.detailedBreakdown.structure.quantifiedAchievements}/15
                                                    </span>
                                                </div>
                                                <div className="flex justify-between col-span-2">
                                                    <span className="text-slate-600">Readability:</span>
                                                    <span className="font-semibold text-slate-800">{evaluation.detailedBreakdown.structure.readability}/10</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <ScoreBar
                                        label="Reproducibility"
                                        score={evaluation.breakdown.reproducibility}
                                        max={25}
                                        colorClass="bg-indigo-500"
                                        description="Decision making rationale, process clarity, individual contribution."
                                    />

                                    {/* Detailed Reproducibility Breakdown if available */}
                                    {evaluation.detailedBreakdown?.reproducibility && (
                                        <div className="ml-4 p-3 bg-slate-50 rounded-lg space-y-2 border border-slate-100">
                                            <div className="text-[9px] font-bold text-slate-500 uppercase mb-2">Reproducibility Details</div>
                                            <div className="grid grid-cols-2 gap-2 text-[9px]">
                                                <div className="flex justify-between">
                                                    <span className="text-slate-600">Decision Making:</span>
                                                    <span className="font-semibold text-slate-800">{evaluation.detailedBreakdown.reproducibility.decisionMaking}/10</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-slate-600">PAR Flow:</span>
                                                    <span className="font-semibold text-slate-800">{evaluation.detailedBreakdown.reproducibility.problemActionResult}/10</span>
                                                </div>
                                                <div className="flex justify-between col-span-2">
                                                    <span className="text-slate-600">Individual Contribution:</span>
                                                    <span className="font-semibold text-slate-800">{evaluation.detailedBreakdown.reproducibility.individualContribution}/5</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <ScoreBar
                                        label="Role Fit"
                                        score={evaluation.breakdown.roleFit}
                                        max={15}
                                        colorClass="bg-violet-500"
                                        description="Alignment with the specific expectations of the target role."
                                    />

                                    {/* Role Fit Details if available */}
                                    {evaluation.detailedBreakdown?.roleFit?.details && (
                                        <div className="ml-4 p-3 bg-slate-50 rounded-lg border border-slate-100">
                                            <div className="text-[9px] text-slate-600 leading-relaxed">{evaluation.detailedBreakdown.roleFit.details}</div>
                                        </div>
                                    )}

                                    <ScoreBar
                                        label="Risk"
                                        score={evaluation.breakdown.riskHandling}
                                        max={10}
                                        colorClass="bg-rose-500"
                                        description="Handling of career gaps (>90 days) and red flags."
                                    />
                                </div>

                                {/* Validation Messages (if not passing) */}
                                {evaluation.validationMessages && evaluation.validationMessages.length > 0 && (
                                    <div className="bg-red-50 p-4 border-t border-red-100">
                                        <p className="text-[10px] font-bold text-red-600 uppercase mb-2 flex items-center gap-1.5">
                                            <AlertTriangle className="w-3 h-3" /> Failing Criteria
                                        </p>
                                        <ul className="space-y-1.5">
                                            {evaluation.validationMessages.map((msg, i) => (
                                                <li key={i} className="flex gap-2 text-[10px] text-red-700 leading-snug font-medium">
                                                    <span className="text-red-400 mt-0.5">✗</span>
                                                    {msg}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* Action Items */}
                                {evaluation.missingItems.length > 0 && (
                                    <div className="bg-slate-50 p-4 border-t border-slate-100">
                                        <p className="text-[10px] font-bold text-slate-500 uppercase mb-2 flex items-center gap-1.5">
                                            <AlertTriangle className="w-3 h-3 text-amber-500" /> Improvements Needed
                                        </p>
                                        <ul className="space-y-2">
                                            {evaluation.missingItems.map((item, i) => (
                                                <li key={i} className="flex gap-2 text-[10px] text-slate-600 leading-snug">
                                                    <span className="text-amber-400 mt-0.5">•</span>
                                                    {item}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}

                        <button
                            onClick={handleSaveComplete}
                            disabled={!evaluation?.isPassing}
                            className={`w-full py-3 font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg hover:-translate-y-0.5 ${evaluation?.isPassing ? 'bg-slate-900 text-white hover:bg-slate-800 shadow-slate-900/20' : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'}`}
                        >
                            <Save className="w-4 h-4" /> Save as Complete
                        </button>

                        <button onClick={handlePrint} className="w-full py-3 bg-white border-2 border-slate-200 text-slate-700 font-bold text-sm rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-center gap-2">
                            <Printer className="w-4 h-4" /> Export PDF
                        </button>
                    </div>
                </div>

                {(() => {
                    // Filter out gaps that overlap with education periods
                    const unexplainedGaps = data.careerGaps.filter(gap => {
                        if (gap.isExplained) return false;

                        // Check if this gap overlaps with any education period
                        const gapOverlapsEducation = data.timeline?.some(item => {
                            if (item.type !== 'education') return false;
                            // Simple check - if gap reason mentions the education org, consider it explained
                            return gap.period.toLowerCase().includes(item.organization.toLowerCase()) ||
                                gap.period.toLowerCase().includes(item.role.toLowerCase());
                        });

                        return !gapOverlapsEducation;
                    });

                    if (unexplainedGaps.length === 0) return null;

                    return (
                        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start gap-3 shadow-sm">
                            <div className="p-1.5 bg-amber-100 rounded-full text-amber-600 shrink-0">
                                <AlertTriangle className="w-4 h-4" />
                            </div>
                            <div className="flex-1">
                                <h4 className="font-bold text-amber-900 text-sm">Timeline Gap Detected</h4>
                                <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                                    A master resume must have a continuous timeline. Please explain the gap.
                                </p>
                                {unexplainedGaps.length > 0 && (
                                    <div className="mt-2 text-xs text-amber-800">
                                        <span className="font-semibold">Gaps found:</span> {unexplainedGaps.map(g => g.period).join(', ')}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })()}
            </div>

            {/* RIGHT COLUMN: Master Resume (Japanese Style Layout) */}
            <div className="flex-1 overflow-x-auto pb-10">
                <div
                    id="resume-preview"
                    className={`bg-white shadow-2xl min-h-[297mm] w-[210mm] mx-auto p-[15mm] text-slate-900 font-sans text-[9.5pt] leading-relaxed transition-all duration-300 ${activeTab === 'edit' ? 'ring-4 ring-indigo-500/10' : ''}`}
                >

                    {/* Header - Professional Layout */}
                    <div className="border-b-2 border-slate-900 pb-4 mb-6">
                        <div className="mb-3">
                            <h1 className="text-[28pt] font-bold tracking-tight text-slate-900 mb-2 leading-none">
                                {renderEditableText(data.fullName, val => setData({ ...data, fullName: val }), false, "font-sans", "")}
                            </h1>
                            <div className="text-[11pt] text-slate-700 leading-tight mb-1">
                                {renderEditableText(data.currentRole, val => setData({ ...data, currentRole: val }), false, "", "")}
                            </div>
                            {data.contactInfo.department && (
                                <div className="text-[10pt] italic text-slate-600">
                                    {renderEditableText(data.contactInfo.department || "", val => setData({ ...data, contactInfo: { ...data.contactInfo, department: val } }), false, "", "")}
                                </div>
                            )}
                        </div>
                        <div className="text-[9pt] text-slate-700 leading-tight flex gap-2 flex-wrap items-center">
                            {data.contactInfo.email && (
                                <>
                                    <span className="flex items-center gap-1">Email: {renderEditableText(data.contactInfo.email, val => setData({ ...data, contactInfo: { ...data.contactInfo, email: val } }), false, "inline-block", "")}</span>
                                    <span className="text-slate-400">|</span>
                                </>
                            )}
                            {data.contactInfo.phone && (
                                <>
                                    <span className="flex items-center gap-1">Phone: {renderEditableText(data.contactInfo.phone, val => setData({ ...data, contactInfo: { ...data.contactInfo, phone: val } }), false, "inline-block", "")}</span>
                                    <span className="text-slate-400">|</span>
                                </>
                            )}
                            {data.contactInfo.location && (
                                <span>{renderEditableText(data.contactInfo.location, val => setData({ ...data, contactInfo: { ...data.contactInfo, location: val } }), false, "inline-block", "")}</span>
                            )}
                        </div>
                    </div>

                    {/* Professional Summary */}
                    <div className="mb-7">
                        <h2 className="text-[11pt] font-bold border-b border-slate-900 mb-3 pb-1 tracking-tight uppercase">Professional Summary</h2>
                        <div className="text-[9.5pt] text-slate-800 leading-relaxed">
                            {renderEditableText(data.careerSummary, val => setData({ ...data, careerSummary: val }), true, "", "Professional summary goes here...")}
                        </div>
                    </div>

                    {/* Career Summary Timeline */}
                    <div className="mb-7">
                        <h2 className="text-[11pt] font-bold border-b border-slate-900 mb-3 pb-1 tracking-tight uppercase">Career Summary</h2>
                        <div className="space-y-2 text-[9.5pt] mb-4">
                            {data.timeline && data.timeline.length > 0 ? (
                                data.timeline.filter(t => t.type === 'work').map((item, i) => (
                                    <div key={i} className="flex gap-2 leading-snug">
                                        <span className="text-slate-900 font-bold">•</span>
                                        <div className="flex-1">
                                            <span className="font-medium text-slate-900">
                                                {item.period ? renderEditableText(item.period, val => {
                                                    const newT = [...data.timeline];
                                                    newT.find(t => t.id === item.id)!.period = val;
                                                    setData({ ...data, timeline: newT });
                                                }, false, "inline-block", "") : <span className="text-slate-400 italic text-[9pt]">Current</span>}
                                            </span>
                                            <span className="mx-1.5 text-slate-500">:</span>
                                            <span className="text-slate-900 font-semibold">
                                                {item.organization ? renderEditableText(item.organization, val => {
                                                    const newT = [...data.timeline];
                                                    newT.find(t => t.id === item.id)!.organization = val;
                                                    setData({ ...data, timeline: newT });
                                                }, false, "inline-block", "") : <span className="text-slate-400 italic text-[9pt]">Previous</span>}
                                            </span>
                                            {item.role && (
                                                <span className="text-slate-700">
                                                    {' '}{renderEditableText(item.role, val => {
                                                        const newT = [...data.timeline];
                                                        newT.find(t => t.id === item.id)!.role = val;
                                                        setData({ ...data, timeline: newT });
                                                    }, false, "inline-block", "")}
                                                </span>
                                            )}
                                            {item.duration && (
                                                <span className="text-slate-600 ml-1">
                                                    {renderEditableText(item.duration, val => {
                                                        const newT = [...data.timeline];
                                                        newT.find(t => t.id === item.id)!.duration = val;
                                                        setData({ ...data, timeline: newT });
                                                    }, false, "inline-block", "")}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-slate-400 italic text-[9pt]">No career timeline available</div>
                            )}
                        </div>

                        {/* Career Overview Stats */}
                        <div className="pt-3 border-t border-slate-200 text-[9pt] text-slate-700">
                            <div className="flex gap-5 flex-wrap">
                                {data.careerOverview.totalExperience && <span>Total Career: <strong className="text-slate-900">{data.careerOverview.totalExperience}</strong></span>}
                                {data.careerOverview.numberOfEmployers > 0 && <span>Number of Employers: <strong className="text-slate-900">{data.careerOverview.numberOfEmployers}</strong></span>}
                                {data.careerOverview.averageTenure && <span>Average Tenure: <strong className="text-slate-900">{data.careerOverview.averageTenure}</strong></span>}
                                {data.careerOverview.projectCount && <span>Current Position Duration: <strong className="text-slate-900">{data.careerOverview.projectCount}</strong></span>}
                            </div>
                        </div>

                        {/* Career Gaps Section - Only show if gaps exist and are explained */}
                        {data.careerGaps && data.careerGaps.length > 0 && data.careerGaps.some(g => g.isExplained) && (
                            <div className="mt-4 pt-3 border-t border-slate-200">
                                <div className="text-[9pt] font-semibold text-slate-700 mb-2">Career Notes:</div>
                                <div className="space-y-1.5">
                                    {data.careerGaps.filter(g => g.isExplained).map((gap, i) => (
                                        <div key={i} className="flex gap-2 text-[9pt] text-slate-700">
                                            <span className="text-slate-900 font-bold">•</span>
                                            <div className="flex-1">
                                                <span className="font-medium text-slate-900">
                                                    {activeTab === 'preview' ? gap.period : (
                                                        <input
                                                            className="border border-indigo-200 bg-indigo-50/50 rounded px-1.5 py-0.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-slate-800"
                                                            value={gap.period}
                                                            onChange={(e) => {
                                                                const newGaps = [...data.careerGaps];
                                                                newGaps[i].period = e.target.value;
                                                                setData({ ...data, careerGaps: newGaps });
                                                            }}
                                                            placeholder="Period"
                                                        />
                                                    )}
                                                </span>
                                                <span className="mx-1.5 text-slate-500">:</span>
                                                <span className="text-slate-700">
                                                    {activeTab === 'preview' ? gap.reason : (
                                                        <input
                                                            className="border border-indigo-200 bg-indigo-50/50 rounded px-1.5 py-0.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-slate-800"
                                                            value={gap.reason}
                                                            onChange={(e) => {
                                                                const newGaps = [...data.careerGaps];
                                                                newGaps[i].reason = e.target.value;
                                                                setData({ ...data, careerGaps: newGaps });
                                                            }}
                                                            placeholder="Reason"
                                                        />
                                                    )}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Work Experience */}
                    <div className="mb-8">
                        <h2 className="text-[11pt] font-bold border-b border-slate-900 mb-4 pb-1 tracking-tight uppercase">Work Experience</h2>

                        <div className="space-y-8">
                            {data.workExperience && data.workExperience.length > 0 ? (
                                data.workExperience.map((work, i) => (
                                    <div key={work.id} className="break-inside-avoid">
                                        {/* Company & Position Header */}
                                        <div className="mb-3">
                                            <div className="flex justify-between items-start mb-1">
                                                <h3 className="font-bold text-[10.5pt] text-slate-900 flex-1">
                                                    {activeTab === 'preview' ? (
                                                        <>
                                                            {work.company || <span className="text-slate-400 italic">Company Name</span>}
                                                            {' | '}
                                                            {work.position || <span className="text-slate-400 italic">Position</span>}
                                                        </>
                                                    ) : (
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                className="flex-1 border border-indigo-200 bg-indigo-50/50 rounded px-1.5 py-0.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-slate-800"
                                                                value={work.company}
                                                                onChange={(e) => {
                                                                    const newWork = [...(data.workExperience || [])];
                                                                    newWork[i].company = e.target.value;
                                                                    setData({ ...data, workExperience: newWork });
                                                                }}
                                                                placeholder="Company Name"
                                                            />
                                                            <span className="text-slate-500">|</span>
                                                            <input
                                                                className="flex-1 border border-indigo-200 bg-indigo-50/50 rounded px-1.5 py-0.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-slate-800"
                                                                value={work.position}
                                                                onChange={(e) => {
                                                                    const newWork = [...(data.workExperience || [])];
                                                                    newWork[i].position = e.target.value;
                                                                    setData({ ...data, workExperience: newWork });
                                                                }}
                                                                placeholder="Position"
                                                            />
                                                        </div>
                                                    )}
                                                </h3>
                                                {work.period && (
                                                    <span className="text-[9pt] italic text-slate-600 ml-4 whitespace-nowrap">
                                                        {renderEditableText(work.period, val => {
                                                            const newWork = [...(data.workExperience || [])];
                                                            newWork[i].period = val;
                                                            setData({ ...data, workExperience: newWork });
                                                        }, false, "", "Period")}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Responsibilities Section */}
                                        {work.responsibilities && work.responsibilities.length > 0 && (
                                            <div className="mb-3">
                                                <div className="font-bold text-[9pt] text-slate-900 mb-2">■ Responsibilities:</div>
                                                <ul className="space-y-1.5">
                                                    {work.responsibilities.map((resp, j) => (
                                                        <li key={j} className="flex gap-2 text-[9.5pt] text-slate-800 leading-relaxed ml-4">
                                                            <span className="text-slate-900 font-bold mt-0.5">•</span>
                                                            <div className="flex-1">
                                                                {renderEditableText(resp, val => {
                                                                    const newWork = [...(data.workExperience || [])];
                                                                    newWork[i].responsibilities[j] = val;
                                                                    setData({ ...data, workExperience: newWork });
                                                                }, true, "", "Responsibility")}
                                                            </div>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                ))
                            ) : (
                                data.projectPortfolio.representativeProjects.map((proj, i) => (
                                    <div key={i} className="break-inside-avoid">
                                        {/* Company Header */}
                                        <div className="mb-3">
                                            <div className="flex justify-between items-start mb-1">
                                                <h3 className="font-bold text-[11pt] text-slate-900 flex-1">
                                                    {proj.title ? renderEditableText(proj.title, val => {
                                                        const newProjs = [...data.projectPortfolio.representativeProjects];
                                                        newProjs[i].title = val;
                                                        setData({ ...data, projectPortfolio: { ...data.projectPortfolio, representativeProjects: newProjs } });
                                                    }, false, "", "") : <span className="text-slate-400 italic text-[10pt]">Company & Position</span>}
                                                </h3>
                                                {proj.period && (
                                                    <span className="text-[9pt] font-medium text-slate-700 ml-4">
                                                        {renderEditableText(proj.period, val => {
                                                            const newProjs = [...data.projectPortfolio.representativeProjects];
                                                            newProjs[i].period = val;
                                                            setData({ ...data, projectPortfolio: { ...data.projectPortfolio, representativeProjects: newProjs } });
                                                        }, false, "", "")}
                                                    </span>
                                                )}
                                            </div>
                                            {proj.context && (
                                                <div className="text-[9.5pt] text-slate-800 leading-relaxed">
                                                    {renderEditableText(proj.context, val => {
                                                        const newProjs = [...data.projectPortfolio.representativeProjects];
                                                        newProjs[i].context = val;
                                                        setData({ ...data, projectPortfolio: { ...data.projectPortfolio, representativeProjects: newProjs } });
                                                    }, true, "", "")}
                                                </div>
                                            )}
                                        </div>

                                        {/* Responsibilities Section */}
                                        {(proj.role || proj.teamStructure) && (
                                            <div className="mb-3">
                                                <div className="font-bold text-[9pt] text-slate-900 mb-1.5">■ Responsibilities:</div>
                                                {proj.role && (
                                                    <div className="text-[9.5pt] text-slate-800 mb-1 ml-4">
                                                        {renderEditableText(proj.role, val => {
                                                            const newProjs = [...data.projectPortfolio.representativeProjects];
                                                            newProjs[i].role = val;
                                                            setData({ ...data, projectPortfolio: { ...data.projectPortfolio, representativeProjects: newProjs } });
                                                        }, true, "", "")}
                                                    </div>
                                                )}
                                                {proj.teamStructure && (
                                                    <div className="text-[9.5pt] text-slate-800 ml-4">
                                                        {renderEditableText(proj.teamStructure || "", val => {
                                                            const newProjs = [...data.projectPortfolio.representativeProjects];
                                                            newProjs[i].teamStructure = val;
                                                            setData({ ...data, projectPortfolio: { ...data.projectPortfolio, representativeProjects: newProjs } });
                                                        }, true, "", "")}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Main Achievements Section */}
                                        {(proj.contribution || proj.challenges) && (
                                            <div className="mb-3">
                                                <div className="font-bold text-[9pt] text-slate-900 mb-1.5">■ Main Achievements:</div>
                                                {proj.contribution && (
                                                    <div className="text-[9.5pt] text-slate-800 mb-1 ml-4">
                                                        {renderEditableText(proj.contribution, val => {
                                                            const newProjs = [...data.projectPortfolio.representativeProjects];
                                                            newProjs[i].contribution = val;
                                                            setData({ ...data, projectPortfolio: { ...data.projectPortfolio, representativeProjects: newProjs } });
                                                        }, true, "", "")}
                                                    </div>
                                                )}
                                                {proj.challenges && (
                                                    <div className="text-[9.5pt] text-slate-800 ml-4">
                                                        {renderEditableText(proj.challenges || "", val => {
                                                            const newProjs = [...data.projectPortfolio.representativeProjects];
                                                            newProjs[i].challenges = val;
                                                            setData({ ...data, projectPortfolio: { ...data.projectPortfolio, representativeProjects: newProjs } });
                                                        }, true, "", "")}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Detailed Box: Challenge/Approach/Results */}
                                        {(proj.clientType || proj.theme || data.projectPortfolio.additionalEngagements) && (
                                            <div className="bg-slate-100 border border-slate-200 px-4 py-3 text-[9pt] leading-relaxed space-y-2">
                                                {proj.clientType && (
                                                    <div className="flex gap-2">
                                                        <span className="font-bold text-slate-900 min-w-20">Challenge:</span>
                                                        <span className="text-slate-800 flex-1">
                                                            {renderEditableText(proj.clientType || "", val => {
                                                                const newProjs = [...data.projectPortfolio.representativeProjects];
                                                                newProjs[i].clientType = val;
                                                                setData({ ...data, projectPortfolio: { ...data.projectPortfolio, representativeProjects: newProjs } });
                                                            }, false, "inline-block", "")}
                                                        </span>
                                                    </div>
                                                )}
                                                {proj.theme && (
                                                    <div className="flex gap-2">
                                                        <span className="font-bold text-slate-900 min-w-20">Approach:</span>
                                                        <span className="text-slate-800 flex-1">
                                                            {renderEditableText(proj.theme || "", val => {
                                                                const newProjs = [...data.projectPortfolio.representativeProjects];
                                                                newProjs[i].theme = val;
                                                                setData({ ...data, projectPortfolio: { ...data.projectPortfolio, representativeProjects: newProjs } });
                                                            }, false, "inline-block", "")}
                                                        </span>
                                                    </div>
                                                )}
                                                {data.projectPortfolio.additionalEngagements && (
                                                    <div className="flex gap-2">
                                                        <span className="font-bold text-slate-900 min-w-20">Results:</span>
                                                        <span className="text-slate-800 flex-1">
                                                            {renderEditableText(data.projectPortfolio.additionalEngagements, val => setData({ ...data, projectPortfolio: { ...data.projectPortfolio, additionalEngagements: val } }), false, "inline-block", "")}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Education Section */}
                    {data.education && data.education.length > 0 && (
                        <div className="mb-8">
                            <h2 className="text-[11pt] font-bold border-b border-slate-900 mb-4 pb-1 tracking-tight uppercase">Education</h2>
                            <div className="space-y-4">
                                {data.education.map((edu, i) => (
                                    <div key={edu.id} className="break-inside-avoid">
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                                <h3 className="font-bold text-[10pt] text-slate-900">
                                                    {edu.degree ? renderEditableText(edu.degree, val => {
                                                        const newEdu = [...(data.education || [])];
                                                        newEdu[i].degree = val;
                                                        setData({ ...data, education: newEdu });
                                                    }, false, "", "Degree") : <span className="text-slate-400 italic">Degree</span>}
                                                </h3>
                                                <div className="text-[9.5pt] text-slate-700">
                                                    {edu.institution ? renderEditableText(edu.institution, val => {
                                                        const newEdu = [...(data.education || [])];
                                                        newEdu[i].institution = val;
                                                        setData({ ...data, education: newEdu });
                                                    }, false, "", "Institution") : <span className="text-slate-400 italic">Institution</span>}
                                                </div>
                                            </div>
                                            {edu.period && (
                                                <span className="text-[9pt] italic text-slate-600 ml-4">
                                                    {renderEditableText(edu.period, val => {
                                                        const newEdu = [...(data.education || [])];
                                                        newEdu[i].period = val;
                                                        setData({ ...data, education: newEdu });
                                                    }, false, "", "Period")}
                                                </span>
                                            )}
                                        </div>
                                        {edu.notes && (
                                            <div className="text-[9pt] text-slate-600 mt-1 ml-2">
                                                {renderEditableText(edu.notes, val => {
                                                    const newEdu = [...(data.education || [])];
                                                    newEdu[i].notes = val;
                                                    setData({ ...data, education: newEdu });
                                                }, false, "", "Notes")}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Skills Section */}
                    {data.skills && data.skills.length > 0 && (
                        <div className="mb-8">
                            <h2 className="text-[11pt] font-bold border-b border-slate-900 mb-4 pb-1 tracking-tight uppercase">Skills</h2>
                            <div className="flex flex-wrap gap-2">
                                {data.skills.map((skill, i) => (
                                    <div key={i} className="inline-flex items-center">
                                        {activeTab === 'preview' ? (
                                            <span className="px-3 py-1 bg-slate-100 text-slate-800 text-[9pt] rounded-md border border-slate-200">
                                                {skill}
                                            </span>
                                        ) : (
                                            <input
                                                className="px-3 py-1 border border-indigo-200 bg-indigo-50/50 rounded-md text-[9pt] focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-slate-800"
                                                value={skill}
                                                onChange={(e) => {
                                                    const newSkills = [...(data.skills || [])];
                                                    newSkills[i] = e.target.value;
                                                    setData({ ...data, skills: newSkills });
                                                }}
                                                placeholder="Skill"
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Certifications Section */}
                    {data.certifications && data.certifications.length > 0 && (
                        <div className="mb-8">
                            <h2 className="text-[11pt] font-bold border-b border-slate-900 mb-4 pb-1 tracking-tight uppercase">Certifications</h2>
                            <div className="space-y-2">
                                {data.certifications.map((cert, i) => (
                                    <div key={i} className="flex gap-2 text-[9.5pt] text-slate-800">
                                        <span className="text-slate-900 font-bold">•</span>
                                        <div className="flex-1">
                                            {renderEditableText(cert, val => {
                                                const newCerts = [...(data.certifications || [])];
                                                newCerts[i] = val;
                                                setData({ ...data, certifications: newCerts });
                                            }, false, "", "Certification")}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
