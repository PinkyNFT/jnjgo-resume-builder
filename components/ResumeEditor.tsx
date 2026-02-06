'use client';

import React, { useState } from 'react';
import { ResumeData, Project, EvaluationResult } from '../types';
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
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    rows={Math.max(2, value.split('\n').length)}
                    placeholder={placeholder}
                />
            );
        }
        return (
            <input
                className={`w-full border border-indigo-200 bg-indigo-50/50 rounded px-1.5 py-0.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-slate-800 ${className}`}
                value={value}
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
                                    <ScoreBar
                                        label="Reproducibility"
                                        score={evaluation.breakdown.reproducibility}
                                        max={25}
                                        colorClass="bg-indigo-500"
                                        description="Decision making rationale, process clarity, individual contribution."
                                    />
                                    <ScoreBar
                                        label="Role Fit"
                                        score={evaluation.breakdown.roleFit}
                                        max={15}
                                        colorClass="bg-violet-500"
                                        description="Alignment with the specific expectations of the target role."
                                    />
                                    <ScoreBar
                                        label="Risk"
                                        score={evaluation.breakdown.riskHandling}
                                        max={10}
                                        colorClass="bg-rose-500"
                                        description="Handling of career gaps (>90 days) and red flags."
                                    />
                                </div>

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

                {data.careerGaps.some(g => !g.isExplained) && (
                    <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start gap-3 shadow-sm">
                        <div className="p-1.5 bg-amber-100 rounded-full text-amber-600 shrink-0">
                            <AlertTriangle className="w-4 h-4" />
                        </div>
                        <div>
                            <h4 className="font-bold text-amber-900 text-sm">Timeline Gap Detected</h4>
                            <p className="text-xs text-amber-700 mt-1 leading-relaxed">A master resume must have a continuous timeline. Please explain the gap.</p>
                        </div>
                    </div>
                )}
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

                    {/* Career Summary */}
                    <div className="mb-7">
                        <h2 className="text-[11pt] font-bold border-b border-slate-900 mb-3 pb-1 tracking-tight uppercase">Career Summary</h2>
                        <div className="space-y-2 text-[9.5pt]">
                            {data.timeline.filter(t => t.type === 'work').map((item, i) => (
                                <div key={i} className="flex gap-2.5 leading-snug">
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
                            ))}
                        </div>

                        {/* Career Overview Stats */}
                        <div className="mt-4 pt-3 border-t border-slate-200 text-[9pt] text-slate-700">
                            <div className="flex gap-5 flex-wrap">
                                {data.careerOverview.totalExperience && <span>Total Career: <strong className="text-slate-900">{data.careerOverview.totalExperience}</strong></span>}
                                {data.careerOverview.numberOfEmployers > 0 && <span>Total Employers: <strong className="text-slate-900">{data.careerOverview.numberOfEmployers}</strong></span>}
                                {data.careerOverview.averageTenure && <span>Average Tenure: <strong className="text-slate-900">{data.careerOverview.averageTenure}</strong></span>}
                                {data.careerOverview.projectCount && <span>Current Tenure: <strong className="text-slate-900">{data.careerOverview.projectCount}</strong></span>}
                            </div>

                            {/* Work Experience */}
                            <div className="mb-8">
                                <h2 className="text-[11pt] font-bold border-b border-slate-900 mb-4 pb-1 tracking-tight uppercase">Work Experience</h2>

                                <div className="space-y-6">
                                    {data.projectPortfolio.representativeProjects.map((proj, i) => (
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
                                    ))}
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
