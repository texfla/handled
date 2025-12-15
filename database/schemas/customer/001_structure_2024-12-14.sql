-- ============================================================================
-- Customer Schema - Structure Baseline
-- Date: 2024-12-14
-- Purpose: Consolidated baseline for customer schema tables, indexes, functions
-- ============================================================================
-- This baseline consolidates migration: 010_customer_schema.sql
-- ============================================================================

-- ==================================================
-- SCHEMA
-- ==================================================

CREATE SCHEMA IF NOT EXISTS customer;

COMMENT ON SCHEMA customer IS 'Customer production data - IRREPLACEABLE - Organizations and facilities';

-- ==================================================
-- ORGANIZATIONS TABLE
-- ==================================================

CREATE TABLE IF NOT EXISTS customer.organizations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_organizations_slug ON customer.organizations(slug);

COMMENT ON TABLE customer.organizations IS '3PL customer organizations';
COMMENT ON COLUMN customer.organizations.slug IS 'URL-friendly unique identifier for the organization';

-- ==================================================
-- FACILITIES TABLE
-- ==================================================

CREATE TABLE IF NOT EXISTS customer.facilities (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES customer.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    address JSONB,
    zip VARCHAR(5),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_facilities_organization_id ON customer.facilities(organization_id);
CREATE INDEX IF NOT EXISTS idx_facilities_zip ON customer.facilities(zip);

COMMENT ON TABLE customer.facilities IS 'Customer warehouse facilities';
COMMENT ON COLUMN customer.facilities.address IS 'Full address stored as JSON for flexibility';
COMMENT ON COLUMN customer.facilities.zip IS 'ZIP code for location-based lookups and zone calculations';

-- ==================================================
-- FUNCTIONS
-- ==================================================

-- Update updated_at timestamp trigger function
CREATE OR REPLACE FUNCTION customer.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION customer.update_updated_at() IS 'Trigger function to automatically update updated_at column';

-- ==================================================
-- TRIGGERS
-- ==================================================

CREATE TRIGGER trigger_organizations_updated_at
    BEFORE UPDATE ON customer.organizations
    FOR EACH ROW
    EXECUTE FUNCTION customer.update_updated_at();

-- ==================================================
-- BASELINE MARKER
-- ==================================================

COMMENT ON SCHEMA customer IS 'Customer schema baseline established 2024-12-14 - Organizations and facilities for 3PL customers';

-- ==================================================
-- FUTURE TABLES (documented for reference)
-- ==================================================

-- Planned future additions:
-- - customer.inventory (SKU tracking)
-- - customer.orders (order management)
-- - customer.shipments (shipping records)
-- - customer.inventory_transactions (stock movements)
