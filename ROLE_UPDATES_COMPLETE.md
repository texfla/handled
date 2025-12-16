# Role Updates - Ready to Apply

**Date:** 2024-12-16  
**Changes:** Replaced 3PL roles with standard business roles + fixed missing permissions

---

## Changes Made

### 1. Fixed Missing Permission

**Added to TypeScript:**
- `VIEW_DASHBOARD` constant
- PERMISSION_INFO entry with resource/action metadata

**This fixes:** "Other Unknown" permission in admin category

### 2. Updated Roles (4 roles now)

**Old:**
- admin
- customer_service (removed)
- 3pl_ops (removed)
- 3pl_manager (removed)
- 3pl_viewer (removed)

**New:**
- **admin** - Full system access (unchanged)
- **superuser** - All permissions except manage_roles
- **warehouse_lead** - Warehouse operations (inventory, receiving, orders, shipping)
- **salesperson** - Client management and sales view

---

## Role Permissions Summary

### Administrator
- All 38 permissions

### Superuser
- All 37 permissions (excludes manage_roles)
- Can manage users, clients, warehouses
- Full operational access
- Cannot configure role permissions

### Warehouse Lead
- View: clients, warehouses, inventory, receiving, orders, shipping, returns, operations
- Manage: warehouses, inventory, receiving, orders, shipping, operations
- View: demographics, carrier_rates, transformations, integrations
- **Purpose:** Daily warehouse management

### Salesperson
- Manage: clients
- View: inventory, orders, shipping, billing, reports
- **Purpose:** Client acquisition and account management

---

## Apply Changes

### Step 1: Drop config schema
```bash
psql handled_dev -c "DROP SCHEMA IF EXISTS config CASCADE;"
```

### Step 2: Re-run migrations
```bash
bash database/run-migrations-dev.sh -dev
```

**Expected output:**
```
✓ Permissions synced: 38 total permissions loaded
✓ Roles seeded successfully: 4 roles
✓ Admin role has 38 permissions assigned
```

### Step 3: Rebuild code
```bash
cd apps/backoffice/api && pnpm build
cd ../web && pnpm build
```

### Step 4: Restart servers
```bash
pnpm dev
```

### Step 5: Verify

Navigate to Admin → Roles and you should see:
- 4 roles (not 5)
- No "Other Unknown" permissions
- Grouped matrix display

---

## Files Changed

1. `apps/backoffice/api/src/auth/permissions.ts` - Added VIEW_DASHBOARD
2. `apps/backoffice/web/src/hooks/usePermissions.ts` - Added VIEW_DASHBOARD + updated implications
3. `database/schemas/config/004_seed_data_2024-12-14.sql` - New roles and assignments

**Total:** 3 files modified
