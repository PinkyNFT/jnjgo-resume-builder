import Link from 'next/link';
import { Shield, ArrowLeft } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata() {
  const t = await getTranslations('Privacy');
  return { title: `${t('title')} — JNJGO Resume` };
}

export default async function PrivacyPage() {
  const t = await getTranslations('Privacy');

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('backHome')}
        </Link>

        <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 space-y-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{t('title')}</h1>
              <p className="text-sm text-slate-400">{t('lastUpdated')}</p>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 text-sm text-amber-800">
            <strong>Beta:</strong> {t('betaNotice')}
          </div>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">{t('s1Title')}</h2>
            <p className="text-slate-600 leading-relaxed">{t('s1Body')}</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">{t('s2Title')}</h2>
            <ul className="list-disc list-inside space-y-2 text-slate-600 leading-relaxed">
              <li>{t('s2Item1')}</li>
              <li>{t('s2Item2')}</li>
              <li>{t('s2Item3')}</li>
              <li>{t('s2Item4')}</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">{t('s3Title')}</h2>
            <p className="text-slate-600 leading-relaxed">{t('s3Body')}</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">{t('s4Title')}</h2>
            <p className="text-slate-600 leading-relaxed">{t('s4Body')}</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">{t('s5Title')}</h2>
            <p className="text-slate-600 leading-relaxed">{t('s5Body')}</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">{t('s6Title')}</h2>
            <p className="text-slate-600 leading-relaxed">{t('s6Body')}</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">{t('s7Title')}</h2>
            <p className="text-slate-600 leading-relaxed">
              {t('s7Body')}{' '}
              <a href="mailto:dev@kerofi.net" className="text-indigo-600 hover:underline">
                dev@kerofi.net
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
