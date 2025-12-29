-- ============================================
-- COMPANY SCHEMA: YOUR OPERATIONAL ASSETS
-- Milestone: Client & Warehouse Module Foundation
-- Date: 2024-12-15
-- ============================================

CREATE SCHEMA IF NOT EXISTS company;

COMMENT ON SCHEMA company IS 'YOUR operational assets: warehouses, equipment, partners';

-- Utility function for updated_at triggers
CREATE OR REPLACE FUNCTION company.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- WAREHOUSES (Your physical facilities)
-- ============================================

CREATE TABLE IF NOT EXISTS company.warehouses (
  id TEXT PRIMARY KEY DEFAULT ('wh_' || gen_random_uuid()),
  
  -- Identity
  code TEXT NOT NULL UNIQUE,  -- 'DFW-01', 'LAX-02'
  name TEXT NOT NULL,          -- 'Dallas Fulfillment Center'
  type TEXT NOT NULL CHECK (type IN ('owned', 'leased', 'partner')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'commissioning', 'offline', 'decommissioned', 'retired')),
  
  -- Location
  address JSONB NOT NULL,  -- { street1, street2, city, state, zip, country, timezone }
  timezone TEXT NOT NULL DEFAULT 'America/Chicago',
  
  -- Capacity
  capacity JSONB NOT NULL DEFAULT '{}',  -- { total_sqft, usable_sqft, usable_pallets, ... }
  
  -- Operations
  operating_hours JSONB,  -- { mon: "8am-6pm", tue: "8am-6pm", ... }
  capabilities TEXT[],     -- ['cold_storage', 'hazmat', 'kitting', 'returns']
  -- Future: Add CHECK constraint to validate capabilities
  -- CHECK (capabilities <@ ARRAY['standard_storage', 'cold_storage', 'frozen_storage', 'hazmat', 'kitting', 'cross_dock', 'returns_processing', 'value_added_services']::text[])
  
  -- Management
  manager_id TEXT REFERENCES config.users(id),
  notes TEXT,
  
  -- Lifecycle management
  deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  deleted_by TEXT REFERENCES config.users(id),
  deleted_reason TEXT,
  retired_at TIMESTAMPTZ,
  retired_by TEXT REFERENCES config.users(id),
  retired_reason TEXT,
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_warehouses_code ON company.warehouses(code);
CREATE INDEX idx_warehouses_status ON company.warehouses(status);
CREATE INDEX idx_warehouses_manager ON company.warehouses(manager_id);
CREATE INDEX idx_warehouses_deleted ON company.warehouses(deleted) WHERE deleted = false;
CREATE INDEX idx_warehouses_lifecycle ON company.warehouses(status, deleted, retired_at);

-- Constraint: Cannot be both deleted and retired
ALTER TABLE company.warehouses ADD CONSTRAINT IF NOT EXISTS check_deleted_or_retired
  CHECK (
    (deleted = false) OR 
    (deleted = true AND status IN ('active', 'commissioning', 'offline', 'decommissioned'))
  );

-- Trigger for updated_at
CREATE TRIGGER update_warehouses_updated_at
  BEFORE UPDATE ON company.warehouses
  FOR EACH ROW
  EXECUTE FUNCTION company.update_updated_at();

COMMENT ON TABLE company.warehouses IS 'Your physical fulfillment facilities';
COMMENT ON COLUMN company.warehouses.code IS 'Short identifier: DFW-01, LAX-02';
COMMENT ON COLUMN company.warehouses.type IS 'Ownership: owned, leased, partner';
COMMENT ON COLUMN company.warehouses.capacity IS 'JSONB: total_sqft, usable_sqft, usable_pallets';
COMMENT ON COLUMN company.warehouses.capabilities IS 'Array of capabilities: cold_storage, hazmat, kitting, etc.';

-- ============================================
-- WAREHOUSE ZONES (Future: detailed bay management)
-- ============================================

CREATE TABLE IF NOT EXISTS company.warehouse_zones (
  id TEXT PRIMARY KEY DEFAULT ('zone_' || gen_random_uuid()),
  warehouse_id TEXT NOT NULL REFERENCES company.warehouses(id) ON DELETE CASCADE,
  
  zone_code TEXT NOT NULL,  -- 'A1', 'A2', 'B1'
  zone_type TEXT CHECK (zone_type IN ('receiving', 'storage', 'picking', 'shipping', 'qa', 'returns')),
  capacity_pallets INTEGER,
  
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(warehouse_id, zone_code)
);

CREATE INDEX idx_warehouse_zones_warehouse ON company.warehouse_zones(warehouse_id);

CREATE TRIGGER update_warehouse_zones_updated_at
  BEFORE UPDATE ON company.warehouse_zones
  FOR EACH ROW
  EXECUTE FUNCTION company.update_updated_at();

COMMENT ON TABLE company.warehouse_zones IS 'Detailed zone/bay layout within warehouses';

-- ============================================
-- BILLING SERVICES CATALOG
-- ============================================

CREATE TABLE IF NOT EXISTS company.billing_categories (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE company.billing_categories IS 'Categories for organizing billing services (fulfillment, receiving, etc.)';

CREATE TABLE IF NOT EXISTS company.billing_services (
  id SERIAL PRIMARY KEY,
  category_id INTEGER NOT NULL REFERENCES company.billing_categories(id),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  unit TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(category_id, code)
);

COMMENT ON TABLE company.billing_services IS 'Catalog of all billable services offered';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_billing_categories_active ON company.billing_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_billing_services_category_active ON company.billing_services(category_id, is_active);
CREATE INDEX IF NOT EXISTS idx_billing_services_code ON company.billing_services(code);

-- Triggers
CREATE TRIGGER update_billing_categories_updated_at
  BEFORE UPDATE ON company.billing_categories
  FOR EACH ROW EXECUTE FUNCTION company.update_updated_at();

CREATE TRIGGER update_billing_services_updated_at
  BEFORE UPDATE ON company.billing_services
  FOR EACH ROW EXECUTE FUNCTION company.update_updated_at();

-- ============================================
-- VERIFICATION
-- ============================================

SELECT
  'company.warehouses' as table_name,
  COUNT(*) as row_count
FROM company.warehouses
UNION ALL
SELECT
  'company.warehouse_zones',
  COUNT(*)
FROM company.warehouse_zones
UNION ALL
SELECT
  'company.billing_categories',
  COUNT(*)
FROM company.billing_categories
UNION ALL
SELECT
  'company.billing_services',
  COUNT(*)
FROM company.billing_services;


