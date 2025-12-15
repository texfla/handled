-- Migration 001: Create database schemas for PRIMARY DB
-- Database: handled_primary (DBaaS)
-- Date: 2024-12-11

-- Create schemas
CREATE SCHEMA IF NOT EXISTS config;
CREATE SCHEMA IF NOT EXISTS customer;

-- Comments
COMMENT ON SCHEMA config IS 'Authentication, roles, permissions, integration run tracking';
COMMENT ON SCHEMA customer IS 'Customer production data - IRREPLACEABLE (organizations, facilities, orders, shipments)';
