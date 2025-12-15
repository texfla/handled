-- Migration 010: Create customer schema
-- Database: handled_primary (DBaaS)
-- Schema: customer
-- Date: 2024-12-11

-- Create customer schema (already created in 001, but ensuring it exists)
CREATE SCHEMA IF NOT EXISTS customer;

-- Organizations (3PL customers)
CREATE TABLE IF NOT EXISTS customer.organizations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Facilities (warehouses)
CREATE TABLE IF NOT EXISTS customer.facilities (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES customer.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    address JSONB,
    zip VARCHAR(5),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_facilities_organization_id ON customer.facilities(organization_id);
CREATE INDEX IF NOT EXISTS idx_facilities_zip ON customer.facilities(zip);
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON customer.organizations(slug);

-- Trigger to update updated_at for organizations
CREATE OR REPLACE FUNCTION customer.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_organizations_updated_at
    BEFORE UPDATE ON customer.organizations
    FOR EACH ROW
    EXECUTE FUNCTION customer.update_updated_at();

-- Comments
COMMENT ON SCHEMA customer IS 'Customer production data - IRREPLACEABLE';
COMMENT ON TABLE customer.organizations IS '3PL customer organizations';
COMMENT ON TABLE customer.facilities IS 'Customer warehouse facilities';

-- Future tables to be added:
-- - customer.inventory (SKU tracking)
-- - customer.orders (order management)
-- - customer.shipments (shipping records)
-- - customer.inventory_transactions (stock movements)
