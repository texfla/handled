# Database Migrations - Three-Concerns Pattern

**Baseline established:** 2024-12-14

This directory contains the consolidated database migration system using the **three-concerns pattern** with schema-based folders.

## Table of Contents

1. [The Three-Concerns Pattern](#the-three-concerns-pattern)
2. [Schema Folder Organization](#schema-folder-organization)
3. [Running Migrations](#running-migrations)
4. [Baseline Markers](#baseline-markers)
5. [Adding New Migrations](#adding-new-migrations)
6. [Seed Data Strategy](#seed-data-strategy)
7. [Future Consolidations](#future-consolidations)
8. [Migration Path for Existing Databases](#migration-path-for-existing-databases)

---

## The Three-Concerns Pattern

Every schema has three distinct parts:

### 1. STRUCTURE (DDL - Schema Definition)
```sql
-- CREATE TABLE, ALTER TABLE, CREATE INDEX, CREATE FUNCTION
-- Defines WHAT exists
```
- **Safe everywhere:** Dev, Staging, Production
- **Idempotent:** Uses `IF NOT EXISTS`, can re-run safely
- **Files:** `*_structure_*.sql`

### 2. PERMISSIONS (DCL - Access Control)
```sql
-- GRANT USAGE, GRANT ALL, ALTER DEFAULT PRIVILEGES
-- Defines WHO can access
```
- **Safe everywhere:** Dev, Staging, Production
- **Idempotent:** GRANT is safe to re-run
- **Essential:** Without this, app can't access tables
- **Files:** `*_permissions_*.sql`

### 3. SEED DATA (DML - Reference/Initial Data)
```sql
-- INSERT reference data (roles, permissions, carriers)
-- Defines INITIAL STATE
```
- **Production:** Only foundational data (roles, carriers)
- **Development:** Includes sample data for testing
- **Idempotent:** Uses `ON CONFLICT DO NOTHING` or `ON CONFLICT DO UPDATE`
- **Files:** `*_seed_data_*.sql` or `*_seed_data_dev.sql`

---

## Schema Folder Organization

```
database/
  schemas/
    config/            # User auth, roles, permissions
    customer/          # Customer organizations, facilities
    workspace/         # Import staging tables (disposable)
    reference/         # Carriers, services, delivery_matrix
  sample-data/         # Large CSV files for dev
  archive-2024-12-14-pre-consolidation/  # Old migrations
  run-migrations-prod.sh
  run-migrations-dev.sh
```

### Config Schema (PRIMARY DB)
- **Purpose:** User authentication, roles, permissions, integration tracking
- **Database:** PRIMARY_DATABASE_URL (DBaaS in production)
- **Critical:** Yes - contains user accounts and access control

### Customer Schema (PRIMARY DB)
- **Purpose:** Customer organizations and facilities
- **Database:** PRIMARY_DATABASE_URL (DBaaS in production)
- **Critical:** Yes - customer production data (IRREPLACEABLE)

### Workspace Schema (DATA DB or PRIMARY in single mode)
- **Purpose:** Raw imported data staging (us_zips, ups_zones, etc.)
- **Database:** DATA_DATABASE_URL in split mode, PRIMARY in single mode
- **Critical:** No - disposable, can be recreated from source files

### Reference Schema (DATA DB or PRIMARY in single mode)
- **Purpose:** Transformed data (carriers, services, delivery_matrix)
- **Database:** DATA_DATABASE_URL in split mode, PRIMARY in single mode
- **Critical:** Partially - carriers/services are foundational, matrix can be regenerated

---

## Running Migrations

### Development (Single DB, includes dev seed data)

```bash
bash database/run-migrations-dev.sh
```

**What it does:**
- Runs all `.sql` files in each schema folder
- Includes dev-only seed data (`*_dev.sql` files)
- Warns if `NODE_ENV=production`
- Populates sample customer organizations

### Production (Split DB, baseline only)

```bash
bash database/run-migrations-prod.sh
```

**What it does:**
- ONLY runs dated baseline files (`*_YYYY-MM-DD.sql`)
- CANNOT run dev seed data (code doesn't look for `_dev.sql`)
- Fails if `NODE_ENV=development` or `NODE_ENV=test`
- Production-safe by design

### Import Large Data (Development)

```bash
# After running migrations, import CSV files
bash database/setup-dev-data.sh
```

This imports ~40K+ rows of data via the API:
- `us_zips.csv` (~40K rows)
- `gaz_zcta_national.csv` (~33K rows)
- `ups_zones.csv` (~1K rows)

---

## Baseline Markers

### Dated Files (Major Consolidations)
```
001_structure_2024-12-14.sql
```
- Marks a **major consolidation milestone**
- Combines multiple incremental migrations
- Date shows when consolidation occurred

### Undated Files (Incremental Changes)
```
015_add_user_avatar_column.sql
```
- Small, incremental schema changes
- Can be **rolled up** into next baseline
- Easier to review and audit

### Example Evolution
```
Initial:
  001_structure_2024-12-14.sql    (baseline)
  002_permissions_2024-12-14.sql  (baseline)
  003_seed_data_2024-12-14.sql    (baseline)

After 20 incremental changes:
  001_structure_2024-12-14.sql    (baseline)
  002_permissions_2024-12-14.sql  (baseline)
  003_seed_data_2024-12-14.sql    (baseline)
  015_add_column_a.sql            (incremental)
  016_add_column_b.sql            (incremental)
  ...
  035_add_column_z.sql            (incremental)

Future consolidation:
  001_structure_2025-06-01.sql    (new baseline, includes 015-035)
  002_permissions_2025-06-01.sql
  003_seed_data_2025-06-01.sql
  (015-035 deleted, now part of baseline)
```

---

## Adding New Migrations

### Example: Add a column to `config.users`

1. **Find next available number:**
   ```bash
   ls database/schemas/config/  # Shows 001, 002, 003
   ```

2. **Create migration file:**
   ```bash
   touch database/schemas/config/015_add_user_avatar_column.sql
   ```

3. **Write migration (idempotent):**
   ```sql
   -- Migration 015: Add avatar column to users
   ALTER TABLE config.users 
     ADD COLUMN IF NOT EXISTS avatar TEXT;
   
   COMMENT ON COLUMN config.users.avatar 
     IS 'URL to user avatar image';
   ```

4. **Run it:**
   ```bash
   # Development
   bash database/run-migrations-dev.sh
   
   # Production
   bash database/run-migrations-prod.sh
   ```

### Example: Add dev-only seed data

Create `database/schemas/customer/004_seed_data_dev.sql`:
```sql
-- Development only - more sample customers
INSERT INTO customer.organizations (id, name, slug) VALUES
  ('org_sample_test', 'Test Organization', 'test-org')
ON CONFLICT (id) DO NOTHING;
```

**Important:** Dev files (`*_dev.sql`) are NEVER run by `run-migrations-prod.sh`.

---

## Seed Data Strategy

| Schema | Seed Data Type | File Pattern | Size | Runs Where |
|--------|----------------|--------------|------|------------|
| config | Required roles/permissions | `*_2024-12-14.sql` | ~100 rows | Prod + Dev |
| customer | Dev sample orgs | `*_dev.sql` | ~10 rows | Dev only |
| workspace | None | Use CSV import | 40K+ rows | Via API |
| reference | Carriers/services | `*_2024-12-14.sql` | ~18 rows | Prod + Dev |

### Small Data → SQL Seed Files
- Foundational data app needs to function
- Roles, permissions, carriers, services
- ~100 rows or less

### Large Data → CSV Import
- Workspace data (us_zips, ups_zones)
- Use `setup-dev-data.sh` or web UI
- 40K+ rows

### Transformed Data → App Logic
- reference.zip3_reference
- reference.delivery_matrix
- Created by running transformations in the app

---

## Future Consolidations

### When to Consolidate

Consolidate when you have:
- 15-20+ incremental migrations cluttering a schema folder
- Major version upgrade
- Onboarding new developers (clean slate is easier to understand)

### How to Consolidate

1. **Combine incremental migrations into new baseline:**
   ```bash
   # Merge 015-035 into new structure baseline
   cat schemas/config/001_structure_2024-12-14.sql \
       schemas/config/015_add_column_a.sql \
       schemas/config/016_add_column_b.sql \
       ... \
       > schemas/config/001_structure_2025-06-01.sql
   ```

2. **Archive old baseline:**
   ```bash
   mkdir database/archive-2025-06-01/
   mv schemas/config/001_structure_2024-12-14.sql database/archive-2025-06-01/
   ```

3. **Delete consolidated incrementals:**
   ```bash
   rm schemas/config/015_*.sql schemas/config/016_*.sql ... schemas/config/035_*.sql
   ```

4. **Test on fresh database:**
   ```bash
   createdb test_consolidated
   PRIMARY_DATABASE_URL="postgresql://localhost/test_consolidated" \
     bash database/run-migrations-dev.sh
   ```

---

## Migration Path for Existing Databases

### For Production (Already Running)

Production already has all baseline migrations applied (as separate old migrations). To transition to the new system:

```bash
# 1. Update tracking table (adds schema_name column, backfills legacy entries)
psql "$PRIMARY_DATABASE_URL" <<SQL
-- Add schema_name column
ALTER TABLE config.schema_migrations 
  ADD COLUMN IF NOT EXISTS schema_name VARCHAR(50);

-- Backfill existing entries to 'legacy'
UPDATE config.schema_migrations 
SET schema_name = 'legacy' 
WHERE schema_name IS NULL;

-- Make NOT NULL
ALTER TABLE config.schema_migrations 
  ALTER COLUMN schema_name SET NOT NULL;

-- Add composite primary key
ALTER TABLE config.schema_migrations 
  DROP CONSTRAINT IF EXISTS schema_migrations_pkey;
  
ALTER TABLE config.schema_migrations 
  ADD PRIMARY KEY (version, schema_name);
SQL

# 2. Mark baseline migrations as applied (prevent re-running)
psql "$PRIMARY_DATABASE_URL" <<SQL
INSERT INTO config.schema_migrations (version, schema_name, description, applied_by, applied_at)
VALUES 
  ('001', 'config', 'structure 2024-12-14', 'baseline_marker', NOW()),
  ('002', 'config', 'permissions 2024-12-14', 'baseline_marker', NOW()),
  ('003', 'config', 'seed data 2024-12-14', 'baseline_marker', NOW()),
  ('001', 'customer', 'structure 2024-12-14', 'baseline_marker', NOW()),
  ('002', 'customer', 'permissions 2024-12-14', 'baseline_marker', NOW()),
  ('001', 'workspace', 'structure 2024-12-14', 'baseline_marker', NOW()),
  ('002', 'workspace', 'permissions 2024-12-14', 'baseline_marker', NOW()),
  ('001', 'reference', 'structure 2024-12-14', 'baseline_marker', NOW()),
  ('002', 'reference', 'permissions 2024-12-14', 'baseline_marker', NOW()),
  ('003', 'reference', 'seed data 2024-12-14', 'baseline_marker', NOW())
ON CONFLICT DO NOTHING;
SQL

# 3. Run any new migrations
bash database/run-migrations-prod.sh
```

### For Development (handled_dev, handled_test)

Since seed data is idempotent, you can safely clear and re-run:

```bash
# 1. Update tracking table
psql "$PRIMARY_DATABASE_URL" <<SQL
ALTER TABLE config.schema_migrations 
  ADD COLUMN IF NOT EXISTS schema_name VARCHAR(50);
  
UPDATE config.schema_migrations 
SET schema_name = 'legacy' 
WHERE schema_name IS NULL;
  
ALTER TABLE config.schema_migrations 
  ALTER COLUMN schema_name SET NOT NULL;
  
ALTER TABLE config.schema_migrations 
  DROP CONSTRAINT IF EXISTS schema_migrations_pkey;
  
ALTER TABLE config.schema_migrations 
  ADD PRIMARY KEY (version, schema_name);
SQL

# 2. Clear old tracking entries
psql "$PRIMARY_DATABASE_URL" <<SQL
DELETE FROM config.schema_migrations WHERE schema_name = 'legacy';
SQL

# 3. Re-run all baseline migrations (idempotent, safe)
bash database/run-migrations-dev.sh
```

**Result:** Clean tracking, same data (roles/permissions/carriers not duplicated due to `ON CONFLICT DO NOTHING`).

---

## Archived Migrations

Old migration files (000-014) are preserved in:
```
database/archive-2024-12-14-pre-consolidation/
```

These can be referenced for:
- Understanding migration history
- Debugging if something went wrong
- Temporary restoration if needed

**Do not delete the archive!** It's your safety net and historical record.

---

## Benefits of This System

1. ✅ **Clear Mental Model:** Structure/Permissions/Data maps to DDL/DCL/DML
2. ✅ **Schema Isolation:** Each schema evolves independently
3. ✅ **Production Safety:** Separate prod/dev scripts, prod literally cannot run dev seed data
4. ✅ **Future Consolidation:** Dated baselines enable periodic cleanup
5. ✅ **Idempotent Operations:** Safe to re-run migrations
6. ✅ **Audit Trail:** Baseline dates show when major consolidations occurred
7. ✅ **Low Risk:** Existing databases migrate cleanly
8. ✅ **Explicit Data Strategy:** Small seed data in SQL, large data via import tools

---

## Questions?

- **How do I add a new table?** Create `###_add_table_name.sql` in the appropriate schema folder
- **Can I modify baseline files?** Yes! That's the recommended approach for structural changes
- **What about dropping a column?** Add an incremental migration with `ALTER TABLE ... DROP COLUMN IF EXISTS`
- **Do I need to recompile after migration?** No - migrations run at the database level
- **How do I rollback?** Manually create a reverse migration or restore from backup

---

**System Status:** ✅ Production-ready with comprehensive testing and documentation
