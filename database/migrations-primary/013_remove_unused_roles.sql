-- Migration 013: Remove unused roles
-- Database: handled
-- Schema: config
-- Date: 2024-12-11
-- Purpose: Delete data_analyst, user, warehouse, and manager roles

-- ==================================================
-- SAFETY CHECK: Verify no users assigned
-- ==================================================

DO $$
DECLARE
    user_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO user_count
    FROM config.user_roles ur
    JOIN config.roles r ON ur.role_id = r.id
    WHERE r.code IN ('data_analyst', 'user', 'warehouse', 'manager');
    
    IF user_count > 0 THEN
        RAISE EXCEPTION 'Cannot delete roles: % users are still assigned to these roles', user_count;
    END IF;
END $$;

-- ==================================================
-- DELETE ROLES
-- ==================================================

-- Delete role_permissions entries (will cascade, but explicit for clarity)
DELETE FROM config.role_permissions
WHERE role_id IN (
    SELECT id FROM config.roles 
    WHERE code IN ('data_analyst', 'user', 'warehouse', 'manager')
);

-- Delete the roles themselves
DELETE FROM config.roles
WHERE code IN ('data_analyst', 'user', 'warehouse', 'manager')
  AND is_system = false; -- Extra safety: only delete non-system roles

-- ==================================================
-- VERIFICATION QUERY
-- ==================================================
-- Run after migration to verify deletion:
-- SELECT code, name FROM config.roles ORDER BY code;
