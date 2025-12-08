# User Admin Section

## Overview

Add a separate Admin section (like Data) with user management. Access restricted to users with 'admin' role.

---

## Structure

```
Top Nav:  [ Home ]  [ Data ]  [ Admin ]
                                  │
                                  └── Left Sidebar:
                                        • Users
```

## Database Changes

Add `disabled` column to users table:

```sql
ALTER TABLE config.users ADD COLUMN IF NOT EXISTS disabled BOOLEAN DEFAULT FALSE;
```

File: [database/migrations/006_user_disabled.sql](database/migrations/006_user_disabled.sql)

---

## Backend Changes

### 1. Admin Middleware

Role-based access control to protect admin routes.

File: [apps/backoffice/api/src/middleware/requireAdmin.ts](apps/backoffice/api/src/middleware/requireAdmin.ts)

### 2. User Management Routes

- `GET /api/admin/users` - List all users
- `POST /api/admin/users` - Create user
- `PUT /api/admin/users/:id` - Update user (name, email, role)
- `DELETE /api/admin/users/:id` - Delete user
- `POST /api/admin/users/:id/reset-password` - Reset password
- `POST /api/admin/users/:id/disable` - Disable user
- `POST /api/admin/users/:id/enable` - Enable user

File: [apps/backoffice/api/src/routes/admin.ts](apps/backoffice/api/src/routes/admin.ts)

---

## Frontend Changes

### 1. AdminLayout Component

Left sidebar navigation for Admin section.

File: [apps/backoffice/web/src/components/AdminLayout.tsx](apps/backoffice/web/src/components/AdminLayout.tsx)

### 2. UsersPage Component

User management UI with create, edit, delete, and password reset.

File: [apps/backoffice/web/src/pages/UsersPage.tsx](apps/backoffice/web/src/pages/UsersPage.tsx)

### 3. Updated Routes

Admin routes nested under `/admin/*`.

File: [apps/backoffice/web/src/App.tsx](apps/backoffice/web/src/App.tsx)

### 4. Updated Navigation

Admin link in top nav (admin users only).

File: [apps/backoffice/web/src/components/Layout.tsx](apps/backoffice/web/src/components/Layout.tsx)

---

## Status: ✅ Complete

All tasks have been implemented:

- [x] Add disabled column to users table (migration)
- [x] Create requireAdmin middleware for role-based access
- [x] Create user management routes (CRUD + password reset)
- [x] Create AdminLayout.tsx with left sidebar
- [x] Create UsersPage.tsx with user management UI
- [x] Update App.tsx routes for Admin section
- [x] Update Layout.tsx to include Admin link

