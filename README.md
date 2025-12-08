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

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Create database and schemas:
   ```bash
   createdb handled
   psql -U handled_user -d handled -f database/migrations/001_create_schemas.sql
   ```

3. Run migrations:
   ```bash
   pnpm db:migrate
   ```

4. Start development:
   ```bash
   pnpm dev
   ```

## Database Schemas

- **config** - Auth, integration runs, system configuration
- **workspace** - Raw imported data (disposable, can be rebuilt from files)
- **reference** - Transformed data (carriers, delivery_matrix, etc.)

