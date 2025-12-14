# Priority 2: Transaction Error Handling & Error Format Standardization

## Overview

Improved error handling for database transactions and standardized error response formats across the API.

## Priority: 2 (High) - ✅ COMPLETED

## Changes Made

### 1. Transaction Error Handling in `roles.ts`

#### Issue #2: Missing error handling in role creation transaction

**Location**: `apps/backoffice/api/src/routes/roles.ts`

**Before:**
```typescript
const role = await prismaPrimary.$transaction(async (tx) => {
  // ... transaction code
});
// No error handling - generic 500 on failure
```

**After:**
```typescript
try {
  const role = await prismaPrimary.$transaction(async (tx) => {
    // ... transaction code
  });
  return reply.status(201).send({ message: 'Role created successfully', role });
} catch (error) {
  console.error('Failed to create role:', error);
  const message = error instanceof Error ? error.message : 'Failed to create role';
  
  // Check for unique constraint violation (P2002)
  if (error instanceof Error && 'code' in error && (error as any).code === 'P2002') {
    return reply.status(400).send({ 
      error: 'Role code already exists',
      details: 'This role name generates a code that already exists'
    });
  }
  
  return reply.status(500).send({ 
    error: 'Failed to create role',
    details: message
  });
}
```

**Benefits:**
- ✅ Distinguishes Prisma constraint errors from generic failures
- ✅ Returns 400 (client error) for duplicate role codes instead of 500
- ✅ Provides specific error messages for debugging
- ✅ Identifies which permissions are invalid (if transaction fails on permission validation)

#### Permission Update Transaction

**Before:**
```typescript
await prismaPrimary.$transaction(async (tx) => {
  // ... update permissions
});
return reply.send({ message: 'Permissions updated successfully', permissions });
```

**After:**
```typescript
try {
  await prismaPrimary.$transaction(async (tx) => {
    // ... update permissions
  });
  return reply.send({ message: 'Permissions updated successfully', permissions });
} catch (error) {
  console.error('Failed to update role permissions:', error);
  return reply.status(500).send({ 
    error: 'Failed to update role permissions',
    details: error instanceof Error ? error.message : 'Unknown error'
  });
}
```

### 2. Error Response Format Standardization (Issue #8)

#### Standardized Format

**Error responses:**
```typescript
{ 
  error: string,           // Human-readable error message (REQUIRED)
  details?: string,        // Additional context or instructions (OPTIONAL)
  [key]?: any             // Domain-specific data (e.g., userCount, invalidPermissions)
}
```

**Success responses:**
```typescript
{ 
  message: string,         // Success message (OPTIONAL)
  ...data                  // Actual response data
}
```

#### Changes Made

**Before (inconsistent formats):**
```typescript
// Format 1: error + suggestion
{ error: 'Role exists', suggestion: 'Try different name' }

// Format 2: error + invalid array
{ error: 'Invalid permissions', invalid: ['perm1', 'perm2'] }

// Format 3: error + userCount + message (confusing!)
{ error: 'Cannot delete', userCount: 5, message: 'Remove users first' }
```

**After (standardized):**
```typescript
// Format: error + details (+ optional domain data)
{ error: 'Role already exists', details: 'A role with code ... already exists. Try...' }

{ error: 'Invalid permissions provided', details: 'Unknown permissions: perm1, perm2' }

{ error: 'Cannot delete role with assigned users', details: 'This role is assigned to 5 users...', userCount: 5 }
```

#### Benefits of Standardization

1. **Predictable structure**: Frontend can always check `error.error` and `error.details`
2. **No confusion**: `message` field is only for success responses
3. **Better UX**: `details` field provides actionable guidance
4. **Type safety**: Easier to type in TypeScript (consistent shape)

### 3. Improved Error Messages

Made errors more specific and actionable:

| Old | New | Improvement |
|-----|-----|-------------|
| `Invalid permissions` | `Invalid permissions provided` + `Unknown permissions: ...` | Shows which permissions are invalid |
| `Invalid permissions provided` (in transaction) | `Invalid permissions: perm1, perm2` | Lists specific invalid permissions |
| `A role with this name already exists` | `Role already exists` + detailed explanation | Shorter error, fuller details |
| `Cannot delete role assigned to users` | `Cannot delete role with assigned users` + count + instructions | More descriptive and actionable |

## Files Changed

**Modified**: 1 file
- `apps/backoffice/api/src/routes/roles.ts`
  - Added try-catch to 2 transactions (lines ~236 and ~300)
  - Standardized 3 error responses
  - Improved error message specificity
  - Added Prisma error code detection (P2002 for unique constraints)

## Error Format Standard (Going Forward)

### For ALL API endpoints:

```typescript
// ✅ GOOD: Simple error
return reply.status(400).send({ 
  error: 'User-friendly error message' 
});

// ✅ GOOD: Error with details
return reply.status(404).send({ 
  error: 'Resource not found',
  details: 'User with ID 123 does not exist'
});

// ✅ GOOD: Error with domain data
return reply.status(400).send({ 
  error: 'Cannot delete role with assigned users',
  details: 'Remove role from all users first',
  userCount: 5
});

// ❌ BAD: Using "message" in error (reserved for success)
return reply.status(400).send({ 
  error: 'Cannot delete',
  message: 'Remove users first'  // Confusing!
});

// ❌ BAD: Non-standard field names
return reply.status(400).send({ 
  error: 'Invalid',
  suggestion: 'Try this',     // Use "details" instead
  invalid: ['x', 'y']         // Use "details" or specific key
});
```

## Testing

**Manual verification needed:**
1. Test role creation with duplicate name
2. Test role creation with invalid permissions
3. Test permission update failures
4. Verify frontend error display still works

**Expected behavior:**
- Transaction failures return 500 with specific error details
- Unique constraint violations return 400 (not 500)
- All errors follow `{ error, details? }` format

## Next Steps

- Priority 3: Type safety improvements (`any` → proper error types)
- Priority 4: Remove debug logs, add validation

## Related

See also: `SQL_INJECTION_FIX_SUMMARY.md` (Priority 1 - completed)
