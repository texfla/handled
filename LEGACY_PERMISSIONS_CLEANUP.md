# Legacy 3PL Permissions - Cleanup Complete

**Date:** 2024-12-15  
**Issue:** `view_3pl` and `manage_3pl_settings` showing as "other / unknown" in permission UI

---

## What Was Done

### 1. Identified Legacy Permissions

Found 2 permissions that were:
- Too broad/vague
- Redundant with specific permissions
- Not in TypeScript PERMISSION_INFO (causing "other/unknown" display)

**Removed:**
- `view_3pl` - Too broad, replaced by: `view_clients`, `view_warehouses`, `view_orders`, `view_inventory`
- `manage_3pl_settings` - Redundant with: `manage_settings`, `manage_clients`, `manage_warehouses`

### 2. Files Updated

**Seed Files:**
- `database/schemas/config/003_permissions_master_2024-12-16.sql` - Removed from master list
- `database/schemas/config/004_seed_data_2024-12-14.sql` - Updated role assignments:
  - `3pl_ops`: Replaced `view_3pl` with specific view permissions
  - `3pl_manager`: Replaced `view_3pl`, `manage_3pl_settings` with specific permissions
  - `3pl_viewer`: Replaced `view_3pl` with specific view permissions

**Documentation:**
- `docs/RBAC_IMPLEMENTATION.md` - Updated examples to use specific permissions

**Tests:**
- `apps/backoffice/api/tests/validation.test.ts` - Updated test case

**Migrations:**
- `database/schemas/config/005_remove_legacy_3pl_permissions.sql` - NEW cleanup migration

### 3. Database Cleanup Migration

Created migration to remove from existing databases:
- Logs affected roles before deletion
- CASCADE removes role_permissions entries
- Verifies successful deletion

---

## Running the Cleanup

### On Development Database:

```bash
psql handled_dev -f database/schemas/config/005_remove_legacy_3pl_permissions.sql
```

Expected output:
```
NOTICE:  ════════════════════════════════════════
NOTICE:  Removing legacy 3PL permissions
NOTICE:  ════════════════════════════════════════
NOTICE:  view_3pl: X role assignments will be removed
NOTICE:  manage_3pl_settings: Y role assignments will be removed
NOTICE:  
NOTICE:  These permissions are replaced by:
NOTICE:    view_3pl → view_clients, view_warehouses, view_orders
NOTICE:    manage_3pl_settings → manage_settings, manage_clients
NOTICE:  ✓ Legacy 3PL permissions removed successfully
```

### On Production Database:

```bash
# Backup first
pg_dump -Fc "$PRIMARY_DATABASE_URL" > backup_before_permission_cleanup_$(date +%Y%m%d).dump

# Run cleanup
psql "$PRIMARY_DATABASE_URL" -f database/schemas/config/005_remove_legacy_3pl_permissions.sql

# Verify
psql "$PRIMARY_DATABASE_URL" -c "SELECT COUNT(*) FROM config.permissions WHERE code IN ('view_3pl', 'manage_3pl_settings');"
# Should return 0
```

---

## Impact

**Before cleanup:**
- Roles had vague `view_3pl` permission
- Permission UI showed "other / unknown" for these

**After cleanup:**
- Roles have specific permissions (`view_clients`, `view_warehouses`, etc.)
- Permission UI groups them correctly by resource
- Clearer security model

---

## No Functional Changes

**Roles retain the same effective access:**
- `3pl_ops`: Still has view access to clients, warehouses, inventory (via specific permissions)
- `3pl_manager`: Still has full management access (via specific permissions)
- `3pl_viewer`: Still has read-only access (via specific view permissions)

**Just cleaner, more explicit permission model.**

---

## Files Changed

1. `database/schemas/config/003_permissions_master_2024-12-16.sql` - Removed from master list
2. `database/schemas/config/004_seed_data_2024-12-14.sql` - Updated 3 role assignments
3. `database/schemas/config/005_remove_legacy_3pl_permissions.sql` - NEW cleanup migration
4. `docs/RBAC_IMPLEMENTATION.md` - Updated examples
5. `apps/backoffice/api/tests/validation.test.ts` - Updated test

**Total: 4 modified, 1 created**
