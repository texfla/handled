# Handled Platform

Internal tools and data management platform for Handled 3PL operations.

> **📊 Implementation Status**: See [DATABASE_SPLIT_STATUS.md](DATABASE_SPLIT_STATUS.md) for current progress on the database split implementation (Phase 1: ✅ Complete)

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
┌─────────────────┐         ┌──────────────────┐
│  PRIMARY DB     │         │   DATA DB        │
│  (DBaaS)        │         │   (VPS Local)    │
├─────────────────┤         ├──────────────────┤
│ ● Config        │         │ ● Workspace      │
│   - Auth        │         │   - Imports      │
│   - Users       │         │   - Raw data     │
│   - Roles       │         │                  │
│                 │         │ ● Reference      │
│ ● Customer      │         │   - Carriers     │
│   - Orders      │         │   - Matrix       │
│   - Shipments   │         │   - Transforms   │
└─────────────────┘         └──────────────────┘
  Managed, backed up         Fast, local, rebuildable
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
- **Auth:** Lucia Auth with session caching
- **Frontend:** React + TypeScript + Vite + shadcn/ui + Tailwind CSS

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
- **customer** schema: Organizations, facilities, orders, shipments (future)
- **Purpose**: Critical, irreplaceable data with automated backups
- **Performance**: ~60ms latency (remote), cached auth checks ~5ms

**DATA Database** (VPS Local PostgreSQL):
- **workspace** schema: Raw imported data (us_zips, ups_zones, etc.)
- **reference** schema: Transformed data (carriers, delivery_matrix, etc.)
- **Purpose**: High-volume, rebuildable data for fast processing
- **Performance**: <2ms latency (local)

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

