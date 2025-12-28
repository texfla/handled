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
-- CONTRACTS (pricing agreements with amendment tracking)
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
  
  -- Amendment tracking
  contract_type TEXT CHECK (contract_type IN ('original', 'addendum', 'amendment')),
  parent_contract_id TEXT REFERENCES customer.contracts(id),
  superseded_by_contract_id TEXT REFERENCES customer.contracts(id),
  execution_date DATE, -- When signed (vs effective date)
  amendment_number INT,
  document_url TEXT, -- S3/storage link to signed PDF
  terms JSONB, -- Structured contract terms
  
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
CREATE INDEX idx_contracts_type ON customer.contracts(contract_type);
CREATE INDEX idx_contracts_parent ON customer.contracts(parent_contract_id);

CREATE TRIGGER update_contracts_updated_at
  BEFORE UPDATE ON customer.contracts
  FOR EACH ROW
  EXECUTE FUNCTION customer.update_updated_at();

COMMENT ON TABLE customer.contracts IS 'Pricing agreements with clients (supports original + amendments/addendums)';
COMMENT ON COLUMN customer.contracts.auto_renew IS 'TRUE if contract auto-renews at end_date';
COMMENT ON COLUMN customer.contracts.contract_type IS 'Classifies contract: original, addendum, or amendment';
COMMENT ON COLUMN customer.contracts.parent_contract_id IS 'FK to parent contract for amendments';
COMMENT ON COLUMN customer.contracts.superseded_by_contract_id IS 'FK to contract that superseded this one';
COMMENT ON COLUMN customer.contracts.amendment_number IS 'Sequential number for addendums/amendments';

-- ============================================
-- RATE CARDS (pricing details with multi-contract support)
-- ============================================

CREATE TABLE customer.rate_cards (
  id TEXT PRIMARY KEY DEFAULT ('rate_' || gen_random_uuid()),
  customer_id TEXT REFERENCES customer.customers(id) ON DELETE CASCADE,
  
  -- Identity
  name TEXT NOT NULL,
  effective_date TIMESTAMPTZ NOT NULL,
  expires_date TIMESTAMPTZ, -- When superseded (null = active)
  
  -- Versioning
  version INTEGER DEFAULT 1,
  supersedes_id TEXT REFERENCES customer.rate_cards(id),

  -- Adjustment support
  rate_card_type TEXT CHECK (rate_card_type IN ('standard', 'adjustment')) DEFAULT 'standard',
  parent_rate_card_id TEXT REFERENCES customer.rate_cards(id),
  
  -- Rates (flexible JSONB structure)
  rates JSONB NOT NULL DEFAULT '{}',
  
  -- Billing configuration
  billing_cycles JSONB DEFAULT '{}', -- Per-service cycle overrides: {"shipping": "weekly", "storage": "monthly"}
  minimum_monthly_charge DECIMAL(10,2), -- Monthly minimum charge
  based_on_template TEXT, -- Template reference
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  notes TEXT,
  
  -- Soft delete (aligned with app deletion philosophy)
  archived_at TIMESTAMPTZ,
  archived_by TEXT REFERENCES config.users(id),
  archived_reason TEXT,
  
  -- Audit
  created_by TEXT REFERENCES config.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rate_cards_customer ON customer.rate_cards(customer_id);
CREATE INDEX idx_rate_cards_active ON customer.rate_cards(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_rate_cards_effective ON customer.rate_cards(effective_date);
CREATE INDEX idx_rate_cards_expires ON customer.rate_cards(expires_date);
CREATE INDEX idx_rate_cards_customer_active ON customer.rate_cards(customer_id, is_active) WHERE is_active = true;
CREATE INDEX idx_rate_cards_archived ON customer.rate_cards(archived_at) WHERE archived_at IS NOT NULL;
CREATE INDEX idx_rate_cards_rates_gin ON customer.rate_cards USING GIN(rates);
CREATE INDEX idx_rate_cards_parent ON customer.rate_cards(parent_rate_card_id);
CREATE INDEX idx_rate_cards_type ON customer.rate_cards(rate_card_type);

-- Business rule: only one active standard rate card per customer at a time
CREATE UNIQUE INDEX idx_rate_cards_one_active_standard_per_customer
  ON customer.rate_cards(customer_id)
  WHERE is_active = true AND rate_card_type = 'standard';

-- Business rules for adjustments
ALTER TABLE customer.rate_cards ADD CONSTRAINT
  adjustment_requires_parent
  CHECK (rate_card_type = 'standard' OR parent_rate_card_id IS NOT NULL);

CREATE TRIGGER update_rate_cards_updated_at
  BEFORE UPDATE ON customer.rate_cards
  FOR EACH ROW
  EXECUTE FUNCTION customer.update_updated_at();

COMMENT ON TABLE customer.rate_cards IS 'Pricing details with versioning and multi-contract support';
COMMENT ON COLUMN customer.rate_cards.customer_id IS 'Direct link to customer';
COMMENT ON COLUMN customer.rate_cards.supersedes_id IS 'Previous rate card version (for audit trail)';
COMMENT ON COLUMN customer.rate_cards.billing_cycles IS 'Service-level billing cycle overrides: {"shipping": "weekly", "storage": "monthly"}';
COMMENT ON COLUMN customer.rate_cards.minimum_monthly_charge IS 'Monthly minimum charge (applied to monthly invoices)';
COMMENT ON COLUMN customer.rate_cards.expires_date IS 'When this rate card was superseded (null = currently active)';
COMMENT ON COLUMN customer.rate_cards.archived_at IS 'Timestamp when rate card was archived (soft deleted)';
COMMENT ON COLUMN customer.rate_cards.archived_by IS 'User ID who archived this rate card';
COMMENT ON COLUMN customer.rate_cards.archived_reason IS 'Reason for archiving this rate card';

-- ============================================
-- RATE CARD CONTRACTS (Junction Table)
-- ============================================
-- Allows rate cards to reference multiple contracts (original + addendums)

CREATE TABLE customer.rate_card_contracts (
  rate_card_id TEXT NOT NULL REFERENCES customer.rate_cards(id) ON DELETE CASCADE,
  contract_id TEXT NOT NULL REFERENCES customer.contracts(id) ON DELETE RESTRICT,
  
  -- Metadata
  link_type TEXT CHECK (link_type IN ('primary', 'addendum', 'amendment')),
  linked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  linked_by TEXT REFERENCES config.users(id),
  notes TEXT,
  
  PRIMARY KEY (rate_card_id, contract_id)
);

CREATE INDEX idx_rate_card_contracts_rate ON customer.rate_card_contracts(rate_card_id);
CREATE INDEX idx_rate_card_contracts_contract ON customer.rate_card_contracts(contract_id);

COMMENT ON TABLE customer.rate_card_contracts IS 'Many-to-many: Rate cards can reference multiple contracts (original + addendums)';
COMMENT ON COLUMN customer.rate_card_contracts.link_type IS 'Classifies relationship: primary (original contract) or addendum/amendment';

-- ============================================
-- BILLING ACTIVITIES (Source of Truth for Billable Events)
-- ============================================

CREATE TABLE customer.billing_activities (
  id TEXT PRIMARY KEY DEFAULT ('act_' || gen_random_uuid()),
  customer_id TEXT NOT NULL REFERENCES customer.customers(id) ON DELETE CASCADE,
  
  -- Activity details
  activity_date TIMESTAMPTZ NOT NULL, -- When event occurred
  type TEXT NOT NULL, -- e.g., "shipping_parcel", "storage_daily", "order_fulfillment"
  quantity DECIMAL(10,3) NOT NULL CHECK (quantity > 0), -- Units of service
  unit TEXT, -- e.g., "pallet", "order", "item", "kg"
  description TEXT, -- Human-readable detail
  
  -- Reference tracking (for deduplication)
  reference_id TEXT, -- Order ID, Receipt ID, Shipment tracking #
  import_batch_id TEXT, -- For bulk import rollback
  
  -- Rating
  rate_applied DECIMAL(10,2), -- Rate from rate card (or override)
  rate_card_id TEXT REFERENCES customer.rate_cards(id), -- Which rate card was used
  amount DECIMAL(12,2), -- Calculated: quantity * rate_applied
  
  -- Billing cycle assignment
  billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('immediate', 'weekly', 'monthly')),
  billing_period_start DATE, -- For aggregation (Monday for weekly, 1st for monthly)
  
  -- Manual overrides
  is_manual_override BOOLEAN DEFAULT false,
  override_reason TEXT,
  
  -- Source tracking
  source TEXT, -- "wms_import", "api", "manual_entry", "csv_import"
  metadata JSONB, -- Flexible additional data
  
  -- Status
  invoiced BOOLEAN DEFAULT false, -- Has this been included in an invoice?
  invoice_id TEXT, -- FK added later
  
  -- Audit
  imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  imported_by TEXT REFERENCES config.users(id),
  
  -- Deduplication constraint: prevent double-billing
  CONSTRAINT unique_activity UNIQUE(customer_id, reference_id, activity_date, type)
);

CREATE INDEX idx_billing_activities_customer ON customer.billing_activities(customer_id);
CREATE INDEX idx_billing_activities_date ON customer.billing_activities(activity_date);
CREATE INDEX idx_billing_activities_type ON customer.billing_activities(type);
CREATE INDEX idx_billing_activities_reference ON customer.billing_activities(reference_id);
CREATE INDEX idx_billing_activities_billing_period ON customer.billing_activities(customer_id, billing_cycle, billing_period_start);
CREATE INDEX idx_billing_activities_uninvoiced ON customer.billing_activities(customer_id, invoiced) WHERE invoiced = false;
CREATE INDEX idx_billing_activities_import_batch ON customer.billing_activities(import_batch_id);
CREATE INDEX idx_billing_activities_rate_card ON customer.billing_activities(rate_card_id);

COMMENT ON TABLE customer.billing_activities IS 'All billable events (source of truth for invoice generation)';
COMMENT ON COLUMN customer.billing_activities.billing_cycle IS 'Determines invoice frequency: immediate (shipping), weekly, or monthly';
COMMENT ON COLUMN customer.billing_activities.billing_period_start IS 'Aggregation key: Monday for weekly, 1st of month for monthly';
COMMENT ON COLUMN customer.billing_activities.reference_id IS 'External reference (Order#, Shipment#) for deduplication';
COMMENT ON COLUMN customer.billing_activities.import_batch_id IS 'Batch ID for bulk imports (enables rollback if needed)';

-- ============================================
-- INVOICES (All Billing Cycles)
-- ============================================

CREATE TABLE customer.invoices (
  id TEXT PRIMARY KEY DEFAULT ('inv_' || gen_random_uuid()),
  customer_id TEXT NOT NULL REFERENCES customer.customers(id) ON DELETE RESTRICT,
  
  -- Invoice identification
  invoice_number TEXT NOT NULL UNIQUE, -- e.g., "INV-2026-001-W01" (weekly), "INV-2026-001-M" (monthly)
  
  -- Billing period
  billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('immediate', 'weekly', 'monthly', 'ad-hoc')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  -- Dates
  issued_at TIMESTAMPTZ,
  due_date TIMESTAMPTZ,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'issued', 'sent', 'paid', 'partial', 'overdue', 'void', 'credited'
  )),
  
  -- Amounts
  subtotal DECIMAL(12,2) NOT NULL CHECK (subtotal >= 0),
  tax DECIMAL(12,2) DEFAULT 0.00 CHECK (tax >= 0),
  total DECIMAL(12,2) NOT NULL CHECK (total >= 0),
  balance_due DECIMAL(12,2) NOT NULL CHECK (balance_due >= 0), -- Updated on payments
  
  -- Invoice data
  data_snapshot JSONB, -- Frozen: rate card used, activities included, calculations
  pdf_url TEXT, -- S3/storage link
  
  -- Metadata
  notes TEXT,
  internal_notes TEXT, -- Not visible to customer
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT REFERENCES config.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_invoices_customer ON customer.invoices(customer_id);
CREATE INDEX idx_invoices_number ON customer.invoices(invoice_number);
CREATE INDEX idx_invoices_period ON customer.invoices(customer_id, period_start, period_end);
CREATE INDEX idx_invoices_status ON customer.invoices(status);
CREATE INDEX idx_invoices_cycle ON customer.invoices(billing_cycle);
CREATE INDEX idx_invoices_due ON customer.invoices(due_date, status) 
  WHERE status IN ('issued', 'sent', 'partial', 'overdue');

-- Business rule: Only one draft per customer per billing cycle per period
CREATE UNIQUE INDEX idx_invoices_unique_draft
  ON customer.invoices(customer_id, billing_cycle, period_start, period_end)
  WHERE status = 'draft';

CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON customer.invoices
  FOR EACH ROW
  EXECUTE FUNCTION customer.update_updated_at();

COMMENT ON TABLE customer.invoices IS 'Invoice headers for all billing cycles (weekly, monthly, immediate)';
COMMENT ON COLUMN customer.invoices.invoice_number IS 'Format: INV-YYYY-CUSTID-WNN or MNN (W=weekly, M=monthly, I=immediate)';
COMMENT ON COLUMN customer.invoices.billing_cycle IS 'Determines invoice frequency and numbering';
COMMENT ON COLUMN customer.invoices.data_snapshot IS 'Frozen invoice data for exact reproducibility (rate card, activities, calculations)';
COMMENT ON COLUMN customer.invoices.balance_due IS 'Remaining balance after payments (updated by payment records)';

-- ============================================
-- INVOICE LINES (Itemized Details)
-- ============================================

CREATE TABLE customer.invoice_lines (
  id TEXT PRIMARY KEY DEFAULT ('line_' || gen_random_uuid()),
  invoice_id TEXT NOT NULL REFERENCES customer.invoices(id) ON DELETE CASCADE,
  
  -- Link to source activity (for drill-down)
  activity_id TEXT REFERENCES customer.billing_activities(id),
  
  -- Line item details
  description TEXT NOT NULL,
  category TEXT, -- e.g., "shipping", "storage", "fulfillment", "vas", "minimum"
  quantity DECIMAL(10,3) NOT NULL CHECK (quantity > 0),
  unit TEXT, -- e.g., "order", "pallet", "item"
  unit_rate DECIMAL(10,2) NOT NULL CHECK (unit_rate >= 0),
  line_total DECIMAL(12,2) NOT NULL CHECK (line_total >= 0),
  
  -- Line metadata
  line_order INT, -- For display ordering
  
  CONSTRAINT check_line_total CHECK (line_total = quantity * unit_rate)
);

CREATE INDEX idx_invoice_lines_invoice ON customer.invoice_lines(invoice_id);
CREATE INDEX idx_invoice_lines_activity ON customer.invoice_lines(activity_id);
CREATE INDEX idx_invoice_lines_category ON customer.invoice_lines(category);

COMMENT ON TABLE customer.invoice_lines IS 'Itemized invoice line items with activity traceability';
COMMENT ON COLUMN customer.invoice_lines.activity_id IS 'Link to source billing activity (may be null for aggregated/minimum lines)';
COMMENT ON COLUMN customer.invoice_lines.category IS 'Service category for reporting (receiving, storage, fulfillment, shipping, vas)';

-- ============================================
-- PAYMENTS (Payment Tracking)
-- ============================================

CREATE TABLE customer.payments (
  id TEXT PRIMARY KEY DEFAULT ('pay_' || gen_random_uuid()),
  invoice_id TEXT NOT NULL REFERENCES customer.invoices(id) ON DELETE RESTRICT,
  
  -- Payment details
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  payment_date DATE NOT NULL,
  method TEXT NOT NULL CHECK (method IN ('ach', 'card', 'wire', 'check', 'cash', 'credit')),
  reference TEXT, -- Transaction ID, check number, etc.
  
  -- Status
  status TEXT NOT NULL DEFAULT 'applied' CHECK (status IN ('applied', 'pending', 'failed', 'reversed')),
  
  -- Metadata
  notes TEXT,
  
  -- Audit
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  recorded_by TEXT REFERENCES config.users(id)
);

CREATE INDEX idx_payments_invoice ON customer.payments(invoice_id);
CREATE INDEX idx_payments_date ON customer.payments(payment_date);
CREATE INDEX idx_payments_status ON customer.payments(status);
CREATE INDEX idx_payments_method ON customer.payments(method);

COMMENT ON TABLE customer.payments IS 'Payment records applied to invoices (supports partial payments)';
COMMENT ON COLUMN customer.payments.status IS 'Payment status: applied (credited to invoice), pending, failed, or reversed';

-- Add FK from billing_activities to invoices (after invoices table exists)
ALTER TABLE customer.billing_activities
  ADD CONSTRAINT fk_billing_activities_invoice
  FOREIGN KEY (invoice_id) REFERENCES customer.invoices(id);

CREATE INDEX idx_billing_activities_invoice ON customer.billing_activities(invoice_id);

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
SELECT 'customer.rate_card_contracts', COUNT(*) FROM customer.rate_card_contracts
UNION ALL
SELECT 'customer.billing_activities', COUNT(*) FROM customer.billing_activities
UNION ALL
SELECT 'customer.invoices', COUNT(*) FROM customer.invoices
UNION ALL
SELECT 'customer.invoice_lines', COUNT(*) FROM customer.invoice_lines
UNION ALL
SELECT 'customer.payments', COUNT(*) FROM customer.payments
UNION ALL
SELECT 'customer.settings', COUNT(*) FROM customer.settings;
