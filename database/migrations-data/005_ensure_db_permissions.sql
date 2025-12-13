-- =============================================================================
-- Migration: 005_ensure_db_permissions.sql
-- Description: Catchall permission grants for DATA database
-- 
-- Ensures handled_user has access to all objects in workspace and reference schemas,
-- regardless of who created them (postgres, doadmin, or handled_user).
-- 
-- This migration is idempotent and safe to run multiple times.
-- =============================================================================

-- =============================================================================
-- DATA DATABASE PERMISSION GRANTS
-- Ensures handled_user has access to all objects, regardless of who created them
-- =============================================================================

-- Workspace Schema
GRANT USAGE ON SCHEMA workspace TO handled_user;
GRANT ALL ON ALL TABLES IN SCHEMA workspace TO handled_user;
GRANT ALL ON ALL SEQUENCES IN SCHEMA workspace TO handled_user;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA workspace TO handled_user;

-- Reference Schema
GRANT USAGE ON SCHEMA reference TO handled_user;
GRANT ALL ON ALL TABLES IN SCHEMA reference TO handled_user;
GRANT ALL ON ALL SEQUENCES IN SCHEMA reference TO handled_user;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA reference TO handled_user;

-- =============================================================================
-- DEFAULT PRIVILEGES
-- Ensures future objects created by handled_user are accessible
-- =============================================================================

-- Workspace Schema - Default privileges for handled_user
ALTER DEFAULT PRIVILEGES FOR ROLE handled_user IN SCHEMA workspace
  GRANT ALL ON TABLES TO handled_user;
ALTER DEFAULT PRIVILEGES FOR ROLE handled_user IN SCHEMA workspace
  GRANT ALL ON SEQUENCES TO handled_user;
ALTER DEFAULT PRIVILEGES FOR ROLE handled_user IN SCHEMA workspace
  GRANT ALL ON FUNCTIONS TO handled_user;

-- Reference Schema - Default privileges for handled_user
ALTER DEFAULT PRIVILEGES FOR ROLE handled_user IN SCHEMA reference
  GRANT ALL ON TABLES TO handled_user;
ALTER DEFAULT PRIVILEGES FOR ROLE handled_user IN SCHEMA reference
  GRANT ALL ON SEQUENCES TO handled_user;
ALTER DEFAULT PRIVILEGES FOR ROLE handled_user IN SCHEMA reference
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
    FOR target_schema IN SELECT unnest(ARRAY['workspace', 'reference'])
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
  -- Check workspace schema access
  IF NOT has_schema_privilege('handled_user', 'workspace', 'USAGE') THEN
    RAISE WARNING 'handled_user missing USAGE on schema workspace';
    missing_perms := true;
  END IF;
  
  -- Check reference schema access
  IF NOT has_schema_privilege('handled_user', 'reference', 'USAGE') THEN
    RAISE WARNING 'handled_user missing USAGE on schema reference';
    missing_perms := true;
  END IF;
  
  IF NOT missing_perms THEN
    RAISE NOTICE '✓ Permission grants verified successfully';
  END IF;
END $$;
