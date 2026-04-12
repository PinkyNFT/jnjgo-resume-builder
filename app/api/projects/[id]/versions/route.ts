import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../../lib/mongodb';
import { ResumeVersionModel } from '../../../../../lib/models';
import { ResumeVersion } from '../../../../../types';
import { getUserId } from '../../../../../lib/auth-helpers';
import { isValidProjectId } from '../../../../../lib/validator';

const MAX_VERSIONS_PER_PROJECT = 50;

/**
 * GET /api/projects/[id]/versions
 * List all versions for a project (newest first)
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await connectToDatabase();
        const userId = await getUserId(request);
        const { id: projectId } = await params;

        if (!isValidProjectId(projectId)) {
            return NextResponse.json({ error: 'Invalid project ID format' }, { status: 400 });
        }

        const versions = await ResumeVersionModel.find({ userId, projectId })
            .sort({ createdAt: -1 })
            .lean();

        const transformed: ResumeVersion[] = versions.map(v => ({
            id: v.id,
            projectId: v.projectId,
            label: v.label,
            trigger: v.trigger,
            data: v.data,
            evaluation: v.evaluation,
            createdAt: v.createdAt,
        }));

        return NextResponse.json({ versions: transformed }, { status: 200 });
    } catch (error) {
        if (error instanceof NextResponse) return error;
        console.error('Error fetching versions:', error);
        return NextResponse.json(
            { error: 'Failed to fetch versions', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/projects/[id]/versions
 * Create a new version snapshot
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await connectToDatabase();
        const userId = await getUserId(request);
        const { id: projectId } = await params;

        if (!isValidProjectId(projectId)) {
            return NextResponse.json({ error: 'Invalid project ID format' }, { status: 400 });
        }

        const body = await request.json();
        const { label, trigger, data, evaluation } = body;

        if (!label || !trigger || !data) {
            return NextResponse.json({ error: 'Missing required fields: label, trigger, data' }, { status: 400 });
        }

        const validTriggers = ['manual', 'auto_generated', 'auto_evaluated', 'auto_saved', 'auto_pre_restore', 'auto_pre_interview'];
        if (!validTriggers.includes(trigger)) {
            return NextResponse.json({ error: 'Invalid trigger type' }, { status: 400 });
        }

        const versionId = `v_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const now = Date.now();

        const version = await ResumeVersionModel.create({
            userId,
            id: versionId,
            projectId,
            label,
            trigger,
            data,
            evaluation: evaluation || undefined,
            createdAt: now,
        });

        // Enforce max versions: prune oldest auto-versions if over limit.
        // Run count + candidate-fetch in parallel to save one round-trip.
        const [totalCount, oldAutoVersions] = await Promise.all([
            ResumeVersionModel.countDocuments({ userId, projectId }),
            ResumeVersionModel.find({ userId, projectId, trigger: { $ne: 'manual' } })
                .sort({ createdAt: 1 })
                .select('_id')
                .lean(),
        ]);

        if (totalCount > MAX_VERSIONS_PER_PROJECT) {
            const excess = totalCount - MAX_VERSIONS_PER_PROJECT;
            const toDelete = oldAutoVersions.slice(0, excess).map(v => v._id);
            if (toDelete.length > 0) {
                await ResumeVersionModel.deleteMany({ _id: { $in: toDelete } });
            }
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

        return NextResponse.json({ version: transformed }, { status: 201 });
    } catch (error) {
        if (error instanceof NextResponse) return error;
        console.error('Error creating version:', error);
        return NextResponse.json(
            { error: 'Failed to create version', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
