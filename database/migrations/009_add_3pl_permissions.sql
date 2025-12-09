-- ================================================================
-- Migration: Add 3PL Module Permissions
-- Description: Add permissions for all 3PL navigation sections
-- Author: System
-- Date: 2024-12-09
-- ================================================================

BEGIN;

-- Insert new permissions
INSERT INTO config.permissions (code, name, description, category) VALUES
  -- Dashboard
  ('view_dashboard', 'View Dashboard', 'Access system dashboard and overview', 'admin'),
  
  -- Clients
  ('view_clients', 'View Clients', 'View client information and contracts', 'clients'),
  ('manage_clients', 'Manage Clients', 'Create and modify client records', 'clients'),
  
  -- Inventory
  ('view_inventory', 'View Inventory', 'View stock levels and locations', 'inventory'),
  ('manage_inventory', 'Manage Inventory', 'Adjust inventory and manage locations', 'inventory'),
  
  -- Receiving
  ('view_receiving', 'View Receiving', 'View inbound shipments and receipts', 'operations'),
  ('manage_receiving', 'Manage Receiving', 'Process receipts and putaway tasks', 'operations'),
  
  -- Orders
  ('view_orders', 'View Orders', 'View order details and status', 'fulfillment'),
  ('manage_orders', 'Manage Orders', 'Process picks, packs, and shipments', 'fulfillment'),
  
  -- Shipping
  ('view_shipping', 'View Shipping', 'View shipments and tracking', 'fulfillment'),
  ('manage_shipping', 'Manage Shipping', 'Create shipments and print labels', 'fulfillment'),
  
  -- Returns
  ('view_returns', 'View Returns', 'View return requests and status', 'fulfillment'),
  ('manage_returns', 'Manage Returns', 'Process returns and dispositions', 'fulfillment'),
  
  -- Billing
  ('view_billing', 'View Billing', 'View invoices and payments', 'billing'),
  ('manage_billing', 'Manage Billing', 'Create invoices and process payments', 'billing'),
  
  -- Operations
  ('view_operations', 'View Operations', 'View labor and productivity metrics', 'operations'),
  ('manage_operations', 'Manage Operations', 'Manage tasks and warehouse operations', 'operations'),
  
  -- Reports
  ('view_reports', 'View Reports', 'Access reports and analytics', 'reports'),
  
  -- Integrations
  ('view_integrations', 'View Integrations', 'View integration status and logs', 'integrations'),
  ('manage_integrations', 'Manage Integrations', 'Configure and run integrations', 'integrations'),
  
  -- Settings
  ('view_settings', 'View Settings', 'View system settings', 'admin'),
  ('manage_settings', 'Manage Settings', 'Modify system configuration', 'admin')
ON CONFLICT (code) DO NOTHING;

-- Grant all new permissions to admin and superuser roles
INSERT INTO config.role_permissions (role_id, permission_id, granted)
SELECT r.id, p.id, true
FROM config.roles r
CROSS JOIN config.permissions p
WHERE r.code IN ('admin', 'superuser')
  AND p.code IN (
    'view_dashboard', 'view_clients', 'manage_clients', 
    'view_inventory', 'manage_inventory', 'view_receiving', 'manage_receiving',
    'view_orders', 'manage_orders', 'view_shipping', 'manage_shipping',
    'view_returns', 'manage_returns', 'view_billing', 'manage_billing',
    'view_operations', 'manage_operations', 'view_reports',
    'view_integrations', 'manage_integrations', 'view_settings', 'manage_settings'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Grant view-only permissions to User role
INSERT INTO config.role_permissions (role_id, permission_id, granted)
SELECT r.id, p.id, true
FROM config.roles r
CROSS JOIN config.permissions p
WHERE r.code = 'user'
  AND p.code LIKE 'view_%'
ON CONFLICT (role_id, permission_id) DO NOTHING;

COMMIT;

COMMENT ON TABLE config.permissions IS 'Updated with 3PL module permissions for navigation system';

