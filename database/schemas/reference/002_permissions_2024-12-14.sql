-- ============================================================================
-- Reference Schema - Permissions Baseline
-- Date: 2024-12-14
-- Purpose: Grant all necessary permissions to handled_user for reference schema
-- ============================================================================
-- Ensures handled_user has access to all objects in reference schema,
-- regardless of who created them (postgres, doadmin, or handled_user).
--
-- This migration is idempotent and safe to run multiple times.
-- ============================================================================

-- =============================================================================
-- REFERENCE SCHEMA PERMISSION GRANTS
-- =============================================================================

-- Schema access
GRANT USAGE ON SCHEMA reference TO handled_user;

-- All existing tables
GRANT ALL ON ALL TABLES IN SCHEMA reference TO handled_user;

-- All existing sequences
GRANT ALL ON ALL SEQUENCES IN SCHEMA reference TO handled_user;

-- All existing functions
GRANT ALL ON ALL FUNCTIONS IN SCHEMA reference TO handled_user;

-- =============================================================================
-- DEFAULT PRIVILEGES FOR FUTURE OBJECTS
-- Ensures future objects created by handled_user are accessible
-- =============================================================================

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
BEGIN
  -- Loop through potential admin users
  FOR admin_role IN 
    SELECT rolname FROM pg_roles 
    WHERE rolname IN ('postgres', 'doadmin')
    AND rolcanlogin = true
  LOOP
    -- Grant on tables
    EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA reference GRANT ALL ON TABLES TO handled_user', 
                   admin_role);
    
    -- Grant on sequences
    EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA reference GRANT ALL ON SEQUENCES TO handled_user', 
                   admin_role);
    
    -- Grant on functions
    EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA reference GRANT ALL ON FUNCTIONS TO handled_user', 
                   admin_role);
    
    RAISE NOTICE 'Set default privileges for role % in schema reference', admin_role;
  END LOOP;
END $$;

-- =============================================================================
-- VERIFICATION
-- =============================================================================

DO $$
DECLARE
  missing_perms BOOLEAN := false;
BEGIN
  -- Check reference schema access
  IF NOT has_schema_privilege('handled_user', 'reference', 'USAGE') THEN
    RAISE WARNING 'handled_user missing USAGE on schema reference';
    missing_perms := true;
  END IF;
  
  IF NOT missing_perms THEN
    RAISE NOTICE '✓ Reference schema permission grants verified successfully';
  END IF;
END $$;
