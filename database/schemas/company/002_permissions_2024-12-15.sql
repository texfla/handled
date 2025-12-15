-- ============================================
-- COMPANY SCHEMA: PERMISSIONS
-- Milestone: Client & Warehouse Module Foundation
-- Date: 2024-12-15
-- ============================================

-- Grant schema usage
GRANT USAGE ON SCHEMA company TO handled_user;

-- Grant table permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA company TO handled_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA company TO handled_user;

-- Grant function permissions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA company TO handled_user;

-- Set default privileges for future objects created by handled_user
ALTER DEFAULT PRIVILEGES FOR ROLE handled_user IN SCHEMA company
  GRANT ALL ON TABLES TO handled_user;
ALTER DEFAULT PRIVILEGES FOR ROLE handled_user IN SCHEMA company
  GRANT ALL ON SEQUENCES TO handled_user;
ALTER DEFAULT PRIVILEGES FOR ROLE handled_user IN SCHEMA company
  GRANT EXECUTE ON FUNCTIONS TO handled_user;

-- Also set for admin roles (postgres/doadmin) - handles both local and DBaaS
DO $$
DECLARE
  admin_role TEXT;
BEGIN
  FOR admin_role IN 
    SELECT rolname FROM pg_roles 
    WHERE rolname IN ('postgres', 'doadmin')
    AND rolcanlogin = TRUE
  LOOP
    EXECUTE format(
      'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA company GRANT ALL ON TABLES TO handled_user',
      admin_role
    );
    EXECUTE format(
      'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA company GRANT ALL ON SEQUENCES TO handled_user',
      admin_role
    );
    EXECUTE format(
      'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA company GRANT EXECUTE ON FUNCTIONS TO handled_user',
      admin_role
    );
  END LOOP;
END $$;

-- ============================================
-- VERIFICATION
-- ============================================

SELECT 
  schemaname, 
  tablename, 
  has_table_privilege('handled_user', schemaname||'.'||tablename, 'SELECT') as can_select,
  has_table_privilege('handled_user', schemaname||'.'||tablename, 'INSERT') as can_insert,
  has_table_privilege('handled_user', schemaname||'.'||tablename, 'UPDATE') as can_update,
  has_table_privilege('handled_user', schemaname||'.'||tablename, 'DELETE') as can_delete
FROM pg_tables 
WHERE schemaname = 'company'
ORDER BY tablename;
