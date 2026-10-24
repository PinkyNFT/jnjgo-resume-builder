import Link from 'next/link';
import { ArrowLeft, CheckCircle2, AlertTriangle, CalendarClock, Sparkles, MessageSquare, FlaskConical } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata() {
  const t = await getTranslations('BetaStatus');
  return { title: `${t('metaTitle')} — JNJGO Resume` };
}

interface Item {
  title: string;
  body: string;
  when?: string;
}

/**
 * Beta status: what works, known limitations, what's next, and how the shared
 * AI credits work (linked from the credit meter as /beta#credits). Content is
 * in messages/{en,ja}.json → BetaStatus, so it can be updated without code.
 */
export default async function BetaStatusPage() {
  const t = await getTranslations('BetaStatus');
  const credits = t.raw('credits') as string[];
  const works = t.raw('works') as string[];
  const limits = t.raw('limits') as Item[];
  const next = t.raw('next') as Item[];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" />
          {t('backHome')}
        </Link>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-12 space-y-10">
          <header className="space-y-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold">
              <FlaskConical className="w-3.5 h-3.5" /> {t('badge')}
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">{t('title')}</h1>
            <p className="text-slate-600 leading-relaxed">{t('intro')}</p>
            <p className="text-xs text-slate-400">{t('updated')}</p>
          </header>

          <section id="credits" className="scroll-mt-24 space-y-3">
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
              <Sparkles className="w-5 h-5 text-indigo-500" /> {t('creditsTitle')}
            </h2>
            <ul className="space-y-2 text-sm text-slate-600 leading-relaxed list-disc pl-5">
              {credits.map(line => <li key={line}>{line}</li>)}
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" /> {t('worksTitle')}
            </h2>
            <ul className="grid sm:grid-cols-2 gap-2">
              {works.map(item => (
                <li key={item} className="flex items-start gap-2 text-sm text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
              <AlertTriangle className="w-5 h-5 text-amber-500" /> {t('limitsTitle')}
            </h2>
            <dl className="divide-y divide-slate-100 border border-slate-100 rounded-xl">
              {limits.map(item => (
                <div key={item.title} className="p-4 sm:grid sm:grid-cols-3 sm:gap-4">
                  <dt className="text-sm font-semibold text-slate-900">{item.title}</dt>
                  <dd className="mt-1 sm:mt-0 sm:col-span-2 text-sm text-slate-600 leading-relaxed">{item.body}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="space-y-3">
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
              <CalendarClock className="w-5 h-5 text-indigo-500" /> {t('nextTitle')}
            </h2>
            <p className="text-xs text-slate-500">{t('nextNote')}</p>
            <ol className="space-y-3">
              {next.map(item => (
                <li key={item.title} className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="shrink-0 sm:w-44 text-xs font-bold text-indigo-700">{item.when}</span>
                  <span>
                    <span className="block text-sm font-semibold text-slate-900">{item.title}</span>
                    <span className="block text-sm text-slate-600 leading-relaxed">{item.body}</span>
                  </span>
                </li>
              ))}
            </ol>
          </section>

          <section className="space-y-2 border-t border-slate-100 pt-8">
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
              <MessageSquare className="w-5 h-5 text-indigo-500" /> {t('feedbackTitle')}
            </h2>
            <p className="text-sm text-slate-600">
              {t('feedbackBody')}{' '}
              <a href="mailto:dev@kerofi.net" className="text-indigo-600 hover:underline">dev@kerofi.net</a>
            </p>
            <Link href="/how-to-test" className="inline-block text-sm font-semibold text-indigo-600 hover:underline">
              {t('testingGuide')} →
            </Link>
          </section>
        </div>
      </div>
    </div>
  );
}
