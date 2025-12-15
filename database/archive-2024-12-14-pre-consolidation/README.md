# Archive: Pre-Consolidation Migration Files

**Date Archived:** 2024-12-14

This folder contains the original migration system before the three-concerns pattern consolidation.

## What's Archived

### Migration Files
- `migrations-primary/` - 12 PRIMARY DB migrations (000-014)
- `migrations-data/` - 5 DATA DB migrations (000-005)

### Migration Runners (replaced)
- `migrate-primary.sh` - Old PRIMARY DB migration runner
- `migrate-data.sh` - Old DATA DB migration runner
- `migrate-all.sh` - Old combined migration runner

### One-Time/Utility Scripts (no longer needed)
- `migrate-production-data.sh` - One-time script for DB split (already executed)
- `setup-dev-db.sh` - Old dev setup (replaced by `run-migrations-dev.sh`)
- `MIGRATION_TEMPLATE.sql` - Old migration template (replaced by new naming scheme)

## Why Archived

These files were replaced with a new schema-folder-based system using the three-concerns pattern:
- Structure (DDL)
- Permissions (DCL)
- Seed Data (DML)

## New System Location

See `database/README.md` for the new migration system documentation.

New structure:
```
database/
  config/
  customer/
  workspace/
  reference/
  run-migrations-prod.sh
  run-migrations-dev.sh
```

## Restoration (if needed)

If you need to restore the old system temporarily:

```bash
cp archive-2024-12-14-pre-consolidation/migrate-*.sh database/
bash database/migrate-primary.sh
```

## Production Status

All migrations in this archive were successfully applied to production before archival.
