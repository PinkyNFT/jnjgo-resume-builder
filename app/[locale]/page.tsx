'use client';

import React, { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import { AuthButton } from '../../components/AuthButton';
import { ArrowRight, Zap, FileText, BarChart3, CheckCircle2, Sparkles } from 'lucide-react';

export default function LandingPage() {
  const t = useTranslations('Landing');
  const { status } = useSession();
  const router = useRouter();

  // If authenticated, redirect to dashboard
  useEffect(() => {
    if (status === 'authenticated') {
      router.push('/dashboard');
    }
  }, [status, router]);

  const handleGetStarted = () => {
    router.push('/auth/signin');
  };

  return (
    <div className="font-sans text-slate-900 bg-white min-h-screen">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 glass border-b border-slate-100 shadow-sm shadow-slate-100/50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="group flex items-center gap-2.5">
            <span className="text-2xl drop-shadow-sm group-hover:scale-110 transition-transform inline-block">🚀</span>
            <span className="font-black text-slate-800 tracking-tight text-lg">JNJGO Resume</span>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <AuthButton />
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-linear-to-b from-indigo-50/50 via-white to-white"></div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-200 h-150 bg-linear-to-br from-indigo-200/30 via-purple-200/20 to-pink-200/10 rounded-full blur-3xl"></div>

        <div className="relative max-w-7xl mx-auto px-6 pt-20 pb-24 md:pt-32 md:pb-36">
          <div className="max-w-4xl mx-auto text-center space-y-8 page-transition">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-sm font-semibold shadow-sm">
              <Sparkles className="w-4 h-4" />
              {t('badge')}
            </div>

            {/* Headline */}
            <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-[1.1]">
              {t('heroTitle')}
              <span className="block gradient-text">
                {t('heroHighlight')}
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-xl md:text-2xl text-slate-500 max-w-2xl mx-auto leading-relaxed font-medium">
              {t('heroSubtitle')}
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <button
                onClick={handleGetStarted}
                className="group relative inline-flex items-center justify-center px-8 py-4 font-bold text-white text-lg transition-all duration-300 bg-slate-900 rounded-2xl hover:bg-indigo-600 hover:shadow-2xl hover:shadow-indigo-500/25 hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 active:scale-[0.98]"
              >
                {t('getStarted')}
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </button>
              <p className="text-sm text-slate-400 font-medium">{t('freeToUse')}</p>
            </div>
          </div>

          {/* Preview mockup */}
          <div className="mt-20 max-w-5xl mx-auto">
            <div className="relative">
              <div className="absolute -inset-4 bg-linear-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20 rounded-3xl blur-2xl"></div>
              <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
                <div className="bg-slate-100 px-4 py-3 flex items-center gap-2 border-b border-slate-200">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                    <div className="w-3 h-3 rounded-full bg-green-400"></div>
                  </div>
                  <div className="flex-1 text-center">
                    <div className="inline-block bg-white px-4 py-1 rounded-md text-xs text-slate-500 font-medium">JNJGO Resume Builder</div>
                  </div>
                </div>
                <div className="p-8 bg-linear-to-br from-slate-50 to-white">
                  <div className="grid grid-cols-3 gap-6">
                    {/* AI Interview preview */}
                    <div className="col-span-2 bg-white rounded-xl border border-slate-200 p-6 space-y-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                          <Zap className="w-4 h-4 text-indigo-600" />
                        </div>
                        <span className="font-bold text-sm text-slate-800">AI Interview</span>
                      </div>
                      <div className="space-y-3">
                        <div className="bg-indigo-50 rounded-lg p-3 text-sm text-slate-700 max-w-[80%]">
                          What was your biggest professional achievement?
                        </div>
                        <div className="bg-slate-100 rounded-lg p-3 text-sm text-slate-600 max-w-[75%] ml-auto">
                          Led a team of 12 engineers to deliver...
                        </div>
                        <div className="bg-indigo-50 rounded-lg p-3 text-sm text-slate-700 max-w-[85%]">
                          That&apos;s impressive! What metrics did you use to measure success?
                        </div>
                      </div>
                    </div>
                    {/* Score preview */}
                    <div className="space-y-4">
                      <div className="bg-white rounded-xl border border-slate-200 p-5">
                        <div className="text-xs font-bold text-slate-500 uppercase mb-3">Quality Score</div>
                        <div className="text-4xl font-black text-green-600 mb-1">87</div>
                        <div className="text-xs text-green-600 font-semibold">PASSING</div>
                      </div>
                      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
                        <div className="text-xs font-bold text-slate-500 uppercase">Breakdown</div>
                        <div className="space-y-2">
                          <div>
                            <div className="flex justify-between text-xs mb-1"><span className="text-slate-600">Structure</span><span className="font-bold text-slate-800">92%</span></div>
                            <div className="h-1.5 bg-slate-100 rounded-full"><div className="h-full bg-green-500 rounded-full" style={{ width: '92%' }}></div></div>
                          </div>
                          <div>
                            <div className="flex justify-between text-xs mb-1"><span className="text-slate-600">Impact</span><span className="font-bold text-slate-800">85%</span></div>
                            <div className="h-1.5 bg-slate-100 rounded-full"><div className="h-full bg-indigo-500 rounded-full" style={{ width: '85%' }}></div></div>
                          </div>
                          <div>
                            <div className="flex justify-between text-xs mb-1"><span className="text-slate-600">Role Fit</span><span className="font-bold text-slate-800">80%</span></div>
                            <div className="h-1.5 bg-slate-100 rounded-full"><div className="h-full bg-purple-500 rounded-full" style={{ width: '80%' }}></div></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-slate-50/80">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-4">{t('featuresTitle')}</h2>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto">{t('featuresSubtitle')}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 stagger-children">
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 group">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center mb-6 group-hover:bg-indigo-100 group-hover:scale-110 transition-all duration-200">
                <Zap className="w-7 h-7 text-indigo-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">{t('feature1Title')}</h3>
              <p className="text-slate-500 leading-relaxed">{t('feature1Desc')}</p>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 group">
              <div className="w-14 h-14 rounded-2xl bg-purple-50 flex items-center justify-center mb-6 group-hover:bg-purple-100 group-hover:scale-110 transition-all duration-200">
                <BarChart3 className="w-7 h-7 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">{t('feature2Title')}</h3>
              <p className="text-slate-500 leading-relaxed">{t('feature2Desc')}</p>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 group">
              <div className="w-14 h-14 rounded-2xl bg-pink-50 flex items-center justify-center mb-6 group-hover:bg-pink-100 group-hover:scale-110 transition-all duration-200">
                <FileText className="w-7 h-7 text-pink-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">{t('feature3Title')}</h3>
              <p className="text-slate-500 leading-relaxed">{t('feature3Desc')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-4">{t('howItWorksTitle')}</h2>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto">{t('howItWorksSubtitle')}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 max-w-4xl mx-auto stagger-children">
            <div className="text-center space-y-4 group">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto text-indigo-600 font-black text-2xl group-hover:bg-indigo-100 group-hover:scale-110 transition-all duration-200 shadow-sm border border-indigo-100/50">1</div>
              <h3 className="text-lg font-bold text-slate-900">{t('step1Title')}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{t('step1Desc')}</p>
            </div>

            <div className="text-center space-y-4 group">
              <div className="w-16 h-16 rounded-2xl bg-purple-50 flex items-center justify-center mx-auto text-purple-600 font-black text-2xl group-hover:bg-purple-100 group-hover:scale-110 transition-all duration-200 shadow-sm border border-purple-100/50">2</div>
              <h3 className="text-lg font-bold text-slate-900">{t('step2Title')}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{t('step2Desc')}</p>
            </div>

            <div className="text-center space-y-4 group">
              <div className="w-16 h-16 rounded-2xl bg-pink-50 flex items-center justify-center mx-auto text-pink-600 font-black text-2xl group-hover:bg-pink-100 group-hover:scale-110 transition-all duration-200 shadow-sm border border-pink-100/50">3</div>
              <h3 className="text-lg font-bold text-slate-900">{t('step3Title')}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{t('step3Desc')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-24 bg-linear-to-br from-slate-900 via-indigo-950 to-slate-900 text-white relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-20 right-20 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl animate-pulse-soft"></div>
          <div className="absolute bottom-20 left-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse-soft"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-black mb-4">{t('benefitsTitle')}</h2>
            <p className="text-lg text-slate-400">{t('benefitsSubtitle')}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-5 max-w-3xl mx-auto stagger-right">
            {[
              t('benefit1'), t('benefit2'), t('benefit3'),
              t('benefit4'), t('benefit5'), t('benefit6')
            ].map((benefit, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors duration-200">
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                </div>
                <span className="text-slate-300 font-medium">{benefit}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-28 bg-white relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-200 h-100 bg-linear-to-br from-indigo-50/40 via-purple-50/20 to-transparent rounded-full blur-3xl"></div>
        <div className="relative max-w-3xl mx-auto text-center px-6 space-y-8">
          <h2 className="text-3xl md:text-4xl font-black text-slate-900">{t('ctaTitle')}</h2>
          <p className="text-lg text-slate-500">{t('ctaSubtitle')}</p>
          <button
            onClick={handleGetStarted}
            className="group inline-flex items-center justify-center px-10 py-5 font-bold text-white text-lg transition-all duration-300 bg-slate-900 rounded-2xl hover:bg-indigo-600 hover:shadow-2xl hover:shadow-indigo-500/25 hover:-translate-y-1 active:scale-[0.98]"
          >
            {t('getStarted')}
            <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-slate-50 border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">🚀</span>
            <span className="font-bold text-slate-600 text-sm">JNJGO Resume</span>
          </div>
          <p className="text-sm text-slate-400">{t('footer')}</p>
        </div>
      </footer>
    </div>
  );
}
