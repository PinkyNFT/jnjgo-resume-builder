# Validation System Documentation

## Overview

The validation system provides comprehensive input validation, data sanitization, and error handling for the JNJGO Resume Builder application. It ensures data integrity, security, and consistent error responses across all API endpoints.

## Features

- ✅ **Type-Safe Validation** - Full TypeScript support with type guards
- 🛡️ **Input Sanitization** - Automatic removal of dangerous characters
- 📋 **Comprehensive Validators** - Email, phone, URL, and custom business logic validation
- 🎯 **Consistent Error Format** - Standardized error responses across all endpoints
- 🔒 **Security** - Protection against XSS and injection attacks
- 📊 **Detailed Error Messages** - Field-specific error messages with error codes

## Basic Usage

### Validating User Profile

```typescript
import { validateUserProfile, sanitizeUserProfile, throwIfErrors } from '../lib/validator';

// In your API route
const profile: UserProfile = await request.json();

// Validate
const errors = validateUserProfile(profile);
if (errors.length > 0) {
    return NextResponse.json(
        createValidationErrorResponse(errors),
        { status: 400 }
    );
}

// Sanitize
const sanitized = sanitizeUserProfile(profile);

// Use sanitized data
await UserProfileModel.create(sanitized);
```

### Validating Project Data

```typescript
import { validateProjectCreate, sanitizeProject } from '../lib/validator';

// For create operations
const project: Project = await request.json();
const errors = validateProjectCreate(project);
throwIfErrors(errors); // Throws ValidationException if errors exist

const sanitizedProject = sanitizeProject(project);
await ProjectModel.create(sanitizedProject);
```

```typescript
import { validateProjectUpdate } from '../lib/validator';

// For update operations
const updates: Partial<Project> = await request.json();
const errors = validateProjectUpdate(updates);
throwIfErrors(errors);

await ProjectModel.findOneAndUpdate({ id }, updates);
```

## Available Validators

### Basic Validators

#### `isNonEmptyString(value: any): boolean`
Checks if value is a non-empty string.

```typescript
isNonEmptyString('hello')     // true
isNonEmptyString('   ')       // false
isNonEmptyString(null)        // false
```

#### `isValidEmail(email: string): boolean`
Validates email format.

```typescript
isValidEmail('user@example.com')     // true
isValidEmail('invalid-email')        // false
```

#### `isValidPhone(phone: string): boolean`
Validates phone number (flexible international format).

```typescript
isValidPhone('+1234567890')          // true
isValidPhone('090-1234-5678')        // true
isValidPhone('abc')                  // false
```

#### `isValidUrl(url: string): boolean`
Validates URL format (with or without protocol).

```typescript
isValidUrl('https://example.com')    // true
isValidUrl('linkedin.com/in/user')   // true
isValidUrl('not a url')              // false
```

#### `isValidProjectId(id: string): boolean`
Validates project ID format.

```typescript
isValidProjectId('1234567890abc')    // true
isValidProjectId('123')              // false (too short)
```

### Business Logic Validators

#### `isValidRoleType(roleType: any): boolean`
Type guard for RoleType.

```typescript
isValidRoleType('consultant')        // true
isValidRoleType('senior_engineer')   // true
isValidRoleType('invalid')           // false
```

#### `isValidProjectStatus(status: any): boolean`
Type guard for ProjectStatus.

```typescript
isValidProjectStatus('draft')        // true
isValidProjectStatus('completed')    // true
isValidProjectStatus('invalid')      // false
```

### Complex Validators

#### `validateUserProfile(profile: Partial<UserProfile>): ValidationError[]`
Validates complete user profile data.

**Checks:**
- Full name: Required, 2-100 characters
- Email: Required, valid format
- Phone: Required, valid format
- Location: Required, 2-200 characters
- LinkedIn: Optional, valid URL if provided

#### `validateProjectCreate(project: Partial<Project>): ValidationError[]`
Validates project creation data.

**Checks:**
- ID: Required, valid format
- Title: Required, 1-200 characters
- Role type: Required, valid value
- Status: Optional, valid value if provided
- Updated at: Optional, valid timestamp if provided
- History: Optional, must be array if provided

#### `validateProjectUpdate(project: Partial<Project>): ValidationError[]`
Validates project update data (all fields optional).

#### `validateResumeData(data: Partial<ResumeData>): ValidationError[]`
Validates resume data structure.

**Checks:**
- Contact info email: Valid format if provided
- Contact info LinkedIn: Valid URL if provided
- Array fields: Must be arrays if provided

## Sanitization Functions

### `sanitizeString(input: string): string`
Removes dangerous characters and trims whitespace.

```typescript
sanitizeString('  hello  ')                    // 'hello'
sanitizeString('test<script>alert()</script>') // 'testsalert()/script'
```

### `sanitizeUserProfile(profile: UserProfile): UserProfile`
Sanitizes all user profile fields.

```typescript
const dirty = {
    fullName: '  John <script>  ',
    email: '  JOHN@EXAMPLE.COM  ',
    phone: '  +1234567890  ',
    location: '  Tokyo  '
};

const clean = sanitizeUserProfile(dirty);
// {
//     fullName: 'John script',
//     email: 'john@example.com',
//     phone: '+1234567890',
//     location: 'Tokyo'
// }
```

### `sanitizeProject(project: Project): Project`
Sanitizes project data.

## Error Handling

### ValidationError Interface

```typescript
interface ValidationError {
    field: string;      // Field name that failed validation
    message: string;    // Human-readable error message
    code: string;       // Machine-readable error code
}
```

### Error Codes

- `REQUIRED_FIELD` - Field is required but missing
- `INVALID_FORMAT` - Invalid format (email, phone, URL, etc.)
- `INVALID_LENGTH` - String length outside allowed range
- `INVALID_VALUE` - Invalid enum value or business rule violation
- `INVALID_TYPE` - Wrong data type (e.g., expected array but got string)
- `REQUIRED_HEADER` - Required HTTP header missing

### ValidationException Class

```typescript
class ValidationException extends Error {
    errors: ValidationError[];
    statusCode: number;
}
```

### Throwing Validation Errors

```typescript
import { throwIfErrors, ValidationException } from '../lib/validator';

try {
    const errors = validateUserProfile(profile);
    throwIfErrors(errors); // Throws if errors exist
    
    // Continue with valid data
} catch (error) {
    if (error instanceof ValidationException) {
        return NextResponse.json(
            createValidationErrorResponse(error.errors),
            { status: error.statusCode }
        );
    }
    throw error;
}
```

### Creating Error Response

```typescript
import { createValidationErrorResponse } from '../lib/validator';

const errors = validateUserProfile(profile);
if (errors.length > 0) {
    return NextResponse.json(
        createValidationErrorResponse(errors),
        { status: 400 }
    );
}

// Response format:
// {
//     "error": "Validation failed",
//     "code": "VALIDATION_ERROR",
//     "details": [
//         {
//             "field": "email",
//             "message": "Invalid email format",
//             "code": "INVALID_FORMAT"
//         }
//     ],
//     "timestamp": "2026-02-12T10:30:00.000Z"
// }
```

## Integration with API Routes

### Profile API Example

```typescript
// app/api/profile/route.ts
import { validateUserProfile, sanitizeUserProfile, createValidationErrorResponse } from '../../../lib/validator';

export async function PUT(request: NextRequest) {
    try {
        const body: UserProfile = await request.json();
        
        // Validate
        const errors = validateUserProfile(body);
        if (errors.length > 0) {
            return NextResponse.json(
                createValidationErrorResponse(errors),
                { status: 400 }
            );
        }
        
        // Sanitize
        const sanitized = sanitizeUserProfile(body);
        
        // Save
        const profile = await UserProfileModel.findOneAndUpdate(
            { userId },
            sanitized,
            { upsert: true, new: true }
        );
        
        return NextResponse.json({ profile });
    } catch (error) {
        // Error handling
    }
}
```

### Projects API Example

```typescript
// app/api/projects/route.ts
import { validateProjectCreate, sanitizeProject, createValidationErrorResponse } from '../../../lib/validator';

export async function POST(request: NextRequest) {
    try {
        const body: Project = await request.json();
        
        // Validate
        const errors = validateProjectCreate(body);
        if (errors.length > 0) {
            return NextResponse.json(
                createValidationErrorResponse(errors),
                { status: 400 }
            );
        }
        
        // Sanitize
        const sanitized = sanitizeProject(body);
        
        // Save
        const project = await ProjectModel.create({
            userId,
            ...sanitized
        });
        
        return NextResponse.json({ project }, { status: 201 });
    } catch (error) {
        // Error handling
    }
}
```

## Testing

Run the validator tests:

```bash
npm test lib/__tests__/validator.test.ts
```

## Best Practices

1. **Always validate before sanitizing** - Validation should run on original data
2. **Always sanitize before storing** - Never store unsanitized user input
3. **Use throwIfErrors** - For cleaner code when you want to throw on validation failure
4. **Validate at API boundaries** - All external input should be validated
5. **Provide helpful error messages** - Users should understand what went wrong
6. **Use error codes** - Enable programmatic error handling on the frontend
7. **Keep validation logic centralized** - Avoid duplicating validation rules

## Security Considerations

- The validator removes `<>` characters to prevent XSS attacks
- Control characters are stripped from input
- Email addresses are lowercased to prevent duplicate accounts
- URLs are validated to prevent invalid data storage
- All user input should pass through sanitization before database storage

## Extension

To add new validators:

1. Create basic validator function in `lib/validator.ts`
2. Add validation tests in `lib/__tests__/validator.test.ts`
3. Integrate into appropriate API routes
4. Update this documentation

Example:

```typescript
export function isValidZipCode(zip: string): boolean {
    // US zip code format
    return /^\d{5}(-\d{4})?$/.test(zip);
}
```
