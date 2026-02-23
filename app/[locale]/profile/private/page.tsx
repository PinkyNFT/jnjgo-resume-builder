import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";
import { redirect } from "next/navigation";
import PrivateProfileEditor from "../../../../components/profile/PrivateProfileEditor";
import Link from "next/link";
import { ChevronLeft, UserCircle, LayoutDashboard, FileOutput } from "lucide-react";

export default async function PrivateProfilePage() {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
        redirect('/');
    }

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Top bar — clean, minimal */}
            <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-xl border-b border-slate-200/60">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link
                            href="/dashboard"
                            className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors group"
                        >
                            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" aria-hidden />
                            Back
                        </Link>
                        <span className="hidden sm:block w-px h-5 bg-slate-200" />
                        <nav className="hidden sm:flex items-center gap-0.5" aria-label="Secondary">
                            <Link
                                href="/dashboard"
                                className="px-3 py-1.5 text-sm font-medium text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-all flex items-center gap-1.5"
                            >
                                <LayoutDashboard className="w-3.5 h-3.5" />
                                Dashboard
                            </Link>
                            <Link
                                href="/dashboard"
                                className="px-3 py-1.5 text-sm font-medium text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-all flex items-center gap-1.5"
                                title="Go to Dashboard to export a specific project"
                            >
                                <FileOutput className="w-3.5 h-3.5" />
                                Export
                            </Link>
                        </nav>
                    </div>
                    <div className="flex items-center gap-2 text-slate-500">
                        <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center">
                            <UserCircle className="w-4 h-4 text-indigo-500" aria-hidden />
                        </div>
                        <span className="text-sm font-semibold text-slate-700 hidden sm:block">Recruiter profile</span>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 pb-28 animate-[fade-in_0.4s_ease-out]">
                <PrivateProfileEditor />
            </main>
        </div>
    );
}
