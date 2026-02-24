'use client';

import React from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowLeft } from 'lucide-react';

/**
 * A reusable "← Back to Dashboard" breadcrumb link.
 * Used on sub-pages (Export, Profile, etc.) for quick navigation back.
 */
export default function BackToDashboard() {
    const locale = useLocale();
    const t = useTranslations('Nav');

    return (
        <Link
            href={`/${locale}/dashboard`}
            className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 font-semibold text-sm mb-6 transition-all duration-200 hover:-translate-x-0.5 group"
        >
            <ArrowLeft className="w-4 h-4 group-hover:scale-110 transition-transform" />
            {t('backToDashboard')}
        </Link>
    );
}
