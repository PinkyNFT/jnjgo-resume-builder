import { NextResponse } from 'next/server';
import { routeErrorResponse } from '../../../../lib/api-error';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';
import { connectToDatabase } from '../../../../lib/mongodb';
import { ExportEventModel } from '../../../../lib/models';
import { ExportEvent } from '../../../../types';

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const data: Partial<ExportEvent> = await req.json();

        if (!data.siteKey) {
            return NextResponse.json({ error: 'siteKey is required' }, { status: 400 });
        }

        await connectToDatabase();

        const exportEvent = new ExportEventModel({
            userId: session.user.id,
            projectId: data.projectId ?? null,
            siteKey: data.siteKey,
            variant: data.variant || 'standard',
            linkIncluded: data.linkIncluded ?? false,
        });

        await exportEvent.save();

        return NextResponse.json({ success: true, eventId: exportEvent._id });
    } catch (error) {
        return routeErrorResponse(error, 'POST /api/export/events');
    }
}
