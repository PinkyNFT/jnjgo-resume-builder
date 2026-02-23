import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../globals.css";
import { Providers } from "../providers";

const inter = Inter({
    variable: "--font-inter",
    subsets: ["latin"],
    weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
    title: "JNJGO — Candidate Profile",
    description: "View this candidate's verified profile on JNJGO",
};

export default function CandidateLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body className={`${inter.variable} bg-slate-50 text-slate-900 antialiased`}>
                <Providers>
                    {children}
                </Providers>
            </body>
        </html>
    );
}
