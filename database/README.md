# Database Migrations

This directory contains all database migrations for the Handled platform.

## Quick Start

```bash
# Run all pending migrations
pnpm db:migrate

# Check which migrations have been applied
pnpm db:migrate:status
```

## Developer Setup (First Time)

### One-Command Setup

```bash
# Run this once per machine (takes ~30 seconds)
bash database/setup-dev-db.sh
```

This creates:
- PostgreSQL user: `handled_user` (superuser, no password)
- Database: `handled_dev`
- Runs all migrations

### Configure Environment

```bash
# Copy template (already configured for handled_user)
cp apps/backoffice/api/env-template.txt apps/backoffice/api/.env

# No changes needed! Template uses handled_user by default
```

### Start Developing

```bash
pnpm install
pnpm dev
```

## Daily Workflow

**Query the database:**
```bash
psql -U handled_user handled_dev

# Or set PGUSER in your shell (~/.zshrc or ~/.bashrc):
export PGUSER=handled_user
# Then just use:
psql handled_dev
```

**Run migrations:**
```bash
pnpm db:migrate  # Uses handled_user automatically
```

**Why handled_user?**
- ✅ Consistent with production (same username)
- ✅ Consistent object ownership
- ✅ Simple onboarding (one user, one way)
- ✅ No password needed for local dev

## Local vs Production Database Users

**Important:** The `handled_user` behaves differently in local vs production:

### Local Development
- `handled_user` is a **superuser** (created with `-s` flag)
- Can create databases, run migrations without restrictions
- No password required (PostgreSQL trust authentication)
- More convenient for development workflow
- Can run `pg_dump`, create test databases, etc.

### Production
- `handled_user` is a **regular user** with specific granted permissions
- Cannot create databases or modify other users
- Requires password authentication
- More secure, reflects real-world constraints
- Relies on explicit GRANT statements from migrations

**Why the difference?**
- Local dev prioritizes convenience (no permission roadblocks)
- Catchall migrations ensure production has correct grants
- You're not testing security boundaries in local dev
- Production security is enforced by the migration system

**What this means:**
- If a migration works locally but fails in production with permission errors, you forgot a GRANT statement
- The catchall migrations (012, 005) fix any missing grants
- New migrations should always include explicit GRANTs (see MIGRATION_TEMPLATE.sql)

## Directory Structure

```
database/
├── README.md              # This file
├── MIGRATION_TEMPLATE.sql # Template for new migrations
├── migrate.sh             # Smart migration runner script
└── migrations/            # All migration files
    ├── 000_migration_tracking.sql
    ├── 001_create_schemas.sql
    ├── 002_auth_tables.sql
    └── ...
```

## Migration Numbering System

- **000-099:** Core schema and infrastructure
- **100-199:** Initial data and seed migrations
- **200-299:** Schema modifications (ALTER TABLE, etc.)
- **300-399:** Data migrations and transformations
- **400+:** Feature additions and extensions

## Creating a New Migration

### Step 1: Copy the Template

```bash
# Find the next available number
ls -1 database/migrations/ | tail -1

# Copy template with next number
cp database/MIGRATION_TEMPLATE.sql database/migrations/007_add_feature_name.sql
```

### Step 2: Edit the Migration

1. Update the header with migration number, description, and date
2. Write your SQL changes
3. **Make it idempotent** - use `IF NOT EXISTS`, `IF EXISTS`, etc.
4. Add comments explaining the "why"
5. Document rollback steps in comments

### Step 3: Test Locally

```bash
# Run the migration
pnpm db:migrate

# Verify it worked
pnpm db:migrate:status

# Check the database
psql -U handled_user -d handled
```

### Step 4: Update Prisma (if needed)

```bash
# Update the Prisma schema file
vim apps/backoffice/api/prisma/schema.prisma

# Regenerate Prisma client
cd apps/backoffice/api
pnpm db:generate
```

### Step 5: Commit

```bash
git add database/migrations/007_*.sql
git add apps/backoffice/api/prisma/schema.prisma  # if changed
git commit -m "feat: add feature_name migration"
```

## Migration Best Practices

### ✅ DO

- **Use sequential numbering** - No gaps, no duplicates
- **Make migrations idempotent** - Safe to run multiple times
- **One logical change per migration** - Easy to understand and rollback
- **Add descriptive comments** - Explain why, not just what
- **Test on fresh database** - Catch issues early
- **Include rollback notes** - Document how to undo changes
- **Use explicit schema names** - `config.users`, not just `users`

### ❌ DON'T

- **Never edit applied migrations** - Create a new migration instead
- **Don't skip version numbers** - Keep sequence intact
- **Don't mix concerns** - Schema + data changes = separate migrations
- **Don't assume state** - Check for existence before creating/dropping
- **Don't forget indexes** - Performance matters
- **Don't ignore foreign keys** - Maintain referential integrity

## Common Patterns

### Adding a Column

```sql
ALTER TABLE config.users 
    ADD COLUMN IF NOT EXISTS phone VARCHAR(20);

CREATE INDEX IF NOT EXISTS idx_users_phone 
    ON config.users(phone);

COMMENT ON COLUMN config.users.phone IS 'User contact phone number';
```

### Creating a Table

```sql
CREATE TABLE IF NOT EXISTS config.customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_customers_email 
    ON config.customers(email);

COMMENT ON TABLE config.customers IS 'Customer accounts and profiles';
```

### Adding a Foreign Key

```sql
-- Add column first
ALTER TABLE config.orders 
    ADD COLUMN IF NOT EXISTS customer_id TEXT;

-- Then add constraint
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_orders_customer_id'
    ) THEN
        ALTER TABLE config.orders 
            ADD CONSTRAINT fk_orders_customer_id 
            FOREIGN KEY (customer_id) 
            REFERENCES config.customers(id) 
            ON DELETE CASCADE;
    END IF;
END $$;
```

### Renaming a Column (Carefully!)

```sql
-- Step 1: Add new column
ALTER TABLE config.users 
    ADD COLUMN IF NOT EXISTS full_name TEXT;

-- Step 2: Copy data
UPDATE config.users 
    SET full_name = name 
    WHERE full_name IS NULL;

-- Step 3: In a LATER migration, drop old column
-- ALTER TABLE config.users DROP COLUMN IF EXISTS name;
```

## Migration Script Features

The `migrate.sh` script provides:

- ✅ Automatic tracking of applied migrations
- ✅ Smart detection of pending migrations
- ✅ Colored output for easy reading
- ✅ Execution time tracking
- ✅ Error handling with rollback
- ✅ Idempotent - safe to run multiple times

## Troubleshooting

### Migration Failed Mid-Execution

```bash
# Check what was applied
pnpm db:migrate:status

# Fix the issue in the migration file
vim database/migrations/XXX_problematic.sql

# Delete the tracking entry
psql -U handled_user -d handled -c "DELETE FROM config.schema_migrations WHERE version = 'XXX';"

# Run again
pnpm db:migrate
```

### Need to Rollback a Migration

```bash
# Manually undo the changes (use rollback notes from migration file)
psql -U handled_user -d handled -f rollback_script.sql

# Remove from tracking
psql -U handled_user -d handled -c "DELETE FROM config.schema_migrations WHERE version = 'XXX';"
```

### Migration Out of Order

Never edit applied migrations. Instead:

1. Create a new migration that fixes the issue
2. Number it with the next available version
3. Run it normally

## Environment Variables

The migration script supports these environment variables:

```bash
# Database configuration
export DB_USER=handled_user     # Default: handled_user
export DB_NAME=handled           # Default: handled
export DB_HOST=localhost         # Default: localhost
export DB_PORT=5432              # Default: 5432

# Run migrations
pnpm db:migrate
```

## Production Deployment

For production deployments:

1. **Always backup first**: `pg_dump handled > backup.sql`
2. **Test migrations on staging** identical to production
3. **Run during maintenance window** if schema changes are breaking
4. **Monitor execution**: Migrations should complete in < 30 seconds
5. **Have rollback ready**: Know how to undo changes
6. **Coordinate with application deployment**: Deploy app after migrations

## Getting Help

- Check the template: `database/MIGRATION_TEMPLATE.sql`
- Review existing migrations for patterns
- Test on fresh database: `dropdb handled && createdb handled && pnpm db:migrate`
- Ask the team in #engineering

---

**Remember:** Migrations are permanent records. Take your time, test thoroughly, and document well!

