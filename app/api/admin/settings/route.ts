import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { requireAdmin, logAdminAction, getClientIp } from '@/lib/admin-auth';
import {
    AdminSettingsModel,
    seedDefaultSettings,
    invalidateSettingsCache,
    getAllCachedSettings
} from '@/lib/admin-models';

/**
 * GET /api/admin/settings
 * Returns all admin settings grouped by category
 */
export async function GET(request: NextRequest) {
    const admin = await requireAdmin(request);
    if (admin instanceof NextResponse) return admin;

    try {
        await connectToDatabase();
        await seedDefaultSettings(admin.userId);

        const settings = await AdminSettingsModel.find({})
            .sort({ category: 1, key: 1 })
            .lean();

        return NextResponse.json({ settings }, { status: 200 });
    } catch (error) {
        console.error('Error fetching settings:', error);
        return NextResponse.json(
            { error: 'Failed to fetch settings' },
            { status: 500 }
        );
    }
}

/**
 * PUT /api/admin/settings
 * Updates a single setting by key
 * Body: { key: string, value: any }
 */
export async function PUT(request: NextRequest) {
    const admin = await requireAdmin(request);
    if (admin instanceof NextResponse) return admin;

    try {
        await connectToDatabase();

        const { key, value } = await request.json();

        if (!key) {
            return NextResponse.json({ error: 'Setting key is required' }, { status: 400 });
        }

        const existing = await AdminSettingsModel.findOne({ key }).lean();
        if (!existing) {
            return NextResponse.json({ error: `Setting '${key}' not found` }, { status: 404 });
        }

        // Type validation
        if (existing.valueType === 'number' && typeof value !== 'number') {
            return NextResponse.json({ error: `Value for '${key}' must be a number` }, { status: 400 });
        }
        if (existing.valueType === 'boolean' && typeof value !== 'boolean') {
            return NextResponse.json({ error: `Value for '${key}' must be a boolean` }, { status: 400 });
        }
        if (existing.valueType === 'select' && existing.options && !existing.options.includes(value)) {
            return NextResponse.json(
                { error: `Value for '${key}' must be one of: ${existing.options.join(', ')}` },
                { status: 400 }
            );
        }

        const oldValue = existing.value;

        const updated = await AdminSettingsModel.findOneAndUpdate(
            { key },
            { $set: { value, updatedBy: admin.userId } },
            { returnDocument: 'after' }
        ).lean();

        // Invalidate cache
        invalidateSettingsCache(key);

        // Audit log
        logAdminAction(admin, 'settings.update', `settings:${key}`, {
            oldValue,
            newValue: value
        }, getClientIp(request));

        return NextResponse.json({ setting: updated }, { status: 200 });
    } catch (error) {
        console.error('Error updating setting:', error);
        return NextResponse.json(
            { error: 'Failed to update setting' },
            { status: 500 }
        );
    }
}
