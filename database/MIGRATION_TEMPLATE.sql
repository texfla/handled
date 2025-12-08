-- Migration XXX: [Brief description of what this migration does]
-- Database: handled
-- Schema: [config/workspace/reference]
-- Date: YYYY-MM-DD
-- Author: [Your name]
-- Ticket/Issue: [Optional reference to issue tracker]

-- ==================================================
-- DESCRIPTION
-- ==================================================
-- [Detailed explanation of why this migration exists]
-- [What problem it solves]
-- [Any important context or dependencies]

-- ==================================================
-- CHANGES
-- ==================================================

-- Example: Add new column
-- ALTER TABLE config.users ADD COLUMN IF NOT EXISTS 
--     phone VARCHAR(20);

-- Example: Create new table
-- CREATE TABLE IF NOT EXISTS config.customers (
--     id TEXT PRIMARY KEY,
--     name TEXT NOT NULL,
--     email TEXT UNIQUE NOT NULL,
--     created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
-- );

-- Example: Add index
-- CREATE INDEX IF NOT EXISTS idx_customers_email 
--     ON config.customers(email);

-- Example: Add foreign key
-- ALTER TABLE config.orders 
--     ADD CONSTRAINT fk_orders_customer_id 
--     FOREIGN KEY (customer_id) 
--     REFERENCES config.customers(id) 
--     ON DELETE CASCADE;

-- ==================================================
-- DATA MIGRATION (if needed)
-- ==================================================

-- Example: Migrate existing data
-- UPDATE config.users 
--     SET phone = NULL 
--     WHERE phone = '';

-- ==================================================
-- COMMENTS
-- ==================================================

-- COMMENT ON TABLE config.customers IS 'Customer accounts and contact information';
-- COMMENT ON COLUMN config.customers.email IS 'Primary contact email for customer';

-- ==================================================
-- ROLLBACK NOTES (for reference)
-- ==================================================
-- To rollback this migration:
-- 1. [Step-by-step rollback instructions]
-- 2. [Drop tables/columns in reverse order]
-- 3. [Restore any data if needed]

-- ==================================================
-- VERIFICATION
-- ==================================================
-- After running, verify with:
-- SELECT * FROM config.schema_migrations WHERE version = 'XXX';
-- [Any other verification queries]

