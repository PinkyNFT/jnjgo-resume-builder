import mongoose, { Schema, Model, Document, Types } from 'mongoose';

// ===== INTERFACES =====

export interface IAdminSettingsDocument extends Document {
    key: string;
    value: mongoose.Schema.Types.Mixed;
    label: string;
    description: string;
    category: 'ai' | 'app' | 'security' | 'limits';
    valueType: 'string' | 'number' | 'boolean' | 'select';
    options?: string[]; // for select type
    updatedBy: string;
    updatedAt: Date;
    createdAt: Date;
}

export interface IPromptTemplateDocument extends Document {
    slug: string; // unique identifier: 'system_instruction', 'analyze_import', 'evaluate_resume', 'parse_resume'
    name: string;
    description: string;
    contentEn: string;
    contentJa: string;
    isActive: boolean;
    version: number;
    updatedBy: string;
    updatedAt: Date;
    createdAt: Date;
}

export interface IPromptHistoryDocument extends Document {
    slug: string;
    version: number;
    contentEn: string;
    contentJa: string;
    changedBy: string;
    changeReason: string;
    createdAt: Date;
}

export interface IAuditLogDocument extends Document {
    userId: string;
    userEmail: string;
    action: string; // e.g. 'settings.update', 'prompt.update', 'user.role_change'
    resource: string; // e.g. 'settings:gemini_model', 'prompt:system_instruction'
    details: Record<string, unknown>;
    ipAddress?: string;
    createdAt: Date;
}

export interface IAdminUserDocument extends Document {
    userId: string; // references the NextAuth user id
    email: string;
    name: string;
    role: 'admin' | 'super_admin';
    isActive: boolean;
    lastLogin?: Date;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
}

// ===== SCHEMAS =====

const AdminSettingsSchema = new Schema<IAdminSettingsDocument>({
    key: { type: String, required: true, unique: true, index: true },
    value: { type: Schema.Types.Mixed, required: true },
    label: { type: String, required: true },
    description: { type: String, default: '' },
    category: {
        type: String,
        enum: ['ai', 'app', 'security', 'limits'],
        required: true,
        index: true
    },
    valueType: {
        type: String,
        enum: ['string', 'number', 'boolean', 'select'],
        required: true
    },
    options: [{ type: String }],
    updatedBy: { type: String, required: true }
}, {
    timestamps: true,
    collection: 'adminSettings'
});

const PromptTemplateSchema = new Schema<IPromptTemplateDocument>({
    slug: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    contentEn: { type: String, required: true },
    contentJa: { type: String, required: true },
    isActive: { type: Boolean, default: true, index: true },
    version: { type: Number, default: 1 },
    updatedBy: { type: String, required: true }
}, {
    timestamps: true,
    collection: 'promptTemplates'
});

// Compound index for fetching active prompts efficiently
PromptTemplateSchema.index({ slug: 1, isActive: 1 });

const PromptHistorySchema = new Schema<IPromptHistoryDocument>({
    slug: { type: String, required: true, index: true },
    version: { type: Number, required: true },
    contentEn: { type: String, required: true },
    contentJa: { type: String, required: true },
    changedBy: { type: String, required: true },
    changeReason: { type: String, default: '' },
}, {
    timestamps: true,
    collection: 'promptHistory'
});

// Compound index for efficient version lookups per slug
PromptHistorySchema.index({ slug: 1, version: -1 });
// TTL index: auto-delete prompt history after 1 year
PromptHistorySchema.index({ createdAt: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

const AuditLogSchema = new Schema<IAuditLogDocument>({
    userId: { type: String, required: true, index: true },
    userEmail: { type: String, required: true },
    action: { type: String, required: true, index: true },
    resource: { type: String, required: true },
    details: { type: Schema.Types.Mixed, default: {} },
    ipAddress: { type: String }
}, {
    timestamps: true,
    collection: 'auditLogs'
});

// TTL index: auto-delete audit logs after 90 days for storage efficiency
AuditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });
// Compound index for admin queries
AuditLogSchema.index({ action: 1, createdAt: -1 });

const AdminUserSchema = new Schema<IAdminUserDocument>({
    userId: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    role: {
        type: String,
        enum: ['admin', 'super_admin'],
        default: 'admin'
    },
    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date },
    createdBy: { type: String, required: true }
}, {
    timestamps: true,
    collection: 'adminUsers'
});

AdminUserSchema.index({ email: 1, isActive: 1 });

// ===== MODELS =====

export const AdminSettingsModel: Model<IAdminSettingsDocument> =
    mongoose.models.AdminSettings || mongoose.model<IAdminSettingsDocument>('AdminSettings', AdminSettingsSchema);

export const PromptTemplateModel: Model<IPromptTemplateDocument> =
    mongoose.models.PromptTemplate || mongoose.model<IPromptTemplateDocument>('PromptTemplate', PromptTemplateSchema);

export const PromptHistoryModel: Model<IPromptHistoryDocument> =
    mongoose.models.PromptHistory || mongoose.model<IPromptHistoryDocument>('PromptHistory', PromptHistorySchema);

export const AuditLogModel: Model<IAuditLogDocument> =
    mongoose.models.AuditLog || mongoose.model<IAuditLogDocument>('AuditLog', AuditLogSchema);

export const AdminUserModel: Model<IAdminUserDocument> =
    mongoose.models.AdminUser || mongoose.model<IAdminUserDocument>('AdminUser', AdminUserSchema);

// ===== CACHE LAYER =====
// In-memory cache for settings to avoid hammering MongoDB on every API call
// Settings change infrequently, so a short TTL is fine

interface CacheEntry<T> {
    data: T;
    expiry: number;
}

const settingsCache = new Map<string, CacheEntry<unknown>>();
const CACHE_TTL = 60 * 1000; // 60 seconds

export async function getCachedSetting<T>(key: string): Promise<T | null> {
    const cached = settingsCache.get(key);
    if (cached && cached.expiry > Date.now()) {
        return cached.data as T;
    }

    const doc = await AdminSettingsModel.findOne({ key }).lean();
    if (!doc) return null;

    settingsCache.set(key, { data: doc.value, expiry: Date.now() + CACHE_TTL });
    return doc.value as T;
}

export async function getAllCachedSettings(): Promise<Record<string, unknown>> {
    const cachedAll = settingsCache.get('__all__');
    if (cachedAll && cachedAll.expiry > Date.now()) {
        return cachedAll.data as Record<string, unknown>;
    }

    const docs = await AdminSettingsModel.find({}).lean();
    const result: Record<string, unknown> = {};
    for (const doc of docs) {
        result[doc.key] = doc.value;
        settingsCache.set(doc.key, { data: doc.value, expiry: Date.now() + CACHE_TTL });
    }
    settingsCache.set('__all__', { data: result, expiry: Date.now() + CACHE_TTL });
    return result;
}

export function invalidateSettingsCache(key?: string): void {
    if (key) {
        settingsCache.delete(key);
    }
    settingsCache.delete('__all__');
}

// Cached prompt template fetcher
const promptCache = new Map<string, CacheEntry<IPromptTemplateDocument>>();
const PROMPT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes (prompts change less frequently)

export async function getCachedPrompt(slug: string): Promise<IPromptTemplateDocument | null> {
    const cached = promptCache.get(slug);
    if (cached && cached.expiry > Date.now()) {
        return cached.data;
    }

    const doc = await PromptTemplateModel.findOne({ slug, isActive: true }).lean() as IPromptTemplateDocument | null;
    if (!doc) return null;

    promptCache.set(slug, { data: doc, expiry: Date.now() + PROMPT_CACHE_TTL });
    return doc;
}

export function invalidatePromptCache(slug?: string): void {
    if (slug) {
        promptCache.delete(slug);
    } else {
        promptCache.clear();
    }
}

// ===== PROMPT HISTORY HELPERS =====

/**
 * Snapshots the current prompt state into history before applying an update.
 * Non-blocking — failures are logged but do not interrupt the caller.
 */
export async function snapshotPromptBeforeUpdate(
    slug: string,
    changedBy: string,
    changeReason: string = ''
): Promise<void> {
    try {
        const current = await PromptTemplateModel.findOne({ slug }).lean();
        if (!current) return;

        await PromptHistoryModel.create({
            slug,
            version: current.version ?? 1,
            contentEn: current.contentEn,
            contentJa: current.contentJa,
            changedBy,
            changeReason,
        });
    } catch (err) {
        console.error(`Failed to snapshot prompt history for "${slug}":`, err);
    }
}

/**
 * Returns the version history for a prompt slug, newest-first.
 */
export async function getPromptHistory(
    slug: string,
    limit: number = 20
): Promise<IPromptHistoryDocument[]> {
    return PromptHistoryModel
        .find({ slug })
        .sort({ version: -1 })
        .limit(limit)
        .lean() as unknown as IPromptHistoryDocument[];
}

// ===== DEFAULT SETTINGS SEED =====
// Called on first admin access to ensure defaults exist

export const DEFAULT_SETTINGS = [
    {
        key: 'gemini_model',
        value: 'gemini-3-flash-preview',
        label: 'AI Model',
        description: 'The Gemini model used for chat and resume generation',
        category: 'ai' as const,
        valueType: 'select' as const,
        options: ['gemini-3-flash-preview', 'gemini-2.0-flash', 'gemini-2.5-pro-preview-06-05', 'gemma-3-12b-it']
    },
    {
        key: 'ai_temperature',
        value: 0.7,
        label: 'AI Temperature',
        description: 'Controls randomness in AI responses (0.0 = deterministic, 1.0 = creative)',
        category: 'ai' as const,
        valueType: 'number' as const
    },
    {
        key: 'max_conversation_turns',
        value: 50,
        label: 'Max Conversation Turns',
        description: 'Maximum number of back-and-forth turns in a single interview session',
        category: 'limits' as const,
        valueType: 'number' as const
    },
    {
        key: 'max_projects_per_user',
        value: 10,
        label: 'Max Projects per User',
        description: 'Maximum number of resume projects a user can create',
        category: 'limits' as const,
        valueType: 'number' as const
    },
    {
        key: 'resume_import_max_chars',
        value: 10000,
        label: 'Resume Import Max Characters',
        description: 'Maximum character count for imported resume text',
        category: 'limits' as const,
        valueType: 'number' as const
    },
    {
        key: 'session_max_age_days',
        value: 30,
        label: 'Session Max Age (Days)',
        description: 'How long user sessions remain valid',
        category: 'security' as const,
        valueType: 'number' as const
    },
    {
        key: 'require_recruiter_verification',
        value: false,
        label: 'Require Recruiter Verification',
        description: 'When enabled, new recruiter accounts must be manually approved by an admin before they can access the platform.',
        category: 'security' as const,
        valueType: 'boolean' as const
    },
    {
        key: 'allow_anonymous_users',
        value: false,
        label: 'Allow Anonymous Users',
        description: 'Whether unauthenticated users can create projects',
        category: 'security' as const,
        valueType: 'boolean' as const
    },
    {
        key: 'app_maintenance_mode',
        value: false,
        label: 'Maintenance Mode',
        description: 'When enabled, only admins can access the application',
        category: 'app' as const,
        valueType: 'boolean' as const
    },
    {
        key: 'gap_detection_threshold_days',
        value: 90,
        label: 'Gap Detection Threshold (Days)',
        description: 'Minimum number of days between positions to flag as a career gap',
        category: 'app' as const,
        valueType: 'number' as const
    },
    {
        key: 'passing_score_threshold',
        value: 80,
        label: 'Passing Score Threshold',
        description: 'Minimum total score for a resume to be considered submission-ready',
        category: 'app' as const,
        valueType: 'number' as const
    },
    {
        key: 'rate_limit_ai_requests',
        value: 15,
        label: 'AI Rate Limit — Max Requests',
        description: 'Maximum number of AI requests (chat, parse, analyze) allowed per user per window. Enforced across all server instances via MongoDB.',
        category: 'limits' as const,
        valueType: 'number' as const
    },
    {
        key: 'rate_limit_ai_window_seconds',
        value: 60,
        label: 'AI Rate Limit — Window (seconds)',
        description: 'Duration of the rate limit window in seconds for AI endpoints.',
        category: 'limits' as const,
        valueType: 'number' as const
    }
];

export async function seedDefaultSettings(adminUserId: string): Promise<void> {
    const ops = DEFAULT_SETTINGS.map(setting => ({
        updateOne: {
            filter: { key: setting.key },
            update: { $setOnInsert: { ...setting, updatedBy: adminUserId } as Record<string, unknown> },
            upsert: true,
        },
    }));
    await AdminSettingsModel.bulkWrite(ops, { ordered: false });
}
