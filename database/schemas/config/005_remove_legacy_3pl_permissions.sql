-- ============================================================================
-- Migration 005: Remove Legacy 3PL Permissions
-- Date: 2024-12-15
-- Purpose: Remove vague 'view_3pl' and 'manage_3pl_settings' permissions
--          Replaced with specific permissions: view_clients, view_warehouses, etc.
-- ============================================================================

-- Safe to run: CASCADE removes role_permissions entries automatically
-- These permissions are redundant with more specific permissions now in use

BEGIN;

-- Log what will be deleted
DO $$
DECLARE
  view_3pl_count INTEGER;
  manage_3pl_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO view_3pl_count
  FROM config.role_permissions rp
  JOIN config.permissions p ON rp.permission_id = p.id
  WHERE p.code = 'view_3pl' AND rp.granted = TRUE;
  
  SELECT COUNT(*) INTO manage_3pl_count
  FROM config.role_permissions rp
  JOIN config.permissions p ON rp.permission_id = p.id
  WHERE p.code = 'manage_3pl_settings' AND rp.granted = TRUE;
  
  RAISE NOTICE '════════════════════════════════════════';
  RAISE NOTICE 'Removing legacy 3PL permissions';
  RAISE NOTICE '════════════════════════════════════════';
  RAISE NOTICE 'view_3pl: % role assignments will be removed', view_3pl_count;
  RAISE NOTICE 'manage_3pl_settings: % role assignments will be removed', manage_3pl_count;
  RAISE NOTICE '';
  RAISE NOTICE 'These permissions are replaced by:';
  RAISE NOTICE '  view_3pl → view_clients, view_warehouses, view_orders';
  RAISE NOTICE '  manage_3pl_settings → manage_settings, manage_clients';
END $$;

-- Delete permissions (CASCADE removes role_permissions)
DELETE FROM config.permissions 
WHERE code IN ('view_3pl', 'manage_3pl_settings');

-- Verification
DO $$
DECLARE
  remaining INTEGER;
BEGIN
  SELECT COUNT(*) INTO remaining
  FROM config.permissions
  WHERE code IN ('view_3pl', 'manage_3pl_settings');
  
  IF remaining > 0 THEN
    RAISE EXCEPTION 'Failed to delete legacy permissions';
  END IF;
  
  RAISE NOTICE '✓ Legacy 3PL permissions removed successfully';
END $$;

COMMIT;

-- Verify current permission list
SELECT code, name, category 
FROM config.permissions 
WHERE category IN ('operations', 'admin', '3pl')
ORDER BY category, code;
