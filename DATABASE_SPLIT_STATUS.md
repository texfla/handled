# Database Split Implementation - Status Tracker

**Last Updated**: December 11, 2024  
**Current Phase**: Phase 1 Complete ✅ | Phase 2 Pending ⏳

---

## 📊 Phase Overview

| Phase | Status | Description |
|-------|--------|-------------|
| **Phase 1** | ✅ **COMPLETE** | Local development with dual Prisma clients |
| **Phase 2** | ⏳ **PENDING** | Provision Digital Ocean DBaaS |
| **Phase 3** | ⏳ **PENDING** | Production deployment with split databases |

---

## Phase 1: Local Development Implementation ✅

**Status**: COMPLETE  
**Environment**: Single database (`handled_dev`) with all schemas  
**Mode**: `SPLIT_DB_MODE=false`

### Completed Tasks

- [x] **Dual Prisma Client Architecture**
  - Created `@prisma/client-primary` for config + customer schemas
  - Created `@prisma/client-data` for workspace + reference schemas
  - Implemented lazy initialization with environment variable support
  - Added backward compatibility with deprecated `prisma` export

- [x] **Split Migration System**
  - Separated migrations into `migrations-primary/` and `migrations-data/`
  - Created `migrate-primary.sh` and `migrate-data.sh` scripts
  - Implemented enhanced validation with pre-flight checks
  - Added auto-repair mode (`--repair`) for schema mismatches
  - Created comprehensive `MIGRATION_GUIDE.md` documentation

- [x] **Session Caching**
  - Implemented in-memory session cache (`sessionCache`)
  - 30-second TTL to reduce PRIMARY DB load
  - Automatic cleanup interval for expired entries
  - Reduces auth queries from ~100/min to ~10/min for active users

- [x] **Security Enhancements**
  - Fixed session invalidation on password reset
  - Fixed session invalidation on user disable
  - Fixed session invalidation on user delete
  - Cache properly cleared alongside database deletions

- [x] **Query Logging Configuration**
  - Made Prisma query logging optional via `LOG_DB_QUERIES` env var
  - Prevents log flooding during bulk operations (11M+ row transformations)
  - Defaults to error/warn only; enable queries for debugging

- [x] **Testing & Validation**
  - Integration tests created (`tests/db-split.test.ts`)
  - Session cache cleanup added to test teardown
  - Prisma schema CASCADE constraint matches SQL migrations
  - Local development fully tested and operational

- [x] **Developer Experience**
  - Updated `env-template.txt` with clear local setup instructions
  - Enhanced `README.md` with local development quickstart
  - Created `DEVELOPER_SETUP.md` with troubleshooting guide
  - All documentation references system username requirement

- [x] **Test Single-DB Mode**
  - Application tested with `SPLIT_DB_MODE=false`
  - Both `PRIMARY_DATABASE_URL` and `DATA_DATABASE_URL` pointing to same DB
  - All schemas (config, customer, workspace, reference) working correctly
  - Transformations, imports, and exports functioning properly

### Key Files Modified

**Backend:**
- `apps/backoffice/api/src/db/index.ts` - Dual Prisma clients
- `apps/backoffice/api/src/db/session-cache.ts` - Session caching
- `apps/backoffice/api/src/env.ts` - Environment variable loading
- `apps/backoffice/api/src/routes/admin.ts` - Session invalidation fixes
- `apps/backoffice/api/src/services/import.ts` - Uses prismaData
- `apps/backoffice/api/src/services/transform.ts` - Uses prismaData

**Migrations:**
- `database/migrations-primary/` - Config + customer schemas
- `database/migrations-data/` - Workspace + reference schemas
- `database/migrate-primary.sh` - PRIMARY DB migrations
- `database/migrate-data.sh` - DATA DB migrations
- `database/migrate-all.sh` - Run both migration sets

**Documentation:**
- `database/MIGRATION_GUIDE.md` - Migration system documentation
- `docs/DEVELOPER_SETUP.md` - Developer onboarding guide
- `docs/DEPLOYMENT_CHECKLIST.md` - Production deployment steps
- `README.md` - Quick start instructions

---

## Phase 2: DBaaS Provisioning ⏳

**Status**: PENDING  
**Action Required**: Manual provisioning of Digital Ocean DBaaS

### Tasks

- [ ] **Provision Digital Ocean Managed PostgreSQL**
  - Select appropriate plan (see `docs/DEPLOYMENT_CHECKLIST.md`)
  - Configure connection pooling (PgBouncer)
  - Set up SSL/TLS certificates
  - Create `handled_primary` database
  - Create `handled_user` database user with appropriate permissions

- [ ] **Update Production Environment Variables**
  - Set `SPLIT_DB_MODE=true`
  - Configure `PRIMARY_DATABASE_URL` with DBaaS connection string
  - Configure `DATA_DATABASE_URL` with VPS local PostgreSQL
  - Update connection pool parameters

- [ ] **Run PRIMARY Migrations on DBaaS**
  - Export environment variables for DBaaS
  - Run `bash database/migrate-primary.sh`
  - Verify config and customer schemas created
  - Test connectivity from VPS application server

- [ ] **Data Migration (if needed)**
  - Export existing config schema data from VPS
  - Import into DBaaS PRIMARY database
  - Verify user accounts, roles, permissions transferred
  - Test authentication against DBaaS

### Documentation Reference

See `docs/DEPLOYMENT_CHECKLIST.md` for detailed Phase 2 steps.

---

## Phase 3: Production Deployment ⏳

**Status**: PENDING (Depends on Phase 2 completion)

### Tasks

- [ ] **Configure VPS for Split Mode**
  - Update `.env` with production DATABASE URLs
  - Set `SPLIT_DB_MODE=true`
  - Restart application services

- [ ] **Deploy Application Updates**
  - Build production assets: `pnpm build`
  - Deploy API and web applications
  - Update nginx configuration if needed
  - Restart systemd services

- [ ] **Verify Split Database Operations**
  - Test authentication (PRIMARY DB: config.users, config.sessions)
  - Test imports (DATA DB: workspace schema)
  - Test transformations (DATA DB: workspace → reference)
  - Test exports (DATA DB: reference schema)

- [ ] **Monitoring & Validation**
  - Monitor DBaaS connection count and performance
  - Verify session caching reduces PRIMARY DB load
  - Check application logs for errors
  - Run end-to-end integration tests

- [ ] **Backup Strategy**
  - Verify Digital Ocean automated backups configured
  - Document VPS local PostgreSQL backup procedures
  - Test backup restoration process

### Documentation Reference

See `docs/DEPLOYMENT_CHECKLIST.md` and `docs/OPS_RUNBOOK.md` for Phase 3 procedures.

---

## Environment Configurations

### Local Development (Current)

```env
SPLIT_DB_MODE=false
PRIMARY_DATABASE_URL="postgresql://YOUR_USERNAME@localhost:5432/handled_dev"
DATA_DATABASE_URL="postgresql://YOUR_USERNAME@localhost:5432/handled_dev"
```

**Schema Distribution**: All schemas (config, customer, workspace, reference) in single database

### Production (Target)

```env
SPLIT_DB_MODE=true

# PRIMARY DATABASE (Digital Ocean DBaaS)
PRIMARY_DATABASE_URL="postgresql://handled_user:PASSWORD@db-postgresql-nyc3-xxxxx.ondigitalocean.com:25060/handled_primary?sslmode=require&pgbouncer=true&connection_limit=15"

# DATA DATABASE (VPS Local PostgreSQL)
DATA_DATABASE_URL="postgresql://handled_user:PASSWORD@localhost:5432/handled_data"
```

**Schema Distribution**:
- **PRIMARY DB (DBaaS)**: `config`, `customer` (high-value, irreplaceable data)
- **DATA DB (VPS Local)**: `workspace`, `reference` (rebuildable data)

---

## Quick Commands

### Local Development

```bash
# Generate Prisma clients
pnpm --filter @handled/api db:generate

# Run migrations (both PRIMARY and DATA)
pnpm db:migrate

# Check migration status
pnpm db:migrate:status:primary
pnpm db:migrate:status:data

# Start development servers
pnpm dev
```

### Production Deployment (Phase 2/3)

```bash
# Export environment variables
export PRIMARY_DATABASE_URL="<dbaas-connection-string>"
export DATA_DATABASE_URL="postgresql://handled_user:PASSWORD@localhost:5432/handled_data"
export SPLIT_DB_MODE=true

# Run migrations
bash database/migrate-primary.sh  # Run on DBaaS
bash database/migrate-data.sh     # Run on VPS local

# Build and deploy
pnpm build
# ... deploy steps ...
```

---

## Notes

- **Phase 1** focused on implementing the dual-database architecture in local development without requiring actual database infrastructure changes
- **Query Logging**: Disabled by default to prevent log flooding during large transformations (11M+ rows). Enable with `LOG_DB_QUERIES=true` for debugging
- **Session Caching**: Automatically reduces PRIMARY DB load by caching session validation for 30 seconds
- **Migration Auto-Repair**: Use `--repair` flag if schema tracking gets out of sync with actual database state

---

## Related Documentation

- [Database Migration Guide](database/MIGRATION_GUIDE.md)
- [Developer Setup Guide](docs/DEVELOPER_SETUP.md)
- [Deployment Checklist](docs/DEPLOYMENT_CHECKLIST.md)
- [Operations Runbook](docs/OPS_RUNBOOK.md)
- [README - Quick Start](README.md)
