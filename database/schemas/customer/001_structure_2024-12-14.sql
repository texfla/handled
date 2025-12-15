-- ============================================
-- CUSTOMER SCHEMA: COMPLETE STRUCTURE
-- Milestone: Client & Warehouse Module Foundation
-- Date: 2024-12-14 (Updated 2024-12-15)
-- Safe: No real customer data in production yet (foundational rebuild)
-- ============================================

-- Drop and recreate schema (foundational rebuild)
DROP SCHEMA IF EXISTS customer CASCADE;
CREATE SCHEMA customer;

COMMENT ON SCHEMA customer IS 'Client data: organizations, allocations, contacts, contracts';

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
-- ORGANIZATIONS (client companies)
-- ============================================

CREATE TABLE customer.organizations (
  id TEXT PRIMARY KEY DEFAULT ('org_' || gen_random_uuid()),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'prospect' 
    CHECK (status IN ('prospect', 'setup', 'active', 'paused', 'terminated')),
  setup_progress JSONB DEFAULT '{}',
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_organizations_status ON customer.organizations(status);
CREATE INDEX idx_organizations_slug ON customer.organizations(slug);

CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON customer.organizations
  FOR EACH ROW
  EXECUTE FUNCTION customer.update_updated_at();

COMMENT ON TABLE customer.organizations IS 'Client companies we serve';
COMMENT ON COLUMN customer.organizations.status IS 'Client lifecycle: prospect, setup, active, paused, terminated';
COMMENT ON COLUMN customer.organizations.setup_progress IS 'JSONB tracking onboarding wizard completion';

-- ============================================
-- FACILITIES (client allocations at YOUR warehouses)
-- ============================================

CREATE TABLE customer.facilities (
  id TEXT PRIMARY KEY DEFAULT ('fac_' || gen_random_uuid()),
  
  -- Relationships
  organization_id TEXT NOT NULL REFERENCES customer.organizations(id) ON DELETE CASCADE,
  company_warehouse_id TEXT NOT NULL REFERENCES company.warehouses(id) ON DELETE RESTRICT,
  
  -- Allocation details
  is_primary BOOLEAN DEFAULT FALSE,
  space_allocation JSONB,  -- { pallets: 100, sqft: 5000 }
  zone_assignment TEXT,     -- 'A1-A50' (which bays in warehouse)
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'setup', 'inactive')),
  
  notes TEXT,
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(organization_id, company_warehouse_id)
);

CREATE INDEX idx_facilities_organization ON customer.facilities(organization_id);
CREATE INDEX idx_facilities_warehouse ON customer.facilities(company_warehouse_id);
CREATE INDEX idx_facilities_status ON customer.facilities(status);

CREATE TRIGGER update_facilities_updated_at
  BEFORE UPDATE ON customer.facilities
  FOR EACH ROW
  EXECUTE FUNCTION customer.update_updated_at();

COMMENT ON TABLE customer.facilities IS 'Client allocations at YOUR warehouses';
COMMENT ON COLUMN customer.facilities.company_warehouse_id IS 'FK to company.warehouses - which of YOUR warehouses they use';
COMMENT ON COLUMN customer.facilities.space_allocation IS 'JSONB: pallets, sqft allocated to this client';

-- ============================================
-- CLIENT FACILITIES (their warehouses - planning only)
-- ============================================

CREATE TABLE customer.client_facilities (
  id TEXT PRIMARY KEY DEFAULT ('client_fac_' || gen_random_uuid()),
  
  -- Relationships
  organization_id TEXT NOT NULL REFERENCES customer.organizations(id) ON DELETE CASCADE,
  
  -- Identity
  name TEXT NOT NULL,
  facility_type TEXT CHECK (facility_type IN ('warehouse', 'manufacturing', 'retail', 'office', 'other')),
  
  -- Location
  address JSONB NOT NULL,  -- { street1, city, state, zip, country }
  
  -- Details
  is_source BOOLEAN DEFAULT FALSE,  -- Do we receive inventory from here?
  is_destination BOOLEAN DEFAULT FALSE,  -- Do we ship to here?
  
  notes TEXT,
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_client_facilities_org ON customer.client_facilities(organization_id);
CREATE INDEX idx_client_facilities_source ON customer.client_facilities(is_source) WHERE is_source = TRUE;
CREATE INDEX idx_client_facilities_dest ON customer.client_facilities(is_destination) WHERE is_destination = TRUE;

CREATE TRIGGER update_client_facilities_updated_at
  BEFORE UPDATE ON customer.client_facilities
  FOR EACH ROW
  EXECUTE FUNCTION customer.update_updated_at();

COMMENT ON TABLE customer.client_facilities IS 'Client-owned warehouses/facilities for planning and visibility';
COMMENT ON COLUMN customer.client_facilities.is_source IS 'TRUE if we receive inventory from this facility';
COMMENT ON COLUMN customer.client_facilities.is_destination IS 'TRUE if we ship orders to this facility';

-- ============================================
-- CONTACTS (client team members)
-- ============================================

CREATE TABLE customer.contacts (
  id TEXT PRIMARY KEY DEFAULT ('contact_' || gen_random_uuid()),
  organization_id TEXT NOT NULL REFERENCES customer.organizations(id) ON DELETE CASCADE,
  
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
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_contacts_organization ON customer.contacts(organization_id);
CREATE INDEX idx_contacts_primary ON customer.contacts(is_primary) WHERE is_primary = TRUE;
CREATE INDEX idx_contacts_active ON customer.contacts(active) WHERE active = TRUE;

CREATE TRIGGER update_contacts_updated_at
  BEFORE UPDATE ON customer.contacts
  FOR EACH ROW
  EXECUTE FUNCTION customer.update_updated_at();

COMMENT ON TABLE customer.contacts IS 'Client team members and points of contact';
COMMENT ON COLUMN customer.contacts.role IS 'Contact role: operations, billing, executive, technical, general';

-- ============================================
-- CONTRACTS (pricing agreements)
-- ============================================

CREATE TABLE customer.contracts (
  id TEXT PRIMARY KEY DEFAULT ('contract_' || gen_random_uuid()),
  organization_id TEXT NOT NULL REFERENCES customer.organizations(id) ON DELETE CASCADE,
  
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
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_contracts_organization ON customer.contracts(organization_id);
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

CREATE TABLE customer.client_settings (
  organization_id TEXT PRIMARY KEY REFERENCES customer.organizations(id) ON DELETE CASCADE,
  
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

CREATE INDEX idx_client_settings_portal ON customer.client_settings(portal_enabled) WHERE portal_enabled = TRUE;

CREATE TRIGGER update_client_settings_updated_at
  BEFORE UPDATE ON customer.client_settings
  FOR EACH ROW
  EXECUTE FUNCTION customer.update_updated_at();

COMMENT ON TABLE customer.client_settings IS 'Client-specific configuration and preferences';
COMMENT ON COLUMN customer.client_settings.portal_subdomain IS 'Unique subdomain for client portal access';

-- ============================================
-- VERIFICATION
-- ============================================

SELECT 'customer.organizations' as table_name, COUNT(*) as row_count FROM customer.organizations
UNION ALL
SELECT 'customer.facilities', COUNT(*) FROM customer.facilities
UNION ALL
SELECT 'customer.client_facilities', COUNT(*) FROM customer.client_facilities
UNION ALL
SELECT 'customer.contacts', COUNT(*) FROM customer.contacts
UNION ALL
SELECT 'customer.contracts', COUNT(*) FROM customer.contracts
UNION ALL
SELECT 'customer.rate_cards', COUNT(*) FROM customer.rate_cards
UNION ALL
SELECT 'customer.client_settings', COUNT(*) FROM customer.client_settings;
