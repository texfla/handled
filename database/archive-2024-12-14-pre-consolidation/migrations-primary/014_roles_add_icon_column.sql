-- Migration 014: Add Icon Column to Roles
-- Purpose: Store role icons in database for UI configuration
-- Date: 2024-12-11

ALTER TABLE config.roles 
ADD COLUMN IF NOT EXISTS icon VARCHAR(50);

ALTER TABLE config.roles 
ALTER COLUMN icon SET DEFAULT 'shield';

-- Seed existing roles
UPDATE config.roles SET icon = 'shield-check' WHERE code = 'admin';
UPDATE config.roles SET icon = 'crown' WHERE code = 'superuser';
UPDATE config.roles SET icon = 'user-cog' WHERE code = 'system_admin';
UPDATE config.roles SET icon = 'package-check' WHERE code = 'warehouse_lead';
UPDATE config.roles SET icon = 'package' WHERE code = 'warehouse_picker';
UPDATE config.roles SET icon = 'dollar-sign' WHERE code = 'billing_manager';
UPDATE config.roles SET icon = 'calculator' WHERE code = 'finance';
UPDATE config.roles SET icon = 'target' WHERE code = 'sales_manager';
UPDATE config.roles SET icon = 'trending-up' WHERE code = 'salesperson';
UPDATE config.roles SET icon = 'trending-up' WHERE code = 'sales';
UPDATE config.roles SET icon = 'message-square' WHERE code = 'client_service';
UPDATE config.roles SET icon = 'headphones' WHERE code = 'customer_service';

UPDATE config.roles SET icon = 'shield' WHERE icon IS NULL;

ALTER TABLE config.roles 
ALTER COLUMN icon SET NOT NULL;

COMMENT ON COLUMN config.roles.icon IS 'Lucide icon name (e.g., shield, crown)';

GRANT ALL ON TABLE config.roles TO handled_user;
GRANT ALL ON ALL SEQUENCES IN SCHEMA config TO handled_user;
