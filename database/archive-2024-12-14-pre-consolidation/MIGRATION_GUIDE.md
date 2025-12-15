# Database Migration Guide

## Overview

Our migration system supports both **split-database** (production) and **single-database** (local dev) modes with built-in validation and data protection.

---

## Quick Start

### Local Development (First Time Setup)

```bash
# 1. Run one-command setup (creates user, database, runs migrations)
bash database/setup-dev-db.sh

# 2. Copy environment template
cp apps/backoffice/api/env-template.txt apps/backoffice/api/.env

# 3. Start developing
pnpm install
pnpm dev
```

**That's it!** The setup script handles everything:
- Creates `handled_user` (superuser for local dev)
- Creates `handled_dev` database
- Runs all migrations
- Tests connections

For more details, see the [Developer Setup section in README.md](README.md#developer-setup-first-time)

### Production (Split Database)

```bash
# Set environment variables
export SPLIT_DB_MODE=true
export PRIMARY_DATABASE_URL="postgresql://handled_user:PASSWORD@dbaas-host:25060/handled_primary?sslmode=require"
export DATA_DATABASE_URL="postgresql://handled_user:PASSWORD@localhost:5432/handled_data"

# Run migrations
pnpm db:migrate
```

---

## Migration Commands

### Run All Migrations

```bash
# Recommended: runs both PRIMARY and DATA migrations
pnpm db:migrate
```

### Run Individual Migration Sets

```bash
# PRIMARY DB only (config + customer schemas)
pnpm db:migrate:primary

# DATA DB only (workspace + reference schemas)
pnpm db:migrate:data
```

### Check Migration Status

```bash
# View all applied migrations
pnpm db:migrate:status:primary
pnpm db:migrate:status:data
```

---

## Enhanced Features

### Schema Validation

The migration scripts now **automatically validate** that:
- Expected schemas actually exist in the database
- Tracking table matches reality
- No mismatches between recorded and actual state

Example output:
```
✓ Schema 'config' exists and is ready
✓ Schema 'customer' exists and is ready
✓ Schema 'workspace' exists and is ready
✓ Schema 'reference' exists and is ready
```

### Auto-Repair Mode

If migrations are tracked but schemas are missing, use **repair mode**:

```bash
# For PRIMARY DB
bash database/migrate-primary.sh --repair

# For DATA DB
bash database/migrate-data.sh --repair
```

**What repair does:**
1. Detects missing schemas
2. Clears tracking for schema creation migrations
3. Re-runs those migrations safely (using `IF NOT EXISTS`)
4. Validates schemas were created

### Data Protection

The scripts detect if schemas contain data and inform you:

```
ℹ Schema 'config' contains tables (data protection active)
```

This prevents accidental data loss. Migrations use `IF NOT EXISTS` and won't drop existing data.

---

## Permission Grants in Migrations

**CRITICAL:** Every migration that creates new database objects **MUST** include permission grants.

### Why This Matters

In production, migrations might be run by different PostgreSQL users:
- `postgres` (superuser)
- `doadmin` (Digital Ocean admin)
- `handled_user` (application user)

When an admin user creates a table, they **own** it. Without explicit `GRANT` statements, the application user (`handled_user`) cannot access the table, causing **"Operation not permitted"** errors.

### Required Grants

#### For New Tables

```sql
-- Create the table
CREATE TABLE config.my_table (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL
);

-- MUST include this grant
GRANT ALL ON TABLE config.my_table TO handled_user;
```

#### For New Sequences

```sql
-- Create the sequence
CREATE SEQUENCE config.my_seq;

-- MUST include this grant
GRANT ALL ON SEQUENCE config.my_seq TO handled_user;
```

#### For New Functions

```sql
-- Create the function
CREATE FUNCTION config.my_function() RETURNS TEXT AS $$
BEGIN
    RETURN 'hello';
END;
$$ LANGUAGE plpgsql;

-- MUST include this grant
GRANT ALL ON FUNCTION config.my_function TO handled_user;
```

#### When Creating a New Schema

```sql
-- Create the schema
CREATE SCHEMA my_schema;

-- Grant usage permission
GRANT USAGE ON SCHEMA my_schema TO handled_user;

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES FOR ROLE handled_user IN SCHEMA my_schema
  GRANT ALL ON TABLES TO handled_user;
  
ALTER DEFAULT PRIVILEGES FOR ROLE handled_user IN SCHEMA my_schema
  GRANT ALL ON SEQUENCES TO handled_user;
  
ALTER DEFAULT PRIVILEGES FOR ROLE handled_user IN SCHEMA my_schema
  GRANT ALL ON FUNCTIONS TO handled_user;
```

### Using the Template

The `MIGRATION_TEMPLATE.sql` includes a **PERMISSIONS** section with all the necessary grant statements. Always copy this template when creating new migrations:

```bash
cp database/MIGRATION_TEMPLATE.sql database/migrations-primary/013_my_feature.sql
```

### Catchall Migrations

We have catchall migrations that fix any missing permissions:
- `012_ensure_db_permissions.sql` (PRIMARY DB - config & customer schemas)
- `005_ensure_db_permissions.sql` (DATA DB - workspace & reference schemas)

These migrations:
- Grant permissions on all existing tables/sequences/functions
- Set default privileges for future objects
- Handle production admin users (postgres, doadmin)

**Important:** These catchall migrations are a safety net, not a replacement for proper grants in your migrations!

### Verification

After writing a migration, verify permissions:

```bash
# Run migration with verification (recommended)
bash database/migrate-primary.sh --verify

# This checks both tables AND sequences automatically
# Sequences are critical - without USAGE permission, INSERTs fail on SERIAL columns
```

The `--verify` flag checks:
- Table permissions (SELECT, INSERT, UPDATE, DELETE)
- Sequence permissions (USAGE, SELECT) - critical for auto-increment IDs
- Provides summary and fix suggestions

All permissions should show `t` (true). If any show `f` (false), you forgot a GRANT statement!

### Common Mistakes

❌ **WRONG:** Creating a table without grants
```sql
CREATE TABLE config.customers (...);
-- App will fail with "permission denied" in production
```

✅ **CORRECT:** Always include grants
```sql
CREATE TABLE config.customers (...);
GRANT ALL ON TABLE config.customers TO handled_user;
```

❌ **WRONG:** Assuming local dev behavior matches production
```
Works on my machine!  (local handled_user is superuser)
Fails in production!  (production handled_user needs explicit grants)
```

✅ **CORRECT:** Test with --verify flag
```bash
bash database/migrate-primary.sh --verify
```

---

## Troubleshooting

### Problem: "Schema does not exist" Error

**Symptoms:**
```
ERROR: schema "reference" does not exist
```

**Cause:** Migrations tracked but didn't actually run

**Fix:**
```bash
# Check what schemas exist
psql -d handled_dev -c "\dn"

# Use repair mode
bash database/migrate-data.sh --repair
```

---

### Problem: "Migrations already applied" but Schemas Missing

**Symptoms:**
```
[APPLIED] 001_create_schemas.sql
✗ Schema 'workspace' does not exist in database
```

**Cause:** Tracking table out of sync with reality

**Fix 1 - Auto Repair (Recommended):**
```bash
bash database/migrate-data.sh --repair
```

**Fix 2 - Manual Schema Creation:**
```bash
psql -d handled_dev -c "CREATE SCHEMA IF NOT EXISTS workspace; CREATE SCHEMA IF NOT EXISTS reference;"
```

**Fix 3 - Full Reset (Nuclear Option):**
```bash
dropdb handled_dev
dropuser handled_user

# Re-run setup script
bash database/setup-dev-db.sh
```

---

### Problem: Permission Denied

**Symptoms:**
```
ERROR: permission denied for database handled_dev
```

**Cause:** Connection string missing username or wrong user

**Fix:** Ensure you're using `handled_user` in connection strings:
```env
PRIMARY_DATABASE_URL="postgresql://handled_user@localhost:5432/handled_dev"
DATA_DATABASE_URL="postgresql://handled_user@localhost:5432/handled_dev"
```

If `handled_user` doesn't exist, run the setup script:
```bash
bash database/setup-dev-db.sh
```

---

## Migration File Structure

### PRIMARY DB (`migrations-primary/`)
```
000_migration_tracking.sql  → Sets up tracking table
001_create_schemas.sql      → config + customer schemas
002_auth_tables.sql         → users, sessions, roles
003_integration_tables.sql  → integration_runs
006_user_disabled.sql       → user.disabled column
007_roles_and_permissions.sql → RBAC tables
008_add_additional_roles.sql → warehouse roles
009_add_3pl_permissions.sql  → 3PL permissions
010_customer_schema.sql      → organizations, facilities
```

### DATA DB (`migrations-data/`)
```
000_migration_tracking.sql  → Sets up tracking table
001_create_schemas.sql      → workspace + reference schemas
002_workspace_tables.sql    → us_zips, ups_zones, usps tables
003_reference_tables.sql    → delivery_matrix, zip3_reference
```

---

## Best Practices

### Local Development

1. **Run the setup script first** (one time per machine):
   ```bash
   bash database/setup-dev-db.sh
   ```

2. **Use handled_user** for all database connections:
   ```bash
   export PRIMARY_DATABASE_URL="postgresql://handled_user@localhost:5432/handled_dev"
   export DATA_DATABASE_URL="postgresql://handled_user@localhost:5432/handled_dev"
   ```

3. **Use migrate-all.sh** instead of individual scripts

4. **Check schema status** if something seems off:
   ```bash
   psql -U handled_user -d handled_dev -c "\dn"
   ```

### Production

1. **Run PRIMARY first**, then DATA (or use migrate-all.sh)

2. **Always backup** before running migrations in production

3. **Test on staging** with production data copy first

4. **Monitor** migration execution time (logged in tracking table)

---

## Environment Variables Required

### Single-DB Mode (Local Dev)
```env
SPLIT_DB_MODE=false
PRIMARY_DATABASE_URL="postgresql://handled_user@localhost:5432/handled_dev"
DATA_DATABASE_URL="postgresql://handled_user@localhost:5432/handled_dev"
```

### Split-DB Mode (Production)
```env
SPLIT_DB_MODE=true
PRIMARY_DATABASE_URL="postgresql://handled_user:PASSWORD@dbaas-host:25060/handled_primary?sslmode=require&pgbouncer=true"
DATA_DATABASE_URL="postgresql://handled_user:PASSWORD@localhost:5432/handled_data"
```

---

## Migration Script Flags

### `--verify`
Verifies that `handled_user` has proper permissions on all tables and sequences after migration.

**Use when:**
- You've just written a new migration
- You want to check permission grants
- Debugging "permission denied" errors
- Verifying after running catchall migrations

**Example:**
```bash
bash database/migrate-primary.sh --verify
bash database/migrate-data.sh --verify
```

**What it checks:**
- **Table permissions:** SELECT, INSERT, UPDATE, DELETE on all tables
- **Sequence permissions:** USAGE, SELECT on all sequences (critical for SERIAL columns)
- **Summary:** Reports count of objects with missing permissions
- **Fix suggestions:** Provides exact commands to resolve issues

**Output example:**
```
TABLE PERMISSIONS:
 schemaname | tablename | read | insert | update | delete
 config     | users     | t    | t      | t      | t
 config     | roles     | t    | t      | t      | t

SEQUENCE PERMISSIONS:
 schemaname | sequencename  | usage | select
 config     | users_id_seq  | t     | t
 config     | roles_id_seq  | t     | t

✓ All objects accessible by handled_user
✓ Tables: All permissions granted
✓ Sequences: All permissions granted
```

**If issues found:**
```
⚠ Found permission issues:
  - 2 tables with missing permissions
  - 1 sequences with missing permissions

To fix, run the catchall migration:
  psql "$PRIMARY_DATABASE_URL" -f database/migrations-primary/012_ensure_db_permissions.sql
```

### `--repair`
Re-runs schema creation migrations if tracking is out of sync with reality.

**Use when:**
- Schemas are tracked as created but don't actually exist
- Post-migration validation fails
- You suspect tracking table is out of sync

**Example:**
```bash
bash database/migrate-data.sh --repair
```

### `--force`
Skips data protection warnings (reserved for future use).

**Use when:**
- Running destructive migrations intentionally
- You've backed up data and want to proceed

---

## FAQ

**Q: Do I need to run migrations every time I pull code?**  
A: No, only when migrations are added. Check git diff for `database/migrations-*` changes.

**Q: Can I run migrations while the app is running?**  
A: Yes for additive migrations (new tables/columns). No for destructive ones (DROP, ALTER).

**Q: What if migration fails halfway?**  
A: The script exits on first error. Fix the issue, then re-run. Already-applied migrations are skipped.

**Q: How do I know what migrations have been applied?**  
A: `pnpm db:migrate:status:primary` or `pnpm db:migrate:status:data`

**Q: Can I write my own migrations?**  
A: Yes! Use `database/MIGRATION_TEMPLATE.sql` as a template. Number it sequentially.

---

## Support

If you encounter issues:
1. Check this guide's Troubleshooting section
2. Run migrations with validation: `bash database/migrate-data.sh --repair`
3. Check `/docs/DEVELOPER_SETUP.md` for detailed setup instructions
4. Ask in #engineering Slack channel
