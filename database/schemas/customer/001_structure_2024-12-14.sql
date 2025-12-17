-- ============================================
-- CUSTOMER SCHEMA: COMPLETE STRUCTURE
-- Milestone: Client & Warehouse Module Foundation
-- Date: 2024-12-14 (Updated 2024-12-15)
-- Safe: No real customer data in production yet (foundational rebuild)
-- ============================================

-- Drop and recreate schema (foundational rebuild)
DROP SCHEMA IF EXISTS customer CASCADE;
CREATE SCHEMA customer;

COMMENT ON SCHEMA customer IS 'Client data: customers, allocations, contacts, contracts';

-- ============================================
-- UTILITY FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION customer.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- CUSTOMERS (client companies)
-- ============================================

CREATE TABLE customer.customers (
  id TEXT PRIMARY KEY DEFAULT ('cust_' || gen_random_uuid()),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'prospect' 
    CHECK (status IN ('prospect', 'setup', 'active', 'paused', 'terminated')),
  setup_progress JSONB DEFAULT '{}',
  
  -- Lifecycle management
  deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  deleted_by TEXT REFERENCES config.users(id),
  deleted_reason TEXT,
  retired_at TIMESTAMPTZ,
  retired_by TEXT REFERENCES config.users(id),
  retired_reason TEXT,
  is_test_data BOOLEAN DEFAULT false,
  
  -- Client company information
  address JSONB,
  internal_notes TEXT,
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_customers_status ON customer.customers(status);
CREATE INDEX idx_customers_slug ON customer.customers(slug);
CREATE INDEX idx_customers_deleted ON customer.customers(deleted) WHERE deleted = false;
CREATE INDEX idx_customers_lifecycle ON customer.customers(status, deleted, retired_at);
CREATE INDEX idx_customers_test_data ON customer.customers(is_test_data) WHERE is_test_data = true;

-- Constraint: Cannot be both deleted and terminated
ALTER TABLE customer.customers ADD CONSTRAINT check_deleted_or_terminated
  CHECK (
    (deleted = false) OR 
    (deleted = true AND status IN ('prospect', 'setup', 'active', 'paused'))
  );

CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON customer.customers
  FOR EACH ROW
  EXECUTE FUNCTION customer.update_updated_at();

COMMENT ON TABLE customer.customers IS 'Client companies we serve';
COMMENT ON COLUMN customer.customers.status IS 'Client lifecycle: prospect, setup, active, paused, terminated';
COMMENT ON COLUMN customer.customers.setup_progress IS 'JSONB tracking onboarding wizard completion';
COMMENT ON COLUMN customer.customers.address IS 'Client company address (JSON: street1, street2, city, state, zip, country)';
COMMENT ON COLUMN customer.customers.internal_notes IS 'Internal staff notes about this client (not visible to client)';

-- ============================================
-- WAREHOUSE ALLOCATIONS (client space at YOUR warehouses)
-- ============================================

CREATE TABLE customer.warehouse_allocations (
  id TEXT PRIMARY KEY DEFAULT ('alloc_' || gen_random_uuid()),
  
  -- Relationships
  customer_id TEXT NOT NULL REFERENCES customer.customers(id) ON DELETE CASCADE,
  company_warehouse_id TEXT NOT NULL REFERENCES company.warehouses(id) ON DELETE RESTRICT,
  
  -- Allocation details
  is_primary BOOLEAN DEFAULT FALSE,
  space_allocated JSONB,  -- { pallets: 100, sqft: 5000 }
  zone_assignment TEXT,     -- 'A1-A50' (which bays in warehouse)
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'setup', 'inactive')),
  
  notes TEXT,
  
  -- Lifecycle management
  deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  deleted_by TEXT REFERENCES config.users(id),
  deleted_reason TEXT,
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(customer_id, company_warehouse_id)
);

CREATE INDEX idx_warehouse_allocations_customer ON customer.warehouse_allocations(customer_id);
CREATE INDEX idx_warehouse_allocations_warehouse ON customer.warehouse_allocations(company_warehouse_id);
CREATE INDEX idx_warehouse_allocations_status ON customer.warehouse_allocations(status);
CREATE INDEX idx_warehouse_allocations_deleted ON customer.warehouse_allocations(deleted) WHERE deleted = false;

CREATE TRIGGER update_warehouse_allocations_updated_at
  BEFORE UPDATE ON customer.warehouse_allocations
  FOR EACH ROW
  EXECUTE FUNCTION customer.update_updated_at();

COMMENT ON TABLE customer.warehouse_allocations IS 'Client space allocations at YOUR warehouses (billing/capacity)';
COMMENT ON COLUMN customer.warehouse_allocations.company_warehouse_id IS 'FK to company.warehouses - which of YOUR warehouses they use';
COMMENT ON COLUMN customer.warehouse_allocations.space_allocated IS 'JSONB: pallets, sqft allocated to this client';

-- ============================================
-- FACILITIES (THEIR warehouses/buildings - supply chain visibility)
-- ============================================

CREATE TABLE customer.facilities (
  id TEXT PRIMARY KEY DEFAULT ('fac_' || gen_random_uuid()),
  
  -- Relationships
  customer_id TEXT NOT NULL REFERENCES customer.customers(id) ON DELETE CASCADE,
  
  -- Identity
  name TEXT NOT NULL,
  facility_type TEXT CHECK (facility_type IN ('warehouse', 'manufacturing', 'retail', 'office', 'other')),
  
  -- Location
  address JSONB NOT NULL,  -- { street1, city, state, zip, country }
  
  -- Details
  is_source BOOLEAN DEFAULT FALSE,  -- Do we receive inventory from here?
  is_destination BOOLEAN DEFAULT FALSE,  -- Do we ship to here?
  
  notes TEXT,
  
  -- Lifecycle management
  deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  deleted_by TEXT REFERENCES config.users(id),
  deleted_reason TEXT,
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_facilities_customer ON customer.facilities(customer_id);
CREATE INDEX idx_facilities_source ON customer.facilities(is_source) WHERE is_source = TRUE;
CREATE INDEX idx_facilities_dest ON customer.facilities(is_destination) WHERE is_destination = TRUE;
CREATE INDEX idx_facilities_deleted ON customer.facilities(deleted) WHERE deleted = false;

CREATE TRIGGER update_facilities_updated_at
  BEFORE UPDATE ON customer.facilities
  FOR EACH ROW
  EXECUTE FUNCTION customer.update_updated_at();

COMMENT ON TABLE customer.facilities IS 'Customer-owned warehouses/facilities for supply chain planning and visibility';
COMMENT ON COLUMN customer.facilities.is_source IS 'TRUE if we receive inventory from this facility';
COMMENT ON COLUMN customer.facilities.is_destination IS 'TRUE if we ship orders to this facility';

-- ============================================
-- CONTACTS (client team members)
-- ============================================

CREATE TABLE customer.contacts (
  id TEXT PRIMARY KEY DEFAULT ('contact_' || gen_random_uuid()),
  customer_id TEXT NOT NULL REFERENCES customer.customers(id) ON DELETE CASCADE,
  
  -- Identity
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  title TEXT,
  
  -- Contact info
  email TEXT,
  phone TEXT,
  
  -- Role in organization
  role TEXT CHECK (role IN ('operations', 'billing', 'executive', 'technical', 'general')),
  is_primary BOOLEAN DEFAULT FALSE,
  
  -- Status
  active BOOLEAN DEFAULT TRUE,
  
  notes TEXT,
  
  -- Lifecycle management
  deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  deleted_by TEXT REFERENCES config.users(id),
  deleted_reason TEXT,
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_contacts_customer ON customer.contacts(customer_id);
CREATE INDEX idx_contacts_primary ON customer.contacts(is_primary) WHERE is_primary = TRUE;
CREATE INDEX idx_contacts_active ON customer.contacts(active) WHERE active = TRUE;
CREATE INDEX idx_contacts_deleted ON customer.contacts(deleted) WHERE deleted = false;

CREATE TRIGGER update_contacts_updated_at
  BEFORE UPDATE ON customer.contacts
  FOR EACH ROW
  EXECUTE FUNCTION customer.update_updated_at();

COMMENT ON TABLE customer.contacts IS 'Client team members and points of contact';
COMMENT ON COLUMN customer.contacts.role IS 'Contact role: operations, billing, executive, technical, general';

-- ============================================
-- CONTACT LOG (communication history)
-- ============================================

CREATE TABLE customer.contact_log (
  id TEXT PRIMARY KEY DEFAULT ('log_' || gen_random_uuid()),
  customer_id TEXT NOT NULL REFERENCES customer.customers(id) ON DELETE CASCADE,
  contact_id TEXT REFERENCES customer.contacts(id) ON DELETE SET NULL,
  logged_by_user_id TEXT NOT NULL REFERENCES config.users(id) ON DELETE RESTRICT,
  contact_type TEXT NOT NULL CHECK (contact_type IN ('call', 'email', 'meeting', 'note', 'other')),
  subject TEXT,
  notes TEXT,
  occurred_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE customer.contact_log IS 'Communication history and notes for client interactions';

CREATE INDEX idx_contact_log_customer ON customer.contact_log(customer_id);
CREATE INDEX idx_contact_log_contact ON customer.contact_log(contact_id);
CREATE INDEX idx_contact_log_occurred ON customer.contact_log(occurred_at DESC);
CREATE INDEX idx_contact_log_type ON customer.contact_log(contact_type);

CREATE TRIGGER contact_log_updated_at
  BEFORE UPDATE ON customer.contact_log
  FOR EACH ROW
  EXECUTE FUNCTION customer.update_updated_at();

-- ============================================
-- CONTRACTS (pricing agreements)
-- ============================================

CREATE TABLE customer.contracts (
  id TEXT PRIMARY KEY DEFAULT ('contract_' || gen_random_uuid()),
  customer_id TEXT NOT NULL REFERENCES customer.customers(id) ON DELETE CASCADE,
  
  -- Identity
  contract_number TEXT UNIQUE,
  name TEXT NOT NULL,
  
  -- Dates
  start_date DATE NOT NULL,
  end_date DATE,
  auto_renew BOOLEAN DEFAULT FALSE,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'expired', 'terminated')),
  
  -- Billing
  billing_cycle TEXT CHECK (billing_cycle IN ('monthly', 'weekly', 'per_order', 'custom')),
  payment_terms TEXT,  -- 'Net 30', 'Net 15', 'Prepaid'
  
  notes TEXT,
  
  -- Lifecycle management (contracts are never deleted, only archived)
  archived_at TIMESTAMPTZ,
  archived_by TEXT REFERENCES config.users(id),
  archived_reason TEXT,
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_contracts_customer ON customer.contracts(customer_id);
CREATE INDEX idx_contracts_status ON customer.contracts(status);
CREATE INDEX idx_contracts_dates ON customer.contracts(start_date, end_date);

CREATE TRIGGER update_contracts_updated_at
  BEFORE UPDATE ON customer.contracts
  FOR EACH ROW
  EXECUTE FUNCTION customer.update_updated_at();

COMMENT ON TABLE customer.contracts IS 'Pricing agreements with clients';
COMMENT ON COLUMN customer.contracts.auto_renew IS 'TRUE if contract auto-renews at end_date';

-- ============================================
-- RATE CARDS (pricing details)
-- ============================================

CREATE TABLE customer.rate_cards (
  id TEXT PRIMARY KEY DEFAULT ('rate_' || gen_random_uuid()),
  contract_id TEXT NOT NULL REFERENCES customer.contracts(id) ON DELETE CASCADE,
  
  -- Identity
  name TEXT NOT NULL,
  effective_date DATE NOT NULL,
  expiration_date DATE,
  
  -- Versioning
  version INTEGER DEFAULT 1,
  supersedes_id TEXT REFERENCES customer.rate_cards(id),
  
  -- Rates (flexible structure)
  rates JSONB NOT NULL DEFAULT '{}',  -- { storage_per_pallet: 25.00, pick_fee: 1.50, ... }
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  notes TEXT,
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rate_cards_contract ON customer.rate_cards(contract_id);
CREATE INDEX idx_rate_cards_active ON customer.rate_cards(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_rate_cards_effective ON customer.rate_cards(effective_date);

CREATE TRIGGER update_rate_cards_updated_at
  BEFORE UPDATE ON customer.rate_cards
  FOR EACH ROW
  EXECUTE FUNCTION customer.update_updated_at();

COMMENT ON TABLE customer.rate_cards IS 'Pricing details per contract with versioning';
COMMENT ON COLUMN customer.rate_cards.supersedes_id IS 'Previous rate card version (for audit trail)';

-- ============================================
-- CLIENT SETTINGS (portal, notifications, preferences)
-- ============================================

CREATE TABLE customer.settings (
  customer_id TEXT PRIMARY KEY REFERENCES customer.customers(id) ON DELETE CASCADE,
  
  -- Portal
  portal_enabled BOOLEAN DEFAULT FALSE,
  portal_subdomain TEXT UNIQUE,  -- 'acme.handled.app'
  
  -- Notifications
  notification_email TEXT,
  notification_preferences JSONB DEFAULT '{}',
  
  -- Preferences
  timezone TEXT DEFAULT 'America/Chicago',
  settings JSONB DEFAULT '{}',  -- Flexible client-specific config
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_settings_portal ON customer.settings(portal_enabled) WHERE portal_enabled = TRUE;

CREATE TRIGGER update_settings_updated_at
  BEFORE UPDATE ON customer.settings
  FOR EACH ROW
  EXECUTE FUNCTION customer.update_updated_at();

COMMENT ON TABLE customer.settings IS 'Client-specific configuration and preferences';
COMMENT ON COLUMN customer.settings.portal_subdomain IS 'Unique subdomain for client portal access';

-- ============================================
-- VERIFICATION
-- ============================================

SELECT 'customer.customers' as table_name, COUNT(*) as row_count FROM customer.customers
UNION ALL
SELECT 'customer.warehouse_allocations', COUNT(*) FROM customer.warehouse_allocations
UNION ALL
SELECT 'customer.facilities', COUNT(*) FROM customer.facilities
UNION ALL
SELECT 'customer.contacts', COUNT(*) FROM customer.contacts
UNION ALL
SELECT 'customer.contact_log', COUNT(*) FROM customer.contact_log
UNION ALL
SELECT 'customer.contracts', COUNT(*) FROM customer.contracts
UNION ALL
SELECT 'customer.rate_cards', COUNT(*) FROM customer.rate_cards
UNION ALL
SELECT 'customer.settings', COUNT(*) FROM customer.settings;
