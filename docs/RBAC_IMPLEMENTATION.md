# Role-Based Access Control (RBAC) Implementation

## Overview

Successfully implemented a comprehensive **multi-role RBAC system** with UI-managed permissions, complete role CRUD operations, and extensive integration testing for the Handled platform.

## Implementation Status

✅ **All 12 Phases Complete** - Multi-role upgrade with permissions, implications, and full CRUD operations

## What Was Implemented

### Database Layer

1. **Migration 007** - Created three new tables:
   - `config.roles` - Stores role definitions (admin, sales, warehouse, user)
   - `config.permissions` - Stores available permissions
   - `config.role_permissions` - Junction table linking roles to permissions
   - Migrated existing users from string-based roles to foreign key references

2. **Prisma Schema** - Updated with:
   - Role, Permission, and RolePermission models
   - User model updated with roleId foreign key
   - Proper relations and cascading deletes

### Backend API

3. **Permission System** (`src/auth/permissions.ts`):
   - Centralized permission constants
   - Permission metadata for UI display
   - Helper functions for grouping permissions

4. **Middleware** (`src/middleware/requirePermission.ts`):
   - `requirePermission(permission)` - Check specific permission
   - `requireAnyPermission(...permissions)` - OR logic
   - `requireAllPermissions(...permissions)` - AND logic
   - `requireAdmin()` - Backward compatible admin check
   - `requireAuth()` - Just authenticate, no permission check

5. **Role Management API** (`src/routes/roles.ts`):
   - `GET /api/roles` - List all roles with user counts
   - `GET /api/roles/:id` - Get single role details
   - `GET /api/roles/:id/permissions` - Get role permissions
   - `PUT /api/roles/:id/permissions` - Update role permissions
   - `GET /api/roles/permissions` - List all available permissions

6. **Updated Routes**:
   - Admin routes now require `manage_users` permission
   - Auth routes return user with permissions array
   - All protected routes use new permission middleware

### Frontend UI

7. **Roles Management Page** (`src/pages/RolesPage.tsx`):
   - Card-based role display with user counts
   - Configure permissions dialog with checkboxes
   - Permissions grouped by category
   - Real-time updates

8. **Permission Hook** (`src/hooks/usePermissions.ts`):
   - `hasPermission(permission)` - Check single permission
   - `hasAnyPermission(...permissions)` - Check multiple (OR)
   - `hasAllPermissions(...permissions)` - Check multiple (AND)
   - `isAdmin()` - Check if user is admin

9. **Updated Users Page**:
   - Role dropdown fetches from API
   - Displays role name with colored badges
   - Create/edit users with role selection

10. **Permission-Based Navigation**:
    - Admin section only shows if user has manage_users or manage_roles
    - Data section only shows if user has any data permissions
    - Dynamic navigation based on user permissions

11. **Updated Components**:
    - AdminLayout now includes Roles link
    - App routes include /admin/roles
    - Layout navigation uses permission checks

## Predefined Roles & Permissions

### Roles

| Role | Code | Description | System Role |
|------|------|-------------|-------------|
| Administrator | admin | Full system access | Yes |
| Sales | sales | View and export data | No |
| Warehouse | warehouse | Manage inventory and imports | No |
| User | user | Basic read-only access | No |

### Permissions

| Permission | Code | Category | Description |
|------------|------|----------|-------------|
| Manage Users | manage_users | admin | Create, edit, delete users |
| Manage Roles | manage_roles | admin | Configure role permissions |
| View Data | view_data | data | View data and reports |
| Import Data | import_data | data | Upload and import files |
| Export Data | export_data | data | Download and export data |
| Run Transformations | run_transformations | data | Execute transformations |

### Default Permission Assignments

- **Administrator**: All permissions
- **Sales**: view_data, export_data
- **Warehouse**: view_data, import_data, run_transformations
- **User**: view_data only

## Migration Results

```
Roles created: 4
Permissions created: 6
Role-Permission mappings: 12
Users migrated: 2 (1 admin, 1 user)
```

## Testing Verification

✅ Migration applied successfully (007_roles_and_permissions.sql)
✅ Prisma client regenerated with new models
✅ API server started without errors
✅ Roles table populated with 4 predefined roles
✅ Permissions table populated with 6 permissions
✅ Role-permission mappings created correctly
✅ Existing users migrated to new role system
✅ User counts per role verified

## Usage

### For Administrators

1. **View Roles**: Navigate to Admin → Roles
2. **Configure Permissions**: Click "Configure" on any role card
3. **Select Permissions**: Check/uncheck permissions by category
4. **Save Changes**: Click "Save Changes" to update

### For Developers

#### Check Permissions in Backend

```typescript
import { requirePermission, PERMISSIONS } from '../middleware/requirePermission.js';

// Single permission
fastify.get('/protected', { preHandler: requirePermission(PERMISSIONS.VIEW_DATA) }, async () => {
  // Handler code
});

// Multiple permissions (OR)
fastify.get('/flexible', { 
  preHandler: requireAnyPermission(PERMISSIONS.IMPORT_DATA, PERMISSIONS.EXPORT_DATA) 
}, async () => {
  // Handler code
});
```

#### Check Permissions in Frontend

```typescript
import { usePermissions, PERMISSIONS } from '../hooks/usePermissions';

function MyComponent() {
  const { hasPermission, hasAnyPermission } = usePermissions();
  
  return (
    <div>
      {hasPermission(PERMISSIONS.IMPORT_DATA) && (
        <Button>Upload Files</Button>
      )}
      
      {hasAnyPermission(PERMISSIONS.EXPORT_DATA, PERMISSIONS.VIEW_DATA) && (
        <DataTable />
      )}
    </div>
  );
}
```

## Future Enhancements

Potential additions (not currently implemented):

1. **Permission Deny Rules** - The `granted` column supports future deny logic
2. **Custom Roles** - Allow creating new roles beyond the 4 predefined
3. **Permission History** - Track who changed permissions when
4. **Role Hierarchy** - Inherit permissions from parent roles
5. **Resource-Level Permissions** - Permissions on specific data (e.g., "view orders for customer X")
6. **API Tokens** - Service accounts with specific permissions
7. **Audit Logging** - Track permission checks and access attempts

## Files Created/Modified

### Created Files

- `database/migrations/007_roles_and_permissions.sql`
- `apps/backoffice/api/src/auth/permissions.ts`
- `apps/backoffice/api/src/middleware/requirePermission.ts`
- `apps/backoffice/api/src/routes/roles.ts`
- `apps/backoffice/web/src/pages/RolesPage.tsx`
- `apps/backoffice/web/src/hooks/usePermissions.ts`
- `RBAC_IMPLEMENTATION.md` (this file)

### Modified Files

- `apps/backoffice/api/prisma/schema.prisma`
- `apps/backoffice/api/src/index.ts`
- `apps/backoffice/api/src/routes/admin.ts`
- `apps/backoffice/api/src/routes/auth.ts`
- `apps/backoffice/web/src/App.tsx`
- `apps/backoffice/web/src/hooks/useAuth.ts`
- `apps/backoffice/web/src/pages/UsersPage.tsx`
- `apps/backoffice/web/src/components/AdminLayout.tsx`
- `apps/backoffice/web/src/components/Layout.tsx`

## Multi-Role Upgrade Status (Phases 1-12)

### ✅ Phase 1-11: Multi-Role Architecture & UI
- Many-to-many user-role relationship (`UserRole` junction table)
- Permission union (flattened effective permissions)
- Permission implications (`manage_users` → `view_roles`)
- Navigation filtering based on permissions
- Read-only UI states with tooltips
- Full role CRUD operations (create, edit metadata, delete)
- Database-driven icon system
- Immutable role names/codes after creation

### ✅ Phase 12: Comprehensive Integration Tests
- **Test Framework**: Node.js built-in test runner (no Jest dependency)
- **Test Database**: Isolated `handled_test` database
- **Test Scripts**: `pnpm test`, `pnpm test:watch`, `pnpm test:reset`
- **Test Files**:
  - `tests/db-split.test.ts` - Database split verification (converted from Jest)
  - `tests/rbac-multi-role.test.ts` - **14 RBAC tests** covering:
    - Multi-role assignment (3 tests)
    - Permission flattening/union (3 tests)
    - Permission implications (4 tests)
    - Edge cases (4 tests: disabled users, system roles, cascades, empty roles)
  - `tests/test-helpers.ts` - Reusable test utilities with robust cleanup
  - `tests/sql-injection-prevention.test.ts` - **29 SQL injection tests**
  - `tests/validation.test.ts` - **24 input validation tests**

**Total Test Coverage**: 67 passing tests across 4 test suites

## Code Quality Improvements (Post-Phase 12)

Following comprehensive code review, implemented 4 additional priorities:

### ✅ Priority 1: SQL Injection Prevention
- Created `sql-utils.ts` with validation and safe quoting
- Protected table/column names in raw SQL queries
- 29 dedicated tests for injection attack vectors

### ✅ Priority 2: Transaction Error Handling
- Added try-catch to all Prisma transactions
- Standardized error response format (`{ error, details }`)
- Distinguishes Prisma constraint errors (P2002 → 400, not 500)

### ✅ Priority 3: Type Safety & Error Handling
- Eliminated all `any` types (6 instances → 0)
- Created proper error type definitions (backend & frontend)
- Custom `ApiError` class with structured response data
- Type guards for safe error handling

### ✅ Priority 4: Input Validation & Production Logging
- Created `validation.ts` with 5 comprehensive validators
- Icon whitelist validation (20 predefined icons)
- Robust role code sanitization
- Fixed permission validation race condition
- Production-safe logger (respects `NODE_ENV` and `LOG_LEVEL`)
- Replaced all debug `console.log` statements

## Multi-Role Usage Patterns

### Assigning Multiple Roles to Users

Users can now have multiple roles simultaneously, with permissions combined via union (OR logic):

**Example Scenarios:**
- A user with both `3pl_ops` + `3pl_manager` roles gets all permissions from both roles
- A user with `customer_service` + `3pl_viewer` can both help customers and view 3PL data
- Admins typically only need the `admin` role (it has all permissions)

### Permission Implications

Some permissions automatically imply others for better UX:

```typescript
// From src/auth/permissions.ts
export const PERMISSION_IMPLICATIONS: Record<string, string[]> = {
  manage_users: ['view_roles'],        // User managers can view roles
  manage_roles: ['view_roles'],        // Role managers can view roles
  manage_clients: ['view_clients'],    // Client managers can view clients
  manage_warehouses: ['view_warehouses'], // Warehouse managers can view warehouses
  // ... more implications
};
```

**What this means:**
- When checking permissions, implications are automatically included
- UI elements show correctly without redundant permission grants
- Keeps permission lists clean and minimal

### Current Roles & Their Purpose

| Role | Code | Typical Use Case |
|------|------|------------------|
| **Administrator** | `admin` | Full system access, manages all users and settings |
| **Customer Service** | `customer_service` | Helps customers, views orders, manages customer data |
| **3PL Operations** | `3pl_ops` | Daily warehouse operations, imports, transformations |
| **3PL Manager** | `3pl_manager` | Oversees 3PL operations, full access to 3PL settings |
| **3PL Viewer** | `3pl_viewer` | Read-only access to 3PL data for reporting |

### Role Management Best Practices

1. **Assign Minimal Roles**: Only assign roles a user actually needs
2. **Use Single Role When Possible**: Most users should have one primary role
3. **Multiple Roles for Special Cases**: Cross-functional users who need access to multiple areas
4. **Regular Audits**: Periodically review user roles and remove unnecessary assignments
5. **Role Changes**: Use the Users page to add/remove roles; changes take effect immediately

### Frontend Permission Checking

Navigation items automatically hide/show based on permissions:

```typescript
// From usePermissions hook
const { hasPermission, hasAnyPermission, hasAllPermissions, isAdmin } = usePermissions();

// Hide/show UI elements
{hasPermission('manage_users') && <UsersButton />}
{hasAnyPermission('view_clients', 'view_warehouses') && <OperationsSection />}
{isAdmin() && <DangerZone />}
```

### Backend Permission Enforcement

Routes are protected with middleware:

```typescript
// Single permission required
fastify.get('/data', { preHandler: requirePermission('view_data') }, handler);

// Any of multiple permissions (OR)
fastify.post('/import', { 
  preHandler: requireAnyPermission('import_data', 'manage_settings') 
}, handler);

// All permissions required (AND)
fastify.post('/critical', { 
  preHandler: requireAllPermissions('manage_users', 'manage_roles') 
}, handler);
```

## Production Deployment Status

### ✅ Week 3: Production Deployment Complete

**Deployment Date**: December 2024

**Actions Taken:**
1. ✅ Pulled latest code with multi-role updates
2. ✅ Regenerated Prisma clients (schema-primary, schema-data)
3. ✅ Resolved TypeScript compilation errors (session cache destructuring, unused variables)
4. ✅ Rebuilt backend with `pnpm build`
5. ✅ Restarted PM2 with fresh process (`pm2 kill` + `pm2 start`)
6. ✅ Verified login and authentication working
7. ✅ Manually reassigned all users to appropriate roles via Admin UI
8. ✅ Tested permissions and navigation filtering

**Production Environment:**
- Server: VPS (ops.handledcommerce.com)
- Database: Split architecture (Primary DB on DBaaS, Data DB on VPS)
- Process Manager: PM2 with tsx interpreter
- TypeScript: Direct execution via tsx (no pre-compilation for deployment)

**Known Issues/Resolutions:**
- **Module Caching**: Required `pm2 kill` instead of `pm2 restart` to clear tsx module cache
- **Dual PM2 Instances**: Used `pm2 delete` to remove duplicate instances before fresh start
- **Session Destructuring**: Fixed nullable return type handling for session cache

## System Status

🟢 **All systems operational - Production Deployed**

- Database migrations: ✅ Complete (14 migrations)
- Multi-role system: ✅ Fully functional in production
- Backend API: ✅ Running with validation
- Frontend UI: ✅ Role CRUD + read-only modes
- Permission checks: ✅ Active with implications
- Integration tests: ✅ 67 tests passing
- Code quality: ✅ Type-safe, validated, secure
- Documentation: ✅ Comprehensive
- **Production Deployment: ✅ Complete with role reassignment**

The RBAC multi-role system is **live in production** with comprehensive testing, security hardening, and successful user migration!

