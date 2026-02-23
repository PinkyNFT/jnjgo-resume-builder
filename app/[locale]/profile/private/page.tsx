import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";
import { redirect } from "next/navigation";
import PrivateProfileEditor from "../../../../components/profile/PrivateProfileEditor";
import AppShell from "../../../../components/navigation/AppShell";

export default async function PrivateProfilePage() {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
        redirect('/');
    }

    return (
        <AppShell>
            <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 animate-[fade-in_0.4s_ease-out]">
                <PrivateProfileEditor />
            </div>
        </AppShell>
    );
}
