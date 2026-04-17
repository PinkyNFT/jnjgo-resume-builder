import Link from 'next/link';
import { Search } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

export default async function NotFound() {
  const t = await getTranslations('NotFound');

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto">
          <Search className="w-8 h-8 text-indigo-500" />
        </div>
        <div className="space-y-2">
          <p className="text-6xl font-black text-slate-200 leading-none">404</p>
          <h1 className="text-2xl font-bold text-slate-900">{t('title')}</h1>
          <p className="text-slate-500 leading-relaxed">{t('description')}</p>
        </div>
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 text-white font-semibold rounded-xl hover:bg-indigo-600 transition-colors"
        >
          {t('backHome')}
        </Link>
      </div>
    </div>
  );
}
