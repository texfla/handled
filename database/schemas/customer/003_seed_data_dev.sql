-- ============================================================================
-- Customer Schema - Development Seed Data
-- Date: 2024-12-14
-- Purpose: Sample organizations and facilities for development environments
-- ============================================================================
-- WARNING: This file is for DEVELOPMENT ONLY
-- Do NOT run in production - use run-migrations-dev.sh only
-- ============================================================================

-- ==================================================
-- SAMPLE ORGANIZATIONS
-- ==================================================

INSERT INTO customer.organizations (id, name, slug) VALUES
  ('org_sample_acme', 'Acme Corporation', 'acme-corp'),
  ('org_sample_widgets', 'Widgets Inc', 'widgets-inc'),
  ('org_sample_global', 'Global Distribution Co', 'global-dist')
ON CONFLICT (id) DO NOTHING;

-- ==================================================
-- SAMPLE FACILITIES
-- ==================================================

INSERT INTO customer.facilities (id, organization_id, name, address, zip) VALUES
  -- Acme Corporation facilities
  ('fac_sample_acme_dal', 'org_sample_acme', 'Acme Warehouse - Dallas', 
   '{"street": "123 Commerce St", "city": "Dallas", "state": "TX", "zip": "75201"}'::jsonb, 
   '75201'),
  
  ('fac_sample_acme_la', 'org_sample_acme', 'Acme Distribution Center - Los Angeles', 
   '{"street": "456 Industrial Blvd", "city": "Los Angeles", "state": "CA", "zip": "90001"}'::jsonb, 
   '90001'),
  
  -- Widgets Inc facilities
  ('fac_sample_widgets_chi', 'org_sample_widgets', 'Widgets Distribution Center', 
   '{"street": "789 Warehouse Way", "city": "Chicago", "state": "IL", "zip": "60601"}'::jsonb, 
   '60601'),
  
  -- Global Distribution Co facilities
  ('fac_sample_global_atl', 'org_sample_global', 'Global Fulfillment Center - Atlanta', 
   '{"street": "321 Logistics Dr", "city": "Atlanta", "state": "GA", "zip": "30303"}'::jsonb, 
   '30303'),
  
  ('fac_sample_global_sea', 'org_sample_global', 'Global Port Warehouse - Seattle', 
   '{"street": "654 Harbor Rd", "city": "Seattle", "state": "WA", "zip": "98101"}'::jsonb, 
   '98101')
ON CONFLICT (id) DO NOTHING;

-- ==================================================
-- VERIFICATION
-- ==================================================

DO $$
DECLARE
  org_count INTEGER;
  fac_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO org_count FROM customer.organizations WHERE id LIKE 'org_sample_%';
  SELECT COUNT(*) INTO fac_count FROM customer.facilities WHERE id LIKE 'fac_sample_%';
  
  RAISE NOTICE '✓ Development seed data: % sample organizations, % sample facilities', org_count, fac_count;
  RAISE NOTICE '⚠ Remember: This is DEV DATA ONLY - not for production!';
END $$;
