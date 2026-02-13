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
        .replace(/[<>]/g, '') // Remove potential HTML tags
        .replace(/[\x00-\x1F\x7F]/g, ''); // Remove control characters
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
    return {
        fullName: sanitizeString(profile.fullName),
        email: sanitizeString(profile.email.toLowerCase()),
        phone: sanitizeString(profile.phone),
        location: sanitizeString(profile.location),
        linkedin: profile.linkedin ? sanitizeString(profile.linkedin) : undefined
    };
}

/**
 * Sanitize project input
 */
export function sanitizeProject(project: Project): Project {
    return {
        ...project,
        title: sanitizeString(project.title),
        // Deep sanitization of nested objects can be added as needed
    };
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
