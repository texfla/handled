-- =============================================================================
-- Migration: 012_ensure_db_permissions.sql
-- Description: Catchall permission grants for PRIMARY database
-- 
-- Ensures handled_user has access to all objects in config and customer schemas,
-- regardless of who created them (postgres, doadmin, or handled_user).
-- 
-- This migration is idempotent and safe to run multiple times.
-- =============================================================================

-- =============================================================================
-- PRIMARY DATABASE PERMISSION GRANTS
-- Ensures handled_user has access to all objects, regardless of who created them
-- =============================================================================

-- Config Schema
GRANT USAGE ON SCHEMA config TO handled_user;
GRANT ALL ON ALL TABLES IN SCHEMA config TO handled_user;
GRANT ALL ON ALL SEQUENCES IN SCHEMA config TO handled_user;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA config TO handled_user;

-- Customer Schema
GRANT USAGE ON SCHEMA customer TO handled_user;
GRANT ALL ON ALL TABLES IN SCHEMA customer TO handled_user;
GRANT ALL ON ALL SEQUENCES IN SCHEMA customer TO handled_user;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA customer TO handled_user;

-- =============================================================================
-- DEFAULT PRIVILEGES
-- Ensures future objects created by handled_user are accessible
-- =============================================================================

-- Config Schema - Default privileges for handled_user
ALTER DEFAULT PRIVILEGES FOR ROLE handled_user IN SCHEMA config 
  GRANT ALL ON TABLES TO handled_user;
ALTER DEFAULT PRIVILEGES FOR ROLE handled_user IN SCHEMA config 
  GRANT ALL ON SEQUENCES TO handled_user;
ALTER DEFAULT PRIVILEGES FOR ROLE handled_user IN SCHEMA config 
  GRANT ALL ON FUNCTIONS TO handled_user;

-- Customer Schema - Default privileges for handled_user
ALTER DEFAULT PRIVILEGES FOR ROLE handled_user IN SCHEMA customer 
  GRANT ALL ON TABLES TO handled_user;
ALTER DEFAULT PRIVILEGES FOR ROLE handled_user IN SCHEMA customer 
  GRANT ALL ON SEQUENCES TO handled_user;
ALTER DEFAULT PRIVILEGES FOR ROLE handled_user IN SCHEMA customer 
  GRANT ALL ON FUNCTIONS TO handled_user;

-- =============================================================================
-- PRODUCTION ADMIN USER HANDLING
-- Ensures that if migrations are run by production admins (postgres, doadmin),
-- handled_user still gets access to created objects
-- =============================================================================

DO $$
DECLARE
  admin_role TEXT;
  target_schema TEXT;
BEGIN
  -- Loop through potential admin users
  FOR admin_role IN 
    SELECT rolname FROM pg_roles 
    WHERE rolname IN ('postgres', 'doadmin')
    AND rolcanlogin = true
  LOOP
    -- Apply default privileges for both schemas
    FOR target_schema IN SELECT unnest(ARRAY['config', 'customer'])
    LOOP
      -- Grant on tables
      EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA %I GRANT ALL ON TABLES TO handled_user', 
                     admin_role, target_schema);
      
      -- Grant on sequences
      EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA %I GRANT ALL ON SEQUENCES TO handled_user', 
                     admin_role, target_schema);
      
      -- Grant on functions
      EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA %I GRANT ALL ON FUNCTIONS TO handled_user', 
                     admin_role, target_schema);
      
      RAISE NOTICE 'Set default privileges for role % in schema %', admin_role, target_schema;
    END LOOP;
  END LOOP;
END $$;

-- =============================================================================
-- VERIFICATION
-- =============================================================================

-- Verify permissions were granted
DO $$
DECLARE
  missing_perms BOOLEAN := false;
BEGIN
  -- Check config schema access
  IF NOT has_schema_privilege('handled_user', 'config', 'USAGE') THEN
    RAISE WARNING 'handled_user missing USAGE on schema config';
    missing_perms := true;
  END IF;
  
  -- Check customer schema access
  IF NOT has_schema_privilege('handled_user', 'customer', 'USAGE') THEN
    RAISE WARNING 'handled_user missing USAGE on schema customer';
    missing_perms := true;
  END IF;
  
  IF NOT missing_perms THEN
    RAISE NOTICE '✓ Permission grants verified successfully';
  END IF;
END $$;
