'use client';

import { useLocale } from 'next-intl';
import { useTransition } from 'react';
import { setUserLocale } from '@/services/locale';
import { Locale } from '@/i18n/config';
import { Globe } from 'lucide-react';

interface LanguageSwitcherProps {
    /** When true renders a compact row suitable for dropdowns */
    compact?: boolean;
}

export default function LanguageSwitcher({ compact = false }: LanguageSwitcherProps) {
    const locale = useLocale();
    const [isPending, startTransition] = useTransition();

    const switchLocale = (nextLocale: Locale) => {
        if (locale === nextLocale) return;
        startTransition(() => {
            setUserLocale(nextLocale);
        });
    };

    if (compact) {
        return (
            <div className="flex items-center gap-2">
                <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <div className="flex gap-1">
                    {(['en', 'ja'] as Locale[]).map((l) => (
                        <button
                            key={l}
                            onClick={() => switchLocale(l)}
                            disabled={isPending}
                            className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                                locale === l
                                    ? 'bg-indigo-50 text-indigo-600 ring-1 ring-indigo-200'
                                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                            }`}
                        >
                            {l === 'en' ? 'EN' : 'JA'}
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
                onClick={() => switchLocale('en')}
                disabled={isPending}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                    locale === 'en'
                        ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-black/5'
                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                }`}
            >
                EN
            </button>
            <button
                onClick={() => switchLocale('ja')}
                disabled={isPending}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                    locale === 'ja'
                        ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-black/5'
                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                }`}
            >
                日本語
            </button>
        </div>
    );
}
