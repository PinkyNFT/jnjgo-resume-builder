import mongoose, { Schema, Model, Document, Types } from 'mongoose';
import {
    Project,
    UserProfile,
    Message,
    ImportData,
    ResumeData,
    EvaluationResult,
    ProjectStatus,
    RoleType,
    ResumeVersion,
    VersionTrigger,
    CandidatePrivateProfile,
    CandidatePublicPage,
    ExportEvent,
    RecruiterProfile
} from '../types';

// ===== INTERFACES FOR MONGOOSE DOCUMENTS =====

export interface IUserProfileDocument extends Document, Omit<UserProfile, 'id'> {
    userId: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface IProjectDocument extends Omit<Document, '_id'>, Omit<Project, 'id'> {
    _id: Types.ObjectId;
    userId: string;
    id: string;
    createdAt: Date;
}

export interface IResumeVersionDocument extends Omit<Document, '_id'>, Omit<ResumeVersion, 'id'> {
    _id: Types.ObjectId;
    userId: string;
    id: string;
}

export interface ICandidatePrivateProfileDocument extends Omit<Document, '_id'>, Omit<CandidatePrivateProfile, 'id' | 'createdAt' | 'updatedAt'> {
    _id: Types.ObjectId;
    userId: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface ICandidatePublicPageDocument extends Omit<Document, '_id'>, Omit<CandidatePublicPage, 'id' | 'createdAt'> {
    _id: Types.ObjectId;
    userId: string;
    createdAt: Date;
}

export interface IExportEventDocument extends Omit<Document, '_id'>, Omit<ExportEvent, 'id' | 'copiedAt'> {
    _id: Types.ObjectId;
    userId: string;
    projectId?: string | null;
    copiedAt: Date;
}

export interface IRecruiterProfileDocument extends Omit<Document, '_id'>, Omit<RecruiterProfile, 'id' | 'createdAt' | 'updatedAt'> {
    _id: Types.ObjectId;
    userId: string;
    createdAt: Date;
    updatedAt: Date;
}

// ===== SCHEMAS =====

const MessageSchema = new Schema<Message>({
    role: { type: String, enum: ['user', 'model'], required: true },
    text: { type: String, required: true },
    isHint: { type: Boolean, default: false },
    phase: { type: String, enum: ['overview', 'confirmation', 'detail', 'general'] }
}, { _id: false });

const ImportDataSchema = new Schema<ImportData>({
    sourceText: { type: String, required: true },
    parsedSummary: { type: String, required: true },
    extractionDate: { type: Number, required: true }
}, { _id: false });

const ContactInfoSchema = new Schema({
    email: { type: String, default: '' },
    phone: { type: String, default: '' },
    location: { type: String, default: '' },
    linkedin: { type: String },
    age: { type: String },
    department: { type: String }
}, { _id: false });

const TimelineItemSchema = new Schema({
    id: { type: String, required: true },
    period: { type: String, required: true },
    organization: { type: String, required: true },
    role: { type: String, required: true },
    type: { type: String, enum: ['work', 'education'], required: true },
    notes: { type: String },
    duration: { type: String }
}, { _id: false });

const CareerOverviewSchema = new Schema({
    totalExperience: { type: String, default: '' },
    numberOfEmployers: { type: Number, default: 0 },
    averageTenure: { type: String, default: '' },
    areasOfExpertise: [{ type: String }],
    projectCount: { type: String, default: '' },
    typicalDuration: { type: String, default: '' }
}, { _id: false });

const RepresentativeProjectSchema = new Schema({
    id: { type: String, required: true },
    title: { type: String, required: true },
    period: { type: String, required: true },
    clientType: { type: String },
    theme: { type: String },
    teamStructure: { type: String },
    role: { type: String, required: true },
    context: { type: String, required: true },
    contribution: { type: String, required: true },
    challenges: { type: String }
}, { _id: false });

const ProjectPortfolioSchema = new Schema({
    summary: [{ type: String }],
    representativeProjects: [RepresentativeProjectSchema],
    additionalEngagements: { type: String, default: '' }
}, { _id: false });

const GapItemSchema = new Schema({
    period: { type: String, required: true },
    reason: { type: String, required: true },
    isExplained: { type: Boolean, required: true }
}, { _id: false });

const WorkExperienceSchema = new Schema({
    id: { type: String, required: true },
    company: { type: String, required: true },
    position: { type: String, required: true },
    period: { type: String, required: true },
    responsibilities: [{ type: String }]
}, { _id: false });

const EducationSchema = new Schema({
    id: { type: String, required: true },
    degree: { type: String, required: true },
    institution: { type: String, required: true },
    period: { type: String, required: true },
    notes: { type: String }
}, { _id: false });

const SkillTimelineSchema = new Schema({
    id: { type: String, required: true },
    skillName: { type: String, required: true },
    period: { type: String, required: true },
    context: { type: String }
}, { _id: false });

const ResumeDataSchema = new Schema<ResumeData>({
    fullName: { type: String, default: '' },
    currentRole: { type: String, default: '' },
    careerSummary: { type: String, default: '' },
    contactInfo: { type: ContactInfoSchema, required: true },
    timeline: [TimelineItemSchema],
    careerOverview: { type: CareerOverviewSchema, required: true },
    projectPortfolio: { type: ProjectPortfolioSchema, required: true },
    careerGaps: [GapItemSchema],
    workExperience: [WorkExperienceSchema],
    education: [EducationSchema],
    skillTimelines: [SkillTimelineSchema],
    skills: [{ type: String }],
    certifications: [{ type: String }]
}, { _id: false });

const EvaluationResultSchema = new Schema<EvaluationResult>({
    totalScore: { type: Number, required: true },
    isPassing: { type: Boolean, required: true },
    breakdown: {
        structure: { type: Number, required: true },
        reproducibility: { type: Number, required: true },
        roleFit: { type: Number, required: true },
        riskHandling: { type: Number, required: true }
    },
    detailedBreakdown: { type: Schema.Types.Mixed },
    missingItems: [{ type: String }],
    suggestions: [{ type: String }],
    validationMessages: [{ type: String }]
}, { _id: false });

// ===== USER PROFILE SCHEMA =====

const UserProfileSchema = new Schema<IUserProfileDocument>({
    userId: { type: String, required: true, unique: true, index: true },
    fullName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    location: { type: String, required: true },
    linkedin: { type: String }
}, {
    timestamps: true,
    collection: 'userProfiles'
});

// ===== PROJECT SCHEMA =====

const ProjectSchema = new Schema<IProjectDocument>({
    userId: { type: String, required: true, index: true },
    id: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    roleType: { type: String, enum: ['consultant', 'senior_engineer', 'general'], required: true },
    updatedAt: { type: Number, required: true },
    status: {
        type: String,
        enum: ['draft', 'imported', 'interviewing', 'generated', 'completed'],
        default: 'draft'
    },
    history: [MessageSchema],
    importData: { type: ImportDataSchema },
    data: { type: ResumeDataSchema },
    evaluation: { type: EvaluationResultSchema }
}, {
    timestamps: true,
    collection: 'projects'
});

// Indexes for better query performance
ProjectSchema.index({ userId: 1, updatedAt: -1 });
ProjectSchema.index({ userId: 1, status: 1 });

// ===== RESUME VERSION SCHEMA =====

const ResumeVersionSchema = new Schema<IResumeVersionDocument>({
    userId: { type: String, required: true, index: true },
    id: { type: String, required: true, unique: true },
    projectId: { type: String, required: true, index: true },
    label: { type: String, required: true },
    trigger: {
        type: String,
        enum: ['manual', 'auto_generated', 'auto_evaluated', 'auto_saved', 'auto_pre_restore'],
        required: true
    },
    data: { type: ResumeDataSchema, required: true },
    evaluation: { type: EvaluationResultSchema },
    createdAt: { type: Number, required: true }
}, {
    collection: 'resumeVersions'
});

ResumeVersionSchema.index({ userId: 1, projectId: 1, createdAt: -1 });

// ===== ADDENDUM: RECRUITER-ONLY & EXPORT SCHEMAS =====

const CandidatePrivateProfileSchema = new Schema<ICandidatePrivateProfileDocument>({
    userId: { type: String, required: true, unique: true, index: true },
    status: { type: String, enum: ['draft', 'published'], default: 'draft' },
    orientation: { type: String },
    aiObjectiveReview: { type: String },
    jobChangeIntent: { type: String, enum: ['now', 'within_3_months', 'open_to_offers'] },
    desiredSalary: {
        minimum: { type: Number },
        target: { type: Number }
    },
    desiredRoles: [{
        role: { type: String },
        priority: { type: Number }
    }],
    workingConditions: { type: String },
    dealBreakers: [{ type: String }],
    interviewAvailability: { type: String },
    jobChangeReasonSummary: { type: String },
    highlightedProjectId: { type: String, default: null },
    visibilityFlags: {
        isRecruiterOnly: { type: Boolean, default: true }
    }
}, {
    timestamps: true,
    collection: 'candidatePrivateProfiles'
});

const CandidatePublicPageSchema = new Schema<ICandidatePublicPageDocument>({
    userId: { type: String, required: true, unique: true, index: true },
    pageSlug: { type: String, required: true, unique: true, index: true },
    isActive: { type: Boolean, default: false }
}, {
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'candidatePublicPages'
});

const ExportEventSchema = new Schema<IExportEventDocument>({
    userId: { type: String, required: true, index: true },
    projectId: { type: String, default: null, index: true },
    siteKey: { type: String, required: true },
    variant: { type: String, enum: ['short', 'standard', 'long'] },
    linkIncluded: { type: Boolean, required: true },
    copiedAt: { type: Date, default: Date.now }
}, {
    collection: 'exportEvents'
});

const RecruiterProfileSchema = new Schema<IRecruiterProfileDocument>({
    userId: { type: String, required: true, unique: true, index: true },
    companyName: { type: String, required: true },
    jobTitle: { type: String, required: true },
    phone: { type: String },
    companyWebsite: { type: String },
    companySize: { type: String, enum: ['startup', 'small', 'medium', 'large', 'enterprise'] },
    industry: { type: String },
    bio: { type: String },
    onboardingCompleted: { type: Boolean, default: false }
}, {
    timestamps: true,
    collection: 'recruiterProfiles'
});

// ===== MODELS =====

export const UserProfileModel: Model<IUserProfileDocument> =
    mongoose.models.UserProfile || mongoose.model<IUserProfileDocument>('UserProfile', UserProfileSchema);

export const ProjectModel: Model<IProjectDocument> =
    mongoose.models.Project || mongoose.model<IProjectDocument>('Project', ProjectSchema);

export const ResumeVersionModel: Model<IResumeVersionDocument> =
    mongoose.models.ResumeVersion || mongoose.model<IResumeVersionDocument>('ResumeVersion', ResumeVersionSchema);

export const CandidatePrivateProfileModel: Model<ICandidatePrivateProfileDocument> =
    mongoose.models.CandidatePrivateProfile || mongoose.model<ICandidatePrivateProfileDocument>('CandidatePrivateProfile', CandidatePrivateProfileSchema);

export const CandidatePublicPageModel: Model<ICandidatePublicPageDocument> =
    mongoose.models.CandidatePublicPage || mongoose.model<ICandidatePublicPageDocument>('CandidatePublicPage', CandidatePublicPageSchema);

export const ExportEventModel: Model<IExportEventDocument> =
    mongoose.models.ExportEvent || mongoose.model<IExportEventDocument>('ExportEvent', ExportEventSchema);

export const RecruiterProfileModel: Model<IRecruiterProfileDocument> =
    mongoose.models.RecruiterProfile || mongoose.model<IRecruiterProfileDocument>('RecruiterProfile', RecruiterProfileSchema);
