'use client';

import React, { useState, useEffect } from 'react';
import { InterviewView } from '../components/InterviewView';
import { ResumeEditor } from '../components/ResumeEditor';
import { Message, ResumeData, Project, RoleType, ImportData, UserProfile } from '../types';
import { useParseResume, useAnalyzeImport } from '../hooks/useGemini';
import { getProjects, saveProject, deleteProject, createNewProject, getUserProfile, saveUserProfile } from '../services/storageService';
import { Loader2, ArrowRight, Plus, FileText, Clock, Trash2, Edit3, Eye, Upload, User, MapPin, Mail, Phone, Linkedin } from 'lucide-react';

// --- Sub-Components ---

const HeroSection = ({ onStart }: { onStart: () => void }) => {
  return (
    <div className="text-center max-w-4xl mx-auto space-y-8 animate-in fade-in zoom-in duration-700 py-16 md:py-24 px-6">
      <div className="inline-flex items-center justify-center p-5 bg-white rounded-3xl shadow-2xl shadow-indigo-200/50 mb-8 relative group cursor-default hover:scale-105 transition-transform">
        <div className="absolute inset-0 bg-linear-to-tr from-indigo-500 via-purple-500 to-pink-500 rounded-3xl opacity-10 blur-xl group-hover:opacity-20 transition-opacity"></div>
        <span className="text-5xl relative z-10 drop-shadow-sm">🚀</span>
      </div>
      <h1 className="text-5xl md:text-7xl font-black tracking-tight text-slate-900 leading-[1.1] drop-shadow-sm">
        JNJGO Resume
      </h1>
      <p className="text-xl md:text-2xl text-slate-600 font-medium max-w-2xl mx-auto leading-relaxed">
        Build Your Master Resume with AI
      </p>
      <p className="text-slate-500 leading-relaxed max-w-xl mx-auto text-base md:text-lg">
        JNJGO creates a "Decision-Making Document" for high-end professionals. Stop telling stories; start showing impact.
      </p>

      <div className="flex justify-center pt-8">
        <button
          onClick={onStart}
          className="group relative inline-flex items-center justify-center px-10 py-5 font-bold text-white text-lg transition-all duration-300 bg-slate-900 rounded-2xl hover:bg-indigo-600 hover:shadow-2xl hover:shadow-indigo-500/30 hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900"
        >
          Start New Resume
          <ArrowRight className="w-6 h-6 ml-2 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
};

const ProjectCard = ({ project, onOpen, onDelete }: { project: Project, onOpen: () => void, onDelete: () => void }) => {
  const isCompleted = project.status === 'completed';
  const score = project.evaluation?.totalScore || 0;

  return (
    <div
      onClick={onOpen}
      className="bg-white rounded-2xl border border-slate-100 p-6 shadow-[0_2px_8px_rgb(0,0,0,0.04)] hover:shadow-[0_12px_24px_rgb(0,0,0,0.08)] hover:-translate-y-1 transition-all cursor-pointer group flex flex-col h-full relative overflow-hidden"
    >
      <div className={`absolute top-0 right-0 w-24 h-24 bg-linear-to-bl opacity-10 rounded-bl-full -mr-4 -mt-4 transition-opacity ${isCompleted ? 'from-green-500 to-teal-500' : 'from-indigo-500 to-purple-500'}`}></div>

      <div className="flex justify-between items-start mb-5 relative z-10">
        <div className={`p-3.5 rounded-2xl shadow-sm ${isCompleted ? 'bg-green-50 text-green-600' : 'bg-indigo-50 text-indigo-600'}`}>
          <FileText className="w-7 h-7" />
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="p-2 -mr-2 -mt-2 opacity-0 group-hover:opacity-100 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-all"
          title="Delete"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <h3 className="font-bold text-slate-800 text-xl mb-1.5 line-clamp-1 pr-4">{project.title}</h3>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-[10px] px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 uppercase font-bold tracking-wider border border-slate-200">
          {project.roleType}
        </span>
        {isCompleted && project.evaluation && (
          <span className={`text-[10px] px-2.5 py-1 rounded-md font-bold tracking-wider border ${score >= 80 ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
            SCORE: {score}
          </span>
        )}
      </div>
      <p className="text-xs text-slate-400 flex items-center gap-1.5 mb-6 font-medium">
        <Clock className="w-3.5 h-3.5" />
        Last updated: {new Date(project.updatedAt).toLocaleDateString()}
      </p>

      <div className="mt-auto">
        <button className={`w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${isCompleted
          ? 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
          : 'bg-slate-900 text-white hover:bg-slate-800 shadow-lg hover:shadow-xl'
          }`}>
          {isCompleted ? (
            <><Eye className="w-4 h-4" /> Editor</>
          ) : (
            <><Edit3 className="w-4 h-4" /> Continue</>
          )}
        </button>
      </div>
    </div>
  );
};

const SetupView = ({ onComplete, onCancel }: { onComplete: (role: RoleType, importData?: ImportData) => void, onCancel: () => void }) => {
  const [role, setRole] = useState<RoleType>('consultant');
  const [importText, setImportText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const analyzeImportMutation = useAnalyzeImport();

  const handleStart = async () => {
    if (importText.trim().length > 20) {
      setIsAnalyzing(true);
      try {
        const data = await analyzeImportMutation.mutateAsync(importText);
        onComplete(role, data);
      } catch (e) {
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
      <h2 className="text-3xl font-bold text-slate-900 mb-8">Project Setup</h2>

      <div className="space-y-8 bg-white p-8 md:p-10 rounded-3xl shadow-xl border border-slate-100">
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-4 uppercase tracking-wide">Select Your Primary Role</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => setRole('consultant')}
              className={`p-6 rounded-2xl border-2 text-left transition-all ${role === 'consultant' ? 'border-indigo-600 bg-indigo-50/50 text-indigo-900 ring-4 ring-indigo-500/10' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}
            >
              <div className="font-bold text-lg mb-1">Consultant / PM</div>
              <div className="text-xs text-indigo-600/80 font-medium">Strategy / Operations / PM</div>
            </button>
            <button
              onClick={() => setRole('senior_engineer')}
              className={`p-6 rounded-2xl border-2 text-left transition-all ${role === 'senior_engineer' ? 'border-indigo-600 bg-indigo-50/50 text-indigo-900 ring-4 ring-indigo-500/10' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}
            >
              <div className="font-bold text-lg mb-1">Senior Engineer / Tech Lead</div>
              <div className="text-xs text-indigo-600/80 font-medium">SWE / SRE / Tech Lead</div>
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-3 uppercase tracking-wide items-center gap-2">
            <Upload className="w-4 h-4" /> Import Existing Resume (Optional)
          </label>
          <p className="text-sm text-slate-500 mb-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
            Paste your current resume text here. The AI will extract your timeline and find gaps immediately.
          </p>
          <textarea
            className="w-full h-48 p-4 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all placeholder:text-slate-400 bg-slate-50/50 focus:bg-white resize-none"
            placeholder="Paste text from your PDF/DOCX here..."
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
          <button onClick={onCancel} className="px-6 py-3 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition-all">Cancel</button>
          <button
            onClick={handleStart}
            disabled={isAnalyzing}
            className="px-8 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center gap-2"
          >
            {isAnalyzing ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing text...</>
            ) : (
              <><ArrowRight className="w-4 h-4" /> Start AI Interview</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

const PersonalInfoView = ({ initialProfile, onComplete, onBack }: { initialProfile: UserProfile | null, onComplete: (profile: UserProfile) => void, onBack: () => void }) => {
  const [profile, setProfile] = useState<UserProfile>(initialProfile || { fullName: '', email: '', phone: '', location: '', linkedin: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveUserProfile(profile);
    onComplete(profile);
  };

  return (
    <div className="max-w-2xl mx-auto py-12 px-6">
      <h2 className="text-3xl font-bold text-slate-900 mb-2">Personal Information</h2>
      <p className="text-slate-500 mb-8">We'll save this for your future resumes so you don't have to type it again.</p>

      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="col-span-2">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">Full Name</label>
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
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">Email</label>
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
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">Phone</label>
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
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">Address / Location</label>
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
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">LinkedIn (Optional)</label>
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
          <button type="button" onClick={onBack} className="px-6 py-3 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition-all">Back</button>
          <button type="submit" className="px-8 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 shadow-lg transition-all flex items-center gap-2">
            Confirm & Start Interview <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};

// --- Main Page Component ---

export default function Page() {
  const [step, setStep] = useState<'dashboard' | 'setup' | 'personal_info' | 'interview' | 'generating' | 'editor'>('dashboard');
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);

  // Temp storage for setup data before project creation
  const [setupData, setSetupData] = useState<{ role: RoleType, importData?: ImportData } | null>(null);

  useEffect(() => {
    setProjects(getProjects().sort((a, b) => b.updatedAt - a.updatedAt));
  }, [step]);

  const handleStartSetup = () => {
    setStep('setup');
  };

  const handleSetupComplete = (role: RoleType, importData?: ImportData) => {
    setSetupData({ role, importData });
    setStep('personal_info');
  };

  const handlePersonalInfoComplete = (profile: UserProfile) => {
    if (!setupData) return;

    const newProject = createNewProject(setupData.role, setupData.importData, profile);

    saveProject(newProject);
    setCurrentProject(newProject);
    setStep('interview');
  };

  const handleOpenProject = (project: Project) => {
    setCurrentProject(project);
    if (project.status === 'completed' || project.status === 'generated') {
      setStep('editor');
    } else {
      setStep('interview');
    }
  };

  const handleDeleteProject = (id: string) => {
    deleteProject(id);
    setProjects(prev => prev.filter(p => p.id !== id));
  };

  const handleSaveInterview = (history: Message[]) => {
    if (currentProject) {
      const updatedProject = {
        ...currentProject,
        history: history,
        updatedAt: Date.now(),
        status: 'interviewing' as const
      };
      saveProject(updatedProject);
      setCurrentProject(updatedProject);
    }
  };

  const handleFinishInterview = async (history: Message[]) => {
    handleSaveInterview(history);
    setStep('generating');

    try {
      const parseResumeMutation = useParseResume();
      const data = await parseResumeMutation.mutateAsync({
        history,
        importData: currentProject?.importData,
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
        saveProject(updatedProject);
        setCurrentProject(updatedProject);
      }
      setStep('editor');
    } catch (error) {
      console.error(error);
      alert("Something went wrong generating the resume. Please try again.");
      setStep('interview');
    }
  };

  const handleUpdateProjectData = (data: ResumeData) => {
    if (currentProject) {
      const updatedProject = {
        ...currentProject,
        data,
        updatedAt: Date.now()
      };
      saveProject(updatedProject);
      setCurrentProject(updatedProject);
    }
  };

  return (
    <div className="font-sans text-slate-900 bg-slate-50 min-h-screen">
      {step === 'dashboard' && (
        <div className="animate-in fade-in duration-500">
          {/* Dashboard Header */}
          <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 px-6 py-4 flex justify-between items-center transition-all">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl drop-shadow-sm">🚀</span>
              <span className="font-black text-slate-800 tracking-tight text-lg">JNJGO Resume</span>
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-6 pb-20">
            {projects.length === 0 ? (
              <HeroSection onStart={handleStartSetup} />
            ) : (
              <div className="py-12">
                <div className="flex flex-col sm:flex-row justify-between items-end mb-10 gap-4 border-b border-slate-200 pb-6">
                  <div>
                    <h2 className="text-3xl font-bold text-slate-900 mb-1">My Resumes</h2>
                    <p className="text-slate-500">Manage your master resumes and versions.</p>
                  </div>
                  <button
                    onClick={handleStartSetup}
                    className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl hover:bg-indigo-600 transition-all font-bold text-sm shadow-lg shadow-slate-200 hover:shadow-indigo-200 hover:-translate-y-0.5"
                  >
                    <Plus className="w-4 h-4" /> Create New Project
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {projects.map(project => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      onOpen={() => handleOpenProject(project)}
                      onDelete={() => handleDeleteProject(project.id)}
                    />
                  ))}

                  {/* Create New Card (Ghost) */}
                  <button
                    onClick={handleStartSetup}
                    className="border-2 border-dashed border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all group min-h-70"
                  >
                    <div className="w-16 h-16 rounded-full bg-slate-50 group-hover:bg-white flex items-center justify-center mb-4 transition-colors shadow-sm">
                      <Plus className="w-8 h-8 opacity-50 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <span className="font-bold text-sm">Create New Resume</span>
                  </button>
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
          initialProfile={getUserProfile()}
          onComplete={handlePersonalInfoComplete}
          onBack={() => setStep('setup')}
        />
      )}

      {step === 'interview' && currentProject && (
        <div className="h-screen py-4 md:py-8 px-4 bg-linear-to-b from-slate-50 to-slate-100">
          <InterviewView
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
        <div className="h-screen flex flex-col justify-center items-center bg-white">
          <Loader2 className="w-16 h-16 text-indigo-600 animate-spin mb-6" />
          <h2 className="text-2xl font-bold text-slate-800">Structuring Master Resume...</h2>
        </div>
      )}

      {step === 'editor' && currentProject && currentProject.data && (
        <div className="min-h-screen py-8 px-4 bg-slate-100">
          <ResumeEditor
            project={currentProject}
            onUpdate={handleUpdateProjectData}
            onBack={() => setStep('dashboard')}
          />
        </div>
      )}
    </div>
  );
}
