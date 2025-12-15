-- Migration 001: Create database schemas for DATA DB
-- Database: handled_data (VPS Local)
-- Date: 2024-12-11

-- Create schemas
CREATE SCHEMA IF NOT EXISTS workspace;
CREATE SCHEMA IF NOT EXISTS reference;

-- Comments
COMMENT ON SCHEMA workspace IS 'Raw imported data - disposable, can be rebuilt from files';
COMMENT ON SCHEMA reference IS 'Transformed data - carriers, delivery_matrix, demographics - rebuildable';
