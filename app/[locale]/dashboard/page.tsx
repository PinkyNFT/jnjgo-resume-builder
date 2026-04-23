'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useTranslations, useLocale } from 'next-intl';
import { useSession } from 'next-auth/react';
import { Loader2 as DynLoader } from 'lucide-react';

// Lazily loaded — only pulled into the bundle when the user actually reaches
// that step. Keeps the initial dashboard chunk small.
const InterviewView = dynamic(
  () => import('../../../components/InterviewView').then(m => ({ default: m.InterviewView })),
  { ssr: false, loading: () => <div className="flex items-center justify-center h-64"><DynLoader className="w-8 h-8 animate-spin text-indigo-400" /></div> }
);
const ResumeEditor = dynamic(
  () => import('../../../components/ResumeEditor').then(m => ({ default: m.ResumeEditor })),
  { ssr: false, loading: () => <div className="flex items-center justify-center h-64"><DynLoader className="w-8 h-8 animate-spin text-indigo-400" /></div> }
);
const ResumeGeneratingView = dynamic(
  () => import('../../../components/ResumeGeneratingView').then(m => ({ default: m.ResumeGeneratingView })),
  { ssr: false, loading: () => <div className="flex items-center justify-center h-64"><DynLoader className="w-8 h-8 animate-spin text-indigo-400" /></div> }
);
import { Message, ResumeData, Project, RoleType, ImportData, UserProfile } from '../../../types';
import { useParseResume, useAnalyzeImport } from '../../../hooks/useGemini';
import { getProjects, getProject, saveProject, deleteProject, createNewProject, getUserProfile, saveUserProfile, createVersion } from '../../../services/storageService';
import { migrateFromLocalStorage, isMigrationCompleted } from '../../../utils/dataMigration';
import { Loader2, ArrowRight, Plus, FileText, Clock, Trash2, Edit3, Eye, UploadCloud, File, User, MapPin, Mail, Phone, Linkedin, FolderOpen, CheckCircle, PenLine, BarChart3, Shield, UserCircle, Share2, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from '../../../lib/toast';
import JobMatchingSection from '../../../components/JobMatchingSection';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import AppNavbar from '../../../components/navigation/AppNavbar';
import { DashboardSkeleton } from '../../../components/navigation/Skeletons';
import Dropzone from 'react-dropzone';

// --- Sub-Components ---

type Step = 'dashboard' | 'setup' | 'personal_info' | 'interview' | 'generating' | 'editor';

const EmptyState = ({ onStart }: { onStart: () => void }) => {
  const t = useTranslations('Dashboard');
  return (
    <div className="text-center max-w-lg mx-auto space-y-8 py-16 md:py-24 px-4 sm:px-6 page-transition">
      <div className="relative w-24 h-24 mx-auto">
        <div className="absolute inset-0 bg-indigo-100 rounded-3xl rotate-6 opacity-60" />
        <div className="relative w-24 h-24 bg-linear-to-br from-indigo-50 to-purple-50 rounded-3xl flex items-center justify-center shadow-sm border border-indigo-100/50">
          <FolderOpen className="w-12 h-12 text-indigo-400" />
        </div>
      </div>
      <div className="space-y-3">
        <h2 className="text-3xl font-black text-slate-900">{t('emptyTitle')}</h2>
        <p className="text-slate-500 leading-relaxed max-w-sm mx-auto">{t('emptyDesc')}</p>
      </div>
      <button
        onClick={onStart}
        className="group inline-flex items-center justify-center px-8 py-4 font-bold text-white text-lg transition-all duration-300 bg-slate-900 rounded-2xl hover:bg-indigo-600 hover:shadow-2xl hover:shadow-indigo-500/25 hover:-translate-y-1"
      >
        <Sparkles className="w-5 h-5 mr-2 group-hover:rotate-12 transition-transform" />
        {t('startNew')}
        <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
      </button>
    </div>
  );
};

const StatsCards = ({ projects }: { projects: Project[] }) => {
  const t = useTranslations('Dashboard');
  const total = projects.length;
  const completed = projects.filter(p => p.status === 'completed' || p.status === 'generated').length;
  const inProgress = projects.filter(p => p.status === 'interviewing' || p.status === 'draft').length;
  const avgScore = projects.filter(p => p.evaluation?.totalScore).reduce((acc, p) => acc + (p.evaluation?.totalScore || 0), 0) / (projects.filter(p => p.evaluation?.totalScore).length || 1);

  const stats = [
    { label: t('statTotal'), value: total, icon: FileText, color: 'bg-indigo-50 text-indigo-600', border: 'border-indigo-100', gradient: 'from-indigo-500 to-indigo-600' },
    { label: t('statCompleted'), value: completed, icon: CheckCircle, color: 'bg-emerald-50 text-emerald-600', border: 'border-emerald-100', gradient: 'from-emerald-500 to-emerald-600' },
    { label: t('statInProgress'), value: inProgress, icon: PenLine, color: 'bg-amber-50 text-amber-600', border: 'border-amber-100', gradient: 'from-amber-500 to-amber-600' },
    { label: t('statAvgScore'), value: projects.filter(p => p.evaluation?.totalScore).length > 0 ? Math.round(avgScore) : '—', icon: BarChart3, color: 'bg-purple-50 text-purple-600', border: 'border-purple-100', gradient: 'from-purple-500 to-purple-600' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
      {stats.map((stat, i) => (
        <div key={i} className={`group bg-white rounded-xl border ${stat.border} p-5 flex items-center gap-4 card-hover cursor-default`}>
          <div className={`w-11 h-11 rounded-xl ${stat.color} flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-110`}>
            <stat.icon className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 tabular-nums">{stat.value}</div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{stat.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
};

const ProjectCard = ({ project, locale, onOpen, onDelete }: { project: Project, locale: string, onOpen: () => void, onDelete: () => void }) => {
  const t = useTranslations('Dashboard');
  const tCommon = useTranslations('Common');
  const isCompleted = project.status === 'completed' || project.status === 'generated';
  const score = project.evaluation?.totalScore || 0;

  const statusConfig = isCompleted
    ? { label: t('statusComplete'), color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' }
    : { label: t('statusDraft'), color: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' };

  return (
    <div
      onClick={onOpen}
      className="group bg-white rounded-2xl border border-slate-200/80 p-6 hover:shadow-xl hover:shadow-slate-200/50 hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col h-full relative overflow-hidden"
    >
      {/* Subtle gradient accent on hover */}
      <div className={`absolute top-0 left-0 right-0 h-1 transition-opacity duration-300 opacity-0 group-hover:opacity-100 bg-linear-to-r ${isCompleted ? 'from-emerald-400 to-teal-400' : 'from-indigo-400 to-purple-400'}`} />

      {/* Top row: icon + status + delete */}
      <div className="flex justify-between items-start mb-5">
        <div className={`p-3 rounded-xl transition-all duration-200 group-hover:scale-105 ${isCompleted ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'}`}>
          <FileText className="w-6 h-6" />
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full font-semibold border ${statusConfig.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`}></span>
            {statusConfig.label}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-all duration-200"
            title={tCommon('delete')}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Title */}
      <h3 className="font-bold text-slate-800 text-lg mb-2 line-clamp-1 group-hover:text-indigo-700 transition-colors duration-200">{project.title}</h3>

      {/* Role tag */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-[10px] px-2.5 py-1 rounded-md bg-slate-50 text-slate-600 uppercase font-bold tracking-wider border border-slate-200">
          {t(`roleType.${project.roleType}` as const)}
        </span>
        {isCompleted && project.evaluation && (
          <span className={`text-[10px] px-2.5 py-1 rounded-md font-bold tracking-wider border ${score >= 80 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
            SCORE: {score}
          </span>
        )}
      </div>

      {/* Score bar (if available) */}
      {isCompleted && project.evaluation && (
        <div className="mb-4">
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${score >= 80 ? 'bg-emerald-500' : score >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
              style={{ width: `${Math.min(score, 100)}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Timestamp */}
      <p className="text-xs text-slate-400 flex items-center gap-1.5 mb-6 font-medium">
        <Clock className="w-3.5 h-3.5" />
        {t('lastUpdated', { date: new Date(project.updatedAt).toLocaleDateString() })}
      </p>

      {/* Action button(s) */}
      <div className="mt-auto">
        {isCompleted ? (
          <div className="flex gap-2">
            <button
              onClick={onOpen}
              className="flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all duration-200 bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200 active:scale-[0.98]"
            >
              <Eye className="w-4 h-4" /> {t('openEditor')}
            </button>
            <Link
              href={`/${locale}/export?projectId=${project.id}`}
              onClick={(e) => e.stopPropagation()}
              className="px-4 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all duration-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 active:scale-[0.98]"
              title="Export to job sites"
            >
              <Share2 className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <button className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all duration-200 bg-slate-900 text-white hover:bg-indigo-600 shadow-md hover:shadow-lg active:scale-[0.98]">
            <Edit3 className="w-4 h-4" /> {t('continueEditing')}
          </button>
        )}
      </div>
    </div>
  );
};

const SetupView = ({ onComplete, onCancel }: { onComplete: (role: RoleType, importData?: ImportData) => void, onCancel: () => void }) => {
  const t = useTranslations('Setup');
  const tCommon = useTranslations('Common');
  const locale = useLocale();
  const [role, setRole] = useState<RoleType>('consultant');
  const [importText, setImportText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const analyzeImportMutation = useAnalyzeImport();

  const handleStart = async () => {
    if (importText.trim().length > 20) {
      setIsAnalyzing(true);
      try {
        const data = await analyzeImportMutation.mutateAsync({ text: importText, locale });
        onComplete(role, data);
      } catch {
        toast.warning("Couldn't read the imported file — starting fresh.");
        onComplete(role, undefined);
      } finally {
        setIsAnalyzing(false);
      }
    } else {
      onComplete(role, undefined);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-8 md:py-12 px-4 sm:px-6 page-transition">
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold mb-4">
          <Sparkles className="w-3 h-3" /> Step 1 of 3
        </div>
        <h2 className="text-3xl font-black text-slate-900">{t('title')}</h2>
      </div>

      <div className="space-y-8 bg-white p-5 sm:p-8 md:p-10 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100">
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-4 uppercase tracking-wide">{t('selectRole')}</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => setRole('consultant')}
              className={`p-6 rounded-2xl border-2 text-left transition-all duration-200 ${role === 'consultant' ? 'border-indigo-600 bg-indigo-50/50 text-indigo-900 ring-4 ring-indigo-500/10 shadow-sm' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}
            >
              <div className="font-bold text-lg mb-1">{t('roleConsultant')}</div>
              <div className="text-xs text-indigo-600/80 font-medium">{t('roleConsultantDesc')}</div>
            </button>
            <button
              onClick={() => setRole('senior_engineer')}
              className={`p-6 rounded-2xl border-2 text-left transition-all duration-200 ${role === 'senior_engineer' ? 'border-indigo-600 bg-indigo-50/50 text-indigo-900 ring-4 ring-indigo-500/10 shadow-sm' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}
            >
              <div className="font-bold text-lg mb-1">{t('roleEngineer')}</div>
              <div className="text-xs text-indigo-600/80 font-medium">{t('roleEngineerDesc')}</div>
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-3 uppercase tracking-wide flex items-center gap-2">
            <UploadCloud className="w-4 h-4" /> {t('importTitle')}
          </label>
          <p className="text-sm text-slate-500 mb-4 bg-slate-50 p-3 rounded-xl border border-slate-200">
            {t('importDesc')} You can upload a PDF/Word file or paste text directly.
          </p>

          <Dropzone
            onDrop={async (acceptedFiles) => {
              if (acceptedFiles.length === 0) return;
              const file = acceptedFiles[0];
              setIsUploading(true);
              setUploadError('');

              try {
                const formData = new FormData();
                formData.append('file', file);

                const response = await fetch('/api/extract-file', {
                  method: 'POST',
                  body: formData,
                });

                const result = await response.json();

                if (!response.ok) {
                  throw new Error(result.error || 'Failed to extract text from file.');
                }

                if (result.text) {
                  setImportText(result.text);
                }
              } catch (err: any) {
                setUploadError(err.message || 'An error occurred while uploading. Please ensure your file is a valid PDF or DOCX under 5MB.');
                console.error('File upload error:', err);
              } finally {
                setIsUploading(false);
              }
            }}
            accept={{
              'application/pdf': ['.pdf'],
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
              'application/msword': ['.doc']
            }}
            maxSize={5 * 1024 * 1024} // 5MB limit
            multiple={false}
          >
            {({ getRootProps, getInputProps, isDragActive, isDragReject }) => (
              <div
                {...getRootProps()}
                className={`w-full mb-4 p-6 rounded-xl border-2 border-dashed text-center cursor-pointer transition-colors ${isDragActive ? 'border-indigo-500 bg-indigo-50 text-indigo-700' :
                    isDragReject ? 'border-red-500 bg-red-50 text-red-700' :
                      'border-slate-300 hover:border-slate-400 bg-slate-50/50 hover:bg-slate-100/50 text-slate-500'
                  }`}
              >
                <input {...getInputProps()} />
                {isUploading ? (
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                    <p className="text-sm font-semibold text-slate-700">Extracting text...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <File className={`w-8 h-8 ${isDragActive ? 'text-indigo-500' : 'text-slate-400'}`} />
                    <p className="text-sm font-semibold">
                      {isDragActive ? "Drop the file here" : "Drag & drop a PDF or Word file here, or click to select"}
                    </p>
                    <p className="text-xs opacity-75">Maximum size: 5MB</p>
                  </div>
                )}
              </div>
            )}
          </Dropzone>

          {uploadError && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm font-medium rounded-lg border border-red-200 flex items-start gap-2">
              <Shield className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <span>{uploadError}</span>
            </div>
          )}

          <textarea
            className="w-full h-48 p-4 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all placeholder:text-slate-400 bg-slate-50/50 focus:bg-white resize-none"
            placeholder={t('importPlaceholder')}
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
          />
        </div>

        <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-6 border-t border-slate-100">
          <button onClick={onCancel} className="px-6 py-3 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition-all duration-200">{tCommon('cancel')}</button>
          <button
            onClick={handleStart}
            disabled={isAnalyzing}
            className="group px-8 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-indigo-600 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isAnalyzing ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> {t('analyzing')}</>
            ) : (
              <><ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" /> {t('startInterview')}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

const PersonalInfoView = ({ initialProfile, onComplete, onBack }: { initialProfile: UserProfile | null, onComplete: (profile: UserProfile) => void, onBack: () => void }) => {
  const t = useTranslations('PersonalInfo');
  const tCommon = useTranslations('Common');
  const [profile, setProfile] = useState<UserProfile>(initialProfile || { fullName: '', email: '', phone: '', location: '', linkedin: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await saveUserProfile(profile);
      onComplete(profile);
    } catch (error) {
      console.error('Failed to save profile:', error);
      toast.error('Failed to save profile. Please try again.');
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8 md:py-12 px-4 sm:px-6 page-transition">
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold mb-4">
          <User className="w-3 h-3" /> Step 2 of 3
        </div>
        <h2 className="text-3xl font-black text-slate-900 mb-2">{t('title')}</h2>
        <p className="text-slate-500">{t('subtitle')}</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-5 sm:p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="col-span-full">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">{t('fullName')}</label>
            <div className="relative">
              <User className="w-5 h-5 absolute left-3 top-3.5 text-slate-400" />
              <input
                required
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all font-medium"
                placeholder="Taro Yamada"
                value={profile.fullName}
                onChange={e => setProfile({ ...profile, fullName: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">{t('email')}</label>
            <div className="relative">
              <Mail className="w-5 h-5 absolute left-3 top-3.5 text-slate-400" />
              <input
                required
                type="email"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all font-medium"
                placeholder="taro@example.com"
                value={profile.email}
                onChange={e => setProfile({ ...profile, email: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">{t('phone')}</label>
            <div className="relative">
              <Phone className="w-5 h-5 absolute left-3 top-3.5 text-slate-400" />
              <input
                required
                type="tel"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all font-medium"
                placeholder="090-1234-5678"
                value={profile.phone}
                onChange={e => setProfile({ ...profile, phone: e.target.value })}
              />
            </div>
          </div>

          <div className="col-span-full">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">{t('address')}</label>
            <div className="relative">
              <MapPin className="w-5 h-5 absolute left-3 top-3.5 text-slate-400" />
              <input
                required
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all font-medium"
                placeholder="Tokyo, Japan"
                value={profile.location}
                onChange={e => setProfile({ ...profile, location: e.target.value })}
              />
            </div>
          </div>

          <div className="col-span-full">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">{t('linkedin')}</label>
            <div className="relative">
              <Linkedin className="w-5 h-5 absolute left-3 top-3.5 text-slate-400" />
              <input
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all font-medium"
                placeholder="linkedin.com/in/..."
                value={profile.linkedin || ''}
                onChange={e => setProfile({ ...profile, linkedin: e.target.value })}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-6 border-t border-slate-100">
          <button type="button" onClick={onBack} className="px-6 py-3 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition-all">{tCommon('back')}</button>
          <button type="submit" className="px-8 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 shadow-lg transition-all flex items-center justify-center gap-2">
            {t('confirmStart')} <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};

// --- Main Page Component ---

export default function Page() {
  const t = useTranslations('Dashboard');
  const tCommon = useTranslations('Common');
  const locale = useLocale();
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const [step, setStep] = useState<Step>('dashboard');
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Redirect recruiters to their own dashboard
  useEffect(() => {
    if (sessionStatus === 'authenticated') {
      if (session?.user?.role === 'recruiter') {
        router.replace(`/${locale}/recruiter/dashboard`);
      } else if (session?.user?.role === 'pending_recruiter') {
        router.replace(`/${locale}/auth/pending-approval`);
      } else if (!session?.user?.role) {
        // Redirect users without a role to role selection
        router.replace(`/${locale}/auth/select-role?callbackUrl=/dashboard`);
      }
    }
  }, [sessionStatus, session, router, locale]);

  // Temp storage for setup data before project creation
  const [setupData, setSetupData] = useState<{ role: RoleType, importData?: ImportData } | null>(null);
  // Delete confirmation state
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Initialize the parse resume mutation at the component level
  const parseResumeMutation = useParseResume();

  // Load projects and profile on mount
  useEffect(() => {
    const initializeData = async () => {
      setIsLoading(true);
      try {
        // Check for and run migration if needed
        if (!isMigrationCompleted()) {
          console.log('Detecting legacy data, starting migration...');
          const migrationResult = await migrateFromLocalStorage();
          if (migrationResult.success) {
            console.log(`✅ Migration completed: ${migrationResult.projectsMigrated} projects, profile: ${migrationResult.profileMigrated}`);
          } else {
            console.error('Migration encountered errors:', migrationResult.errors);
          }
        }

        // Load data from database
        await Promise.all([
          refreshProjects(),
          loadUserProfile()
        ]);
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    initializeData();
  }, []);

  const loadUserProfile = async () => {
    try {
      const profile = await getUserProfile();
      setUserProfile(profile);
    } catch (error) {
      console.error('Failed to load profile:', error);
    }
  };

  const refreshProjects = async () => {
    try {
      const loadedProjects = await getProjects();
      setProjects(loadedProjects.sort((a, b) => b.updatedAt - a.updatedAt));
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  };

  const handleStartSetup = () => {
    setStep('setup');
  };

  const handleSetupComplete = (role: RoleType, importData?: ImportData) => {
    setSetupData({ role, importData });
    setStep('personal_info');
  };

  const handlePersonalInfoComplete = async (profile: UserProfile) => {
    if (!setupData) return;

    try {
      const newProject = createNewProject(setupData.role, setupData.importData, profile);
      await saveProject(newProject);
      await refreshProjects();
      setCurrentProject(newProject);
      setStep('interview');
    } catch (error) {
      console.error('Failed to create project:', error);
      toast.error('Failed to create project. Please try again.');
    }
  };

  const handleOpenProject = async (project: Project) => {
    // Fetch full project data (with history & resume data) on demand
    const fullProject = await getProject(project.id);
    if (!fullProject) {
      toast.error('Failed to load project. Please try again.');
      return;
    }
    setCurrentProject(fullProject);
    if (fullProject.status === 'completed' || fullProject.status === 'generated') {
      setStep('editor');
    } else {
      setStep('interview');
    }
  };

  const handleDeleteProject = (id: string) => {
    setConfirmDeleteId(id);
  };

  const handleConfirmDelete = async () => {
    if (!confirmDeleteId) return;
    const id = confirmDeleteId;
    setConfirmDeleteId(null);
    try {
      await deleteProject(id);
      setProjects(prev => prev.filter(p => p.id !== id));
      toast.success('Resume deleted.');
    } catch (error) {
      console.error('Failed to delete project:', error);
      toast.error('Failed to delete project. Please try again.');
    }
  };

  const handleSaveInterview = async (history: Message[]) => {
    if (currentProject) {
      try {
        const updatedProject = {
          ...currentProject,
          history: history,
          updatedAt: Date.now(),
          status: 'interviewing' as const
        };
        await saveProject(updatedProject);
        await refreshProjects();
        setCurrentProject(updatedProject);
      } catch (error) {
        console.error('Failed to save interview:', error);
      }
    }
  };

  // Track generating error state
  const [generatingError, setGeneratingError] = useState<string | null>(null);
  // Track the history used for generation so we can retry/cancel
  const [generatingHistory, setGeneratingHistory] = useState<Message[] | null>(null);

  const handleFinishInterview = async (history: Message[]) => {
    await handleSaveInterview(history);
    setGeneratingError(null);
    setGeneratingHistory(history);
    setStep('generating');

    try {
      const data = await parseResumeMutation.mutateAsync({
        history,
        importData: currentProject?.importData,
        locale,
      });

      // Merge known personal info back if somehow lost (though AI prompt should keep it, safety first)
      if (currentProject?.data?.fullName) {
        data.fullName = currentProject.data.fullName;
        data.contactInfo = { ...data.contactInfo, ...currentProject.data.contactInfo };
      }

      if (currentProject) {
        const updatedProject: Project = {
          ...currentProject,
          history: history,
          data: data,
          status: 'generated',
          updatedAt: Date.now(),
          title: (currentProject.title.includes('Untitled') || currentProject.title.includes('Imported')) && data.currentRole
            ? `${data.currentRole} Resume`
            : currentProject.title
        };
        await saveProject(updatedProject);
        // Auto-version on initial generation
        await createVersion(
          updatedProject.id,
          `Initial Generation — ${new Date().toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
          'auto_generated',
          data
        );
        await refreshProjects();
        setCurrentProject(updatedProject);
      }
      setStep('editor');
    } catch (error: any) {
      console.error(error);
      setGeneratingError(error?.message || 'Something went wrong generating the resume. Please try again.');
    }
  };

  const handleCancelGeneration = () => {
    setGeneratingError(null);
    setGeneratingHistory(null);
    setStep('interview');
  };

  const handleUpdateProjectData = async (data: ResumeData) => {
    if (currentProject) {
      try {
        const updatedProject = {
          ...currentProject,
          data,
          updatedAt: Date.now()
        };
        await saveProject(updatedProject);
        await refreshProjects();
        setCurrentProject(updatedProject);
      } catch (error) {
        console.error('Failed to update project:', error);
        toast.error('Failed to save changes. Please try again.');
      }
    }
  };

  const handleResumeInterview = async () => {
    if (!currentProject || !currentProject.data) return;

    try {
      // Auto-save the current resume as a version before returning to interview
      await createVersion(
        currentProject.id,
        `Pre-Interview — ${new Date().toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
        'auto_pre_interview',
        currentProject.data,
        currentProject.evaluation
      );

      // Update project status back to interviewing
      const updatedProject: Project = {
        ...currentProject,
        status: 'interviewing',
        updatedAt: Date.now(),
      };
      await saveProject(updatedProject);
      await refreshProjects();
      setCurrentProject(updatedProject);
      setStep('interview');
    } catch (error) {
      console.error('Failed to resume interview:', error);
      toast.error('Failed to resume interview. Please try again.');
    }
  };

  const [isAdmin, setIsAdmin] = useState(false);

  // Check admin status
  useEffect(() => {
    if (session?.user) {
      fetch('/api/admin/check')
        .then(res => res.json())
        .then(data => setIsAdmin(data.isAdmin))
        .catch(() => { });
    }
  }, [session]);

  return (
    <div className="font-sans text-slate-900 bg-slate-50 min-h-screen">
      {isLoading ? (
        <DashboardSkeleton />
      ) : (
        <>
          {step === 'dashboard' && (
            <div className="animate-in fade-in duration-500">
              {/* Shared navigation */}
              <AppNavbar isAdmin={isAdmin} />

              <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-24 md:pb-20">
                {projects.length === 0 ? (
                  <EmptyState onStart={handleStartSetup} />
                ) : (
                  <div className="py-8 space-y-8">
                    {/* Welcome banner */}
                    <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-slate-900 via-indigo-950 to-slate-900 p-6 md:p-8">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
                      <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4" />
                      <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="space-y-1">
                          <h1 className="text-2xl md:text-3xl font-bold text-white">
                            {t('welcomeBack')}{session?.user?.name ? `, ${session.user.name.split(' ')[0]}` : ''} 👋
                          </h1>
                          <p className="text-slate-400 text-sm md:text-base">{t('manageResumes')}</p>
                        </div>
                        <button
                          onClick={handleStartSetup}
                          className="group flex items-center justify-center gap-2 px-6 py-3 bg-white text-slate-900 rounded-xl hover:bg-indigo-50 transition-all font-bold text-sm shadow-lg hover:-translate-y-0.5 shrink-0 w-full md:w-auto"
                        >
                          <Plus className="w-4 h-4" /> {t('createNewProject')}
                          <ArrowRight className="w-4 h-4 opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all" />
                        </button>
                      </div>
                    </div>

                    {/* Quick Actions row */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 stagger-children">
                      <button
                        onClick={handleStartSetup}
                        className="group bg-white rounded-xl border border-slate-200 p-4 text-left hover:border-indigo-200 hover:shadow-md hover:-translate-y-0.5 transition-all"
                      >
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center mb-3 group-hover:bg-indigo-100 transition-colors">
                          <Plus className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div className="text-sm font-bold text-slate-800">{t('createNewProject')}</div>
                        <div className="text-xs text-slate-500 mt-0.5">AI-guided interview</div>
                      </button>

                      <Link
                        href={`/${locale}/profile/private`}
                        className="group bg-white rounded-xl border border-slate-200 p-4 text-left hover:border-purple-200 hover:shadow-md hover:-translate-y-0.5 transition-all"
                      >
                        <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center mb-3 group-hover:bg-purple-100 transition-colors">
                          <UserCircle className="w-5 h-5 text-purple-600" />
                        </div>
                        <div className="text-sm font-bold text-slate-800">Recruiter Profile</div>
                        <div className="text-xs text-slate-500 mt-0.5">Private conditions</div>
                      </Link>

                      {projects.filter(p => p.status === 'completed' || p.status === 'generated').length > 0 && (
                        <Link
                          href={`/${locale}/export?projectId=${projects.find(p => p.status === 'completed' || p.status === 'generated')?.id}`}
                          className="group bg-white rounded-xl border border-slate-200 p-4 text-left hover:border-green-200 hover:shadow-md hover:-translate-y-0.5 transition-all"
                        >
                          <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center mb-3 group-hover:bg-green-100 transition-colors">
                            <Share2 className="w-5 h-5 text-green-600" />
                          </div>
                          <div className="text-sm font-bold text-slate-800">Export Resume</div>
                          <div className="text-xs text-slate-500 mt-0.5">Job site formats</div>
                        </Link>
                      )}

                      {isAdmin && (
                        <Link
                          href={`/${locale}/admin`}
                          className="group bg-white rounded-xl border border-slate-200 p-4 text-left hover:border-amber-200 hover:shadow-md hover:-translate-y-0.5 transition-all"
                        >
                          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center mb-3 group-hover:bg-amber-100 transition-colors">
                            <Shield className="w-5 h-5 text-amber-600" />
                          </div>
                          <div className="text-sm font-bold text-slate-800">Admin Panel</div>
                          <div className="text-xs text-slate-500 mt-0.5">Settings & users</div>
                        </Link>
                      )}
                    </div>

                    {/* Stats */}
                    <StatsCards projects={projects} />

                    {/* Projects list */}
                    <div className="space-y-5">
                      <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold text-slate-800">{t('myResumes')}</h2>
                        <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full tabular-nums">{projects.length} {projects.length === 1 ? 'project' : 'projects'}</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 stagger-children">
                        {projects.map(project => (
                          <ProjectCard
                            key={project.id}
                            project={project}
                            locale={locale}
                            onOpen={() => handleOpenProject(project)}
                            onDelete={() => handleDeleteProject(project.id)}
                          />
                        ))}

                        {/* Create New Card (Ghost) */}
                        <button
                          onClick={handleStartSetup}
                          className="border-2 border-dashed border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all duration-300 group min-h-70"
                        >
                          <div className="w-14 h-14 rounded-2xl bg-slate-50 group-hover:bg-indigo-50 flex items-center justify-center mb-3 transition-all duration-200 group-hover:scale-110">
                            <Plus className="w-7 h-7 opacity-50 group-hover:opacity-100 transition-opacity" />
                          </div>
                          <span className="font-bold text-sm">{t('createNewProject')}</span>
                          <span className="text-xs text-slate-400 mt-1 group-hover:text-indigo-400 transition-colors">AI-guided interview</span>
                        </button>
                      </div>
                    </div>

                    {/* Job Matching — candidate-only, self-fetches private profile */}
                    <JobMatchingSection locale={locale} />
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 'setup' && (
            <>
              <AppNavbar isAdmin={isAdmin} minimal />
              <SetupView onComplete={handleSetupComplete} onCancel={() => setStep('dashboard')} />
            </>
          )}

          {step === 'personal_info' && (
            <>
              <AppNavbar isAdmin={isAdmin} minimal />
              <PersonalInfoView
                initialProfile={userProfile}
                onComplete={handlePersonalInfoComplete}
                onBack={() => setStep('setup')}
              />
            </>
          )}

          {step === 'interview' && currentProject && (
            <div className="h-screen py-4 md:py-8 px-4 bg-linear-to-b from-slate-50 to-slate-100">
              <InterviewView
                key={currentProject.id}
                initialHistory={currentProject.history}
                onFinish={handleFinishInterview}
                onSave={handleSaveInterview}
                onExit={() => setStep('dashboard')}
                roleType={currentProject.roleType}
                importData={currentProject.importData}
                initialData={currentProject.data}
              />
            </div>
          )}

          {step === 'generating' && (
            <ResumeGeneratingView
              onCancel={handleCancelGeneration}
              isGenerating={parseResumeMutation.isPending}
              error={generatingError}
            />
          )}

          {step === 'editor' && currentProject && currentProject.data && (
            <div className="min-h-screen py-4 md:py-8 px-2 sm:px-4 bg-slate-100">
              <ResumeEditor
                project={currentProject}
                onUpdate={handleUpdateProjectData}
                onBack={() => setStep('dashboard')}
                onResumeInterview={handleResumeInterview}
              />
            </div>
          )}
        </>
      )}

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        isOpen={confirmDeleteId !== null}
        title="Delete this resume?"
        message="This action cannot be undone. All interview history and resume data will be permanently removed."
        confirmLabel="Delete"
        cancelLabel="Keep it"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}
