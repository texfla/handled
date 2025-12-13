# Handled Platform

Internal tools and data management platform for Handled 3PL operations.

> **📊 Implementation Status**: See [DATABASE_SPLIT_STATUS.md](DATABASE_SPLIT_STATUS.md) for full details. **All phases complete!** ✅ Production is live with split database architecture.

## Project Structure

```
handled/
├── database/              # SQL migrations (split by database)
│   ├── migrations-primary/   # Config + customer schemas (DBaaS)
│   ├── migrations-data/      # Workspace + reference schemas (VPS)
│   ├── migrate-primary.sh
│   ├── migrate-data.sh
│   └── migrate-all.sh
├── apps/
│   └── backoffice/        # Internal admin tools
│       ├── api/           # Node.js + Fastify + Prisma backend
│       │   ├── prisma/
│       │   │   ├── schema-primary.prisma
│       │   │   └── schema-data.prisma
│       │   └── src/
│       └── web/           # React + Vite + shadcn/ui frontend
├── docs/
│   ├── DEVELOPER_SETUP.md  # Developer onboarding guide
│   └── OPS_RUNBOOK.md      # Operations guide
└── package.json           # pnpm workspace root
```

## Architecture

### Split Database Design

The platform uses **two separate PostgreSQL databases** for optimal data safety and performance:

```
┌────────────────────────────────┐
│   Fastify API Application      │
│                                │
│   Query Router (src/db/)       │
└────┬─────────────────────┬─────┘
     │                     │
     │                     │
     ▼                     ▼
┌─────────────────┐   ┌──────────────────┐
│  PRIMARY DB     │   │   DATA DB        │
│  (DBaaS)        │   │   (VPS Local)    │
├─────────────────┤   ├──────────────────┤
│ ● config        │   │ ● workspace      │
│   - users       │   │   - us_zips      │
│   - sessions    │   │   - ups_zones    │
│   - roles       │   │   - usps_3d      │
│   - permissions │   │   - gaz_zcta     │
│   - int_runs    │   │                  │
│                 │   │ ● reference      │
│ ● customer*     │   │   - carriers     │
│   - orgs        │   │   - services     │
│   - facilities  │   │   - delivery_    │
│   - orders      │   │     matrix       │
│   - shipments   │   │   - zip3_demos   │
└─────────────────┘   └──────────────────┘
  20-50ms latency        <2ms latency
  Backed up, HA          Fast, local
  
* customer schema ready for future expansion
```

**Why Split?**
- 🔒 Critical customer data protected in managed database
- ⚡ High-volume data processing stays fast on local VPS
- 💾 Automatic backups for irreplaceable data
- 📈 Independent scaling for each workload

## Tech Stack

- **Databases:** 
  - PRIMARY: PostgreSQL 17 (Digital Ocean DBaaS) - Config + Customer
  - DATA: PostgreSQL 17 (VPS Local) - Workspace + Reference
- **Backend:** Node.js + TypeScript + Fastify + Prisma (dual clients)
- **Auth:** Lucia Auth with session caching (30s TTL, ~90% DB load reduction)
- **Frontend:** React + TypeScript + Vite + shadcn/ui + Tailwind CSS
- **Backups:** Digital Ocean automated (PRIMARY), scripted (DATA) - See [BACKUP_STRATEGY.md](docs/BACKUP_STRATEGY.md)

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 8+
- PostgreSQL 17+ (local installation)

### Quick Start (Single DB Mode - Recommended for New Developers)

The simplest way to get started. See [DEVELOPER_SETUP.md](docs/DEVELOPER_SETUP.md) for full details.

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Create local database:**
   ```bash
   createdb handled_dev
   ```

3. **Configure environment:**
   ```bash
   cd apps/backoffice/api
   cp env-template.txt .env
   # Edit .env and update:
   #  - Replace YOUR_USERNAME with your system username
   #  - Set AUTH_SECRET (32+ characters)
   # Both URLs should point to handled_dev for local development
   ```

4. **Run migrations:**
   ```bash
   cd ../../..  # Back to root
   export PRIMARY_DATABASE_URL="postgresql://YOUR_USERNAME@localhost:5432/handled_dev"
   export DATA_DATABASE_URL="postgresql://YOUR_USERNAME@localhost:5432/handled_dev"
   pnpm db:migrate
   ```
   
   **Note:** If you encounter "schema does not exist" errors, use repair mode:
   ```bash
   bash database/migrate-data.sh --repair
   ```

5. **Generate Prisma clients:**
   ```bash
   pnpm --filter @handled/api db:generate
   ```

6. **Start development:**
   ```bash
   pnpm dev
   ```
   - API: http://localhost:3001
   - Web: http://localhost:5173

### Advanced Setup (Split DB Mode)

For working on customer features or mirroring production:

```bash
# Create two databases
createdb handled_primary_dev
createdb handled_data_dev

# Configure .env with SPLIT_DB_MODE=true
# See docs/DEVELOPER_SETUP.md for full instructions
```

## Database Architecture

### Two Database System

**PRIMARY Database** (Digital Ocean DBaaS - Managed PostgreSQL):
- **config** schema: Users, roles, permissions, sessions, integration_runs
- **customer** schema: Organizations, facilities (expandable for orders, shipments)
- **Purpose**: Critical, irreplaceable data with automated daily backups
- **Performance**: 20-50ms latency (remote), cached auth checks <5ms
- **Backup**: Automated daily backups, 7-day retention, point-in-time recovery

**DATA Database** (VPS Local PostgreSQL):
- **workspace** schema: Raw imported data (us_zips, ups_zones, usps_3d, gaz_zcta)
- **reference** schema: Transformed data (carriers, services, delivery_matrix, zip3_demographics)
- **Purpose**: High-volume, rebuildable data for fast processing
- **Performance**: <2ms latency (local)
- **Backup**: Script-based daily backups, 14-day retention

### Why Split?

1. **Data Safety**: Customer data protected in managed database with backups
2. **Performance**: Data processing stays fast on local VPS
3. **Cost Effective**: Only pay for managed DB for critical data
4. **Independent Scaling**: Scale each database based on workload

### Prisma Clients

```typescript
// Use prismaPrimary for config/customer data
import { prismaPrimary } from '../db/index.js';
await prismaPrimary.user.findUnique({ ... });

// Use prismaData for workspace/reference data
import { prismaData } from '../db/index.js';
await prismaData.carrier.findMany({ ... });
```

### Migrations

The platform uses **two separate migration systems**:

- **PRIMARY Migrations:** `database/migrations-primary/` (config + customer)
- **DATA Migrations:** `database/migrations-data/` (workspace + reference)

#### Migration Commands

```bash
# Run all migrations (both PRIMARY and DATA)
pnpm db:migrate

# Run PRIMARY migrations only
pnpm db:migrate:primary

# Run DATA migrations only
pnpm db:migrate:data

# Check migration status
pnpm db:migrate:status:primary
pnpm db:migrate:status:data
```

#### Creating New Migrations

**For config/customer features:**
```bash
cd database/migrations-primary
cp ../MIGRATION_TEMPLATE.sql 011_your_feature.sql
# Edit file, then:
pnpm db:migrate:primary
pnpm --filter @handled/api db:generate:primary
```

**For workspace/reference features:**
```bash
cd database/migrations-data
cp ../MIGRATION_TEMPLATE.sql 005_your_feature.sql
# Edit file, then:
pnpm db:migrate:data
pnpm --filter @handled/api db:generate:data
```

#### Migration Best Practices

- ✅ Always use `IF NOT EXISTS` / `IF EXISTS` for idempotency
- ✅ Number migrations sequentially within each folder
- ✅ One logical change per migration
- ✅ Add comments explaining why
- ✅ Test on fresh database before committing
- ✅ Put migration in correct folder (PRIMARY or DATA)
- ❌ Never edit migrations that have been deployed
- ❌ Never skip version numbers

**See [database/README.md](database/README.md) for detailed migration guide.**

## Production Architecture

The platform is **live in production** with a fully operational split database architecture.

### Full Production Stack

```
                    Internet (HTTPS/HTTP)
                            │
                            ▼
                ┌───────────────────────┐
                │   Nginx Web Server    │
                │   Ports: 80/443       │
                │   ops.handledcommerce │
                └─────┬──────────┬──────┘
                      │          │
        ┌─────────────┘          └─────────────┐
        │                                      │
        ▼                                      ▼
┌─────────────────┐                 ┌──────────────────────┐
│  Static Files   │                 │   API Reverse Proxy  │
│  React SPA      │                 │   → localhost:3001   │
│  (Vite Build)   │                 └──────────┬───────────┘
└─────────────────┘                            │
                                               ▼
                                    ┌──────────────────────┐
                                    │   PM2 Process Mgr    │
                                    │   managed-api        │
                                    └──────────┬───────────┘
                                               │
                                               ▼
                                    ┌──────────────────────────┐
                                    │  Fastify API Server      │
                                    │  Node.js 20+ TypeScript  │
                                    │  Port: 3001              │
                                    │                          │
                                    │  Dual Prisma Clients:    │
                                    │  ├─ prismaPrimary        │
                                    │  └─ prismaData           │
                                    │                          │
                                    │  Session Cache (30s TTL) │
                                    └────┬──────────────┬──────┘
                                         │              │
                    ┌────────────────────┘              └────────────────────┐
                    │                                                        │
                    ▼                                                        ▼
        ┌─────────────────────────┐                          ┌─────────────────────────┐
        │  PRIMARY DATABASE       │                          │  DATA DATABASE          │
        │  Digital Ocean DBaaS    │                          │  VPS Local              │
        │  PostgreSQL 17.7        │                          │  PostgreSQL 17.7        │
        │  Port: 25060 (SSL)      │                          │  Port: 5432 (local)     │
        ├─────────────────────────┤                          ├─────────────────────────┤
        │ ● config schema         │                          │ ● workspace schema      │
        │   - users               │                          │   - us_zips (~43K)      │
        │   - sessions (cached)   │                          │   - ups_zones (~178K)   │
        │   - roles               │                          │   - usps_3d (~26K)      │
        │   - permissions         │                          │   - gaz_zcta (~32K)     │
        │   - integration_runs    │                          │                         │
        │                         │                          │ ● reference schema      │
        │ ● customer schema       │                          │   - carriers            │
        │   - organizations       │                          │   - services            │
        │   - facilities          │                          │   - delivery_matrix     │
        │   (orders, shipments*)  │                          │   - zip3_demographics   │
        │                         │                          │   - zip3_centroids      │
        └─────────────────────────┘                          └─────────────────────────┘
        Managed, Auto-backup (7d)                             Script backup (14d)
        Connection Pool: 15                                   Local, <2ms latency
        PgBouncer enabled                                     Rebuildable data
        20-50ms latency
        
        * Future expansion

┌─────────────────────────────────────────────────────────────────┐
│  VPS Server (Ubuntu 24.04)                                      │
│  Location: San Francisco (DO)                                   │
│  ├─ Nginx (reverse proxy + static hosting)                      │
│  ├─ PM2 (process manager)                                       │
│  ├─ Node.js API (Fastify)                                       │
│  ├─ PostgreSQL 17 (DATA DB)                                     │
│  └─ Backup scripts (cron-based)                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Request Flow Examples

**User Login:**
1. Browser → Nginx (443) → React SPA loads
2. User submits credentials → Nginx → API (3001)
3. API checks `prismaPrimary.user` (DBaaS)
4. Session cached (30s) → Response
5. Total time: ~50-100ms

**Data Transformation:**
1. User triggers transformation → API (3001)
2. API reads `prismaData.workspace` (local)
3. Runs SQL transform
4. Writes to `prismaData.reference` (local)
5. Total time: 2-15s (depending on data volume)

**Import Process:**
1. File upload → API (3001)
2. Parse & validate
3. Write to `prismaData.workspace` (local, fast)
4. Track in `prismaPrimary.integration_runs` (DBaaS)
5. Total time: Seconds to minutes (file size dependent)

---

## Production Architecture (Detailed)

The platform is **live in production** with a fully operational split database architecture.

### Key Features

🚀 **Dual Database System**
- PRIMARY DB on Digital Ocean DBaaS (auth, users, customers)
- DATA DB on VPS local PostgreSQL (imports, transformations)
- Independent scaling and optimization per workload

⚡ **Performance Optimizations**
- Session caching reduces PRIMARY DB load by ~90%
- Local DATA DB provides <2ms query latency
- Query logging configurable (disabled in production)

🔒 **Data Protection**
- Automated daily backups on PRIMARY DB (7-day retention)
- Script-based backups for DATA DB (14-day retention)
- Point-in-time recovery available for critical data

📊 **Monitoring & Operations**
- Migration tracking in `config.schema_migrations`
- Enhanced validation with auto-repair capabilities
- Comprehensive ops runbook and deployment guides

### Documentation

- **[DATABASE_SPLIT_STATUS.md](DATABASE_SPLIT_STATUS.md)** - Complete implementation status
- **[DEVELOPER_SETUP.md](docs/DEVELOPER_SETUP.md)** - Developer onboarding guide
- **[BACKUP_STRATEGY.md](docs/BACKUP_STRATEGY.md)** - Backup and recovery procedures
- **[OPS_RUNBOOK.md](docs/OPS_RUNBOOK.md)** - Production operations guide
- **[DEPLOYMENT_CHECKLIST.md](docs/DEPLOYMENT_CHECKLIST.md)** - Deployment procedures

### Support

For production issues or questions:
- Review the ops runbook for common scenarios
- Check Digital Ocean dashboard for DBaaS metrics
- Monitor application logs via PM2: `pm2 logs handled-api`

---

Built with ❤️ for Handled 3PL operations

