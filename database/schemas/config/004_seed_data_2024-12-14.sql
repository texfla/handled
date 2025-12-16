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
  ('customer_service', 'Customer Service', 'Help customers, view orders, manage customer data', 'headphones', false),
  ('3pl_ops', '3PL Operations', 'Daily warehouse operations, imports, transformations', 'package', false),
  ('3pl_manager', '3PL Manager', 'Oversee 3PL operations, full access to 3PL settings', 'package-check', false),
  ('3pl_viewer', '3PL Viewer', 'Read-only access to 3PL data for reporting', 'eye', false)
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
-- CUSTOMER_SERVICE: Customer-facing operations
-- ------------------------------------
INSERT INTO config.role_permissions (role_id, permission_id, granted)
SELECT r.id, p.id, true
FROM config.roles r
CROSS JOIN config.permissions p
WHERE r.code = 'customer_service'
  AND p.code IN (
    -- View access
    'view_dashboard',
    'view_clients',
    'view_orders',
    'view_inventory',
    'view_shipping',
    'view_billing',
    'view_reports',
    -- Manage returns (customer service handles returns)
    'view_returns', 'manage_returns',
    -- Export data for reports
    'export_data'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ------------------------------------
-- 3PL_OPS: Daily warehouse operations
-- ------------------------------------
INSERT INTO config.role_permissions (role_id, permission_id, granted)
SELECT r.id, p.id, true
FROM config.roles r
CROSS JOIN config.permissions p
WHERE r.code = '3pl_ops'
  AND p.code IN (
    -- View access to 3PL data
    'view_3pl',
    'view_dashboard',
    'view_inventory',
    'view_receiving',
    'view_orders',
    'view_shipping',
    'view_operations',
    -- Operational permissions
    'manage_inventory',
    'manage_receiving',
    'manage_orders',
    'manage_shipping',
    'manage_operations',
    -- Data operations
    'import_data',
    'export_data',
    'run_transformations',
    'view_integrations'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ------------------------------------
-- 3PL_MANAGER: Full 3PL access
-- ------------------------------------
INSERT INTO config.role_permissions (role_id, permission_id, granted)
SELECT r.id, p.id, true
FROM config.roles r
CROSS JOIN config.permissions p
WHERE r.code = '3pl_manager'
  AND (
    -- All 3PL permissions
    p.code IN ('view_3pl', 'manage_3pl_settings')
    -- All operational permissions
    OR p.code IN (
      'view_dashboard',
      'view_inventory', 'manage_inventory',
      'view_receiving', 'manage_receiving',
      'view_orders', 'manage_orders',
      'view_shipping', 'manage_shipping',
      'view_returns', 'manage_returns',
      'view_operations', 'manage_operations',
      'view_billing', 'manage_billing'
    )
    -- All data permissions
    OR p.code IN (
      'import_data',
      'export_data',
      'run_transformations',
      'view_integrations',
      'manage_integrations'
    )
    -- Reports
    OR p.code = 'view_reports'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ------------------------------------
-- 3PL_VIEWER: Read-only 3PL access
-- ------------------------------------
INSERT INTO config.role_permissions (role_id, permission_id, granted)
SELECT r.id, p.id, true
FROM config.roles r
CROSS JOIN config.permissions p
WHERE r.code = '3pl_viewer'
  AND p.code IN (
    -- All view permissions
    'view_3pl',
    'view_dashboard',
    'view_clients',
    'view_inventory',
    'view_receiving',
    'view_orders',
    'view_shipping',
    'view_returns',
    'view_operations',
    'view_billing',
    'view_reports',
    'view_integrations',
    -- Export for reporting
    'export_data'
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

