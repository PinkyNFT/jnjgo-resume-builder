/**
 * Validator Tests
 * 
 * Comprehensive test suite for validation utilities
 * Run with: npm test
 * 
 * @module lib/__tests__/validator.test.ts
 */

import {
    isNonEmptyString,
    isValidEmail,
    isValidPhone,
    isValidUrl,
    isValidProjectId,
    isValidRoleType,
    isValidProjectStatus,
    validateUserProfile,
    validateProjectCreate,
    validateProjectUpdate,
    sanitizeString,
    sanitizeUserProfile,
    ValidationException,
    throwIfErrors
} from '../validator';
import { UserProfile, Project } from '../../types';

describe('Basic Validators', () => {
    describe('isNonEmptyString', () => {
        it('should return true for valid non-empty strings', () => {
            expect(isNonEmptyString('hello')).toBe(true);
            expect(isNonEmptyString('  hello  ')).toBe(true);
        });

        it('should return false for empty or invalid strings', () => {
            expect(isNonEmptyString('')).toBe(false);
            expect(isNonEmptyString('   ')).toBe(false);
            expect(isNonEmptyString(null)).toBe(false);
            expect(isNonEmptyString(undefined)).toBe(false);
            expect(isNonEmptyString(123)).toBe(false);
        });
    });

    describe('isValidEmail', () => {
        it('should validate correct email formats', () => {
            expect(isValidEmail('user@example.com')).toBe(true);
            expect(isValidEmail('john.doe@company.co.jp')).toBe(true);
            expect(isValidEmail('test+tag@domain.org')).toBe(true);
        });

        it('should reject invalid email formats', () => {
            expect(isValidEmail('invalid')).toBe(false);
            expect(isValidEmail('user@')).toBe(false);
            expect(isValidEmail('@domain.com')).toBe(false);
            expect(isValidEmail('user @domain.com')).toBe(false);
        });
    });

    describe('isValidPhone', () => {
        it('should validate correct phone formats', () => {
            expect(isValidPhone('+1234567890')).toBe(true);
            expect(isValidPhone('123-456-7890')).toBe(true);
            expect(isValidPhone('(123) 456-7890')).toBe(true);
            expect(isValidPhone('090-1234-5678')).toBe(true);
        });

        it('should reject invalid phone formats', () => {
            expect(isValidPhone('abc')).toBe(false);
            expect(isValidPhone('123')).toBe(false);
        });
    });

    describe('isValidUrl', () => {
        it('should validate correct URL formats', () => {
            expect(isValidUrl('https://example.com')).toBe(true);
            expect(isValidUrl('http://www.example.com')).toBe(true);
            expect(isValidUrl('linkedin.com/in/johndoe')).toBe(true);
        });

        it('should reject invalid URLs', () => {
            expect(isValidUrl('not a url')).toBe(false);
            expect(isValidUrl('ht tp://broken.com')).toBe(false);
        });
    });

    describe('isValidProjectId', () => {
        it('should validate project ID format', () => {
            expect(isValidProjectId('1234567890abc')).toBe(true);
            expect(isValidProjectId('project_123-abc')).toBe(true);
        });

        it('should reject invalid project IDs', () => {
            expect(isValidProjectId('123')).toBe(false); // too short
            expect(isValidProjectId('a'.repeat(100))).toBe(false); // too long
            expect(isValidProjectId('invalid@id')).toBe(false); // invalid chars
        });
    });
});

describe('User Profile Validation', () => {
    describe('validateUserProfile', () => {
        it('should pass valid user profile', () => {
            const profile: UserProfile = {
                fullName: 'John Doe',
                email: 'john@example.com',
                phone: '+1234567890',
                location: 'Tokyo, Japan',
                linkedin: 'https://linkedin.com/in/johndoe'
            };

            const errors = validateUserProfile(profile);
            expect(errors).toHaveLength(0);
        });

        it('should fail when required fields are missing', () => {
            const profile = {
                fullName: '',
                email: '',
                phone: '',
                location: ''
            } as UserProfile;

            const errors = validateUserProfile(profile);
            expect(errors.length).toBeGreaterThan(0);
        });

        it('should fail with invalid email', () => {
            const profile: UserProfile = {
                fullName: 'John Doe',
                email: 'invalid-email',
                phone: '+1234567890',
                location: 'Tokyo, Japan'
            };

            const errors = validateUserProfile(profile);
            expect(errors.some(e => e.field === 'email')).toBe(true);
        });

        it('should fail with invalid LinkedIn URL', () => {
            const profile: UserProfile = {
                fullName: 'John Doe',
                email: 'john@example.com',
                phone: '+1234567890',
                location: 'Tokyo, Japan',
                linkedin: 'not a valid url'
            };

            const errors = validateUserProfile(profile);
            expect(errors.some(e => e.field === 'linkedin')).toBe(true);
        });
    });

    describe('sanitizeUserProfile', () => {
        it('should sanitize user profile data', () => {
            const profile: UserProfile = {
                fullName: '  John Doe  <script>',
                email: '  JOHN@EXAMPLE.COM  ',
                phone: '  +1234567890  ',
                location: '  Tokyo  ',
                linkedin: '  https://linkedin.com/in/johndoe  '
            };

            const sanitized = sanitizeUserProfile(profile);
            expect(sanitized.fullName).toBe('John Doe script');
            expect(sanitized.email).toBe('john@example.com');
            expect(sanitized.phone).toBe('+1234567890');
            expect(sanitized.location).toBe('Tokyo');
            expect(sanitized.linkedin).toBe('https://linkedin.com/in/johndoe');
        });
    });
});

describe('Project Validation', () => {
    describe('isValidRoleType', () => {
        it('should validate role types', () => {
            expect(isValidRoleType('consultant')).toBe(true);
            expect(isValidRoleType('senior_engineer')).toBe(true);
            expect(isValidRoleType('general')).toBe(true);
            expect(isValidRoleType('invalid')).toBe(false);
        });
    });

    describe('isValidProjectStatus', () => {
        it('should validate project statuses', () => {
            expect(isValidProjectStatus('draft')).toBe(true);
            expect(isValidProjectStatus('imported')).toBe(true);
            expect(isValidProjectStatus('interviewing')).toBe(true);
            expect(isValidProjectStatus('generated')).toBe(true);
            expect(isValidProjectStatus('completed')).toBe(true);
            expect(isValidProjectStatus('invalid')).toBe(false);
        });
    });

    describe('validateProjectCreate', () => {
        it('should pass valid project data', () => {
            const project: Partial<Project> = {
                id: '1234567890abc',
                title: 'My Resume',
                roleType: 'consultant',
                updatedAt: Date.now(),
                status: 'draft',
                history: []
            };

            const errors = validateProjectCreate(project);
            expect(errors).toHaveLength(0);
        });

        it('should fail when required fields are missing', () => {
            const project = {} as Partial<Project>;

            const errors = validateProjectCreate(project);
            expect(errors.length).toBeGreaterThan(0);
            expect(errors.some(e => e.field === 'id')).toBe(true);
            expect(errors.some(e => e.field === 'title')).toBe(true);
            expect(errors.some(e => e.field === 'roleType')).toBe(true);
        });

        it('should fail with invalid role type', () => {
            const project = {
                id: '1234567890abc',
                title: 'My Resume',
                roleType: 'invalid' as any
            } as Partial<Project>;

            const errors = validateProjectCreate(project);
            expect(errors.some(e => e.field === 'roleType')).toBe(true);
        });

        it('should fail with invalid status', () => {
            const project = {
                id: '1234567890abc',
                title: 'My Resume',
                roleType: 'consultant',
                status: 'invalid' as any
            } as Partial<Project>;

            const errors = validateProjectCreate(project);
            expect(errors.some(e => e.field === 'status')).toBe(true);
        });
    });

    describe('validateProjectUpdate', () => {
        it('should pass valid update data', () => {
            const project: Partial<Project> = {
                title: 'Updated Title',
                status: 'completed'
            };

            const errors = validateProjectUpdate(project);
            expect(errors).toHaveLength(0);
        });

        it('should allow partial updates', () => {
            const project: Partial<Project> = {
                title: 'Only Title Update'
            };

            const errors = validateProjectUpdate(project);
            expect(errors).toHaveLength(0);
        });
    });
});

describe('Sanitization', () => {
    describe('sanitizeString', () => {
        it('should remove dangerous characters', () => {
            expect(sanitizeString('  hello  ')).toBe('hello');
            expect(sanitizeString('test<script>alert("xss")</script>')).toBe('testscriptalert("xss")/script');
            expect(sanitizeString('normal text')).toBe('normal text');
        });
    });
});

describe('Error Handling', () => {
    describe('throwIfErrors', () => {
        it('should throw ValidationException if errors exist', () => {
            const errors = [
                { field: 'email', message: 'Invalid email', code: 'INVALID_FORMAT' }
            ];

            expect(() => throwIfErrors(errors)).toThrow(ValidationException);
        });

        it('should not throw if no errors', () => {
            expect(() => throwIfErrors([])).not.toThrow();
        });
    });
});
