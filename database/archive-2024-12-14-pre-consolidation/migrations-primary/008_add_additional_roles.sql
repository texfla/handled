-- Migration 008: Add additional roles
-- Database: handled
-- Schema: config
-- Date: 2024-12-08
-- Purpose: Add Customer Service, Finance, Manager, and SuperUser roles

-- ==================================================
-- ADD NEW ROLES
-- ==================================================

INSERT INTO config.roles (code, name, description, is_system) VALUES
    ('customer_service', 'Customer Service', 'Handle customer inquiries and orders', false),
    ('finance', 'Finance', 'Financial reporting and billing access', false),
    ('manager', 'Manager', 'Oversee operations with elevated access', false),
    ('superuser', 'Super User', 'Full system access except role management', false)
ON CONFLICT (code) DO NOTHING;

-- ==================================================
-- ASSIGN PERMISSIONS TO ROLES
-- ==================================================

-- Customer Service: view_data, export_data
INSERT INTO config.role_permissions (role_id, permission_id, granted)
SELECT 
    r.id, 
    p.id, 
    true
FROM config.roles r
CROSS JOIN config.permissions p
WHERE r.code = 'customer_service' 
  AND p.code IN ('view_data', 'export_data')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Finance: view_data, export_data
INSERT INTO config.role_permissions (role_id, permission_id, granted)
SELECT 
    r.id, 
    p.id, 
    true
FROM config.roles r
CROSS JOIN config.permissions p
WHERE r.code = 'finance' 
  AND p.code IN ('view_data', 'export_data')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Manager: All permissions except manage_roles
INSERT INTO config.role_permissions (role_id, permission_id, granted)
SELECT 
    r.id, 
    p.id, 
    true
FROM config.roles r
CROSS JOIN config.permissions p
WHERE r.code = 'manager' 
  AND p.code IN (
    'manage_users',
    'view_data',
    'import_data',
    'export_data',
    'run_transformations'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- SuperUser: All permissions except manage_roles
INSERT INTO config.role_permissions (role_id, permission_id, granted)
SELECT 
    r.id, 
    p.id, 
    true
FROM config.roles r
CROSS JOIN config.permissions p
WHERE r.code = 'superuser' 
  AND p.code IN (
    'manage_users',
    'view_data',
    'import_data',
    'export_data',
    'run_transformations'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ==================================================
-- VERIFICATION QUERY
-- ==================================================
-- Run after migration to verify:
-- SELECT r.name, COUNT(rp.permission_id) as permission_count
-- FROM config.roles r
-- LEFT JOIN config.role_permissions rp ON r.id = rp.role_id AND rp.granted = true
-- GROUP BY r.id, r.name
-- ORDER BY r.name;

-- To see detailed permissions per role:
-- SELECT r.name as role, p.name as permission, p.category
-- FROM config.roles r
-- JOIN config.role_permissions rp ON r.id = rp.role_id
-- JOIN config.permissions p ON rp.permission_id = p.id
-- WHERE rp.granted = true
-- ORDER BY r.name, p.category, p.name;

