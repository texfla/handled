# Permission Matrix Implementation Plan

## Current State → Target State

### Old Permission Model (Inconsistent)
```
view_data, import_data, export_data  (what data?)
run_transformations                   (doesn't match view/manage pattern)
view_3pl, manage_3pl_settings        (too vague)
```

### New Permission Model (Matrix)
```
                    View  Manage  Import  Export
Users                ✓     ✓       
Roles                ✓     ✓       
Clients              ✓     ✓
Warehouses           ✓     ✓
Demographics         ✓     ✓       ✓       ✓
Carrier Rates        ✓     ✓       ✓       ✓
Transformations      ✓     ✓
Integrations         ✓     ✓
```

---

## Complete Permission List

### Admin Category
- view_users, manage_users
- view_roles, manage_roles
- view_settings, manage_settings

### Operations Category
- view_clients, manage_clients
- view_warehouses, manage_warehouses
- view_inventory, manage_inventory
- view_receiving, manage_receiving
- view_orders, manage_orders
- view_shipping, manage_shipping
- view_returns, manage_returns
- view_operations, manage_operations

### Billing Category
- view_billing, manage_billing

### Reports Category
- view_reports

### Data Category (Integrations Module)
- view_integrations, manage_integrations
- view_demographics, manage_demographics, import_demographics, export_demographics
- view_carrier_rates, manage_carrier_rates, import_carrier_rates, export_carrier_rates
- view_transformations, manage_transformations

---

## Changes from Old Model

**Removed:**
- `view_data` (too vague)
- `import_data` (split into demographics + carrier_rates)
- `export_data` (split into demographics + carrier_rates)
- `run_transformations` (renamed to manage_transformations)
- `view_3pl` (redundant)
- `manage_3pl_settings` (redundant)

**Added:**
- `view_demographics`, `manage_demographics`, `import_demographics`, `export_demographics`
- `view_carrier_rates`, `manage_carrier_rates`, `import_carrier_rates`, `export_carrier_rates`
- `view_transformations` (new - see transformation history)
- `manage_transformations` (renamed from run_transformations)

---

## Navigation Updates

**Old:**
```typescript
requiredPermission: 'import_data'        // Imports page
requiredPermission: 'export_data'        // Exports page
requiredPermission: 'run_transformations' // Transformations page
```

**New:**
```typescript
requiredAnyPermission: ['import_demographics', 'import_carrier_rates']    // Imports page
requiredAnyPermission: ['export_demographics', 'export_carrier_rates']    // Exports page
requiredAnyPermission: ['view_transformations', 'manage_transformations'] // Transformations page
```

**Logic:** If you can import/export ANY data type, you see the page. Within the page, you only see options for data types you have access to.

---

## Implementation Steps

1. Update TypeScript constants (PERMISSIONS, PERMISSION_INFO)
2. Update navigation.ts with new permission checks
3. Update usePermissions.ts with new constants
4. Update 003_permissions_master.sql with complete new list
5. Update 004_seed_data.sql with new role assignments
6. Delete 005_remove_legacy_3pl_permissions.sql
7. Update tests
8. Drop config schema and re-migrate

---

## Rollback Plan

If issues arise:
- Git revert this commit
- Existing config schema still works with old permissions
- No data loss (you'll just recreate users)

---

Ready to proceed with implementation.
