-- ============================================
-- CUSTOMER SCHEMA: DEVELOPMENT SEED DATA
-- Date: 2024-12-14 (Updated 2024-12-15)
-- ============================================
-- WARNING: This file is for DEVELOPMENT ONLY
-- This data is used for local testing and will NOT be run in production
-- ============================================

-- ============================================
-- SAMPLE CUSTOMERS
-- ============================================

INSERT INTO customer.customers (id, name, slug, status, setup_progress) VALUES
  ('cust_acme', 'Acme Corporation', 'acme', 'active', jsonb_build_object('completed', true, 'step', 5)),
  ('cust_beta', 'Beta Industries', 'beta', 'active', jsonb_build_object('completed', true, 'step', 5)),
  ('cust_gamma', 'Gamma LLC', 'gamma', 'setup', jsonb_build_object('completed', false, 'step', 3)),
  ('cust_prospect', 'Prospect Company', 'prospect-co', 'prospect', jsonb_build_object('completed', false, 'step', 0))
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  status = EXCLUDED.status,
  setup_progress = EXCLUDED.setup_progress,
  updated_at = NOW();

-- ============================================
-- SAMPLE WAREHOUSE ALLOCATIONS (space at YOUR warehouses)
-- ============================================

-- Acme has allocations at both NJ and LAX
INSERT INTO customer.warehouse_allocations (id, customer_id, company_warehouse_id, is_primary, space_allocated, zone_assignment, status, notes) VALUES
  ('alloc_acme_nj', 'cust_acme', 'wh_nj_01', TRUE, jsonb_build_object('pallets', 500, 'sqft', 10000), 'A1-A25', 'active', 'Primary warehouse for Acme'),
  ('alloc_acme_lax', 'cust_acme', 'wh_lax_02', FALSE, jsonb_build_object('pallets', 200, 'sqft', 5000), 'B1-B10', 'active', 'West Coast overflow')
ON CONFLICT (customer_id, company_warehouse_id) DO UPDATE SET
  is_primary = EXCLUDED.is_primary,
  space_allocated = EXCLUDED.space_allocated,
  zone_assignment = EXCLUDED.zone_assignment,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  updated_at = NOW();

-- Beta uses only NJ
INSERT INTO customer.warehouse_allocations (id, customer_id, company_warehouse_id, is_primary, space_allocated, zone_assignment, status, notes) VALUES
  ('alloc_beta_nj', 'cust_beta', 'wh_nj_01', TRUE, jsonb_build_object('pallets', 300, 'sqft', 6000), 'C1-C15', 'active', 'Primary warehouse for Beta')
ON CONFLICT (customer_id, company_warehouse_id) DO UPDATE SET
  is_primary = EXCLUDED.is_primary,
  space_allocated = EXCLUDED.space_allocated,
  zone_assignment = EXCLUDED.zone_assignment,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  updated_at = NOW();

-- ============================================
-- SAMPLE FACILITIES (THEIR warehouses/buildings)
-- ============================================

-- Acme's manufacturing plant (we receive inventory from here)
INSERT INTO customer.facilities (id, customer_id, name, facility_type, address, is_source, is_destination, notes) VALUES
  (
    'fac_acme_plant',
    'cust_acme',
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
    'fac_acme_retail',
    'cust_acme',
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

INSERT INTO customer.contacts (id, customer_id, first_name, last_name, title, email, phone, role, is_primary, active, notes) VALUES
  ('contact_acme_john', 'cust_acme', 'John', 'Smith', 'Operations Manager', 'john.smith@acme.com', '555-0101', 'operations', TRUE, TRUE, 'Primary point of contact'),
  ('contact_acme_jane', 'cust_acme', 'Jane', 'Doe', 'CFO', 'jane.doe@acme.com', '555-0102', 'billing', FALSE, TRUE, 'Handles all billing matters'),
  ('contact_beta_bob', 'cust_beta', 'Bob', 'Johnson', 'CEO', 'bob@betaindustries.com', '555-0201', 'executive', TRUE, TRUE, 'Primary contact and decision maker')
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

INSERT INTO customer.contracts (id, customer_id, contract_number, name, start_date, end_date, auto_renew, status, billing_cycle, payment_terms, notes) VALUES
  (
    'contract_acme_2024',
    'cust_acme',
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
    'cust_beta',
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

INSERT INTO customer.rate_cards (id, customer_id, name, effective_date, version, rates, is_active, notes) VALUES
  (
    'rate_acme_2024_v1',
    'cust_acme',
    'Acme 2024 Rate Schedule',
    '2024-01-01',
    1,
    jsonb_build_object(
      'receiving', jsonb_build_object(
        'standardPallet', 10.00,
        'oversizePallet', 15.00,
        'containerDevanning20ft', 150.00,
        'containerDevanning40ft', 250.00,
        'perItem', 0.50,
        'perHour', 45.00
      ),
      'storage', jsonb_build_object(
        'palletMonthly', 25.00,
        'palletDaily', 1.00,
        'cubicFootMonthly', 2.50,
        'longTermPenaltyMonthly', 5.00
      ),
      'fulfillment', jsonb_build_object(
        'baseOrder', 2.00,
        'additionalItem', 1.50,
        'b2bPallet', 8.00,
        'pickPerLine', 0.75
      ),
      'shipping', jsonb_build_object(
        'markupPercent', 15.00,
        'labelFee', 0.25
      ),
      'vas', jsonb_build_object(
        'kitting', 2.50,
        'labeling', 0.50,
        'bundling', 1.75
      )
    ),
    TRUE,
    'Standard rate card for 2024'
  ),
  (
    'rate_beta_2024_v1',
    'cust_beta',
    'Beta 2024 Rate Schedule',
    '2024-06-01',
    1,
    jsonb_build_object(
      'receiving', jsonb_build_object(
        'standardPallet', 8.50,
        'oversizePallet', 12.00,
        'containerDevanning20ft', 125.00,
        'containerDevanning40ft', 200.00,
        'perItem', 0.40,
        'perHour', 40.00
      ),
      'storage', jsonb_build_object(
        'palletMonthly', 22.00,
        'palletDaily', 0.85,
        'cubicFootMonthly', 2.25,
        'longTermPenaltyMonthly', 4.00
      ),
      'fulfillment', jsonb_build_object(
        'baseOrder', 1.75,
        'additionalItem', 1.25,
        'b2bPallet', 7.00,
        'pickPerLine', 0.65
      ),
      'shipping', jsonb_build_object(
        'markupPercent', 12.00,
        'labelFee', 0.20
      ),
      'vas', jsonb_build_object(
        'kitting', 2.00,
        'labeling', 0.40,
        'bundling', 1.50
      )
    ),
    TRUE,
    'Discounted rates for volume commitment'
  )
ON CONFLICT (id) DO UPDATE SET
  customer_id = EXCLUDED.customer_id,
  name = EXCLUDED.name,
  effective_date = EXCLUDED.effective_date,
  rates = EXCLUDED.rates,
  is_active = EXCLUDED.is_active,
  notes = EXCLUDED.notes,
  updated_at = NOW();

-- ============================================
-- LINK RATE CARDS TO CONTRACTS (Junction Table)
-- ============================================

INSERT INTO customer.rate_card_contracts (rate_card_id, contract_id, link_type, linked_at) VALUES
  ('rate_acme_2024_v1', 'contract_acme_2024', 'primary', NOW()),
  ('rate_beta_2024_v1', 'contract_beta_2024', 'primary', NOW())
ON CONFLICT (rate_card_id, contract_id) DO NOTHING;

-- ============================================
-- SAMPLE CUSTOMER SETTINGS
-- ============================================

INSERT INTO customer.settings (customer_id, portal_enabled, portal_subdomain, notification_email, timezone, settings) VALUES
  (
    'cust_acme',
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
    'cust_beta',
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
ON CONFLICT (customer_id) DO UPDATE SET
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
  'Customers' as entity,
  COUNT(*) as count
FROM customer.customers
UNION ALL
SELECT 'Warehouse Allocations', COUNT(*) FROM customer.warehouse_allocations
UNION ALL
SELECT 'Facilities (Their Buildings)', COUNT(*) FROM customer.facilities
UNION ALL
SELECT 'Contacts', COUNT(*) FROM customer.contacts
UNION ALL
SELECT 'Contracts', COUNT(*) FROM customer.contracts
UNION ALL
SELECT 'Rate Cards', COUNT(*) FROM customer.rate_cards
UNION ALL
SELECT 'Settings', COUNT(*) FROM customer.settings;
