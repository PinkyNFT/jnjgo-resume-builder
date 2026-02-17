import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { requireAdmin, logAdminAction, getClientIp } from '@/lib/admin-auth';
import { PromptTemplateModel, invalidatePromptCache, snapshotPromptBeforeUpdate, getPromptHistory } from '@/lib/admin-models';
import { getDefaultPromptBySlug, DEFAULT_PROMPT_TEMPLATES } from '@/lib/prompt-defaults';
import { getPromptComparisons } from '@/lib/admin-settings-reader';

/**
 * GET /api/admin/prompts
 *
 * Query params:
 *   ?defaults=true   → returns the base default templates from code
 *   ?compare=true    → returns layered comparison (base vs. override) for all prompts
 *   ?history=<slug>  → returns version history for a specific prompt slug
 *   (default)        → returns all DB prompt overrides
 */
export async function GET(request: NextRequest) {
    const admin = await requireAdmin(request);
    if (admin instanceof NextResponse) return admin;

    const { searchParams } = new URL(request.url);

    // Return base defaults from code
    if (searchParams.get('defaults') === 'true') {
        return NextResponse.json({ defaults: DEFAULT_PROMPT_TEMPLATES }, { status: 200 });
    }

    // Return layered comparison view (base + overrides)
    if (searchParams.get('compare') === 'true') {
        try {
            const comparisons = await getPromptComparisons();
            return NextResponse.json({ comparisons }, { status: 200 });
        } catch (error) {
            console.error('Error fetching prompt comparisons:', error);
            return NextResponse.json(
                { error: 'Failed to fetch prompt comparisons' },
                { status: 500 }
            );
        }
    }

    // Return version history for a specific prompt
    const historySlug = searchParams.get('history');
    if (historySlug) {
        try {
            await connectToDatabase();
            const limit = parseInt(searchParams.get('limit') || '20', 10);
            const history = await getPromptHistory(historySlug, Math.min(limit, 50));
            return NextResponse.json({ history }, { status: 200 });
        } catch (error) {
            console.error('Error fetching prompt history:', error);
            return NextResponse.json(
                { error: 'Failed to fetch prompt history' },
                { status: 500 }
            );
        }
    }

    // Default: return all DB prompt overrides
    try {
        await connectToDatabase();

        const prompts = await PromptTemplateModel.find({})
            .sort({ slug: 1 })
            .lean();

        return NextResponse.json({ prompts }, { status: 200 });
    } catch (error) {
        console.error('Error fetching prompts:', error);
        return NextResponse.json(
            { error: 'Failed to fetch prompts' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/admin/prompts
 * Creates a new prompt template
 */
export async function POST(request: NextRequest) {
    const admin = await requireAdmin(request);
    if (admin instanceof NextResponse) return admin;

    try {
        await connectToDatabase();

        const body = await request.json();
        const { slug, name, description, contentEn, contentJa, useDefaults } = body;

        // If useDefaults is true, populate from prompt-defaults.ts
        let finalContentEn = contentEn;
        let finalContentJa = contentJa;
        let finalName = name;
        let finalDescription = description;

        if (useDefaults && slug) {
            const defaultPrompt = getDefaultPromptBySlug(slug);
            if (defaultPrompt) {
                finalContentEn = finalContentEn || defaultPrompt.contentEn;
                finalContentJa = finalContentJa || defaultPrompt.contentJa;
                finalName = finalName || defaultPrompt.name;
                finalDescription = finalDescription || defaultPrompt.description;
            }
        }

        if (!slug || !finalName || !finalContentEn || !finalContentJa) {
            return NextResponse.json(
                { error: 'slug, name, contentEn, and contentJa are required' },
                { status: 400 }
            );
        }

        // Check for duplicate slug
        const existing = await PromptTemplateModel.findOne({ slug }).lean();
        if (existing) {
            return NextResponse.json(
                { error: `Prompt with slug '${slug}' already exists` },
                { status: 409 }
            );
        }

        const prompt = await PromptTemplateModel.create({
            slug,
            name: finalName,
            description: finalDescription || '',
            contentEn: finalContentEn,
            contentJa: finalContentJa,
            isActive: true,
            version: 1,
            updatedBy: admin.userId
        });

        logAdminAction(admin, 'prompt.create', `prompt:${slug}`, {
            name: finalName
        }, getClientIp(request));

        return NextResponse.json({ prompt }, { status: 201 });
    } catch (error) {
        console.error('Error creating prompt:', error);
        return NextResponse.json(
            { error: 'Failed to create prompt' },
            { status: 500 }
        );
    }
}

/**
 * PUT /api/admin/prompts
 * Updates an existing prompt template by slug.
 *
 * Body: { slug, contentEn?, contentJa?, name?, description?, isActive?, changeReason?, reset? }
 *
 * If `reset=true` is included, resets the prompt to its base default from prompt-defaults.ts.
 * Content changes are version-tracked: a snapshot is saved to promptHistory before overwriting.
 */
export async function PUT(request: NextRequest) {
    const admin = await requireAdmin(request);
    if (admin instanceof NextResponse) return admin;

    try {
        await connectToDatabase();

        const body = await request.json();
        const { slug, reset, changeReason, ...updates } = body;

        if (!slug) {
            return NextResponse.json({ error: 'Prompt slug is required' }, { status: 400 });
        }

        const existing = await PromptTemplateModel.findOne({ slug }).lean();

        // ── RESET TO DEFAULT ──
        if (reset === true) {
            const defaultPrompt = getDefaultPromptBySlug(slug);
            if (!defaultPrompt) {
                return NextResponse.json(
                    { error: `No base default found for slug '${slug}'` },
                    { status: 404 }
                );
            }

            if (existing) {
                // Snapshot current state before resetting
                await snapshotPromptBeforeUpdate(slug, admin.userId, changeReason || 'Reset to default');

                const updated = await PromptTemplateModel.findOneAndUpdate(
                    { slug },
                    {
                        $set: {
                            contentEn: defaultPrompt.contentEn,
                            contentJa: defaultPrompt.contentJa,
                            name: defaultPrompt.name,
                            description: defaultPrompt.description,
                            updatedBy: admin.userId,
                        },
                        $inc: { version: 1 }
                    },
                    { returnDocument: 'after' }
                ).lean();

                invalidatePromptCache(slug);

                logAdminAction(admin, 'prompt.reset', `prompt:${slug}`, {
                    previousVersion: existing.version,
                    reason: changeReason || 'Reset to default',
                }, getClientIp(request));

                return NextResponse.json({ prompt: updated, wasReset: true }, { status: 200 });
            } else {
                // No override existed — nothing to reset
                return NextResponse.json({
                    message: `Prompt '${slug}' has no override; already using base defaults.`,
                    wasReset: false,
                }, { status: 200 });
            }
        }

        // ── STANDARD UPDATE ──
        if (!existing) {
            return NextResponse.json({ error: `Prompt '${slug}' not found` }, { status: 404 });
        }

        // Snapshot current state before updating (only for content changes)
        const hasContentChange = updates.contentEn !== undefined || updates.contentJa !== undefined;
        if (hasContentChange) {
            await snapshotPromptBeforeUpdate(slug, admin.userId, changeReason || '');
        }

        // Build update object, only include provided fields
        const updateFields: Record<string, unknown> = { updatedBy: admin.userId };
        if (updates.contentEn !== undefined) updateFields.contentEn = updates.contentEn;
        if (updates.contentJa !== undefined) updateFields.contentJa = updates.contentJa;
        if (updates.name !== undefined) updateFields.name = updates.name;
        if (updates.description !== undefined) updateFields.description = updates.description;
        if (updates.isActive !== undefined) updateFields.isActive = updates.isActive;

        const updated = await PromptTemplateModel.findOneAndUpdate(
            { slug },
            {
                $set: updateFields,
                $inc: { version: 1 }
            },
            { returnDocument: 'after' }
        ).lean();

        // Invalidate cache for this prompt
        invalidatePromptCache(slug);

        logAdminAction(admin, 'prompt.update', `prompt:${slug}`, {
            fieldsUpdated: Object.keys(updateFields).filter(k => k !== 'updatedBy'),
            newVersion: (existing.version || 0) + 1,
            changeReason: changeReason || undefined,
        }, getClientIp(request));

        return NextResponse.json({ prompt: updated }, { status: 200 });
    } catch (error) {
        console.error('Error updating prompt:', error);
        return NextResponse.json(
            { error: 'Failed to update prompt' },
            { status: 500 }
        );
    }
}
