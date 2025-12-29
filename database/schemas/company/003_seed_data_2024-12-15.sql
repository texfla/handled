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
-- BILLING SERVICES SEED DATA
-- ============================================

-- Insert categories
INSERT INTO company.billing_categories (code, name, description, sort_order) VALUES
  ('fulfillment', 'Fulfillment Services', 'Services related to order processing and fulfillment', 1),
  ('receiving', 'Receiving Services', 'Services for receiving and processing inbound inventory', 2),
  ('storage', 'Storage Services', 'Services for storing inventory in warehouses', 3),
  ('shipping', 'Shipping Services', 'Services related to outbound shipping and delivery', 4),
  ('vas', 'Value-Added Services', 'Additional services like kitting, labeling, and bundling', 5)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order;

-- Insert services
INSERT INTO company.billing_services (category_id, code, name, description, unit, sort_order)
SELECT
  cat.id,
  'Fulfillment_BaseOrder',
  'Order Processing Fee',
  'Base fee for processing each B2C order',
  'per order',
  1
FROM company.billing_categories cat WHERE cat.code = 'fulfillment'
UNION ALL
SELECT cat.id, 'Fulfillment_AdditionalItem', 'Additional Item Fee', 'Fee for each item beyond first in order', 'per item', 2
FROM company.billing_categories cat WHERE cat.code = 'fulfillment'
UNION ALL
SELECT cat.id, 'Fulfillment_B2BPallet', 'B2B Pallet Order', 'Full pallet shipment to business customer', 'per pallet', 3
FROM company.billing_categories cat WHERE cat.code = 'fulfillment'
UNION ALL
SELECT cat.id, 'Fulfillment_PickPerLine', 'Pick Per Line Fee', 'Fee for picking each unique SKU line', 'per line', 4
FROM company.billing_categories cat WHERE cat.code = 'fulfillment'

-- Receiving Services
UNION ALL
SELECT cat.id, 'Receiving_StandardPallet', 'Standard Pallet Receiving', 'Receiving and putaway of standard pallet', 'per pallet', 1
FROM company.billing_categories cat WHERE cat.code = 'receiving'
UNION ALL
SELECT cat.id, 'Receiving_OversizePallet', 'Oversize Pallet Receiving', 'Receiving and putaway of oversize pallet', 'per pallet', 2
FROM company.billing_categories cat WHERE cat.code = 'receiving'
UNION ALL
SELECT cat.id, 'Receiving_Container20ft', '20ft Container Devanning', 'Unloading and processing 20ft container', 'per container', 3
FROM company.billing_categories cat WHERE cat.code = 'receiving'
UNION ALL
SELECT cat.id, 'Receiving_Container40ft', '40ft Container Devanning', 'Unloading and processing 40ft container', 'per container', 4
FROM company.billing_categories cat WHERE cat.code = 'receiving'
UNION ALL
SELECT cat.id, 'Receiving_PerItem', 'Per Item Receiving', 'Receiving charged per individual item', 'per item', 5
FROM company.billing_categories cat WHERE cat.code = 'receiving'
UNION ALL
SELECT cat.id, 'Receiving_HourlyLabor', 'Hourly Receiving Labor', 'Hourly rate for special receiving projects', 'per hour', 6
FROM company.billing_categories cat WHERE cat.code = 'receiving'

-- Storage Services
UNION ALL
SELECT cat.id, 'Storage_PalletMonthly', 'Monthly Pallet Storage', 'Monthly storage fee per pallet position', 'per pallet/month', 1
FROM company.billing_categories cat WHERE cat.code = 'storage'
UNION ALL
SELECT cat.id, 'Storage_PalletDaily', 'Daily Pallet Storage', 'Daily storage fee per pallet position', 'per pallet/day', 2
FROM company.billing_categories cat WHERE cat.code = 'storage'
UNION ALL
SELECT cat.id, 'Storage_CubicFootMonthly', 'Cubic Foot Storage', 'Storage charged per cubic foot monthly', 'per cubic foot/month', 3
FROM company.billing_categories cat WHERE cat.code = 'storage'
UNION ALL
SELECT cat.id, 'Storage_LongTermPenalty', 'Long-term Storage Penalty', 'Penalty for inventory stored >1 year', 'per pallet/month', 4
FROM company.billing_categories cat WHERE cat.code = 'storage'

-- Shipping Services
UNION ALL
SELECT cat.id, 'Shipping_CarrierCostMarkup', 'Carrier Cost Markup', 'Percentage markup on carrier shipping costs', 'percentage', 1
FROM company.billing_categories cat WHERE cat.code = 'shipping'
UNION ALL
SELECT cat.id, 'Shipping_LabelFee', 'Shipping Label Fee', 'Fee for printing/applying shipping labels', 'per label', 2
FROM company.billing_categories cat WHERE cat.code = 'shipping'

-- VAS Services
UNION ALL
SELECT cat.id, 'VAS_Kitting', 'Kitting Service', 'Assembly of multiple items into kits', 'per kit', 1
FROM company.billing_categories cat WHERE cat.code = 'vas'
UNION ALL
SELECT cat.id, 'VAS_Labeling', 'Custom Labeling', 'Application of custom product labels', 'per item', 2
FROM company.billing_categories cat WHERE cat.code = 'vas'
UNION ALL
SELECT cat.id, 'VAS_Bundling', 'Product Bundling', 'Bundling multiple units together', 'per bundle', 3
FROM company.billing_categories cat WHERE cat.code = 'vas'

ON CONFLICT (category_id, code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  unit = EXCLUDED.unit,
  sort_order = EXCLUDED.sort_order;

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


