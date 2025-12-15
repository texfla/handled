-- ============================================================================
-- Workspace Schema - Structure Baseline
-- Date: 2024-12-14
-- Purpose: Consolidated baseline for workspace schema tables and indexes
-- ============================================================================
-- This baseline consolidates migration: 002_workspace_tables.sql
-- Workspace holds RAW IMPORTED DATA (disposable, can be re-imported)
-- ============================================================================

-- ==================================================
-- SCHEMA
-- ==================================================

CREATE SCHEMA IF NOT EXISTS workspace;

COMMENT ON SCHEMA workspace IS 'Workspace for raw imported data - disposable, can be recreated from source files';

-- ==================================================
-- US_ZIPS TABLE
-- ==================================================
-- ZIP code reference data from SimpleMaps (~40K rows)

CREATE TABLE IF NOT EXISTS workspace.us_zips (
    zip VARCHAR(5) PRIMARY KEY,
    city VARCHAR(100),
    state_id VARCHAR(2),
    state_name VARCHAR(100),
    county_name VARCHAR(100),
    lat NUMERIC(10, 7),
    lng NUMERIC(10, 7),
    population INTEGER DEFAULT 0,
    density NUMERIC(10, 2),
    timezone VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_us_zips_state ON workspace.us_zips(state_id);
CREATE INDEX IF NOT EXISTS idx_us_zips_population ON workspace.us_zips(population DESC);

COMMENT ON TABLE workspace.us_zips IS 'ZIP code reference from SimpleMaps - imported via CSV';

-- ==================================================
-- GAZ_ZCTA_NATIONAL TABLE
-- ==================================================
-- Census ZCTA geographic data (~33K rows)

CREATE TABLE IF NOT EXISTS workspace.gaz_zcta_national (
    geoid VARCHAR(5) PRIMARY KEY,
    aland BIGINT,
    awater BIGINT,
    aland_sqmi NUMERIC(12, 2),
    awater_sqmi NUMERIC(12, 2),
    intptlat NUMERIC(10, 7),
    intptlong NUMERIC(10, 7),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE workspace.gaz_zcta_national IS 'Census ZCTA geographic boundaries - imported via CSV';

-- ==================================================
-- UPS_ZONES TABLE
-- ==================================================
-- UPS Zone Charts (origin to destination zones with all service types)

CREATE TABLE IF NOT EXISTS workspace.ups_zones (
    origin_zip VARCHAR(3) NOT NULL,
    dest_zip VARCHAR(3) NOT NULL,
    ground_zone VARCHAR(3),
    three_day_zone VARCHAR(3),
    two_day_zone VARCHAR(3),
    two_day_am_zone VARCHAR(3),
    nda_saver_zone VARCHAR(3),
    next_day_zone VARCHAR(3),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (origin_zip, dest_zip)
);

CREATE INDEX IF NOT EXISTS idx_ups_zones_origin ON workspace.ups_zones(origin_zip);
CREATE INDEX IF NOT EXISTS idx_ups_zones_dest ON workspace.ups_zones(dest_zip);

COMMENT ON TABLE workspace.ups_zones IS 'UPS zone charts (3-to-3) - imported via CSV';

-- ==================================================
-- UPS_GROUND_SERVICE_ZIP5 TABLE
-- ==================================================
-- UPS Ground Service (5-digit to 5-digit transit times)

CREATE TABLE IF NOT EXISTS workspace.ups_ground_service_zip5 (
    origin_zip VARCHAR(5) NOT NULL,
    dest_zip VARCHAR(5) NOT NULL,
    dest_state VARCHAR(2),
    transit_days INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (origin_zip, dest_zip)
);

COMMENT ON TABLE workspace.ups_ground_service_zip5 IS 'UPS ground transit times (5-to-5) - imported via CSV';

-- ==================================================
-- USPS_3D_BASE_SERVICE TABLE
-- ==================================================
-- USPS 3-Day Base Service (all service standards)

CREATE TABLE IF NOT EXISTS workspace.usps_3d_base_service (
    origin_zip_code VARCHAR(3) NOT NULL,
    destination_zip_code VARCHAR(3) NOT NULL,
    pri_service_standard INTEGER,
    gal_service_standard INTEGER,
    mkt_service_standard INTEGER,
    per_service_standard INTEGER,
    pkg_service_standard INTEGER,
    fcm_service_standard INTEGER,
    gah_service_standard INTEGER,
    pfc_service_standard INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (origin_zip_code, destination_zip_code)
);

COMMENT ON TABLE workspace.usps_3d_base_service IS 'USPS delivery standards (3-to-3) - imported via CSV';

-- ==================================================
-- BASELINE MARKER
-- ==================================================

COMMENT ON SCHEMA workspace IS 'Workspace schema baseline established 2024-12-14 - Raw import data staging tables';
