-- ============================================================================
-- Reference Schema - Seed Data Baseline
-- Date: 2024-12-14
-- Purpose: Seed carriers and services (small foundational data)
-- ============================================================================
-- All INSERT statements use ON CONFLICT for idempotency
-- Safe to run multiple times without duplication
--
-- NOTE: Large reference tables (zip3_reference, delivery_matrix) are NOT seeded here.
-- They are populated by transformations from workspace data via the app.
-- ============================================================================

-- ==================================================
-- SEED CARRIERS
-- ==================================================
-- 2 carriers - foundational data the app needs to function

INSERT INTO reference.carriers (code, name, description) VALUES
  ('UPS', 'UPS', 'UPS package delivery services'),
  ('USPS', 'USPS', 'US Postal Service mail and package delivery')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description;

-- ==================================================
-- SEED UPS SERVICES
-- ==================================================
-- 6 UPS services

INSERT INTO reference.services (carrier_code, code, name, description) VALUES
  ('UPS', 'GND', 'Ground', 'UPS Ground shipping'),
  ('UPS', '3DS', '3 Day Select', 'UPS 3 Day Select service'),
  ('UPS', '2DA', '2nd Day Air', 'UPS 2nd Day Air service'),
  ('UPS', '2AM', '2nd Day Air AM', 'UPS 2nd Day Air AM (morning delivery)'),
  ('UPS', 'NDS', 'Next Day Air Saver', 'UPS Next Day Air Saver service'),
  ('UPS', 'NDA', 'Next Day Air', 'UPS Next Day Air service')
ON CONFLICT (carrier_code, code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description;

-- ==================================================
-- SEED USPS SERVICES
-- ==================================================
-- 10 USPS services (complete list from 3D Base columns)

INSERT INTO reference.services (carrier_code, code, name, description) VALUES
  ('USPS', 'PRI', 'Priority Mail', 'USPS Priority Mail service'),
  ('USPS', 'GAL', 'Ground Advantage Light', 'USPS Ground Advantage Light service'),
  ('USPS', 'MKT', 'Marketing Mail', 'USPS Marketing Mail service'),
  ('USPS', 'PER', 'Periodicals', 'USPS Periodicals service'),
  ('USPS', 'PKG', 'Package Services', 'USPS Package Services'),
  ('USPS', 'FCM', 'First-Class Mail', 'USPS First-Class Mail service'),
  ('USPS', 'GAH', 'Ground Advantage Heavy', 'USPS Ground Advantage Heavy service'),
  ('USPS', 'PFC', 'Parcel First Class', 'USPS Parcel First Class service'),
  ('USPS', 'LIB', 'Library Mail', 'USPS Library Mail service'),
  ('USPS', 'MED', 'Media Mail', 'USPS Media Mail service')
ON CONFLICT (carrier_code, code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description;

-- ==================================================
-- VERIFICATION
-- ==================================================

DO $$
DECLARE
  carrier_count INTEGER;
  service_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO carrier_count FROM reference.carriers;
  SELECT COUNT(*) INTO service_count FROM reference.services;
  
  RAISE NOTICE '✓ Reference seed data: % carriers, % services', carrier_count, service_count;
  RAISE NOTICE '  Note: zip3_reference and delivery_matrix populated by transformations';
END $$;
