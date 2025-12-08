-- Migration 004: Create reference schema tables
-- Database: handled
-- Schema: reference
-- Date: 2024-12-07
-- Note: Uses code-based primary keys for stable identity

-- Carriers reference table (code is the primary key)
CREATE TABLE IF NOT EXISTS reference.carriers (
    code VARCHAR(10) PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Services reference table (composite PK: carrier_code + code)
CREATE TABLE IF NOT EXISTS reference.services (
    carrier_code VARCHAR(10) NOT NULL REFERENCES reference.carriers(code),
    code VARCHAR(20) NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    PRIMARY KEY (carrier_code, code)
);

-- ZIP3 reference (combined demographics + geographic data)
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

-- Delivery matrix (the crown jewel - unified transit times)
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

-- Seed carriers (name = common display name, code = uppercase identifier)
INSERT INTO reference.carriers (code, name, description) VALUES
    ('UPS', 'UPS', 'UPS package delivery services'),
    ('USPS', 'USPS', 'US Postal Service mail and package delivery')
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description;

-- Seed UPS services
INSERT INTO reference.services (carrier_code, code, name, description) VALUES
    ('UPS', 'GND', 'Ground', 'UPS Ground shipping'),
    ('UPS', '3DS', '3 Day Select', 'UPS 3 Day Select service'),
    ('UPS', '2DA', '2nd Day Air', 'UPS 2nd Day Air service'),
    ('UPS', '2AM', '2nd Day Air AM', 'UPS 2nd Day Air AM (morning delivery)'),
    ('UPS', 'NDS', 'Next Day Air Saver', 'UPS Next Day Air Saver service'),
    ('UPS', 'NDA', 'Next Day Air', 'UPS Next Day Air service')
ON CONFLICT (carrier_code, code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description;

-- Seed USPS services (complete list from 3D Base columns)
INSERT INTO reference.services (carrier_code, code, name, description) VALUES
    ('USPS', 'PRI', 'Priority Mail', 'USPS Priority Mail service'),
    ('USPS', 'GAL', 'Ground Advantage Light', 'USPS Ground Advantage Light service'),
    ('USPS', 'MKT', 'Marketing Mail', 'USPS Marketing Mail service'),
    ('USPS', 'PER', 'Periodicals', 'USPS Periodicals service'),
    ('USPS', 'PKG', 'Package Services', 'USPS Package Services'),
    ('USPS', 'FCM', 'First-Class Mail', 'USPS First-Class Mail service'),
    ('USPS', 'GAH', 'Ground Advantage Heavy', 'USPS Ground Advantage Heavy service'),
    ('USPS', 'PFC', 'Parcel First Class', 'USPS Parcel First Class service'),
    ('USPS', 'LIB', 'Library Mail', 'USPS Library Mail service'),
    ('USPS', 'MED', 'Media Mail', 'USPS Media Mail service')
ON CONFLICT (carrier_code, code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description;

-- Comments
COMMENT ON TABLE reference.carriers IS 'Carrier reference data (code is PK for stable identity)';
COMMENT ON TABLE reference.services IS 'Service types per carrier (composite PK: carrier_code + code)';
COMMENT ON TABLE reference.zip3_reference IS 'Combined demographics and geographic data by ZIP3';
COMMENT ON TABLE reference.delivery_matrix IS 'Unified transit times - the core data asset';
