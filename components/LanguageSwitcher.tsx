'use client';

import { useLocale } from 'next-intl';
import { useTransition } from 'react';
import { setUserLocale } from '@/services/locale';
import { Locale } from '@/i18n/config';

export default function LanguageSwitcher() {
    const locale = useLocale();
    const [isPending, startTransition] = useTransition();

    const switchLocale = (nextLocale: Locale) => {
        if (locale === nextLocale) return;
        startTransition(() => {
            setUserLocale(nextLocale);
        });
    };

    return (
        <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
                onClick={() => switchLocale('en')}
                disabled={isPending}
                className={`
                    px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5
                    ${locale === 'en'
                        ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-black/5'
                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}
                `}
            >
                <span className="uppercase">English</span>
            </button>
            <button
                onClick={() => switchLocale('ja')}
                disabled={isPending}
                className={`
                    px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5
                    ${locale === 'ja'
                        ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-black/5'
                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}
                `}
            >
                <span className="uppercase">日本語</span>
            </button>
        </div>
    );
}
