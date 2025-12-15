-- Migration 005: Create workspace schema tables
-- Database: handled
-- Schema: workspace
-- Date: 2024-12-06
-- Note: These tables hold raw imported data (disposable)

-- US ZIP codes reference
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

-- Census ZCTA geographic data
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_us_zips_state ON workspace.us_zips(state_id);
CREATE INDEX IF NOT EXISTS idx_us_zips_population ON workspace.us_zips(population DESC);
CREATE INDEX IF NOT EXISTS idx_ups_zones_origin ON workspace.ups_zones(origin_zip);
CREATE INDEX IF NOT EXISTS idx_ups_zones_dest ON workspace.ups_zones(dest_zip);

-- Comments
COMMENT ON TABLE workspace.us_zips IS 'ZIP code reference from SimpleMaps';
COMMENT ON TABLE workspace.gaz_zcta_national IS 'Census ZCTA geographic boundaries';
COMMENT ON TABLE workspace.ups_zones IS 'UPS zone charts (3-to-3)';
COMMENT ON TABLE workspace.ups_ground_service_zip5 IS 'UPS ground transit times (5-to-5)';
COMMENT ON TABLE workspace.usps_3d_base_service IS 'USPS delivery standards (3-to-3)';

