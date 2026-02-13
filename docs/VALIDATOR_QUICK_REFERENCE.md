# Validator Quick Reference

## 📋 Quick Validation Checklist

### User Profile Validation
```typescript
✓ fullName:  Required, 2-100 chars
✓ email:     Required, valid email format
✓ phone:     Required, valid phone format
✓ location:  Required, 2-200 chars
✓ linkedin:  Optional, valid URL if provided
```

### Project Validation (Create)
```typescript
✓ id:         Required, 10-50 chars (alphanumeric, _, -)
✓ title:      Required, 1-200 chars
✓ roleType:   Required, one of: consultant | senior_engineer | general
✓ status:     Optional, one of: draft | imported | interviewing | generated | completed
✓ updatedAt:  Optional, valid timestamp
✓ history:    Optional, must be array
```

### Project Validation (Update)
```typescript
All fields optional, but must be valid if provided
```

## 🔧 Common Usage Patterns

### Pattern 1: API Route with Validation
```typescript
import { validateUserProfile, sanitizeUserProfile, createValidationErrorResponse } from '@/lib/validator';

export async function POST(request: NextRequest) {
    const body = await request.json();
    
    // 1. Validate
    const errors = validateUserProfile(body);
    if (errors.length > 0) {
        return NextResponse.json(
            createValidationErrorResponse(errors),
            { status: 400 }
        );
    }
    
    // 2. Sanitize
    const clean = sanitizeUserProfile(body);
    
    // 3. Use
    await Model.create(clean);
}
```

### Pattern 2: Throw on Error
```typescript
import { throwIfErrors } from '@/lib/validator';

try {
    const errors = validateProjectCreate(project);
    throwIfErrors(errors); // Throws ValidationException
    
    // Continue with valid data...
} catch (error) {
    if (error instanceof ValidationException) {
        return NextResponse.json(
            createValidationErrorResponse(error.errors),
            { status: 400 }
        );
    }
}
```

## 🎯 Type Guards

Use type guards for runtime type checking:

```typescript
if (isValidRoleType(input)) {
    // TypeScript now knows input is RoleType
}

if (isValidEmail(email)) {
    // Safe to use email
}
```

## 🛡️ Sanitization Order

**ALWAYS follow this order:**
```
1. Validate original input
2. Sanitize validated input
3. Store sanitized data
```

**❌ NEVER:**
```
1. Sanitize first (loses validation context)
2. Skip validation (security risk)
3. Store unsanitized data (XSS/injection risk)
```

## 📊 Error Response Format

```json
{
    "error": "Validation failed",
    "code": "VALIDATION_ERROR",
    "details": [
        {
            "field": "email",
            "message": "Invalid email format",
            "code": "INVALID_FORMAT"
        }
    ],
    "timestamp": "2026-02-12T10:30:00.000Z"
}
```

## 🔑 Error Codes

| Code | Meaning |
|------|---------|
| `REQUIRED_FIELD` | Required field is missing |
| `INVALID_FORMAT` | Invalid format (email, phone, URL) |
| `INVALID_LENGTH` | String length out of range |
| `INVALID_VALUE` | Invalid enum value or business rule |
| `INVALID_TYPE` | Wrong data type |
| `REQUIRED_HEADER` | Missing required HTTP header |

## 🧪 Testing

```bash
# Run all tests
npm test

# Run validator tests only
npm test validator.test.ts

# Watch mode
npm test -- --watch
```

## 🚀 Available Validators

### Basic Validators
- `isNonEmptyString(value)` - Non-empty string check
- `isValidEmail(email)` - Email format
- `isValidPhone(phone)` - Phone format (international)
- `isValidUrl(url)` - URL format
- `isValidObjectId(id)` - MongoDB ObjectId
- `isValidProjectId(id)` - Project ID format
- `isValidLength(str, min, max)` - String length

### Business Logic Validators
- `isValidRoleType(type)` - RoleType enum
- `isValidProjectStatus(status)` - ProjectStatus enum
- `validateUserProfile(profile)` - Complete profile validation
- `validateProjectCreate(project)` - Project creation validation
- `validateProjectUpdate(project)` - Project update validation
- `validateResumeData(data)` - Resume data validation

### Sanitization
- `sanitizeString(str)` - Remove dangerous chars
- `sanitizeUserProfile(profile)` - Clean profile data
- `sanitizeProject(project)` - Clean project data

### Utilities
- `throwIfErrors(errors)` - Throw ValidationException
- `createValidationErrorResponse(errors)` - Format error response

## 💡 Tips

1. **Import what you need**: Only import validators you use
2. **Validate early**: Check at API boundaries before processing
3. **Consistent errors**: Always use `createValidationErrorResponse()`
4. **Type safety**: Use type guards for better TypeScript support
5. **Test coverage**: Write tests for custom validators
