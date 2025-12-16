# Migration Script Usage Guide

## Overview

All migration scripts now **require an explicit environment argument** for safety and clarity.

---

## run-migrations-dev.sh

**Includes dev seed data** (`*_dev.sql` files with sample data)

### Usage:

```bash
# Local development database (handled_dev)
bash database/run-migrations-dev.sh -dev

# Local test database (handled_test)
bash database/run-migrations-dev.sh -test

# Production - NOT ALLOWED (use run-migrations-prod.sh instead)
```

### What it runs:
- ✅ All baseline migrations (`*_YYYY-MM-DD.sql`)
- ✅ All dev seed data files (`*_dev.sql`)

### Environment variables used:
- `-dev`: Uses `PRIMARY_DATABASE_URL` and `DATA_DATABASE_URL` from `.env`
- `-test`: Uses `TEST_DATABASE_URL` from `.env`

---

## run-migrations-prod.sh

**Production safe** (baseline files only, no dev seed data)

### Usage:

```bash
# Production database
bash database/run-migrations-prod.sh -prod

# Local development (baseline only, no sample data)
bash database/run-migrations-prod.sh -dev

# Local test (baseline only, no sample data)
bash database/run-migrations-prod.sh -test
```

### What it runs:
- ✅ Only dated baseline migrations (`*_YYYY-MM-DD.sql`)
- ❌ Skips dev seed data files (`*_dev.sql`)

### Environment variables used:
- `-prod`: Uses `PRIMARY_DATABASE_URL` and `DATA_DATABASE_URL` from `.env`
- `-dev`: Uses `PRIMARY_DATABASE_URL` and `DATA_DATABASE_URL` from `.env`
- `-test`: Uses `TEST_DATABASE_URL` from `.env`

---

## Safety Features

### Required Arguments
Both scripts will **reject** execution if no argument is provided:

```bash
$ bash database/run-migrations-dev.sh

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ERROR: Target environment required
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
...
```

### Production Protection
Using `-prod` with `run-migrations-dev.sh` is **not allowed**:

```bash
$ bash database/run-migrations-dev.sh -prod

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
❌ ERROR: Production not allowed with this script
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

For production migrations, use:
  bash database/run-migrations-prod.sh -prod
```

---

## Environment Setup

### Required .env variables:

```bash
# Development database
PRIMARY_DATABASE_URL="postgresql://donkey@localhost:5432/handled_dev"

# Test database
TEST_DATABASE_URL="postgresql://donkey@localhost:5432/handled_test"

# Production (if applicable)
# PRIMARY_DATABASE_URL="postgresql://..."
# DATA_DATABASE_URL="postgresql://..."  # For split-DB mode
```

---

## Common Workflows

### Setting up a fresh development database:
```bash
bash database/run-migrations-dev.sh -dev
```
Result: All schemas, all tables, sample data loaded

### Setting up a fresh test database:
```bash
bash database/run-migrations-dev.sh -test
```
Result: All schemas, all tables, sample data loaded

### Running baseline-only migrations (no sample data):
```bash
bash database/run-migrations-prod.sh -dev
```
Result: All schemas, all tables, NO sample data

### Production deployment:
```bash
bash database/run-migrations-prod.sh -prod
```
Result: Only dated baseline migrations, NO dev seed data

---

## Migration Tracking

All migrations are tracked in `config.schema_migrations` table:

```sql
SELECT version, schema_name, description, applied_at 
FROM config.schema_migrations 
ORDER BY schema_name, version;
```

The tracking table lives in the PRIMARY database, even in split-DB mode.

---

## Schema Processing Order

Migrations run in this order:
1. `config` - Auth, users, roles, permissions
2. `company` - Warehouses (YOUR assets)
3. `customer` - Organizations, facilities, contacts, contracts
4. `workspace` - Import staging tables
5. `reference` - Transformed reference data

This order ensures dependencies are satisfied (e.g., `customer.facilities` depends on `company.warehouses`).
