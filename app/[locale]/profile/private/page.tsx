import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";
import { redirect } from "next/navigation";
import PrivateProfileEditor from "../../../../components/profile/PrivateProfileEditor";
import AppShell from "../../../../components/navigation/AppShell";
import BackToDashboard from "../../../../components/navigation/BackToDashboard";

export default async function PrivateProfilePage() {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
        redirect('/');
    }

    if ((session?.user as any)?.role === 'pending_recruiter') {
        redirect('/auth/pending-approval');
    } else if ((session?.user as any)?.role === 'recruiter') {
        redirect('/recruiter/dashboard');
    }

    return (
        <AppShell>
            <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 animate-[fade-in_0.4s_ease-out]">
                <BackToDashboard />
                <PrivateProfileEditor />
            </div>
        </AppShell>
    );
}
