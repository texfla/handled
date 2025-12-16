-- ============================================================================
-- Config Schema - Seed Data (USER DOMAIN)
-- ============================================================================
-- Date: 2024-12-14
-- Purpose: Initial roles and role-permission assignments for fresh installs
-- 
-- EXECUTION: Only runs on FIRST setup (when roles don't exist)
-- CONFLICT HANDLING: ON CONFLICT DO NOTHING (never overwrite user data)
-- 
-- WHY THIS ONLY RUNS ONCE:
-- - Roles are user-managed (admins create custom roles)
-- - Permission assignments are user-configured
-- - New permissions do NOT automatically get assigned to roles
-- - System admins manually assign new permissions via UI
--
-- NOTE: Permissions are now loaded from 003_permissions_master_2024-12-16.sql
-- ============================================================================

-- ==================================================
-- SEED ROLES (First setup only)
-- ==================================================
-- Current production roles: admin, customer_service, 3pl_ops, 3pl_manager, 3pl_viewer
-- ==================================================

INSERT INTO config.roles (code, name, description, icon, is_system) VALUES
  ('admin', 'Administrator', 'Full system access with all permissions', 'shield-check', true),
  ('superuser', 'Superuser', 'Full operational access - cannot manage roles', 'crown', false),
  ('warehouse_lead', 'Warehouse Lead', 'Manage warehouse operations and inventory', 'package-check', false),
  ('salesperson', 'Salesperson', 'Manage clients and view operations', 'trending-up', false)
ON CONFLICT (code) DO NOTHING;

-- ==================================================
-- ASSIGN PERMISSIONS TO ROLES (First setup only)
-- ==================================================
-- NOTE: New permissions are NOT automatically assigned to roles
-- System admins must manually assign new permissions via Role Management UI
-- ==================================================

-- ------------------------------------
-- ADMIN: All permissions (at time of first setup)
-- ------------------------------------
INSERT INTO config.role_permissions (role_id, permission_id, granted)
SELECT r.id, p.id, true
FROM config.roles r
CROSS JOIN config.permissions p
WHERE r.code = 'admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;


-- ------------------------------------
-- 3PL_OPS: Daily warehouse operations
-- ------------------------------------
INSERT INTO config.role_permissions (role_id, permission_id, granted)
SELECT r.id, p.id, true
FROM config.roles r
CROSS JOIN config.permissions p
WHERE r.code = 'superuser'
  AND p.code != 'manage_roles'  -- Exclude role management
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ------------------------------------
-- WAREHOUSE_LEAD: Warehouse operations
-- ------------------------------------
INSERT INTO config.role_permissions (role_id, permission_id, granted)
SELECT r.id, p.id, true
FROM config.roles r
CROSS JOIN config.permissions p
WHERE r.code = 'warehouse_lead'
  AND p.code IN (
    -- View access
    'view_clients',
    'view_warehouses',
    'view_inventory',
    'view_receiving',
    'view_orders',
    'view_shipping',
    'view_returns',
    'view_operations',
    -- Warehouse operations
    'manage_warehouses',
    'manage_inventory',
    'manage_receiving',
    'manage_orders',
    'manage_shipping',
    'manage_operations',
    -- Data access
    'view_demographics',
    'view_carrier_rates',
    'view_transformations',
    'view_integrations'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ------------------------------------
-- SALESPERSON: Client management and sales
-- ------------------------------------
INSERT INTO config.role_permissions (role_id, permission_id, granted)
SELECT r.id, p.id, true
FROM config.roles r
CROSS JOIN config.permissions p
WHERE r.code = 'salesperson'
  AND p.code IN (
    -- Client management
    'view_clients',
    'manage_clients',
    -- View operations for context
    'view_inventory',
    'view_orders',
    'view_shipping',
    'view_billing',
    -- Reports
    'view_reports'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ==================================================
-- VERIFICATION
-- ==================================================

-- Verify roles were created
DO $$
DECLARE
  role_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO role_count FROM config.roles;
  IF role_count >= 5 THEN
    RAISE NOTICE '✓ Roles seeded successfully: % roles', role_count;
  ELSE
    RAISE WARNING '⚠ Expected at least 5 roles, found %', role_count;
  END IF;
END $$;

-- Verify permissions exist (from 003_permissions_master)
DO $$
DECLARE
  perm_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO perm_count FROM config.permissions;
  IF perm_count >= 30 THEN
    RAISE NOTICE '✓ Permissions loaded: % permissions', perm_count;
  ELSE
    RAISE WARNING '⚠ Expected at least 30 permissions, found %', perm_count;
  END IF;
END $$;

-- Verify role-permission mappings
DO $$
DECLARE
  admin_perms INTEGER;
BEGIN
  SELECT COUNT(*) INTO admin_perms 
  FROM config.role_permissions rp
  JOIN config.roles r ON rp.role_id = r.id
  WHERE r.code = 'admin' AND rp.granted = true;
  
  IF admin_perms > 0 THEN
    RAISE NOTICE '✓ Admin role has % permissions assigned', admin_perms;
  ELSE
    RAISE WARNING '⚠ Admin role has no permissions assigned';
  END IF;
END $$;

