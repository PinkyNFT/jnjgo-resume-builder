'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { AlertTriangle, Clock, Sparkles } from 'lucide-react';
import { formatCreditReset, useAiCredits } from '../hooks/useAiCredits';

/** Below this share of the pool the meter turns amber and the banner warns. */
const LOW_SHARE = 0.1;

/**
 * Compact meter for the navbar: today's shared beta AI credits, with the reset
 * time on hover. Links to the beta page, which explains how credits work.
 */
export function AiCreditsMeter() {
    const t = useTranslations('Credits');
    const locale = useLocale();
    const { data } = useAiCredits();
    if (!data || data.limit <= 0) return null;

    const share = data.remaining / data.limit;
    const { time, hours } = formatCreditReset(data.resetAt, locale);
    const tone = data.exhausted ? 'red' : share < LOW_SHARE ? 'amber' : 'emerald';
    const bar = { red: 'bg-red-500', amber: 'bg-amber-500', emerald: 'bg-emerald-500' }[tone];
    const text = { red: 'text-red-600', amber: 'text-amber-700', emerald: 'text-slate-600' }[tone];

    return (
        <Link
            href="/beta#credits"
            title={t('tooltip', { time, hours })}
            aria-label={`${t('label')}: ${data.exhausted ? t('usedUp') : t('left', { remaining: data.remaining, limit: data.limit })}. ${t('tooltip', { time, hours })}`}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white/70 hover:bg-white hover:border-slate-300 transition-colors"
        >
            <Sparkles className={`w-3.5 h-3.5 shrink-0 ${data.exhausted ? 'text-red-500' : 'text-indigo-500'}`} />
            <span className="flex flex-col gap-1 min-w-0">
                <span className={`text-[10px] font-bold leading-none tabular-nums whitespace-nowrap ${text}`}>
                    <span className="hidden sm:inline">{t('label')} · </span>
                    {data.exhausted ? t('usedUp') : t('left', { remaining: data.remaining, limit: data.limit })}
                </span>
                <span className="block w-16 sm:w-24 h-1 rounded-full bg-slate-200 overflow-hidden">
                    <span className={`block h-full rounded-full ${bar}`} style={{ width: `${Math.round(share * 100)}%` }} />
                </span>
            </span>
        </Link>
    );
}

/**
 * Explains an empty (or nearly empty) pool where the user would otherwise hit
 * it: "used up, your work is saved, back at 4:00 PM". Renders nothing while
 * credits are fine.
 */
export function AiCreditsBanner({ className = '' }: { className?: string }) {
    const t = useTranslations('Credits');
    const locale = useLocale();
    const { data } = useAiCredits();
    if (!data || data.limit <= 0) return null;

    const low = !data.exhausted && data.remaining / data.limit < LOW_SHARE;
    if (!data.exhausted && !low) return null;
    const { time, hours } = formatCreditReset(data.resetAt, locale);

    return (
        <div
            role="status"
            className={`flex items-start gap-3 rounded-xl border p-4 text-sm ${data.exhausted ? 'bg-red-50 border-red-200 text-red-900' : 'bg-amber-50 border-amber-200 text-amber-900'} ${className}`}
        >
            {data.exhausted ? <Clock className="w-5 h-5 shrink-0 mt-0.5 text-red-600" /> : <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber-600" />}
            <div className="min-w-0">
                <p className="font-bold">{data.exhausted ? t('bannerTitle') : t('lowTitle')}</p>
                <p className="mt-1 leading-relaxed">
                    {data.exhausted ? t('bannerBody', { time, hours }) : t('lowBody', { remaining: data.remaining, time })}
                </p>
                <Link href="/beta#credits" className="inline-block mt-2 text-xs font-semibold underline hover:no-underline">
                    {t('learnMore')}
                </Link>
            </div>
        </div>
    );
}

/** Whether AI actions are paused, and the localized time they come back. */
export function useAiCreditsPaused(): { paused: boolean; time: string } {
    const locale = useLocale();
    const { data } = useAiCredits();
    if (!data?.exhausted) return { paused: false, time: '' };
    return { paused: true, time: formatCreditReset(data.resetAt, locale).time };
}
