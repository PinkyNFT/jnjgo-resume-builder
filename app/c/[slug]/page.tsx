import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import { connectToDatabase } from "../../../lib/mongodb";
import { CandidatePublicPageModel, CandidatePrivateProfileModel, ProjectModel, UserProfileModel } from "../../../lib/models";
import {
    Lock, Sparkles, Building2, TrendingUp, Eye, ArrowRight, Shield,
    DollarSign, Ban, CalendarCheck, Globe, Briefcase, Zap,
    CheckCircle2, Clock, MapPin, Search, ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { ResumePreviewCard } from "../../../components/ResumePreviewCard";

/* ─── Helpers ────────────────────────────────────────────── */

const formatSalary = (val?: number) =>
    val ? `¥${val.toLocaleString()}` : '—';

const formatSalaryMan = (val?: number) =>
    val ? `${(val / 10000).toLocaleString()}万円` : '';

const ORIENTATION_META: Record<string, { label: string; icon: typeof Zap; color: string; bg: string }> = {
    'tech-driven': { label: 'Tech / Specialist', icon: Zap, color: 'text-blue-600', bg: 'bg-blue-50' },
    'business-driven': { label: 'Business / Strategy', icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    'management-driven': { label: 'Management / Lead', icon: Briefcase, color: 'text-violet-600', bg: 'bg-violet-50' },
    'balanced': { label: 'Balanced / Hybrid', icon: Globe, color: 'text-amber-600', bg: 'bg-amber-50' },
};

const INTENT_META: Record<string, { label: string; badge: string; color: string }> = {
    'now': { label: 'Actively looking', badge: 'Now', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
    'within_3_months': { label: 'Within 3 months', badge: '3m', color: 'text-blue-700 bg-blue-50 border-blue-200' },
    'open_to_offers': { label: 'Open to offers', badge: 'Passive', color: 'text-slate-700 bg-slate-100 border-slate-200' },
};

/* ─── Page Component ─────────────────────────────────────── */

export default async function CandidateLandingPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;

    await connectToDatabase();

    const publicPage = await CandidatePublicPageModel.findOne({ pageSlug: slug, isActive: true });

    if (!publicPage) {
        notFound();
    }

    const privateProfile = await CandidatePrivateProfileModel.findOne({ userId: publicPage.userId, status: 'published' });

    // Fetch highlighted resume and user profile in parallel if private profile exists
    let highlightedResume: any = null;
    let candidateUserProfile: any = null;
    if (privateProfile) {
        const [resumeResult, userProfileResult] = await Promise.all([
            privateProfile.highlightedProjectId
                ? ProjectModel.findOne({ id: privateProfile.highlightedProjectId }, {
                    'data': 1,
                }).lean()
                : Promise.resolve(null),
            UserProfileModel.findOne({ userId: publicPage.userId }).lean(),
        ]);
        highlightedResume = resumeResult?.data || null;
        candidateUserProfile = userProfileResult;
    }

    /* ─── Profile not available ─── */
    if (!privateProfile || !privateProfile.visibilityFlags?.isRecruiterOnly) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="max-w-md w-full text-center bg-white p-10 rounded-2xl shadow-sm border border-slate-200 animate-scale-in">
                    <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
                        <Eye className="w-8 h-8 text-slate-400" />
                    </div>
                    <h1 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">Profile Not Available</h1>
                    <p className="text-slate-500 leading-relaxed">This candidate&apos;s detailed profile is currently private or has been deactivated.</p>
                </div>
            </div>
        );
    }

    /* ─── Check authentication ─── */
    const session = await getServerSession(authOptions);
    const isAuthenticated = !!session?.user;
    const isRecruiter = (session?.user as any)?.role === 'recruiter';

    const signInUrl = `/auth/signin?intent=recruiter&callbackUrl=${encodeURIComponent(`/c/${slug}`)}`;
    const roleSelectUrl = `/auth/select-role?intent=recruiter&callbackUrl=${encodeURIComponent(`/c/${slug}`)}`;

    /* ─── Shared header ─── */
    const Header = (
        <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200/60 sticky top-0 z-20">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-sm">
                            <span className="text-white text-xs font-black">JN</span>
                        </div>
                        <span className="font-black text-slate-900 tracking-tight text-lg">JNJGO</span>
                    </div>
                    {/* Back to dashboard for authenticated users */}
                    {isAuthenticated && (
                        <>
                            <div className="w-px h-6 bg-slate-200 hidden sm:block" />
                            <Link
                                href={isRecruiter ? '/recruiter/dashboard' : '/dashboard'}
                                className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-900 transition-all duration-200 hover:-translate-x-0.5 group"
                            >
                                <ArrowLeft className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                <span className="hidden sm:inline">{isRecruiter ? 'Dashboard' : 'My Dashboard'}</span>
                            </Link>
                        </>
                    )}
                </div>
                <div className="flex items-center gap-3">
                    {isAuthenticated ? (
                        isRecruiter ? (
                            <div className="flex items-center gap-2.5">
                                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full">
                                    <CheckCircle2 className="w-3 h-3" />
                                    Recruiter Access
                                </span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2.5">
                                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full">
                                    <Clock className="w-3 h-3" />
                                    Candidate Account
                                </span>
                            </div>
                        )
                    ) : (
                        <>
                            <span className="text-xs font-medium text-slate-400 hidden sm:block">Recruiter Access</span>
                            <Link
                                href={signInUrl}
                                className="text-sm font-bold bg-indigo-600 text-white px-5 py-2.5 rounded-xl hover:bg-indigo-700 transition-all shadow-sm hover:shadow-lg hover:-translate-y-0.5 flex items-center gap-2"
                            >
                                Sign In
                                <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </header>
    );

    /* ═══════════════════════════════════════════════════════
       AUTHENTICATED VIEW — Full recruiter profile (only for recruiters)
       ═══════════════════════════════════════════════════════ */
    if (isAuthenticated && isRecruiter) {
        const orientation = ORIENTATION_META[privateProfile.orientation || ''];
        const intent = INTENT_META[privateProfile.jobChangeIntent || ''];
        const OrientationIcon = orientation?.icon || Globe;

        return (
            <div className="min-h-screen bg-slate-50 font-sans">
                {Header}

                <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-14 animate-fade-in">
                    {/* Top badge */}
                    <div className="text-center mb-10">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold uppercase tracking-wider border border-indigo-100 animate-slide-up-sm">
                            <Shield className="w-3.5 h-3.5" /> Verified Candidate Profile
                        </div>
                    </div>

                    {/* Profile card */}
                    <div className="space-y-5 stagger-children">

                        {/* ── Overview Card ── */}
                        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-sm">
                            <div className="flex flex-col sm:flex-row gap-6 items-start">
                                <div className="flex-1 min-w-0">
                                    {/* Status row */}
                                    <div className="flex flex-wrap items-center gap-2 mb-4">
                                        {orientation && (
                                            <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border ${orientation.bg} ${orientation.color} border-current/10`}>
                                                <OrientationIcon className="w-3 h-3" />
                                                {orientation.label}
                                            </span>
                                        )}
                                        {intent && (
                                            <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border ${intent.color}`}>
                                                <Clock className="w-3 h-3" />
                                                {intent.label}
                                            </span>
                                        )}
                                    </div>

                                    {/* AI review */}
                                    {privateProfile.aiObjectiveReview && (
                                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                                                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">AI Summary</span>
                                            </div>
                                            <p className="text-sm text-slate-700 leading-relaxed">
                                                {privateProfile.aiObjectiveReview}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* ── Full Resume Section ── */}
                        {highlightedResume && (
                            <ResumePreviewCard data={highlightedResume} defaultExpanded />
                        )}

                        {/* ── Data Grid ── */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                            {/* Salary Card */}
                            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
                                <div className="flex items-center gap-2.5 mb-4">
                                    <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                                        <DollarSign className="w-4 h-4 text-green-600" />
                                    </div>
                                    <h3 className="font-semibold text-slate-900 text-sm">Salary Expectations</h3>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Minimum</div>
                                        <div className="font-bold text-slate-900 text-lg tabular-nums">{formatSalary(privateProfile.desiredSalary?.minimum)}</div>
                                        {privateProfile.desiredSalary?.minimum && (
                                            <div className="text-xs text-slate-500 mt-0.5">{formatSalaryMan(privateProfile.desiredSalary.minimum)}</div>
                                        )}
                                    </div>
                                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Target</div>
                                        <div className="font-bold text-slate-900 text-lg tabular-nums">{formatSalary(privateProfile.desiredSalary?.target)}</div>
                                        {privateProfile.desiredSalary?.target && (
                                            <div className="text-xs text-slate-500 mt-0.5">{formatSalaryMan(privateProfile.desiredSalary.target)}</div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Interview Availability */}
                            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
                                <div className="flex items-center gap-2.5 mb-4">
                                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                                        <CalendarCheck className="w-4 h-4 text-blue-600" />
                                    </div>
                                    <h3 className="font-semibold text-slate-900 text-sm">Interview Availability</h3>
                                </div>
                                <p className="text-sm text-slate-700 leading-relaxed">
                                    {privateProfile.interviewAvailability || <span className="text-slate-400 italic">Not specified</span>}
                                </p>
                            </div>

                            {/* Working Conditions */}
                            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
                                <div className="flex items-center gap-2.5 mb-4">
                                    <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
                                        <MapPin className="w-4 h-4 text-violet-600" />
                                    </div>
                                    <h3 className="font-semibold text-slate-900 text-sm">Working Conditions</h3>
                                </div>
                                <p className="text-sm text-slate-700 leading-relaxed">
                                    {privateProfile.workingConditions || <span className="text-slate-400 italic">Not specified</span>}
                                </p>
                            </div>

                            {/* Deal Breakers */}
                            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
                                <div className="flex items-center gap-2.5 mb-4">
                                    <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                                        <Ban className="w-4 h-4 text-red-500" />
                                    </div>
                                    <h3 className="font-semibold text-slate-900 text-sm">Deal Breakers</h3>
                                </div>
                                {privateProfile.dealBreakers?.filter(Boolean).length ? (
                                    <div className="flex flex-wrap gap-2">
                                        {privateProfile.dealBreakers.filter(Boolean).map((db: string, i: number) => (
                                            <span
                                                key={i}
                                                className="inline-flex items-center bg-red-50 text-red-700 px-3 py-1.5 rounded-lg text-xs font-semibold border border-red-200"
                                            >
                                                {db}
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-slate-400 italic">None specified</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Trust footer */}
                    <div className="text-center mt-12 animate-fade-in">
                        <p className="text-xs text-slate-400 font-medium">
                            Powered by <span className="font-bold text-slate-500">JNJGO</span> · Direct scouting platform for IT professionals in Japan
                        </p>
                    </div>
                </main>
            </div>
        );
    }

    /* ═══════════════════════════════════════════════════════
       CANDIDATE USER VIEW — Signed in but not a recruiter
       ═══════════════════════════════════════════════════════ */
    if (isAuthenticated && !isRecruiter) {
        return (
            <div className="min-h-screen bg-slate-50 font-sans">
                {Header}
                <main className="max-w-lg mx-auto px-4 py-16 animate-fade-in">
                    <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-10 text-center shadow-sm">
                        <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <Shield className="w-8 h-8 text-amber-500" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 mb-3">Recruiter Access Only</h2>
                        <p className="text-slate-500 leading-relaxed mb-6">
                            {(session?.user as any)?.role === 'pending_recruiter' ? (
                                <>
                                    Your recruiter account is <strong>pending approval</strong>. Once administrators approve your account, you will be able to view candidate details.
                                </>
                            ) : (
                                <>
                                    You&apos;re signed in as a <strong>candidate</strong>. Only recruiters can view detailed candidate profiles.
                                    If you&apos;re a recruiter, please create a recruiter account.
                                </>
                            )}
                        </p>
                        <Link
                            href={roleSelectUrl}
                            className="inline-flex items-center justify-center gap-2 w-full bg-emerald-600 text-white font-bold py-3.5 rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200/40 hover:-translate-y-0.5 mb-3"
                        >
                            <Search className="w-4 h-4" />
                            Switch to Recruiter Account
                        </Link>
                        <p className="text-xs text-slate-400 mt-2">
                            Your account role will be updated to Recruiter.
                        </p>
                    </div>
                </main>
            </div>
        );
    }

    /* ═══════════════════════════════════════════════════════
       GATED VIEW — Unauthenticated visitors
       ═══════════════════════════════════════════════════════ */
    return (
        <div className="min-h-screen bg-slate-50 font-sans">
            {Header}

            <main className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16 animate-fade-in">

                {/* Hero */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold uppercase tracking-wider mb-5 border border-indigo-100 animate-slide-up-sm">
                        <Shield className="w-3.5 h-3.5" /> Verified Candidate
                    </div>
                    <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight mb-4 leading-tight animate-slide-up">
                        Exclusive Candidate Details
                    </h1>
                    <p className="text-base sm:text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed animate-slide-up" style={{ animationDelay: '0.05s' }}>
                        This candidate has shared salary expectations, career preferences, and deal-breakers exclusively on JNJGO.
                    </p>
                </div>

                {/* Value props */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-10 stagger-children">
                    {[
                        { icon: DollarSign, title: 'Salary range', desc: 'See minimum & target expectations upfront', color: 'text-green-600 bg-green-50' },
                        { icon: TrendingUp, title: 'Career intent', desc: 'Know if they\'re actively looking or passive', color: 'text-blue-600 bg-blue-50' },
                        { icon: Ban, title: 'Deal breakers', desc: 'Avoid wasting time on mismatched roles', color: 'text-red-500 bg-red-50' },
                    ].map((item) => (
                        <div key={item.title} className="bg-white/80 backdrop-blur-sm rounded-xl border border-slate-200/60 p-4 flex items-start gap-3">
                            <div className={`w-9 h-9 rounded-lg ${item.color} flex items-center justify-center shrink-0`}>
                                <item.icon className="w-4 h-4" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-slate-900 text-sm">{item.title}</h3>
                                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{item.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Main Card with gate */}
                <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200/80 overflow-hidden relative animate-slide-up" style={{ animationDelay: '0.1s' }}>

                    {/* Gate Overlay */}
                    <div className="absolute inset-0 z-10 bg-linear-to-b from-transparent via-white/70 to-white flex flex-col items-center justify-end pb-12 px-4">
                        <div className="bg-white p-8 sm:p-10 rounded-2xl shadow-2xl shadow-slate-300/40 border border-slate-100 max-w-sm w-full text-center animate-scale-in" style={{ animationDelay: '0.2s' }}>
                            <div className="w-14 h-14 bg-linear-to-br from-indigo-500 to-violet-600 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-indigo-200/50">
                                <Lock className="w-6 h-6 text-white" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">Recruiter Access Required</h3>
                            <p className="text-slate-500 text-sm mb-6 leading-relaxed">
                                Sign in to unlock salary expectations, deal-breakers, and career preferences.
                            </p>
                            <Link
                                href={signInUrl}
                                className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white font-bold py-3.5 rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200/40 hover:shadow-xl hover:-translate-y-0.5"
                            >
                                Unlock Candidate Details
                                <ArrowRight className="w-4 h-4" />
                            </Link>
                            <p className="mt-4 text-xs text-slate-400 font-medium">Free forever · No credit card needed</p>
                        </div>
                    </div>

                    {/* Teaser Content (blurred) */}
                    <div className="p-8 sm:p-10 blur-[3px] select-none pointer-events-none opacity-60" aria-hidden="true">
                        {/* Profile Header */}
                        <div className="flex flex-col sm:flex-row gap-6 items-start mb-8">
                            <div className="w-20 h-20 bg-linear-to-br from-indigo-100 to-violet-100 rounded-2xl shrink-0 border-2 border-white shadow-md" />
                            <div className="flex-1">
                                <div className="h-7 w-48 bg-slate-200/80 rounded-lg mb-3" />
                                <div className="h-4 w-32 bg-slate-100 rounded mb-5" />

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                                        <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                                            <Building2 size={18} className="text-indigo-500" />
                                        </div>
                                        <div>
                                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Orientation</div>
                                            <div className="font-bold text-sm text-slate-800 capitalize">{privateProfile.orientation || 'Specialist'}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                                        <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                                            <TrendingUp size={18} className="text-emerald-500" />
                                        </div>
                                        <div>
                                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Intent</div>
                                            <div className="font-bold text-sm text-slate-800 capitalize">{privateProfile.jobChangeIntent?.replace(/_/g, ' ') || 'Open to offers'}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* AI Review teaser */}
                        <div className="bg-indigo-50/50 rounded-xl p-5 border border-indigo-100/50 mb-8">
                            <div className="flex items-center gap-2 mb-3">
                                <Sparkles className="w-4 h-4 text-indigo-500" />
                                <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">AI Objective Review</span>
                            </div>
                            <p className="text-sm text-slate-700 leading-relaxed">
                                {privateProfile.aiObjectiveReview || 'A highly skilled professional open to relevant career opportunities.'}
                            </p>
                        </div>

                        {/* Skeleton sections */}
                        <div className="space-y-6">
                            <div className="border-t border-slate-100 pt-6">
                                <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2 text-sm">
                                    <Lock className="w-3.5 h-3.5 text-slate-400" /> Salary Expectations
                                </h4>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="h-14 shimmer rounded-xl" />
                                    <div className="h-14 shimmer rounded-xl" />
                                </div>
                            </div>
                            <div className="border-t border-slate-100 pt-6">
                                <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2 text-sm">
                                    <Lock className="w-3.5 h-3.5 text-slate-400" /> Deal Breakers
                                </h4>
                                <div className="flex gap-2">
                                    <div className="h-8 w-32 bg-red-50 rounded-lg border border-red-100" />
                                    <div className="h-8 w-40 bg-red-50 rounded-lg border border-red-100" />
                                    <div className="h-8 w-28 bg-red-50 rounded-lg border border-red-100" />
                                </div>
                            </div>
                            <div className="border-t border-slate-100 pt-6">
                                <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2 text-sm">
                                    <Lock className="w-3.5 h-3.5 text-slate-400" /> Full Resume &amp; Career Impact
                                </h4>
                                <div className="space-y-2.5">
                                    <div className="h-4 w-full shimmer rounded-lg" />
                                    <div className="h-4 w-full shimmer rounded-lg" />
                                    <div className="h-4 w-4/5 shimmer rounded-lg" />
                                    <div className="h-4 w-full shimmer rounded-lg" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Trust footer */}
                <div className="text-center mt-10 animate-fade-in" style={{ animationDelay: '0.3s' }}>
                    <p className="text-xs text-slate-400 font-medium">
                        Powered by <span className="font-bold text-slate-500">JNJGO</span> · Direct scouting platform for IT professionals in Japan
                    </p>
                </div>
            </main>
        </div>
    );
}
