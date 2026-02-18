import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../lib/mongodb';
import { getUserId } from '../../../../lib/auth-helpers';
import mongoose from 'mongoose';

/**
 * Export copy event schema — tracks when a user copies export output.
 * Spec ref: Section 5.1 export_events entity
 */
const ExportEventSchema = new mongoose.Schema({
    candidateUserId: { type: String, required: true, index: true },
    projectId: { type: String, default: null },
    siteKey: { type: String, required: true, index: true },
    variant: { type: String, enum: ['short', 'standard', 'long'], required: true },
    sectionKey: { type: String, default: null }, // null = copied all
    linkIncluded: { type: Boolean, default: false },
    charCount: { type: Number, default: 0 },
    copiedAt: { type: Date, default: Date.now, index: true },
});

const ExportEvent =
    mongoose.models.ExportEvent || mongoose.model('ExportEvent', ExportEventSchema);

/**
 * POST /api/export/copy-event
 * Records a copy event for analytics (KPI: export usage rate, per-platform tracking).
 */
export async function POST(request: NextRequest) {
    try {
        await connectToDatabase();
        const userId = await getUserId(request);
        const body = await request.json();

        const event = await ExportEvent.create({
            candidateUserId: userId,
            projectId: body.projectId || null,
            siteKey: body.siteKey,
            variant: body.variant || 'standard',
            sectionKey: body.sectionKey || null,
            linkIncluded: body.linkIncluded || false,
            charCount: body.charCount || 0,
        });

        return NextResponse.json({ success: true, eventId: event._id }, { status: 201 });
    } catch (error) {
        console.error('Error recording export event:', error);
        return NextResponse.json(
            { error: 'Failed to record export event' },
            { status: 500 },
        );
    }
}

/**
 * GET /api/export/copy-event?projectId=xxx
 * Returns copy events for the current user (for "which platforms pasted into" tracking).
 */
export async function GET(request: NextRequest) {
    try {
        await connectToDatabase();
        const userId = await getUserId(request);
        const projectId = request.nextUrl.searchParams.get('projectId');

        const filter: Record<string, string> = { candidateUserId: userId };
        if (projectId) filter.projectId = projectId;

        const events = await ExportEvent.find(filter)
            .sort({ copiedAt: -1 })
            .limit(100)
            .lean();

        return NextResponse.json({ events }, { status: 200 });
    } catch (error) {
        console.error('Error fetching export events:', error);
        return NextResponse.json(
            { error: 'Failed to fetch export events' },
            { status: 500 },
        );
    }
}
