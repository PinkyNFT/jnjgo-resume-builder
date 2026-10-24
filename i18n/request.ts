
import { cookies } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

const isLocale = (value: string | undefined): value is 'en' | 'ja' =>
    !!value && routing.locales.includes(value as 'en' | 'ja');

export default getRequestConfig(async ({ requestLocale }) => {
    // This typically corresponds to the `[locale]` segment
    let locale = await requestLocale;

    // Routes outside [locale] (e.g. /c/[slug] candidate pages, which the
    // middleware skips) have no locale segment: use the language the user
    // picked (NEXT_LOCALE cookie) instead of always the default.
    if (!isLocale(locale)) {
        const fromCookie = (await cookies()).get('NEXT_LOCALE')?.value;
        locale = isLocale(fromCookie) ? fromCookie : routing.defaultLocale;
    }

    return {
        locale,
        messages: (await import(`../messages/${locale}.json`)).default
    };
});
