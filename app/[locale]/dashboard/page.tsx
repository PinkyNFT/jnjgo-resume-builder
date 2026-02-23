'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useSession } from 'next-auth/react';
import LanguageSwitcher from '../../../components/LanguageSwitcher';
import { AuthButton } from '../../../components/AuthButton';
import { InterviewView } from '../../../components/InterviewView';
import { ResumeEditor } from '../../../components/ResumeEditor';
import { ResumeGeneratingView } from '../../../components/ResumeGeneratingView';
import { Message, ResumeData, Project, RoleType, ImportData, UserProfile } from '../../../types';
import { useParseResume, useAnalyzeImport } from '../../../hooks/useGemini';
import { getProjects, saveProject, deleteProject, createNewProject, getUserProfile, saveUserProfile, createVersion } from '../../../services/storageService';
import { migrateFromLocalStorage, isMigrationCompleted } from '../../../utils/dataMigration';
import { Loader2, ArrowRight, Plus, FileText, Clock, Trash2, Edit3, Eye, Upload, User, MapPin, Mail, Phone, Linkedin, FolderOpen, CheckCircle, PenLine, BarChart3, Shield, UserCircle, Share2 } from 'lucide-react';
import Link from 'next/link';

// --- Sub-Components ---

type Step = 'dashboard' | 'setup' | 'personal_info' | 'interview' | 'generating' | 'editor';

const EmptyState = ({ onStart }: { onStart: () => void }) => {
  const t = useTranslations('Dashboard');
  return (
    <div className="text-center max-w-lg mx-auto space-y-6 py-20 px-6 animate-in fade-in duration-500">
      <div className="w-20 h-20 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto">
        <FolderOpen className="w-10 h-10 text-indigo-400" />
      </div>
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-slate-900">{t('emptyTitle')}</h2>
        <p className="text-slate-500 leading-relaxed">{t('emptyDesc')}</p>
      </div>
      <button
        onClick={onStart}
        className="group inline-flex items-center justify-center px-8 py-4 font-bold text-white text-lg transition-all duration-300 bg-slate-900 rounded-2xl hover:bg-indigo-600 hover:shadow-2xl hover:shadow-indigo-500/25 hover:-translate-y-0.5"
      >
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
    { label: t('statTotal'), value: total, icon: FileText, color: 'bg-indigo-50 text-indigo-600', border: 'border-indigo-100' },
    { label: t('statCompleted'), value: completed, icon: CheckCircle, color: 'bg-green-50 text-green-600', border: 'border-green-100' },
    { label: t('statInProgress'), value: inProgress, icon: PenLine, color: 'bg-amber-50 text-amber-600', border: 'border-amber-100' },
    { label: t('statAvgScore'), value: projects.filter(p => p.evaluation?.totalScore).length > 0 ? Math.round(avgScore) : '—', icon: BarChart3, color: 'bg-purple-50 text-purple-600', border: 'border-purple-100' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, i) => (
        <div key={i} className={`bg-white rounded-xl border ${stat.border} p-5 flex items-center gap-4`}>
          <div className={`w-11 h-11 rounded-xl ${stat.color} flex items-center justify-center shrink-0`}>
            <stat.icon className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{stat.value}</div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">{stat.label}</div>
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
    ? { label: t('statusComplete'), color: 'bg-green-50 text-green-700 border-green-200', dot: 'bg-green-500' }
    : { label: t('statusDraft'), color: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' };

  return (
    <div
      onClick={onOpen}
      className="bg-white rounded-2xl border border-slate-200/80 p-6 hover:shadow-xl hover:shadow-slate-200/50 hover:-translate-y-1 transition-all duration-300 cursor-pointer group flex flex-col h-full relative"
    >
      {/* Top row: icon + status + delete */}
      <div className="flex justify-between items-start mb-5">
        <div className={`p-3 rounded-xl ${isCompleted ? 'bg-green-50 text-green-600' : 'bg-indigo-50 text-indigo-600'}`}>
          <FileText className="w-6 h-6" />
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full font-semibold border ${statusConfig.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`}></span>
            {statusConfig.label}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-all"
            title={tCommon('delete')}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Title */}
      <h3 className="font-bold text-slate-800 text-lg mb-2 line-clamp-1 group-hover:text-indigo-700 transition-colors">{project.title}</h3>

      {/* Role tag */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-[10px] px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 uppercase font-bold tracking-wider border border-slate-200">
          {t(`roleType.${project.roleType}` as const)}
        </span>
        {isCompleted && project.evaluation && (
          <span className={`text-[10px] px-2.5 py-1 rounded-md font-bold tracking-wider border ${score >= 80 ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
            SCORE: {score}
          </span>
        )}
      </div>

      {/* Score bar (if available) */}
      {isCompleted && project.evaluation && (
        <div className="mb-4">
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
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
              className="flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200"
            >
              <Eye className="w-4 h-4" /> {t('openEditor')}
            </button>
            <Link
              href={`/${locale}/export?projectId=${project.id}`}
              onClick={(e) => e.stopPropagation()}
              className="px-4 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200"
              title="Export to job sites"
            >
              <Share2 className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <button className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all bg-slate-900 text-white hover:bg-indigo-600 shadow-md hover:shadow-lg">
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
  const analyzeImportMutation = useAnalyzeImport();

  const handleStart = async () => {
    if (importText.trim().length > 20) {
      setIsAnalyzing(true);
      try {
        const data = await analyzeImportMutation.mutateAsync({ text: importText, locale });
        onComplete(role, data);
      } catch {
        alert("Import failed, starting blank.");
        onComplete(role, undefined);
      } finally {
        setIsAnalyzing(false);
      }
    } else {
      onComplete(role, undefined);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-12 px-6">
      <h2 className="text-3xl font-bold text-slate-900 mb-8">{t('title')}</h2>

      <div className="space-y-8 bg-white p-8 md:p-10 rounded-3xl shadow-xl border border-slate-100">
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-4 uppercase tracking-wide">{t('selectRole')}</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => setRole('consultant')}
              className={`p-6 rounded-2xl border-2 text-left transition-all ${role === 'consultant' ? 'border-indigo-600 bg-indigo-50/50 text-indigo-900 ring-4 ring-indigo-500/10' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}
            >
              <div className="font-bold text-lg mb-1">{t('roleConsultant')}</div>
              <div className="text-xs text-indigo-600/80 font-medium">{t('roleConsultantDesc')}</div>
            </button>
            <button
              onClick={() => setRole('senior_engineer')}
              className={`p-6 rounded-2xl border-2 text-left transition-all ${role === 'senior_engineer' ? 'border-indigo-600 bg-indigo-50/50 text-indigo-900 ring-4 ring-indigo-500/10' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}
            >
              <div className="font-bold text-lg mb-1">{t('roleEngineer')}</div>
              <div className="text-xs text-indigo-600/80 font-medium">{t('roleEngineerDesc')}</div>
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-3 uppercase tracking-wide items-center gap-2">
            <Upload className="w-4 h-4" /> {t('importTitle')}
          </label>
          <p className="text-sm text-slate-500 mb-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
            {t('importDesc')}
          </p>
          <textarea
            className="w-full h-48 p-4 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all placeholder:text-slate-400 bg-slate-50/50 focus:bg-white resize-none"
            placeholder={t('importPlaceholder')}
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
          <button onClick={onCancel} className="px-6 py-3 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition-all">{tCommon('cancel')}</button>
          <button
            onClick={handleStart}
            disabled={isAnalyzing}
            className="px-8 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center gap-2"
          >
            {isAnalyzing ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> {t('analyzing')}</>
            ) : (
              <><ArrowRight className="w-4 h-4" /> {t('startInterview')}</>
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
      alert('Failed to save profile. Please try again.');
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-12 px-6">
      <h2 className="text-3xl font-bold text-slate-900 mb-2">{t('title')}</h2>
      <p className="text-slate-500 mb-8">{t('subtitle')}</p>

      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="col-span-2">
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

          <div className="col-span-2">
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

          <div className="col-span-2">
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

        <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
          <button type="button" onClick={onBack} className="px-6 py-3 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition-all">{tCommon('back')}</button>
          <button type="submit" className="px-8 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 shadow-lg transition-all flex items-center gap-2">
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
  const [step, setStep] = useState<Step>('dashboard');
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Temp storage for setup data before project creation
  const [setupData, setSetupData] = useState<{ role: RoleType, importData?: ImportData } | null>(null);

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
      alert('Failed to create project. Please try again.');
    }
  };

  const handleOpenProject = (project: Project) => {
    setCurrentProject(project);
    if (project.status === 'completed' || project.status === 'generated') {
      setStep('editor');
    } else {
      setStep('interview');
    }
  };

  const handleDeleteProject = async (id: string) => {
    if (!confirm(tCommon('confirmDelete'))) {
      return;
    }
    try {
      await deleteProject(id);
      setProjects(prev => prev.filter(p => p.id !== id));
    } catch (error) {
      console.error('Failed to delete project:', error);
      alert('Failed to delete project. Please try again.');
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
        alert('Failed to save changes. Please try again.');
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
      alert('Failed to resume interview. Please try again.');
    }
  };

  const { data: session } = useSession();
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
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center space-y-4">
            <Loader2 className="w-12 h-12 animate-spin mx-auto text-indigo-600" />
            <p className="text-slate-600 font-medium">Loading...</p>
          </div>
        </div>
      ) : (
        <>
          {step === 'dashboard' && (
            <div className="animate-in fade-in duration-500">
              {/* Dashboard Header */}
              <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 px-6 py-4 flex justify-between items-center transition-all">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl drop-shadow-sm">🚀</span>
                  <span className="font-black text-slate-800 tracking-tight text-lg">JNJGO Resume</span>
                </div>
                <div className="flex items-center gap-4">
                  {isAdmin && (
                    <a
                      href="/admin"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors border border-indigo-100"
                    >
                      <Shield className="w-3.5 h-3.5" />
                      Admin
                    </a>
                  )}
                  <Link
                    href={`/${locale}/profile/private`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-semibold text-slate-700 bg-white rounded-lg hover:bg-slate-50 transition-colors border border-slate-200 shadow-sm"
                  >
                    <UserCircle className="w-4 h-4" />
                    <span className="hidden sm:inline">Recruiter Profile</span>
                  </Link>
                  <AuthButton />
                  <LanguageSwitcher />
                </div>
              </div>

              <div className="max-w-7xl mx-auto px-6 pb-20">
                {projects.length === 0 ? (
                  <EmptyState onStart={handleStartSetup} />
                ) : (
                  <div className="py-10 space-y-8">
                    {/* Welcome section */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div className="space-y-1">
                        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
                          {t('welcomeBack')}{session?.user?.name ? `, ${session.user.name.split(' ')[0]}` : ''}
                        </h1>
                        <p className="text-slate-500">{t('manageResumes')}</p>
                      </div>
                      <button
                        onClick={handleStartSetup}
                        className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl hover:bg-indigo-600 transition-all font-bold text-sm shadow-lg shadow-slate-200 hover:shadow-indigo-200 hover:-translate-y-0.5"
                      >
                        <Plus className="w-4 h-4" /> {t('createNewProject')}
                      </button>
                    </div>

                    {/* Stats */}
                    <StatsCards projects={projects} />

                    {/* Projects list */}
                    <div className="space-y-5">
                      <h2 className="text-lg font-bold text-slate-800">{t('myResumes')}</h2>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
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
                          className="border-2 border-dashed border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all group min-h-70"
                        >
                          <div className="w-14 h-14 rounded-full bg-slate-50 group-hover:bg-white flex items-center justify-center mb-3 transition-colors shadow-sm">
                            <Plus className="w-7 h-7 opacity-50 group-hover:opacity-100 transition-opacity" />
                          </div>
                          <span className="font-bold text-sm">{t('createNewProject')}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 'setup' && (
            <SetupView onComplete={handleSetupComplete} onCancel={() => setStep('dashboard')} />
          )}

          {step === 'personal_info' && (
            <PersonalInfoView
              initialProfile={userProfile}
              onComplete={handlePersonalInfoComplete}
              onBack={() => setStep('setup')}
            />
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
            <div className="min-h-screen py-8 px-4 bg-slate-100">
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
    </div>
  );
}
