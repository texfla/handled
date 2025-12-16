# Permissions Management Guide

## 📋 Overview

The permissions system has been restructured to handle **two different domains**:

1. **Permissions** = Developer Domain (code-driven)
2. **Roles & Assignments** = User Domain (admin-configured)

---

## 🏗️ Architecture

### Permissions (Developer Domain)

**File:** `database/schemas/config/003_permissions_master_2024-12-16.sql`

- ✅ **Always runs** on every migration (idempotent)
- ✅ `ON CONFLICT DO UPDATE` - updates metadata if changed
- ✅ **Append-only** - never remove lines, only comment out
- ✅ Single source of truth for all system permissions

**Why this works:**
- Permissions are tied to code features
- Safe to update names/descriptions/categories
- Does NOT affect role assignments (separate table)
- Developers control what permissions exist

### Roles & Assignments (User Domain)

**File:** `database/schemas/config/004_seed_data_2024-12-14.sql`

- ✅ **Runs once** on first database setup only
- ✅ `ON CONFLICT DO NOTHING` - never overwrites user data
- ✅ Provides baseline roles for fresh installs
- ✅ After first setup, users manage via UI

**Why this works:**
- Roles are user-configured (custom roles per organization)
- Permission assignments are admin decisions
- New permissions do NOT auto-assign to roles
- Users maintain full control

---

## 🔄 Migration Order

```
001_structure           → Creates tables (permissions, roles, role_permissions)
002_permissions        → Grants and other setup
003_permissions_master → Loads ALL permissions (always runs)
004_seed_data          → Roles + assignments (first setup only)
```

---

## ➕ Adding a New Permission

### Step 1: Add to TypeScript Constants

**File:** `apps/backoffice/api/src/auth/permissions.ts`

```typescript
export const PERMISSIONS = {
  // ... existing permissions
  NEW_FEATURE: 'new_feature',  // ← Add here
};

export const PERMISSION_INFO = {
  // ... existing info
  [PERMISSIONS.NEW_FEATURE]: {
    name: 'New Feature',
    description: 'Access to new feature',
    category: PERMISSION_CATEGORIES.OPERATIONS,
  },
};
```

### Step 2: Add to Frontend Constants

**File:** `apps/backoffice/web/src/hooks/usePermissions.ts`

```typescript
export const PERMISSIONS = {
  // ... existing permissions
  NEW_FEATURE: 'new_feature',  // ← Add here
};

const PERMISSION_IMPLICATIONS: Record<string, string[]> = {
  // ... existing implications
  'manage_new_feature': ['view_new_feature'],  // ← If applicable
};
```

### Step 3: Add to Master Permissions File

**File:** `database/schemas/config/003_permissions_master_2024-12-16.sql`

```sql
-- Find the section where it should go (by category)
-- Add a new line to the INSERT statement:

  -- ==================================================
  -- Section X: Feature Permissions (added: YYYY-MM-DD)
  -- ==================================================
  ('new_feature', 'New Feature', 'Access to new feature', 'operations'),

-- Don't forget the trailing comma!
```

### Step 4: Deploy

```bash
# Development
bash database/run-migrations-dev.sh -dev

# Production
bash database/run-migrations-prod.sh -prod
```

**Result:**
- ✅ Permission added to `config.permissions` table
- ❌ Permission **NOT** automatically assigned to any roles
- 👤 **System admin must manually assign** via UI

### Step 5: Admin Assigns Permission

After deployment, system admins must:
1. Go to **Administration** → **Role Permissions**
2. Select role (e.g., **Administrator**)
3. Find new permission in appropriate category
4. Check ☑️ to assign
5. Save changes

---

## 🗑️ Deprecating a Permission

**NEVER remove the line from the file!** Instead, comment it out:

```sql
-- ==================================================
-- DEPRECATED PERMISSIONS
-- ==================================================
-- ('old_feature', 'Old Feature', 'Deprecated feature', 'operations')
-- DEPRECATED: 2025-03-15 - Feature removed in v2.0, use new_feature instead
```

**Why keep it:**
- Preserves history
- Avoids FK constraint issues
- Documents what existed
- Can be cleaned up later if needed

---

## 🧹 One-Time Cleanup (Optional, Years Later)

When you need to actually delete deprecated permissions:

```sql
-- Create a new migration: 099_cleanup_permissions_YYYY-MM-DD.sql

-- Explicit deletion (CASCADE removes role_permissions)
DELETE FROM config.permissions 
WHERE code IN (
  'old_permission_1',
  'deprecated_perm_2'
  -- Explicit list for safety
);

-- Also remove commented lines from 003_permissions_master.sql
```

---

## ✅ Verification Queries

### Check all permissions by category
```sql
SELECT category, COUNT(*) as count 
FROM config.permissions 
GROUP BY category 
ORDER BY category;
```

### Check which roles have a specific permission
```sql
SELECT r.code, r.name 
FROM config.role_permissions rp
JOIN config.roles r ON rp.role_id = r.id
JOIN config.permissions p ON rp.permission_id = p.id
WHERE p.code = 'view_warehouses'
  AND rp.granted = true;
```

### Check all permissions for a role
```sql
SELECT p.code, p.name, p.category
FROM config.role_permissions rp
JOIN config.roles r ON rp.role_id = r.id
JOIN config.permissions p ON rp.permission_id = p.id
WHERE r.code = 'admin'
  AND rp.granted = true
ORDER BY p.category, p.code;
```

---

## 🎯 Key Principles

### DO:
- ✅ Add new permissions to master file
- ✅ Update permission metadata (name, description, category)
- ✅ Comment out deprecated permissions with date/reason
- ✅ Let users assign new permissions via UI
- ✅ Keep TypeScript and SQL in sync

### DON'T:
- ❌ Remove lines from permissions master file
- ❌ Auto-assign new permissions to roles
- ❌ Modify role assignments in migrations
- ❌ Delete permissions without explicit cleanup migration
- ❌ Use `ON CONFLICT DO UPDATE` for roles/assignments

---

## 📊 Current State

**Total Permissions:** 34

**By Category:**
- Admin: 7
- Operations: 6
- Fulfillment: 6
- Data: 4
- Clients: 2
- Warehouse: 2 *(added 2024-12-16)*
- Inventory: 2
- Billing: 2
- Integrations: 2
- 3PL: 2
- Reports: 1

**System Roles:**
- Administrator (all permissions)
- Customer Service (view + returns)
- 3PL Operations (daily ops + integrations)
- 3PL Manager (full operational access)
- 3PL Viewer (read-only)

---

## 🚀 Benefits

1. **Simple to maintain** - One file for all permissions
2. **Safe** - Never breaks FK constraints (append-only)
3. **Fast** - Idempotent upserts in <50ms
4. **Explicit** - Clear history with dates
5. **Scalable** - Works until 500+ permissions
6. **Version controlled** - All changes in git
7. **User-controlled** - Roles managed by admins, not devs
8. **Auditable** - Easy to see what exists and when added

---

## 📞 Need Help?

**Adding a permission not showing up?**
- Check TypeScript constant is added
- Verify SQL file has trailing comma
- Run migrations
- Manually assign via UI (it won't auto-assign!)

**Permission exists but role doesn't have it?**
- This is **intentional and correct**
- Go to Role Permissions UI and manually assign
- New permissions never auto-assign to any role

**Want to rename a permission?**
- Update name/description in master file (`ON CONFLICT DO UPDATE` handles it)
- DO NOT change the `code` field (that's the FK reference)
- Deploy and changes sync automatically

