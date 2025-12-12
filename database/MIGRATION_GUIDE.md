# Database Migration Guide

## Overview

Our migration system supports both **split-database** (production) and **single-database** (local dev) modes with built-in validation and data protection.

---

## Quick Start

### Local Development (First Time Setup)

```bash
# 1. Create database
createdb handled_dev

# 2. Set environment variables
export PRIMARY_DATABASE_URL="postgresql://YOUR_USERNAME@localhost:5432/handled_dev"
export DATA_DATABASE_URL="postgresql://YOUR_USERNAME@localhost:5432/handled_dev"

# 3. Run all migrations
pnpm db:migrate
# OR
bash database/migrate-all.sh
```

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
createdb handled_dev
export PRIMARY_DATABASE_URL="postgresql://YOUR_USERNAME@localhost:5432/handled_dev"
export DATA_DATABASE_URL="postgresql://YOUR_USERNAME@localhost:5432/handled_dev"
bash database/migrate-all.sh
```

---

### Problem: Permission Denied

**Symptoms:**
```
ERROR: permission denied for database handled_dev
```

**Cause:** Connection string missing username

**Fix:** Add your username to connection strings in `.env`:
```env
PRIMARY_DATABASE_URL="postgresql://donkey@localhost:5432/handled_dev"
DATA_DATABASE_URL="postgresql://donkey@localhost:5432/handled_dev"
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

1. **Always set both URLs** (even in single-DB mode):
   ```bash
   export PRIMARY_DATABASE_URL="postgresql://YOUR_USERNAME@localhost:5432/handled_dev"
   export DATA_DATABASE_URL="postgresql://YOUR_USERNAME@localhost:5432/handled_dev"
   ```

2. **Use migrate-all.sh** instead of individual scripts

3. **Check schema status** if something seems off:
   ```bash
   psql -d handled_dev -c "\dn"
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
PRIMARY_DATABASE_URL="postgresql://YOUR_USERNAME@localhost:5432/handled_dev"
DATA_DATABASE_URL="postgresql://YOUR_USERNAME@localhost:5432/handled_dev"
```

### Split-DB Mode (Production)
```env
SPLIT_DB_MODE=true
PRIMARY_DATABASE_URL="postgresql://handled_user:PASSWORD@dbaas-host:25060/handled_primary?sslmode=require&pgbouncer=true"
DATA_DATABASE_URL="postgresql://handled_user:PASSWORD@localhost:5432/handled_data"
```

---

## Migration Script Flags

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
