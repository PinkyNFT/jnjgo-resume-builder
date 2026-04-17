'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowRight, CheckCircle2, FlaskConical, UserCircle, FileText, Share2, Search, Clock } from 'lucide-react';

function StepCard({ number, icon: Icon, title, description, tips }: {
  number: number;
  icon: React.ElementType;
  title: string;
  description: string;
  tips: string[];
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-4">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center font-black text-lg shrink-0">
          {number}
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Icon className="w-4 h-4 text-indigo-500" />
            <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          </div>
          <p className="text-slate-600 leading-relaxed">{description}</p>
        </div>
      </div>
      <div className="ml-14 space-y-1.5">
        {tips.map((tip, i) => (
          <div key={i} className="flex items-start gap-2 text-sm text-slate-500">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
            <span>{tip}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function HowToTestPage() {
  const t = useTranslations('HowToTest');
  const [tab, setTab] = useState<'candidate' | 'recruiter'>('candidate');

  const candidateSteps = [
    {
      number: 1,
      icon: UserCircle,
      title: t('cStep1Title'),
      description: t('cStep1Desc'),
      tips: [t('cStep1Tip1'), t('cStep1Tip2')],
    },
    {
      number: 2,
      icon: FileText,
      title: t('cStep2Title'),
      description: t('cStep2Desc'),
      tips: [t('cStep2Tip1'), t('cStep2Tip2'), t('cStep2Tip3'), t('cStep2Tip4')],
    },
    {
      number: 3,
      icon: Share2,
      title: t('cStep3Title'),
      description: t('cStep3Desc'),
      tips: [t('cStep3Tip1'), t('cStep3Tip2'), t('cStep3Tip3')],
    },
  ];

  const recruiterSteps = [
    {
      number: 1,
      icon: UserCircle,
      title: t('rStep1Title'),
      description: t('rStep1Desc'),
      tips: [t('rStep1Tip1'), t('rStep1Tip2'), t('rStep1Tip3')],
    },
    {
      number: 2,
      icon: Clock,
      title: t('rStep2Title'),
      description: t('rStep2Desc'),
      tips: [t('rStep2Tip1'), t('rStep2Tip2'), t('rStep2Tip3')],
    },
    {
      number: 3,
      icon: Search,
      title: t('rStep3Title'),
      description: t('rStep3Desc'),
      tips: [t('rStep3Tip1'), t('rStep3Tip2'), t('rStep3Tip3')],
    },
  ];

  const steps = tab === 'candidate' ? candidateSteps : recruiterSteps;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <div className="space-y-8">
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-700 text-sm font-semibold px-4 py-1.5 rounded-full">
              <FlaskConical className="w-4 h-4" />
              {t('badge')}
            </div>
            <h1 className="text-3xl font-black text-slate-900">{t('title')}</h1>
            <p className="text-slate-500 leading-relaxed max-w-xl mx-auto">{t('subtitle')}</p>
          </div>

          {/* Beta disclaimer */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 text-sm text-amber-800 space-y-1">
            <p><strong>{t('betaDisclaimerTitle')}</strong></p>
            <ul className="list-disc list-inside space-y-1 text-amber-700">
              <li>{t('betaItem1')}</li>
              <li>{t('betaItem2')}</li>
              <li>{t('betaItem3')}</li>
            </ul>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setTab('candidate')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${
                tab === 'candidate' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <FileText className="w-4 h-4" />
              {t('tabCandidate')}
            </button>
            <button
              onClick={() => setTab('recruiter')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${
                tab === 'recruiter' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Search className="w-4 h-4" />
              {t('tabRecruiter')}
            </button>
          </div>

          {/* Steps */}
          <div className="space-y-4">
            {steps.map((step) => (
              <StepCard key={step.number} {...step} />
            ))}
          </div>

          {/* CTA */}
          <div className="text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-slate-900 text-white font-semibold rounded-xl hover:bg-indigo-600 transition-colors"
            >
              {t('getStarted')}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Known limitations */}
          <div className="bg-slate-100 rounded-2xl px-5 py-5 space-y-3">
            <h3 className="font-semibold text-slate-800">{t('limitationsTitle')}</h3>
            <ul className="space-y-1.5 text-sm text-slate-600">
              {(['limit1', 'limit2', 'limit3', 'limit4'] as const).map((key) => (
                <li key={key} className="flex items-start gap-2">
                  <span className="text-slate-400 mt-0.5">•</span>
                  {t(key)}
                </li>
              ))}
              <li className="flex items-start gap-2">
                <span className="text-slate-400 mt-0.5">•</span>
                {t('limit5').split('dev@kerofi.net')[0]}
                <a href="mailto:dev@kerofi.net" className="text-indigo-600 hover:underline">dev@kerofi.net</a>
                {t('limit5').split('dev@kerofi.net')[1]}
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
