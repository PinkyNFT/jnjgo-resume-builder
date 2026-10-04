import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../globals.css";
import { Providers } from "../providers";
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import PageTransition from '../../components/navigation/PageTransition';
import { Toaster } from '../../components/ui/Toaster';

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "JNJGO Resume Builder",
  description: "AI-powered master resume builder for IT professionals",
};

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  const messages = await getMessages();

  return (
    <html lang={locale} data-scroll-behavior="smooth">
      <body className={`${inter.variable} bg-slate-50 text-slate-900 antialiased`}>
        <NextIntlClientProvider messages={messages}>
          <Providers>
            <PageTransition>
              {children}
            </PageTransition>
            <Toaster />
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
