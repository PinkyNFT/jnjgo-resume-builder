import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../../../lib/mongodb';
import { ResumeVersionModel } from '../../../../../../lib/models';
import { ResumeVersion } from '../../../../../../types';
import { getUserId } from '../../../../../../lib/auth-helpers';
import { isValidProjectId } from '../../../../../../lib/validator';

/**
 * GET /api/projects/[id]/versions/[versionId]
 * Get a specific version
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; versionId: string }> }
) {
    try {
        await connectToDatabase();
        const userId = await getUserId(request);
        const { id: projectId, versionId } = await params;

        if (!isValidProjectId(projectId)) {
            return NextResponse.json({ error: 'Invalid project ID format' }, { status: 400 });
        }

        const version = await ResumeVersionModel.findOne({ id: versionId, userId, projectId }).lean();

        if (!version) {
            return NextResponse.json({ error: 'Version not found' }, { status: 404 });
        }

        const transformed: ResumeVersion = {
            id: version.id,
            projectId: version.projectId,
            label: version.label,
            trigger: version.trigger,
            data: version.data,
            evaluation: version.evaluation,
            createdAt: version.createdAt,
        };

        return NextResponse.json({ version: transformed }, { status: 200 });
    } catch (error) {
        console.error('Error fetching version:', error);
        return NextResponse.json(
            { error: 'Failed to fetch version', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/projects/[id]/versions/[versionId]
 * Delete a specific version
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; versionId: string }> }
) {
    try {
        await connectToDatabase();
        const userId = await getUserId(request);
        const { id: projectId, versionId } = await params;

        if (!isValidProjectId(projectId)) {
            return NextResponse.json({ error: 'Invalid project ID format' }, { status: 400 });
        }

        const result = await ResumeVersionModel.deleteOne({ id: versionId, userId, projectId });

        if (result.deletedCount === 0) {
            return NextResponse.json({ error: 'Version not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        console.error('Error deleting version:', error);
        return NextResponse.json(
            { error: 'Failed to delete version', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}

/**
 * PATCH /api/projects/[id]/versions/[versionId]
 * Update version label
 */
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; versionId: string }> }
) {
    try {
        await connectToDatabase();
        const userId = await getUserId(request);
        const { id: projectId, versionId } = await params;

        if (!isValidProjectId(projectId)) {
            return NextResponse.json({ error: 'Invalid project ID format' }, { status: 400 });
        }

        const body = await request.json();
        const { label } = body;

        if (!label || typeof label !== 'string' || label.trim().length === 0) {
            return NextResponse.json({ error: 'Label is required' }, { status: 400 });
        }

        const version = await ResumeVersionModel.findOneAndUpdate(
            { id: versionId, userId, projectId },
            { label: label.trim() },
            { returnDocument: 'after' }
        ).lean();

        if (!version) {
            return NextResponse.json({ error: 'Version not found' }, { status: 404 });
        }

        const transformed: ResumeVersion = {
            id: version.id,
            projectId: version.projectId,
            label: version.label,
            trigger: version.trigger,
            data: version.data,
            evaluation: version.evaluation,
            createdAt: version.createdAt,
        };

        return NextResponse.json({ version: transformed }, { status: 200 });
    } catch (error) {
        console.error('Error updating version:', error);
        return NextResponse.json(
            { error: 'Failed to update version', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
