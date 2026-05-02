import { NextRequest, NextResponse } from 'next/server';
import { routeErrorResponse } from '../../../../lib/api-error';
import { connectToDatabase } from '../../../../lib/mongodb';
import { ProjectModel } from '../../../../lib/models';
import { Project } from '../../../../types';
import { getUserId } from '../../../../lib/auth-helpers';
import {
    validateProjectUpdate,
    isValidProjectId,
    sanitizeProject,
    createValidationErrorResponse
} from '../../../../lib/validator';

/**
 * GET /api/projects/[id]
 * Retrieves a specific project by ID
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await connectToDatabase();

        const userId = await getUserId(request);
        const { id } = await params;

        // Validate project ID format
        if (!isValidProjectId(id)) {
            return NextResponse.json(
                { error: 'Invalid project ID format' },
                { status: 400 }
            );
        }

        const project = await ProjectModel.findOne({ id, userId }).lean();

        if (!project) {
            return NextResponse.json(
                { error: 'Project not found' },
                { status: 404 }
            );
        }

        const transformedProject: Project = {
            id: project.id,
            title: project.title,
            roleType: project.roleType,

            updatedAt: project.updatedAt,
            status: project.status,
            history: project.history || [],
            importData: project.importData,
            data: project.data,
            evaluation: project.evaluation
        };

        return NextResponse.json({ project: transformedProject }, { status: 200 });
    } catch (error) {
        if (error instanceof NextResponse) return error;
        return routeErrorResponse(error, 'GET /api/projects/[id]');
    }
}

/**
 * PUT /api/projects/[id]
 * Updates a specific project
 */
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await connectToDatabase();

        const userId = await getUserId(request);
        const { id } = await params;

        // Validate project ID format
        if (!isValidProjectId(id)) {
            return NextResponse.json(
                { error: 'Invalid project ID format' },
                { status: 400 }
            );
        }

        const body: Project = await request.json();

        // Validate update data
        const validationErrors = validateProjectUpdate(body);
        if (validationErrors.length > 0) {
            return NextResponse.json(
                createValidationErrorResponse(validationErrors),
                { status: 400 }
            );
        }

        const sanitizedProject = sanitizeProject(body);

        const project = await ProjectModel.findOneAndUpdate(
            { id, userId },
            {
                title: sanitizedProject.title,
                roleType: sanitizedProject.roleType,

                updatedAt: sanitizedProject.updatedAt || Date.now(),
                status: sanitizedProject.status,
                history: sanitizedProject.history,
                importData: sanitizedProject.importData,
                data: sanitizedProject.data,
                evaluation: sanitizedProject.evaluation
            },
            {
                returnDocument: 'after',
                runValidators: true
            }
        ).lean();

        if (!project) {
            return NextResponse.json(
                { error: 'Project not found' },
                { status: 404 }
            );
        }

        const transformedProject: Project = {
            id: project.id,
            title: project.title,
            roleType: project.roleType,

            updatedAt: project.updatedAt,
            status: project.status,
            history: project.history || [],
            importData: project.importData,
            data: project.data,
            evaluation: project.evaluation
        };

        return NextResponse.json({ project: transformedProject }, { status: 200 });
    } catch (error) {
        if (error instanceof NextResponse) return error;
        return routeErrorResponse(error, 'PUT /api/projects/[id]');
    }
}

/**
 * DELETE /api/projects/[id]
 * Deletes a specific project
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await connectToDatabase();

        const userId = await getUserId(request);
        const { id } = await params;

        // Validate project ID format
        if (!isValidProjectId(id)) {
            return NextResponse.json(
                { error: 'Invalid project ID format' },
                { status: 400 }
            );
        }

        const result = await ProjectModel.deleteOne({ id, userId });

        if (result.deletedCount === 0) {
            return NextResponse.json(
                { error: 'Project not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        if (error instanceof NextResponse) return error;
        return routeErrorResponse(error, 'DELETE /api/projects/[id]');
    }
}
