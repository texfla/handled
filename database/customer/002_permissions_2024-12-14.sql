-- ============================================================================
-- Customer Schema - Permissions Baseline
-- Date: 2024-12-14
-- Purpose: Grant all necessary permissions to handled_user for customer schema
-- ============================================================================
-- Ensures handled_user has access to all objects in customer schema,
-- regardless of who created them (postgres, doadmin, or handled_user).
--
-- This migration is idempotent and safe to run multiple times.
-- ============================================================================

-- =============================================================================
-- CUSTOMER SCHEMA PERMISSION GRANTS
-- =============================================================================

-- Schema access
GRANT USAGE ON SCHEMA customer TO handled_user;

-- All existing tables
GRANT ALL ON ALL TABLES IN SCHEMA customer TO handled_user;

-- All existing sequences
GRANT ALL ON ALL SEQUENCES IN SCHEMA customer TO handled_user;

-- All existing functions
GRANT ALL ON ALL FUNCTIONS IN SCHEMA customer TO handled_user;

-- =============================================================================
-- DEFAULT PRIVILEGES FOR FUTURE OBJECTS
-- Ensures future objects created by handled_user are accessible
-- =============================================================================

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
BEGIN
  -- Loop through potential admin users
  FOR admin_role IN 
    SELECT rolname FROM pg_roles 
    WHERE rolname IN ('postgres', 'doadmin')
    AND rolcanlogin = true
  LOOP
    -- Grant on tables
    EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA customer GRANT ALL ON TABLES TO handled_user', 
                   admin_role);
    
    -- Grant on sequences
    EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA customer GRANT ALL ON SEQUENCES TO handled_user', 
                   admin_role);
    
    -- Grant on functions
    EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA customer GRANT ALL ON FUNCTIONS TO handled_user', 
                   admin_role);
    
    RAISE NOTICE 'Set default privileges for role % in schema customer', admin_role;
  END LOOP;
END $$;

-- =============================================================================
-- VERIFICATION
-- =============================================================================

DO $$
DECLARE
  missing_perms BOOLEAN := false;
BEGIN
  -- Check customer schema access
  IF NOT has_schema_privilege('handled_user', 'customer', 'USAGE') THEN
    RAISE WARNING 'handled_user missing USAGE on schema customer';
    missing_perms := true;
  END IF;
  
  IF NOT missing_perms THEN
    RAISE NOTICE '✓ Customer schema permission grants verified successfully';
  END IF;
END $$;
