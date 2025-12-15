-- ============================================
-- CUSTOMER SCHEMA: DEVELOPMENT SEED DATA
-- Date: 2024-12-14 (Updated 2024-12-15)
-- ============================================
-- WARNING: This file is for DEVELOPMENT ONLY
-- This data is used for local testing and will NOT be run in production
-- ============================================

-- ============================================
-- SAMPLE ORGANIZATIONS
-- ============================================

INSERT INTO customer.organizations (id, name, slug, status, setup_progress) VALUES
  ('org_acme', 'Acme Corporation', 'acme', 'active', jsonb_build_object('completed', true, 'step', 5)),
  ('org_beta', 'Beta Industries', 'beta', 'active', jsonb_build_object('completed', true, 'step', 5)),
  ('org_gamma', 'Gamma LLC', 'gamma', 'setup', jsonb_build_object('completed', false, 'step', 3)),
  ('org_prospect', 'Prospect Company', 'prospect-co', 'prospect', jsonb_build_object('completed', false, 'step', 0))
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  status = EXCLUDED.status,
  setup_progress = EXCLUDED.setup_progress,
  updated_at = NOW();

-- ============================================
-- SAMPLE FACILITIES (allocations at YOUR warehouses)
-- ============================================

-- Acme has allocations at both DFW and LAX
INSERT INTO customer.facilities (id, organization_id, company_warehouse_id, is_primary, space_allocation, zone_assignment, status, notes) VALUES
  ('fac_acme_dfw', 'org_acme', 'wh_dfw_01', TRUE, jsonb_build_object('pallets', 500, 'sqft', 10000), 'A1-A25', 'active', 'Primary warehouse for Acme'),
  ('fac_acme_lax', 'org_acme', 'wh_lax_02', FALSE, jsonb_build_object('pallets', 200, 'sqft', 5000), 'B1-B10', 'active', 'West Coast overflow')
ON CONFLICT (organization_id, company_warehouse_id) DO UPDATE SET
  is_primary = EXCLUDED.is_primary,
  space_allocation = EXCLUDED.space_allocation,
  zone_assignment = EXCLUDED.zone_assignment,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  updated_at = NOW();

-- Beta uses only DFW
INSERT INTO customer.facilities (id, organization_id, company_warehouse_id, is_primary, space_allocation, zone_assignment, status, notes) VALUES
  ('fac_beta_dfw', 'org_beta', 'wh_dfw_01', TRUE, jsonb_build_object('pallets', 300, 'sqft', 6000), 'C1-C15', 'active', 'Primary warehouse for Beta')
ON CONFLICT (organization_id, company_warehouse_id) DO UPDATE SET
  is_primary = EXCLUDED.is_primary,
  space_allocation = EXCLUDED.space_allocation,
  zone_assignment = EXCLUDED.zone_assignment,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  updated_at = NOW();

-- ============================================
-- SAMPLE CLIENT FACILITIES (their own warehouses)
-- ============================================

-- Acme's manufacturing plant (we receive inventory from here)
INSERT INTO customer.client_facilities (id, organization_id, name, facility_type, address, is_source, is_destination, notes) VALUES
  (
    'client_fac_acme_plant',
    'org_acme',
    'Acme Manufacturing Plant',
    'manufacturing',
    jsonb_build_object(
      'street1', '123 Industrial Pkwy',
      'city', 'Austin',
      'state', 'TX',
      'zip', '78701',
      'country', 'US'
    ),
    TRUE,
    FALSE,
    'Primary manufacturing facility - ships inventory to us'
  ),
  (
    'client_fac_acme_retail',
    'org_acme',
    'Acme Retail Store',
    'retail',
    jsonb_build_object(
      'street1', '456 Main St',
      'city', 'San Francisco',
      'state', 'CA',
      'zip', '94102',
      'country', 'US'
    ),
    FALSE,
    TRUE,
    'Retail location - we ship orders here'
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  is_source = EXCLUDED.is_source,
  is_destination = EXCLUDED.is_destination,
  notes = EXCLUDED.notes,
  updated_at = NOW();

-- ============================================
-- SAMPLE CONTACTS
-- ============================================

INSERT INTO customer.contacts (id, organization_id, first_name, last_name, title, email, phone, role, is_primary, active, notes) VALUES
  ('contact_acme_john', 'org_acme', 'John', 'Smith', 'Operations Manager', 'john.smith@acme.com', '555-0101', 'operations', TRUE, TRUE, 'Primary point of contact'),
  ('contact_acme_jane', 'org_acme', 'Jane', 'Doe', 'CFO', 'jane.doe@acme.com', '555-0102', 'billing', FALSE, TRUE, 'Handles all billing matters'),
  ('contact_beta_bob', 'org_beta', 'Bob', 'Johnson', 'CEO', 'bob@betaindustries.com', '555-0201', 'executive', TRUE, TRUE, 'Primary contact and decision maker')
ON CONFLICT (id) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  title = EXCLUDED.title,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  role = EXCLUDED.role,
  is_primary = EXCLUDED.is_primary,
  active = EXCLUDED.active,
  notes = EXCLUDED.notes,
  updated_at = NOW();

-- ============================================
-- SAMPLE CONTRACTS
-- ============================================

INSERT INTO customer.contracts (id, organization_id, contract_number, name, start_date, end_date, auto_renew, status, billing_cycle, payment_terms, notes) VALUES
  (
    'contract_acme_2024',
    'org_acme',
    'ACME-2024-001',
    'Acme 2024 Storage Agreement',
    '2024-01-01',
    '2024-12-31',
    TRUE,
    'active',
    'monthly',
    'Net 30',
    'Standard storage and fulfillment contract with annual renewal'
  ),
  (
    'contract_beta_2024',
    'org_beta',
    'BETA-2024-001',
    'Beta 2024 Fulfillment Agreement',
    '2024-06-01',
    '2025-05-31',
    FALSE,
    'active',
    'monthly',
    'Net 15',
    'Fulfillment-only contract, renewable with 60 days notice'
  )
ON CONFLICT (id) DO UPDATE SET
  contract_number = EXCLUDED.contract_number,
  name = EXCLUDED.name,
  start_date = EXCLUDED.start_date,
  end_date = EXCLUDED.end_date,
  auto_renew = EXCLUDED.auto_renew,
  status = EXCLUDED.status,
  billing_cycle = EXCLUDED.billing_cycle,
  payment_terms = EXCLUDED.payment_terms,
  notes = EXCLUDED.notes,
  updated_at = NOW();

-- ============================================
-- SAMPLE RATE CARDS
-- ============================================

INSERT INTO customer.rate_cards (id, contract_id, name, effective_date, expiration_date, version, rates, is_active, notes) VALUES
  (
    'rate_acme_2024_v1',
    'contract_acme_2024',
    'Acme 2024 Rate Schedule',
    '2024-01-01',
    NULL,
    1,
    jsonb_build_object(
      'storage_per_pallet_per_month', 25.00,
      'pick_fee', 1.50,
      'pack_fee', 2.00,
      'shipping_handling_fee', 5.00,
      'receiving_per_pallet', 10.00
    ),
    TRUE,
    'Initial rate card for 2024'
  ),
  (
    'rate_beta_2024_v1',
    'contract_beta_2024',
    'Beta 2024 Rate Schedule',
    '2024-06-01',
    NULL,
    1,
    jsonb_build_object(
      'storage_per_pallet_per_month', 22.00,
      'pick_fee', 1.25,
      'pack_fee', 1.75,
      'shipping_handling_fee', 4.50
    ),
    TRUE,
    'Discounted rates for volume commitment'
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  effective_date = EXCLUDED.effective_date,
  rates = EXCLUDED.rates,
  is_active = EXCLUDED.is_active,
  notes = EXCLUDED.notes,
  updated_at = NOW();

-- ============================================
-- SAMPLE CLIENT SETTINGS
-- ============================================

INSERT INTO customer.client_settings (organization_id, portal_enabled, portal_subdomain, notification_email, timezone, settings) VALUES
  (
    'org_acme',
    TRUE,
    'acme',
    'ops@acme.com',
    'America/Chicago',
    jsonb_build_object(
      'email_notifications', true,
      'sms_notifications', false,
      'weekly_reports', true
    )
  ),
  (
    'org_beta',
    FALSE,
    NULL,
    'admin@betaindustries.com',
    'America/New_York',
    jsonb_build_object(
      'email_notifications', true,
      'sms_notifications', true,
      'weekly_reports', false
    )
  )
ON CONFLICT (organization_id) DO UPDATE SET
  portal_enabled = EXCLUDED.portal_enabled,
  portal_subdomain = EXCLUDED.portal_subdomain,
  notification_email = EXCLUDED.notification_email,
  timezone = EXCLUDED.timezone,
  settings = EXCLUDED.settings,
  updated_at = NOW();

-- ============================================
-- VERIFICATION
-- ============================================

SELECT 
  'Organizations' as entity,
  COUNT(*) as count
FROM customer.organizations
UNION ALL
SELECT 'Facilities', COUNT(*) FROM customer.facilities
UNION ALL
SELECT 'Client Facilities', COUNT(*) FROM customer.client_facilities
UNION ALL
SELECT 'Contacts', COUNT(*) FROM customer.contacts
UNION ALL
SELECT 'Contracts', COUNT(*) FROM customer.contracts
UNION ALL
SELECT 'Rate Cards', COUNT(*) FROM customer.rate_cards
UNION ALL
SELECT 'Client Settings', COUNT(*) FROM customer.client_settings;
