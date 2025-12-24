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
  -- Demographics data permissions (updated: 2024-12-16)
  -- ==================================================
  ('view_demographics', 'View Demographics', 'View demographic and ZIP code data', 'data'),
  ('manage_demographics', 'Manage Demographics', 'Manage demographic data and ZIP codes', 'data'),
  ('import_demographics', 'Import Demographics', 'Upload demographic and ZIP code files', 'data'),
  ('export_demographics', 'Export Demographics', 'Download demographic data', 'data'),
  
  -- ==================================================
  -- Carrier rates permissions (updated: 2024-12-16)
  -- ==================================================
  ('view_carrier_rates', 'View Carrier Rates', 'View carrier pricing and zone data', 'data'),
  ('manage_carrier_rates', 'Manage Carrier Rates', 'Manage carrier pricing data', 'data'),
  ('import_carrier_rates', 'Import Carrier Rates', 'Upload carrier rate and zone files', 'data'),
  ('export_carrier_rates', 'Export Carrier Rates', 'Download carrier rate data', 'data'),
  
  -- ==================================================
  -- Transformations permissions (updated: 2024-12-16)
  -- ==================================================
  ('view_transformations', 'View Transformations', 'View transformation history and status', 'data'),
  ('manage_transformations', 'Manage Transformations', 'Execute and configure transformations', 'data'),
  
  -- ==================================================
  -- Design system permissions (added: 2024-12-11)
  -- ==================================================
  ('view_designs', 'View Designs', 'Access component library, style guide, and design patterns', 'designs'),

  -- ==================================================
  -- Development permissions (added: 2024-12-24)
  -- ==================================================
  ('view_dev_tools', 'View Dev Tools', 'Access developer tools section', 'development'),
  ('view_style_guide', 'View Style Guide', 'Access component library and design patterns', 'development'),
  ('view_api_docs', 'View API Docs', 'Access API documentation and specifications', 'development'),
  ('view_documentation', 'View Documentation', 'Access general system documentation', 'development')

  -- ==================================================
  -- DEPRECATED PERMISSIONS (removed 2024-12-16)
  -- ==================================================
  -- view_data → Split into view_demographics, view_carrier_rates
  -- import_data → Split into import_demographics, import_carrier_rates
  -- export_data → Split into export_demographics, export_carrier_rates
  -- run_transformations → Renamed to manage_transformations (added view_transformations)
  -- view_3pl, manage_3pl_settings → Replaced with specific permissions
  -- ==================================================

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

