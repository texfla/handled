-- ============================================================================
-- Customer Schema - Client Enhancements
-- ============================================================================
-- Date: 2024-12-11
-- Purpose: Add address, internal notes, and contact history log
-- 
-- CHANGES:
-- 1. Add address column to customers (client company address)
-- 2. Add internal_notes column to customers (staff notes about client)
-- 3. Create contact_log table (communication history tracking)
-- ============================================================================

BEGIN;

-- ============================================
-- Add address to customers
-- ============================================
ALTER TABLE customer.customers 
ADD COLUMN IF NOT EXISTS address JSONB;

COMMENT ON COLUMN customer.customers.address IS 'Client company address (JSON: street1, street2, city, state, zip, country)';

-- ============================================
-- Add internal notes to customers
-- ============================================
ALTER TABLE customer.customers 
ADD COLUMN IF NOT EXISTS internal_notes TEXT;

COMMENT ON COLUMN customer.customers.internal_notes IS 'Internal staff notes about this client (not visible to client)';

-- ============================================
-- Create contact_log table
-- ============================================
CREATE TABLE IF NOT EXISTS customer.contact_log (
  id TEXT PRIMARY KEY DEFAULT ('log_' || gen_random_uuid()),
  customer_id TEXT NOT NULL REFERENCES customer.customers(id) ON DELETE CASCADE,
  contact_id TEXT REFERENCES customer.contacts(id) ON DELETE SET NULL,
  logged_by_user_id TEXT NOT NULL REFERENCES config.users(id),
  contact_type TEXT NOT NULL CHECK (contact_type IN ('call', 'email', 'meeting', 'note', 'other')),
  subject TEXT,
  notes TEXT,
  occurred_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE customer.contact_log IS 'Communication history and notes for client interactions';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_contact_log_customer ON customer.contact_log(customer_id);
CREATE INDEX IF NOT EXISTS idx_contact_log_contact ON customer.contact_log(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_log_occurred ON customer.contact_log(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_log_type ON customer.contact_log(contact_type);

-- Updated at trigger
CREATE OR REPLACE FUNCTION customer.update_contact_log_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER contact_log_updated_at
  BEFORE UPDATE ON customer.contact_log
  FOR EACH ROW
  EXECUTE FUNCTION customer.update_contact_log_timestamp();

-- ============================================
-- Verification
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✓ Customer enhancements applied:';
  RAISE NOTICE '  - address column added to customers';
  RAISE NOTICE '  - internal_notes column added to customers';
  RAISE NOTICE '  - contact_log table created';
  RAISE NOTICE '  - Indexes and triggers configured';
END $$;

COMMIT;
