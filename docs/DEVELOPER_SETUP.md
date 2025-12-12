# Developer Setup Guide - Database Split Architecture

## Overview

The Handled platform uses a **split database architecture**:

- **PRIMARY DB** (DBaaS): Config (auth, users, roles) + Customer data
- **DATA DB** (VPS Local): Workspace (imports) + Reference (transforms)

This guide will help you set up your local development environment.

---

## Quick Start (Single DB Mode) - Recommended for New Developers

The simplest way to get started. Uses one local PostgreSQL database.

```bash
# 1. Clone and install
git clone <repo-url>
cd handled
pnpm install

# 2. Create single local database
createdb handled_dev

# 3. Configure environment
cd apps/backoffice/api
cp env-template.txt .env

# Edit .env and update:
#  - Replace YOUR_USERNAME with your system username
#  - Set AUTH_SECRET (32+ characters)
# Example:
# SPLIT_DB_MODE=false
# PRIMARY_DATABASE_URL="postgresql://donkey@localhost:5432/handled_dev"
# DATA_DATABASE_URL="postgresql://donkey@localhost:5432/handled_dev"
# AUTH_SECRET="your-local-secret-key-min-32-chars"

# 4. Run migrations (both sets run against same DB)
cd ../../..  # Back to root
export PRIMARY_DATABASE_URL="postgresql://YOUR_USERNAME@localhost:5432/handled_dev"
export DATA_DATABASE_URL="postgresql://YOUR_USERNAME@localhost:5432/handled_dev"
pnpm db:migrate

# 5. Generate Prisma clients
pnpm --filter @handled/api db:generate

# 6. Start development servers
pnpm dev
```

**Access:**
- API: http://localhost:3001
- Web: http://localhost:5173

---

## Advanced Setup (Split DB Mode) - Mirrors Production

Use this when working on customer features or testing production-like environment.

```bash
# 1-2. Same as above (clone, install)

# 3. Create two local databases
createdb handled_primary_dev
createdb handled_data_dev

# 4. Configure environment for split mode
cd apps/backoffice/api
cp env-template.txt .env

# Edit .env:
# SPLIT_DB_MODE=true
# PRIMARY_DATABASE_URL="postgresql://localhost:5432/handled_primary_dev"
# DATA_DATABASE_URL="postgresql://localhost:5432/handled_data_dev"
# AUTH_SECRET="your-local-secret-key-min-32-chars"

# 5. Run migrations (each set runs against respective DB)
cd ../../..  # Back to root
pnpm db:migrate

# 6. Generate Prisma clients
pnpm --filter @handled/api db:generate

# 7. Start development servers
pnpm dev
```

---

## Daily Development Workflows

### Working on Config/Auth Features

```typescript
// Use PRIMARY DB client
import { prismaPrimary } from '../db/index.js';

// Example: Add new user field
await prismaPrimary.user.update({
  where: { id: 'user-123' },
  data: { newField: 'value' }
});
```

**Creating a migration:**
```bash
# 1. Create migration file
cd database/migrations-primary
cp ../MIGRATION_TEMPLATE.sql 011_add_user_field.sql

# 2. Edit migration file
# Add your SQL changes

# 3. Run PRIMARY migrations only
pnpm db:migrate:primary

# 4. Regenerate PRIMARY Prisma client
pnpm --filter @handled/api db:generate:primary
```

### Working on Data/Transformation Features

```typescript
// Use DATA DB client
import { prismaData } from '../db/index.js';

// Example: Query delivery matrix
const results = await prismaData.deliveryMatrix.findMany({
  where: { originZip: '100' }
});
```

**Creating a migration:**
```bash
# 1. Create migration file
cd database/migrations-data
cp ../MIGRATION_TEMPLATE.sql 005_add_new_carrier.sql

# 2. Edit migration file

# 3. Run DATA migrations only
pnpm db:migrate:data

# 4. Regenerate DATA Prisma client
pnpm --filter @handled/api db:generate:data
```

### Working on Customer Features

```typescript
// Customer schema lives in PRIMARY DB
import { prismaPrimary } from '../db/index.js';

// Create organization
const org = await prismaPrimary.organization.create({
  data: {
    id: generateId(15),
    name: 'ACME 3PL',
    slug: 'acme-3pl'
  }
});

// Create facility
const facility = await prismaPrimary.facility.create({
  data: {
    id: generateId(15),
    organizationId: org.id,
    name: 'NYC Warehouse',
    zip: '10001'
  }
});
```

**Migrations go to PRIMARY:**
```bash
cd database/migrations-primary
cp ../MIGRATION_TEMPLATE.sql 012_add_customer_orders.sql
```

---

## Switching Between Modes

### From Single DB to Split DB

```bash
# 1. Create second database
createdb handled_data_dev

# 2. Update .env
# SPLIT_DB_MODE=true
# DATA_DATABASE_URL="postgresql://localhost:5432/handled_data_dev"

# 3. Run DATA migrations to populate new DB
pnpm db:migrate:data

# 4. Restart dev server
pnpm dev
```

### From Split DB to Single DB

```bash
# 1. Update .env
# SPLIT_DB_MODE=false
# # Comment out or remove DATA_DATABASE_URL

# 2. Both clients will now point to PRIMARY_DATABASE_URL

# 3. Restart dev server
pnpm dev
```

---

## Useful Commands

### Prisma

```bash
# Generate both clients
pnpm --filter @handled/api db:generate

# Generate PRIMARY client only
pnpm --filter @handled/api db:generate:primary

# Generate DATA client only
pnpm --filter @handled/api db:generate:data

# View PRIMARY DB in Prisma Studio
pnpm --filter @handled/api db:studio:primary
# Opens at http://localhost:5555

# View DATA DB in Prisma Studio
pnpm --filter @handled/api db:studio:data
# Opens at http://localhost:5555
```

### Migrations

```bash
# Run all migrations (both PRIMARY and DATA)
pnpm db:migrate

# Run PRIMARY migrations only
pnpm db:migrate:primary

# Run DATA migrations only
pnpm db:migrate:data

# Check migration status (PRIMARY)
pnpm db:migrate:status:primary

# Check migration status (DATA)
pnpm db:migrate:status:data
```

### Testing

```bash
# Unit tests (fast, mocked DB)
pnpm --filter @handled/api test

# Integration tests (requires both DBs running)
pnpm --filter @handled/api test:integration

# E2E tests (full stack)
pnpm test:e2e
```

### Database Management

```bash
# Connect to PRIMARY DB
psql "$PRIMARY_DATABASE_URL"

# Connect to DATA DB
psql "$DATA_DATABASE_URL"

# Check table counts (PRIMARY)
psql "$PRIMARY_DATABASE_URL" -c "
  SELECT 'users', COUNT(*) FROM config.users
  UNION ALL
  SELECT 'organizations', COUNT(*) FROM customer.organizations;
"

# Check table counts (DATA)
psql "$DATA_DATABASE_URL" -c "
  SELECT 'carriers', COUNT(*) FROM reference.carriers
  UNION ALL
  SELECT 'delivery_matrix', COUNT(*) FROM reference.delivery_matrix;
"
```

---

## Common Issues and Solutions

### Issue: Prisma client import errors

**Symptom**: `Cannot find module '@prisma/client-primary'`

**Solution**: Regenerate both clients
```bash
pnpm --filter @handled/api db:generate
```

### Issue: "Schema does not exist" errors

**Symptom**: 
```
ERROR: schema "reference" does not exist
ERROR: schema "workspace" does not exist
```

**Cause**: Migrations tracked but didn't actually run (tracking table out of sync)

**Solution**: Use auto-repair mode
```bash
# Check what schemas exist
psql -d handled_dev -c "\dn"

# Auto-repair (recommended)
bash database/migrate-data.sh --repair

# OR manually create missing schemas
psql -d handled_dev -c "CREATE SCHEMA IF NOT EXISTS workspace; CREATE SCHEMA IF NOT EXISTS reference;"
```

The enhanced migration system detects this automatically and suggests the fix.

### Issue: Migration tracking shows wrong state

**Symptom**: Migrations appear already applied when they're not

**Solution 1 - Auto-Repair (Recommended)**:
```bash
bash database/migrate-primary.sh --repair
bash database/migrate-data.sh --repair
```

**Solution 2 - Manual Check**:
```bash
# Check tracking
psql "$PRIMARY_DATABASE_URL" -c "SELECT version, description FROM config.schema_migrations ORDER BY version;"

# Check actual schemas
psql "$PRIMARY_DATABASE_URL" -c "\dn"
```

### Issue: "Table does not exist" errors

**Symptom**: Runtime error when querying a table

**Solution**: Check you're using the right client
- Config/customer tables → `prismaPrimary`
- Workspace/reference tables → `prismaData`

### Issue: Connection pool exhausted

**Symptom**: "Too many clients already" error

**Solution**: 
1. Check for unclosed connections (all Prisma operations should await)
2. Add connection pooling to DATABASE_URL:
   ```
   ?pgbouncer=true&connection_limit=10
   ```

### Issue: Can't authenticate after code changes

**Symptom**: Login fails or session errors

**Solution**: Clear session cache and regenerate Prisma clients
```bash
# Restart dev server (clears cache)
pnpm dev

# Or regenerate clients
pnpm --filter @handled/api db:generate
```

---

## Resetting Local Development

If things get messed up, start fresh:

```bash
# Drop databases
dropdb handled_primary_dev || true
dropdb handled_data_dev || true

# Recreate
createdb handled_primary_dev
createdb handled_data_dev

# Remigrate
pnpm db:migrate

# Regenerate clients
pnpm --filter @handled/api db:generate

# Restart
pnpm dev
```

---

## Which Prisma Client Should I Use?

### Decision Tree

```
Is it customer data (orders, shipments, inventory)?
├─ YES → prismaPrimary (customer schema)
└─ NO → Is it auth/config (users, roles, permissions)?
    ├─ YES → prismaPrimary (config schema)
    └─ NO → Is it raw import data?
        ├─ YES → prismaData (workspace schema)
        └─ NO → prismaData (reference schema)
```

### Quick Reference

**prismaPrimary** (PRIMARY DB - DBaaS):
- `user`, `session`, `role`, `permission`, `rolePermission`
- `integrationRun`
- `organization`, `facility`

**prismaData** (DATA DB - VPS):
- `carrier`, `service`
- `zip3Demographics`, `zip3Centroid`, `deliveryMatrix`
- Workspace tables (via raw queries)

---

## Environment Variables

### Development

```bash
# Single DB mode (simplest)
SPLIT_DB_MODE=false
PRIMARY_DATABASE_URL="postgresql://localhost:5432/handled_dev"
AUTH_SECRET="local-secret-at-least-32-characters"
NODE_ENV=development
PORT=3001
HOST=0.0.0.0

# Split DB mode (mirrors production)
SPLIT_DB_MODE=true
PRIMARY_DATABASE_URL="postgresql://localhost:5432/handled_primary_dev"
DATA_DATABASE_URL="postgresql://localhost:5432/handled_data_dev"
AUTH_SECRET="local-secret-at-least-32-characters"
NODE_ENV=development
PORT=3001
HOST=0.0.0.0
```

### Production

```bash
SPLIT_DB_MODE=true
PRIMARY_DATABASE_URL="postgresql://doadmin:xxx@db-postgresql-nyc3-xxx.ondigitalocean.com:25060/handled_primary?sslmode=require&pgbouncer=true&connection_limit=15"
DATA_DATABASE_URL="postgresql://handled_user:xxx@localhost:5432/handled_data"
AUTH_SECRET="production-secret-key-must-be-unique-and-secure"
NODE_ENV=production
PORT=3001
HOST=0.0.0.0
```

---

## Tips for Success

1. **Start with single-DB mode** if you're new to the codebase
2. **Use split-DB mode** when working on customer features
3. **Always regenerate Prisma clients** after schema changes
4. **Test in both modes** before pushing to staging
5. **Keep migrations idempotent** (safe to run multiple times)
6. **Use session caching** in auth-heavy endpoints
7. **Check which DB you're using** if you get unexpected errors

---

## Getting Help

- Review the plan: `docs/database-split-plan.md`
- Check migration README: `database/README.md`
- Ask in #engineering Slack channel
- Pair with a senior developer for first PR

---

**Happy coding! 🚀**
