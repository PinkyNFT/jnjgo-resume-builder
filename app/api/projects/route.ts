import { NextRequest, NextResponse } from 'next/server';
import { routeErrorResponse } from '../../../lib/api-error';
import { connectToDatabase } from '../../../lib/mongodb';
import { ProjectModel } from '../../../lib/models';
import { Project } from '../../../types';
import { getUserId } from '../../../lib/auth-helpers';
import {
    validateProjectCreate,
    sanitizeProject,
    createValidationErrorResponse
} from '../../../lib/validator';

/**
 * GET /api/projects
 * Retrieves all projects for the user.
 * Uses field projection to exclude heavy fields (history, full data)
 * from the listing endpoint. Individual project GET returns full data.
 */
export async function GET(request: NextRequest) {
    try {
        await connectToDatabase();

        const userId = await getUserId(request);

        // Project listing only needs metadata — exclude heavy fields
        const projects = await ProjectModel.find({ userId })
            .select('id title roleType updatedAt status evaluation importData data.fullName data.currentRole data.careerSummary data.skills')
            .sort({ updatedAt: -1 })
            .lean();

        // Transform MongoDB documents to Project interface
        const transformedProjects: Project[] = projects.map(proj => ({
            id: proj.id,
            title: proj.title,
            roleType: proj.roleType,

            updatedAt: proj.updatedAt,
            status: proj.status,
            history: [],
            importData: proj.importData,
            data: proj.data,
            evaluation: proj.evaluation
        }));

        return NextResponse.json({ projects: transformedProjects }, { status: 200 });
    } catch (error) {
        if (error instanceof NextResponse) return error;
        return routeErrorResponse(error, 'GET /api/projects');
    }
}

/**
 * POST /api/projects
 * Creates a new project
 */
export async function POST(request: NextRequest) {
    try {
        await connectToDatabase();

        const userId = await getUserId(request);
        const body: Project = await request.json();

        // Validate input
        const validationErrors = validateProjectCreate(body);
        if (validationErrors.length > 0) {
            return NextResponse.json(
                createValidationErrorResponse(validationErrors),
                { status: 400 }
            );
        }

        const sanitizedProject = sanitizeProject(body);

        const project = await ProjectModel.create({
            userId,
            id: sanitizedProject.id,
            title: sanitizedProject.title,
            roleType: sanitizedProject.roleType,

            updatedAt: sanitizedProject.updatedAt || Date.now(),
            status: sanitizedProject.status || 'draft',
            history: sanitizedProject.history || [],
            importData: sanitizedProject.importData,
            data: sanitizedProject.data,
            evaluation: sanitizedProject.evaluation
        });

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

        return NextResponse.json({ project: transformedProject }, { status: 201 });
    } catch (error) {
        if (error instanceof NextResponse) return error;
        // Handle duplicate key error
        if (error instanceof Error && 'code' in error && (error as any).code === 11000) {
            return NextResponse.json(
                { error: 'Project with this ID already exists' },
                { status: 409 }
            );
        }

        return routeErrorResponse(error, 'POST /api/projects');
    }
}
