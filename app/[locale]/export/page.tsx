import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import { redirect } from "next/navigation";
import { connectToDatabase } from "../../../lib/mongodb";
import { CandidatePublicPageModel, ProjectModel } from "../../../lib/models";
import ExportHub from "../../../components/export/ExportHub";
import AppShell from "../../../components/navigation/AppShell";

export default async function ExportPage({
    searchParams,
}: {
    searchParams: Promise<{ projectId?: string }>;
}) {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        redirect('/');
    }

    const { projectId } = await searchParams;

    // A projectId is required — export is always tied to a specific project.
    if (!projectId) {
        redirect('/dashboard');
    }

    await connectToDatabase();

    // Fetch the specific project, scoped to this user and must be completed/generated.
    // .lean() returns a plain JS object, preventing Mongoose circular reference
    // serialization errors when passing props to client components.
    const project = await ProjectModel.findOne({
        id: projectId,
        userId: session.user.id,
        status: { $in: ['completed', 'generated'] },
    }).lean();

    if (!project || !project.data) {
        redirect('/dashboard');
    }

    // Fetch their public page slug (needed for the generated link)
    // If it doesn't exist, we don't block them, but the link injection will be disabled in the UI.
    const publicPage = await CandidatePublicPageModel.findOne({
        userId: session.user.id,
        isActive: true,
    }).lean();

    return (
        <AppShell>
            <ExportHub
                resumeData={project.data}
                candidateSlug={publicPage?.pageSlug}
                projectId={project.id?.toString()}
                projectTitle={project.title}
            />
        </AppShell>
    );
}
