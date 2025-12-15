-- ============================================================================
-- Reference Schema - Structure Baseline
-- Date: 2024-12-14
-- Purpose: Consolidated baseline for reference schema tables and indexes
-- ============================================================================
-- This baseline consolidates migration: 003_reference_tables.sql
-- Reference holds TRANSFORMED DATA (carriers, services, delivery matrix)
-- ============================================================================

-- ==================================================
-- SCHEMA
-- ==================================================

CREATE SCHEMA IF NOT EXISTS reference;

COMMENT ON SCHEMA reference IS 'Reference data - Carriers, services, ZIP3 demographics, and delivery matrix (the core data asset)';

-- ==================================================
-- CARRIERS TABLE
-- ==================================================
-- Code-based primary key for stable identity

CREATE TABLE IF NOT EXISTS reference.carriers (
    code VARCHAR(10) PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

COMMENT ON TABLE reference.carriers IS 'Carrier reference data (code is PK for stable identity)';
COMMENT ON COLUMN reference.carriers.code IS 'Carrier code (e.g., UPS, USPS, FEDEX)';

-- ==================================================
-- SERVICES TABLE
-- ==================================================
-- Composite PK: carrier_code + code

CREATE TABLE IF NOT EXISTS reference.services (
    carrier_code VARCHAR(10) NOT NULL REFERENCES reference.carriers(code),
    code VARCHAR(20) NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    PRIMARY KEY (carrier_code, code)
);

COMMENT ON TABLE reference.services IS 'Service types per carrier (composite PK: carrier_code + code)';
COMMENT ON COLUMN reference.services.code IS 'Service code (e.g., GND, PRI, NDA)';

-- ==================================================
-- ZIP3_REFERENCE TABLE
-- ==================================================
-- Combined demographics + geographic data (populated by transformations)

CREATE TABLE IF NOT EXISTS reference.zip3_reference (
    zip3 VARCHAR(3) PRIMARY KEY,
    -- Demographics (from us_zips)
    total_population INTEGER DEFAULT 0,
    zip_count INTEGER DEFAULT 0,
    primary_state VARCHAR(2),
    primary_city VARCHAR(100),
    pop_weighted_lat NUMERIC(10, 7),
    pop_weighted_lng NUMERIC(10, 7),
    -- Geographic (from gaz_zcta)
    geo_centroid_lat NUMERIC(10, 7),
    geo_centroid_lng NUMERIC(10, 7),
    total_land_sqmi NUMERIC(12, 2),
    total_water_sqmi NUMERIC(12, 2),
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

COMMENT ON TABLE reference.zip3_reference IS 'Combined demographics and geographic data by ZIP3 - populated by transformations from workspace data';

-- ==================================================
-- DELIVERY_MATRIX TABLE
-- ==================================================
-- The crown jewel - unified transit times

CREATE TABLE IF NOT EXISTS reference.delivery_matrix (
    origin_zip3 VARCHAR(3) NOT NULL,
    dest_zip3 VARCHAR(3) NOT NULL,
    carrier_code VARCHAR(10) NOT NULL REFERENCES reference.carriers(code),
    service_code VARCHAR(20) NOT NULL,
    transit_days INTEGER NOT NULL,
    delivery_score INTEGER NOT NULL,
    zone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    PRIMARY KEY (origin_zip3, dest_zip3, carrier_code, service_code),
    FOREIGN KEY (carrier_code, service_code) REFERENCES reference.services(carrier_code, code)
);

-- Indexes for delivery_matrix queries
CREATE INDEX IF NOT EXISTS idx_delivery_matrix_origin ON reference.delivery_matrix(origin_zip3);
CREATE INDEX IF NOT EXISTS idx_delivery_matrix_dest ON reference.delivery_matrix(dest_zip3);
CREATE INDEX IF NOT EXISTS idx_delivery_matrix_carrier ON reference.delivery_matrix(carrier_code);
CREATE INDEX IF NOT EXISTS idx_delivery_matrix_service ON reference.delivery_matrix(service_code);
CREATE INDEX IF NOT EXISTS idx_delivery_matrix_transit ON reference.delivery_matrix(transit_days);
CREATE INDEX IF NOT EXISTS idx_delivery_matrix_score ON reference.delivery_matrix(delivery_score DESC);

COMMENT ON TABLE reference.delivery_matrix IS 'Unified transit times - the core data asset - populated by transformations from workspace data';
COMMENT ON COLUMN reference.delivery_matrix.delivery_score IS 'Calculated score for ranking delivery options';
COMMENT ON COLUMN reference.delivery_matrix.zone IS 'Carrier zone designation (e.g., Zone 5)';

-- ==================================================
-- BASELINE MARKER
-- ==================================================

COMMENT ON SCHEMA reference IS 'Reference schema baseline established 2024-12-14 - Carriers, services, and the delivery matrix';
