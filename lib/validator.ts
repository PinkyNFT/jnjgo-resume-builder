/**
 * Validation Utilities
 * 
 * Provides comprehensive validation functions for API requests and data integrity.
 * Ensures type safety, business logic validation, and data sanitization.
 * 
 * @module lib/validator
 */

import { Project, UserProfile, ResumeData, RoleType, ProjectStatus } from '../types';

// ===== VALIDATION ERROR TYPES =====

export interface ValidationError {
    field: string;
    message: string;
    code: string;
}

export class ValidationException extends Error {
    errors: ValidationError[];
    statusCode: number;

    constructor(errors: ValidationError[], statusCode: number = 400) {
        super('Validation failed');
        this.name = 'ValidationException';
        this.errors = errors;
        this.statusCode = statusCode;
    }
}

// ===== BASIC VALIDATORS =====

/**
 * Check if value is a non-empty string
 */
export function isNonEmptyString(value: any): value is string {
    return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Check if value is a valid email
 */
export function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Check if value is a valid phone number (flexible international format)
 */
export function isValidPhone(phone: string): boolean {
    // Allow: +1234567890, 123-456-7890, (123) 456-7890, etc.
    // Require at least 7 digits total to reject short non-phone strings like '123'
    const stripped = phone.replace(/[\s\-\.\(\)]/g, '');
    const digitsOnly = stripped.replace(/[^\d]/g, '');
    if (digitsOnly.length < 7) return false;
    const phoneRegex = /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
}

/**
 * Check if value is a valid URL
 */
export function isValidUrl(url: string): boolean {
    try {
        new URL(url);
        return true;
    } catch {
        // If URL doesn't have protocol, try adding https://
        try {
            new URL(`https://${url}`);
            return true;
        } catch {
            return false;
        }
    }
}

/**
 * Check if value is a valid MongoDB ObjectId
 */
export function isValidObjectId(id: string): boolean {
    const objectIdRegex = /^[0-9a-fA-F]{24}$/;
    return objectIdRegex.test(id);
}

/**
 * Sanitize string input (remove dangerous characters)
 */
export function sanitizeString(input: string): string {
    return input
        .trim()
        .replace(/[<>]/g, '') // Remove HTML angle brackets
        .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
        .replace(/\s+/g, ' ') // Normalize multiple spaces to single space
        .trim();
}

/**
 * Validate string length
 */
export function isValidLength(str: string, min: number, max: number): boolean {
    const length = str.trim().length;
    return length >= min && length <= max;
}

// ===== USER PROFILE VALIDATORS =====

/**
 * Validate user profile data
 */
export function validateUserProfile(profile: Partial<UserProfile>): ValidationError[] {
    const errors: ValidationError[] = [];

    // Validate full name
    if (!profile.fullName) {
        errors.push({
            field: 'fullName',
            message: 'Full name is required',
            code: 'REQUIRED_FIELD'
        });
    } else if (!isValidLength(profile.fullName, 2, 100)) {
        errors.push({
            field: 'fullName',
            message: 'Full name must be between 2 and 100 characters',
            code: 'INVALID_LENGTH'
        });
    }

    // Validate email
    if (!profile.email) {
        errors.push({
            field: 'email',
            message: 'Email is required',
            code: 'REQUIRED_FIELD'
        });
    } else if (!isValidEmail(profile.email)) {
        errors.push({
            field: 'email',
            message: 'Invalid email format',
            code: 'INVALID_FORMAT'
        });
    }

    // Validate phone
    if (!profile.phone) {
        errors.push({
            field: 'phone',
            message: 'Phone number is required',
            code: 'REQUIRED_FIELD'
        });
    } else if (!isValidPhone(profile.phone)) {
        errors.push({
            field: 'phone',
            message: 'Invalid phone number format',
            code: 'INVALID_FORMAT'
        });
    }

    // Validate location
    if (!profile.location) {
        errors.push({
            field: 'location',
            message: 'Location is required',
            code: 'REQUIRED_FIELD'
        });
    } else if (!isValidLength(profile.location, 2, 200)) {
        errors.push({
            field: 'location',
            message: 'Location must be between 2 and 200 characters',
            code: 'INVALID_LENGTH'
        });
    }

    // Validate LinkedIn (optional but must be valid if provided)
    if (profile.linkedin && !isValidUrl(profile.linkedin)) {
        errors.push({
            field: 'linkedin',
            message: 'Invalid LinkedIn URL format',
            code: 'INVALID_FORMAT'
        });
    }

    return errors;
}

// ===== PROJECT VALIDATORS =====

/**
 * Validate role type
 */
export function isValidRoleType(roleType: any): roleType is RoleType {
    return ['consultant', 'senior_engineer', 'general'].includes(roleType);
}

/**
 * Validate project status
 */
export function isValidProjectStatus(status: any): status is ProjectStatus {
    return ['draft', 'imported', 'interviewing', 'generated', 'completed'].includes(status);
}

/**
 * Validate project ID format
 */
export function isValidProjectId(id: string): boolean {
    // Project IDs are timestamp + random string
    return /^[0-9a-zA-Z_-]{10,50}$/.test(id);
}

/**
 * Validate project title
 */
export function validateProjectTitle(title: string): ValidationError | null {
    if (!isNonEmptyString(title)) {
        return {
            field: 'title',
            message: 'Project title is required',
            code: 'REQUIRED_FIELD'
        };
    }

    if (!isValidLength(title, 1, 200)) {
        return {
            field: 'title',
            message: 'Project title must be between 1 and 200 characters',
            code: 'INVALID_LENGTH'
        };
    }

    return null;
}

/**
 * Validate project data for creation
 */
export function validateProjectCreate(project: Partial<Project>): ValidationError[] {
    const errors: ValidationError[] = [];

    // Validate ID
    if (!project.id) {
        errors.push({
            field: 'id',
            message: 'Project ID is required',
            code: 'REQUIRED_FIELD'
        });
    } else if (!isValidProjectId(project.id)) {
        errors.push({
            field: 'id',
            message: 'Invalid project ID format',
            code: 'INVALID_FORMAT'
        });
    }

    // Validate title
    const titleError = validateProjectTitle(project.title || '');
    if (titleError) {
        errors.push(titleError);
    }

    // Validate role type
    if (!project.roleType) {
        errors.push({
            field: 'roleType',
            message: 'Role type is required',
            code: 'REQUIRED_FIELD'
        });
    } else if (!isValidRoleType(project.roleType)) {
        errors.push({
            field: 'roleType',
            message: 'Invalid role type. Must be: consultant, senior_engineer, or general',
            code: 'INVALID_VALUE'
        });
    }

    // Validate status (optional, defaults to 'draft')
    if (project.status && !isValidProjectStatus(project.status)) {
        errors.push({
            field: 'status',
            message: 'Invalid project status',
            code: 'INVALID_VALUE'
        });
    }

    // Validate updatedAt (optional, defaults to now)
    if (project.updatedAt !== undefined) {
        if (typeof project.updatedAt !== 'number' || project.updatedAt < 0) {
            errors.push({
                field: 'updatedAt',
                message: 'Invalid updatedAt timestamp',
                code: 'INVALID_VALUE'
            });
        }
    }

    // Validate history array (optional, defaults to [])
    if (project.history !== undefined && !Array.isArray(project.history)) {
        errors.push({
            field: 'history',
            message: 'History must be an array',
            code: 'INVALID_TYPE'
        });
    }

    return errors;
}

/**
 * Validate project data for update
 */
export function validateProjectUpdate(project: Partial<Project>): ValidationError[] {
    const errors: ValidationError[] = [];

    // Title is optional for update, but must be valid if provided
    if (project.title !== undefined) {
        const titleError = validateProjectTitle(project.title);
        if (titleError) {
            errors.push(titleError);
        }
    }

    // Validate role type if provided
    if (project.roleType !== undefined && !isValidRoleType(project.roleType)) {
        errors.push({
            field: 'roleType',
            message: 'Invalid role type',
            code: 'INVALID_VALUE'
        });
    }

    // Validate status if provided
    if (project.status !== undefined && !isValidProjectStatus(project.status)) {
        errors.push({
            field: 'status',
            message: 'Invalid project status',
            code: 'INVALID_VALUE'
        });
    }

    // Validate updatedAt if provided
    if (project.updatedAt !== undefined) {
        if (typeof project.updatedAt !== 'number' || project.updatedAt < 0) {
            errors.push({
                field: 'updatedAt',
                message: 'Invalid updatedAt timestamp',
                code: 'INVALID_VALUE'
            });
        }
    }

    return errors;
}

// ===== RESUME DATA VALIDATORS =====

/**
 * Validate resume data structure (basic validation)
 */
export function validateResumeData(data: Partial<ResumeData>): ValidationError[] {
    const errors: ValidationError[] = [];

    // Validate contact info if provided
    if (data.contactInfo) {
        if (!data.contactInfo.email || !isValidEmail(data.contactInfo.email)) {
            errors.push({
                field: 'contactInfo.email',
                message: 'Valid email is required in contact info',
                code: 'INVALID_FORMAT'
            });
        }

        if (data.contactInfo.linkedin && !isValidUrl(data.contactInfo.linkedin)) {
            errors.push({
                field: 'contactInfo.linkedin',
                message: 'Invalid LinkedIn URL format',
                code: 'INVALID_FORMAT'
            });
        }
    }

    // Validate arrays are actually arrays
    const arrayFields: (keyof ResumeData)[] = [
        'timeline',
        'workExperience',
        'education',
        'skills',
        'skillTimelines',
        'certifications'
    ];

    for (const field of arrayFields) {
        if (data[field] !== undefined && !Array.isArray(data[field])) {
            errors.push({
                field,
                message: `${field} must be an array`,
                code: 'INVALID_TYPE'
            });
        }
    }

    return errors;
}

// ===== REQUEST VALIDATORS =====

/**
 * Validate pagination parameters
 */
export function validatePaginationParams(
    page?: string,
    limit?: string
): { page: number; limit: number; errors: ValidationError[] } {
    const errors: ValidationError[] = [];
    let validPage = 1;
    let validLimit = 10;

    if (page) {
        const pageNum = parseInt(page, 10);
        if (isNaN(pageNum) || pageNum < 1) {
            errors.push({
                field: 'page',
                message: 'Page must be a positive integer',
                code: 'INVALID_VALUE'
            });
        } else {
            validPage = pageNum;
        }
    }

    if (limit) {
        const limitNum = parseInt(limit, 10);
        if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
            errors.push({
                field: 'limit',
                message: 'Limit must be between 1 and 100',
                code: 'INVALID_VALUE'
            });
        } else {
            validLimit = limitNum;
        }
    }

    return { page: validPage, limit: validLimit, errors };
}

/**
 * Validate user ID header
 */
export function validateUserId(userId: string | null): ValidationError | null {
    if (!userId || !isNonEmptyString(userId)) {
        return {
            field: 'x-user-id',
            message: 'User ID header is required',
            code: 'REQUIRED_HEADER'
        };
    }

    if (!isValidLength(userId, 1, 100)) {
        return {
            field: 'x-user-id',
            message: 'User ID must be between 1 and 100 characters',
            code: 'INVALID_LENGTH'
        };
    }

    return null;
}

// ===== HELPER FUNCTIONS =====

/**
 * Throw ValidationException if errors exist
 */
export function throwIfErrors(errors: ValidationError[]): void {
    if (errors.length > 0) {
        throw new ValidationException(errors);
    }
}

/**
 * Sanitize user profile input
 */
export function sanitizeUserProfile(profile: UserProfile): UserProfile {
    // Keep the photo only if it's a valid inline image data URL within the size cap.
    const photo = typeof profile.photo === 'string'
        && /^data:image\/(jpeg|jpg|png|webp);base64,/.test(profile.photo)
        && profile.photo.length <= 3_000_000
        ? profile.photo
        : undefined;
    return {
        fullName: sanitizeString(profile.fullName),
        email: sanitizeString(profile.email.toLowerCase()),
        phone: sanitizeString(profile.phone),
        location: sanitizeString(profile.location),
        linkedin: profile.linkedin ? sanitizeString(profile.linkedin) : undefined,
        photo
    };
}

/**
 * Sanitize project input
 */
export function sanitizeProject(project: Project): Project {
    const sanitized = {
        ...project,
        title: sanitizeString(project.title),
        // Deep sanitization of nested objects can be added as needed
    };

    // AI-generated entries can come back with a field missing (e.g. no dates).
    // Keep every entry that has real content and fill the missing text fields
    // with '' so it saves and can be completed in the editor; drop only entries
    // with no id or nothing worth keeping. (Dropping a job because its period
    // was missing used to lose data silently.)
    const text = (v: unknown) => (typeof v === 'string' ? v : '');
    const hasId = (e: { id?: unknown } | null | undefined) => !!e && typeof e.id === 'string' && e.id.trim() !== '';

    if (sanitized.data?.skillTimelines) {
        sanitized.data.skillTimelines = sanitized.data.skillTimelines
            .filter(st => hasId(st) && text(st.skillName).trim() !== '')
            .map(st => ({ ...st, period: text(st.period) }));
    }

    if (sanitized.data?.workExperience) {
        sanitized.data.workExperience = sanitized.data.workExperience
            .filter(we => hasId(we) && (text(we.company).trim() !== '' || text(we.position).trim() !== ''))
            .map(we => ({
                ...we,
                company: text(we.company),
                position: text(we.position),
                period: text(we.period),
                responsibilities: Array.isArray(we.responsibilities) ? we.responsibilities.filter(r => typeof r === 'string') : [],
            }));
    }

    if (sanitized.data?.education) {
        sanitized.data.education = sanitized.data.education
            .filter(edu => hasId(edu) && (text(edu.degree).trim() !== '' || text(edu.institution).trim() !== ''))
            .map(edu => ({ ...edu, degree: text(edu.degree), institution: text(edu.institution), period: text(edu.period) }));
    }

    if (sanitized.data?.timeline) {
        sanitized.data.timeline = sanitized.data.timeline
            .filter(t => hasId(t) && (text(t.organization).trim() !== '' || text(t.role).trim() !== ''))
            .map(t => ({
                ...t,
                period: text(t.period),
                organization: text(t.organization),
                role: text(t.role),
                type: t.type === 'education' ? 'education' : 'work',
            }));
    }

    if (sanitized.data?.projectPortfolio?.representativeProjects) {
        sanitized.data.projectPortfolio.representativeProjects = sanitized.data.projectPortfolio.representativeProjects
            .filter(p => hasId(p))
            .map(p => ({
                ...p,
                title: text(p.title),
                period: text(p.period),
                role: text(p.role),
                context: text(p.context),
                contribution: text(p.contribution),
            }));
    }

    if (sanitized.data?.careerGaps) {
        sanitized.data.careerGaps = sanitized.data.careerGaps
            .filter(g => !!g && (text(g.period).trim() !== '' || text(g.reason).trim() !== ''))
            .map(g => ({ ...g, period: text(g.period), reason: text(g.reason), isExplained: g.isExplained === true }));
    }

    // Drop an invalid or oversized photo — must be an inline data:image/* URL, capped at ~3MB
    if (sanitized.data?.photo !== undefined) {
        const photo = sanitized.data.photo;
        const isValidImageDataUrl = typeof photo === 'string' && /^data:image\/(jpeg|jpg|png|webp);base64,/.test(photo);
        if (!isValidImageDataUrl || photo.length > 3_000_000) {
            delete sanitized.data.photo;
        }
    }

    return sanitized;
}

/**
 * Create validation error response
 */
export function createValidationErrorResponse(errors: ValidationError[]) {
    return {
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: errors,
        timestamp: new Date().toISOString()
    };
}
