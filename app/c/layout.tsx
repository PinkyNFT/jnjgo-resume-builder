import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import "../globals.css";
import { Providers } from "../providers";
import { Toaster } from "../../components/ui/Toaster";

const inter = Inter({
    variable: "--font-inter",
    subsets: ["latin"],
    weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
    title: "JNJGO — Candidate Profile",
    description: "View this candidate's verified profile on JNJGO",
};

// /c sits outside app/[locale], so it needs its own NextIntlClientProvider:
// the recruiter view renders client components that call useTranslations, and
// without the provider that page crashed with a 500 for every recruiter.
export default async function CandidateLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [locale, messages] = await Promise.all([getLocale(), getMessages()]);
    return (
        <html lang={locale} data-scroll-behavior="smooth">
            <body className={`${inter.variable} bg-slate-50 text-slate-900 antialiased`}>
                <NextIntlClientProvider locale={locale} messages={messages}>
                    <Providers>
                        {children}
                        <Toaster />
                    </Providers>
                </NextIntlClientProvider>
            </body>
        </html>
    );
}
