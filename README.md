# Handled Platform

Internal tools and data management platform for Handled 3PL operations.

## Project Structure

```
handled/
├── database/           # Shared SQL migrations
│   └── migrations/
├── apps/
│   └── backoffice/     # Internal admin tools
│       ├── api/        # Node.js + Fastify + Prisma backend
│       └── web/        # React + Vite + shadcn/ui frontend
├── file_importer/      # Legacy reference (deprecated)
└── package.json        # pnpm workspace root
```

## Tech Stack

- **Database:** PostgreSQL with schemas (workspace, config, reference)
- **Backend:** Node.js + TypeScript + Fastify + Prisma
- **Auth:** Lucia Auth (self-hosted)
- **Frontend:** React + TypeScript + Vite + shadcn/ui + Tailwind CSS

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 8+
- PostgreSQL 15+

### Setup

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Create database:**
   ```bash
   createdb handled
   ```

3. **Run all migrations:**
   ```bash
   pnpm db:migrate
   ```
   
   This will automatically:
   - Create all schemas (config, workspace, reference)
   - Set up authentication tables
   - Create integration and reference tables
   - Track which migrations have been applied

4. **Generate Prisma client:**
   ```bash
   cd apps/backoffice/api
   pnpm db:generate
   ```

5. **Start development:**
   ```bash
   pnpm dev
   ```

## Database Architecture

### Schemas

- **config** - Auth, integration runs, system configuration, migration tracking
- **workspace** - Raw imported data (disposable, can be rebuilt from files)
- **reference** - Transformed data (carriers, delivery_matrix, etc.)

### Migrations

The database uses a robust migration system with tracking:

- **Location:** `database/migrations/*.sql`
- **Naming:** `XXX_descriptive_name.sql` (e.g., `001_create_schemas.sql`)
- **Tracking:** Automatically tracked in `config.schema_migrations`

#### Migration Commands

```bash
# Run all pending migrations
pnpm db:migrate

# Check migration status
pnpm db:migrate:status

# View migration history
psql -U handled_user -d handled -c "SELECT * FROM config.schema_migrations ORDER BY version;"
```

#### Creating New Migrations

1. Copy the template:
   ```bash
   cp database/MIGRATION_TEMPLATE.sql database/migrations/007_your_migration_name.sql
   ```

2. Fill in the migration details:
   - Update version number (007, 008, etc.)
   - Add description and date
   - Write your SQL changes
   - Make it idempotent (use `IF NOT EXISTS`, `IF EXISTS`, etc.)

3. Test locally:
   ```bash
   pnpm db:migrate
   ```

4. Update Prisma schema if needed:
   - Edit `apps/backoffice/api/prisma/schema.prisma`
   - Run `cd apps/backoffice/api && pnpm db:generate`

5. Commit both files:
   ```bash
   git add database/migrations/007_*.sql apps/backoffice/api/prisma/schema.prisma
   git commit -m "Add migration: your description"
   ```

#### Migration Best Practices

- ✅ Always use `IF NOT EXISTS` / `IF EXISTS` for idempotency
- ✅ Number migrations sequentially (001, 002, 003...)
- ✅ One logical change per migration
- ✅ Add comments explaining why
- ✅ Test on fresh database before committing
- ✅ Include rollback notes in comments
- ❌ Never edit migrations that have been deployed
- ❌ Never skip version numbers

