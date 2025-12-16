-- ============================================
-- COMPANY SCHEMA: SEED YOUR WAREHOUSES
-- Milestone: Client & Warehouse Module Foundation
-- Date: 2024-12-15
-- ============================================

-- TODO: Update with your actual warehouse details

INSERT INTO company.warehouses (id, code, name, type, status, address, timezone, capacity, operating_hours, capabilities, notes) VALUES
  (
    'wh_nj_01',
    'NJ-01',
    'New Jersey Fulfillment Center',
    'owned',
    'active',
    jsonb_build_object(
      'street1', '1050 Slocum Ave',
      'city', 'Ridgefield',
      'state', 'NJ',
      'zip', '07657',
      'country', 'US',
      'timezone', 'America/New_York'
    ),
    'America/New_York',
    jsonb_build_object(
      'total_sqft', 50000,
      'usable_sqft', 42000,
      'usable_pallets', 5000
    ),
    jsonb_build_object(
      'mon', '8:00-18:00',
      'tue', '8:00-18:00',
      'wed', '8:00-18:00',
      'thu', '8:00-18:00',
      'fri', '8:00-18:00',
      'sat', 'closed',
      'sun', 'closed'
    ),
    ARRAY['standard_storage', 'kitting', 'returns_processing'],
    'Primary fulfillment center'
  ),
  (
    'wh_lax_02',
    'LAX-02',
    'Riverside Distribution Center',
    'leased',
    'active',
    jsonb_build_object(
      'street1', '250 Palmyrita Ave Suite 1',
      'city', 'Riverside',
      'state', 'CA',
      'zip', '92507',
      'country', 'US',
      'timezone', 'America/Los_Angeles'
    ),
    'America/Los_Angeles',
    jsonb_build_object(
      'total_sqft', 35000,
      'usable_sqft', 30000,
      'usable_pallets', 3500
    ),
    jsonb_build_object(
      'mon', '7:00-17:00',
      'tue', '7:00-17:00',
      'wed', '7:00-17:00',
      'thu', '7:00-17:00',
      'fri', '7:00-17:00',
      'sat', 'closed',
      'sun', 'closed'
    ),
    ARRAY['standard_storage', 'cross_dock'],
    'West Coast distribution'
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  status = EXCLUDED.status,
  address = EXCLUDED.address,
  timezone = EXCLUDED.timezone,
  capacity = EXCLUDED.capacity,
  operating_hours = EXCLUDED.operating_hours,
  capabilities = EXCLUDED.capabilities,
  notes = EXCLUDED.notes,
  updated_at = NOW();

-- ============================================
-- VERIFICATION
-- ============================================

SELECT 
  COUNT(*) as warehouse_count 
FROM company.warehouses;

SELECT 
  code, 
  name, 
  type,
  status, 
  (capacity->>'usable_pallets')::int as pallets,
  array_length(capabilities, 1) as capability_count
FROM company.warehouses 
ORDER BY code;


