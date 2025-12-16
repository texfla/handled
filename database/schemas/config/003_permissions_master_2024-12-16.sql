-- ============================================================================
-- MASTER PERMISSIONS FILE
-- ============================================================================
-- Date: 2024-12-16
-- Purpose: Single source of truth for all system permissions (DEVELOPER DOMAIN)
-- 
-- EXECUTION: ALWAYS runs on every migration (idempotent)
-- CONFLICT HANDLING: ON CONFLICT DO UPDATE (always sync with code)
-- MAINTENANCE: Only ADD to this file, never REMOVE (append-only)
-- DEPRECATION: Comment out with date and reason, keep for history
-- 
-- WHY THIS RUNS ALWAYS:
-- - Permissions are code-driven (new features = new permissions)
-- - Safe to update metadata (name, description, category)
-- - Does NOT affect role assignments (separate concern)
--
-- This file MUST run:
--   - AFTER: 001_structure (table must exist)
--   - BEFORE: 004_seed_data (permissions must exist for role assignments)
-- ============================================================================

INSERT INTO config.permissions (code, name, description, category) VALUES
  -- ==================================================
  -- Admin permissions (baseline: 2024-12-14)
  -- ==================================================
  ('manage_users', 'Manage Users', 'Create, edit, and delete user accounts', 'admin'),
  ('manage_roles', 'Manage Roles', 'Configure role permissions', 'admin'),
  ('view_users', 'View Users', 'See user list and user details', 'admin'),
  ('view_roles', 'View Roles', 'See role structure and permission assignments', 'admin'),
  ('view_dashboard', 'View Dashboard', 'Access system dashboard and overview', 'admin'),
  ('view_settings', 'View Settings', 'View system settings', 'admin'),
  ('manage_settings', 'Manage Settings', 'Modify system configuration', 'admin'),
  
  -- ==================================================
  -- Client/Customer permissions (baseline: 2024-12-14)
  -- ==================================================
  ('view_clients', 'View Clients', 'View client information and contracts', 'clients'),
  ('manage_clients', 'Manage Clients', 'Create and modify client records', 'clients'),
  
  -- ==================================================
  -- Warehouse permissions (added: 2024-12-16)
  -- ==================================================
  ('view_warehouses', 'View Warehouses', 'View warehouse facilities and capacity', 'operations'),
  ('manage_warehouses', 'Manage Warehouses', 'Create and modify warehouse facilities', 'operations'),
  
  -- ==================================================
  -- Inventory permissions (baseline: 2024-12-14)
  -- ==================================================
  ('view_inventory', 'View Inventory', 'View stock levels and locations', 'inventory'),
  ('manage_inventory', 'Manage Inventory', 'Adjust inventory and manage locations', 'inventory'),
  
  -- ==================================================
  -- Operations permissions (baseline: 2024-12-14)
  -- ==================================================
  ('view_receiving', 'View Receiving', 'View inbound shipments and receipts', 'operations'),
  ('manage_receiving', 'Manage Receiving', 'Process receipts and putaway tasks', 'operations'),
  ('view_operations', 'View Operations', 'View labor and productivity metrics', 'operations'),
  ('manage_operations', 'Manage Operations', 'Manage tasks and warehouse operations', 'operations'),
  
  -- ==================================================
  -- Fulfillment permissions (baseline: 2024-12-14)
  -- ==================================================
  ('view_orders', 'View Orders', 'View order details and status', 'fulfillment'),
  ('manage_orders', 'Manage Orders', 'Process picks, packs, and shipments', 'fulfillment'),
  ('view_shipping', 'View Shipping', 'View shipments and tracking', 'fulfillment'),
  ('manage_shipping', 'Manage Shipping', 'Create shipments and print labels', 'fulfillment'),
  ('view_returns', 'View Returns', 'View return requests and status', 'fulfillment'),
  ('manage_returns', 'Manage Returns', 'Process returns and dispositions', 'fulfillment'),
  
  -- ==================================================
  -- Billing permissions (baseline: 2024-12-14)
  -- ==================================================
  ('view_billing', 'View Billing', 'View invoices and payments', 'billing'),
  ('manage_billing', 'Manage Billing', 'Create invoices and process payments', 'billing'),
  
  -- ==================================================
  -- Reports permissions (baseline: 2024-12-14)
  -- ==================================================
  ('view_reports', 'View Reports', 'Access reports and analytics', 'reports'),
  
  -- ==================================================
  -- Integrations permissions (baseline: 2024-12-14)
  -- ==================================================
  ('view_integrations', 'View Integrations', 'View integration status and logs', 'integrations'),
  ('manage_integrations', 'Manage Integrations', 'Configure and run integrations', 'integrations'),
  
  -- ==================================================
  -- Data permissions (legacy from initial RBAC)
  -- ==================================================
  ('view_data', 'View Data', 'View data and reports', 'data'),
  ('import_data', 'Import Data', 'Upload and import data files', 'data'),
  ('export_data', 'Export Data', 'Download and export data', 'data'),
  ('run_transformations', 'Run Transformations', 'Execute data transformations', 'data'),
  
  -- ==================================================
  -- 3PL-specific permissions (baseline: 2024-12-14)
  -- ==================================================
  ('view_3pl', 'View 3PL', 'View all 3PL operational data', '3pl'),
  ('manage_3pl_settings', 'Manage 3PL Settings', 'Configure 3PL system settings', '3pl')

-- ==================================================
-- FUTURE PERMISSIONS: Add new permissions above this line
-- ==================================================
-- When adding a new permission:
-- 1. Add line to INSERT above (don't forget trailing comma)
-- 2. Add to TypeScript: apps/backoffice/api/src/auth/permissions.ts
-- 3. Add to frontend: apps/backoffice/web/src/hooks/usePermissions.ts
-- 4. Document in comments with date added
-- 5. Users must manually assign new permission to roles via UI
-- ==================================================

ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category;

-- ==================================================
-- Verification Query
-- ==================================================
DO $$
DECLARE
    perm_count INT;
BEGIN
    SELECT COUNT(*) INTO perm_count FROM config.permissions;
    RAISE NOTICE '✓ Permissions synced: % total permissions loaded', perm_count;
END $$;

