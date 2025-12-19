
```markdown
# Handled: 3PL Logistics Platform

A monorepo containing tools for managing third-party logistics operations, built with modern web technologies for reliable development and production deployment.

## Project Structure

```
handled/
├── apps/                          # Application packages
│   ├── backoffice/
│   │   ├── api/                   # Backend API (Fastify)
│   │   └── web/                   # Frontend React app
│   └── warehouse-optimizer CODE/  # Standalone optimizer app
├── database/                      # Database migrations & schemas
├── docs/                          # Documentation
├── package.json                   # Workspace configuration
├── pnpm-workspace.yaml           # Workspace package definitions
└── pnpm-lock.yaml                # Dependency lock file
```

### Core Applications

The `apps/` directory contains three main applications:

#### Backend API (`apps/backoffice/api/`)
**Technologies**: Fastify, TypeScript, Prisma, PostgreSQL
- REST API endpoints
- Database operations
- Authentication & authorization
- Business logic processing

#### Frontend Web (`apps/backoffice/web/`)
**Technologies**: React, TypeScript, Vite, Tailwind CSS
- User interface for logistics operations
- Interactive dashboards and forms
- Real-time data visualization
- Responsive web application

#### Warehouse Optimizer (`warehouse-optimizer CODE/`)
**Technologies**: React, deck.gl, TypeScript
- Geographic mapping and visualization
- Warehouse location optimization
- Coverage analysis tools

### Why Separate Frontend and Backend?

```
┌─────────────────┐    HTTP/API    ┌─────────────────┐
│   Frontend      │◄──────────────►│   Backend       │
│   (React)       │                │   (Fastify)     │
│                 │                │                 │
│ • User Interface│                │ • Business Logic│
│ • Data Display  │                │ • Data Access   │
│ • Interactions  │                │ • API Routes    │
└─────────────────┘                └─────────────────┘
         │                                 │
         ▼                                 ▼
    Browser/User                      Database
```

**Benefits**:
- Independent scaling and deployment
- Technology optimization per use case
- Parallel development teams
- Clear testing boundaries
- Separate security considerations

## Technology Stack

### Core Technologies

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Runtime** | Node.js | JavaScript execution environment |
| **Package Manager** | pnpm | Efficient dependency management |
| **Monorepo Tool** | pnpm workspaces | Multi-package coordination |
| **Language** | TypeScript | Type-safe JavaScript development |
| **Database** | PostgreSQL | Relational data storage |
| **ORM** | Prisma | Type-safe database access |

### Application Frameworks

```
Frontend Stack:
React → TypeScript → Vite → Tailwind CSS → shadcn/ui

Backend Stack:
Fastify → TypeScript → Prisma → PostgreSQL
```

## Development vs Production

### Environment Comparison

| Aspect | Development | Production |
|--------|-------------|------------|
| **Database Content** | Sample data included | Baseline schema only |
| **Dependencies** | Dev tools included | Runtime only |
| **Build Artifacts** | Source maps, debugging | Optimized, minified |
| **Error Messages** | Verbose, detailed | User-safe |
| **Environment Config** | Local `.env` | Production secrets |
| **Testing** | Full test suites | Critical path only |

### Database Architecture

```
Development Database:
┌─────────────────────────────────────┐
│         handled_dev                 │
├─────────────────────────────────────┤
│ • Complete schema (structure)       │
│ • Full permissions (access control) │
│ • Sample data (warehouses, carriers)│
│ • Test users and permissions        │
└─────────────────────────────────────┘

Production Database:
┌─────────────────────────────────────┐
│         Production DB               │
├─────────────────────────────────────┤
│ • Complete schema (structure)       │
│ • Full permissions (access control) │
│ • Reference data only (no samples)  │
└─────────────────────────────────────┘
```

## Getting Started

### Initial Setup

```bash
# Clone repository
git clone <repository-url>
cd handled

# Install all dependencies
pnpm install

# Set up development database
bash database/run-migrations-dev.sh -dev

# Start development servers
pnpm dev
```

This starts both the API (port 3001) and web app (port 3000).

### Development Workflow

```bash
# Full development environment
pnpm dev                    # Start API + web servers
pnpm dev:api               # API only
pnpm dev:web               # Web app only

# Testing
pnpm test                  # Run all tests
pnpm lint                  # Code linting

# Building
pnpm build                 # Build all apps
```

## Build and Deployment Process

### Build Flow

```
Source Code          Build Process           Output
    │                       │                    │
    ▼                       ▼                    ▼
TypeScript ────► Type Checking ────► JavaScript
    │                       │                    │
    │                       │                    │
   React ──────────► Bundling/Minification ────► Optimized Bundle
    │                       │                    │
    │                       │                    │
  Assets ─────────► Compression ───────────────► Production Assets
```

### Build Commands

```bash
# Build everything (recommended)
pnpm build

# Build individual applications
cd apps/backoffice/api && pnpm build    # API → dist/
cd apps/backoffice/web && pnpm build    # Web → dist/
```

### Production Deployment

```bash
# 1. Build applications
pnpm build

# 2. Run production database migrations
bash database/run-migrations-prod.sh -prod

# 3. Start production servers
cd apps/backoffice/api && pnpm start    # API server
cd apps/backoffice/web && pnpm preview  # Web preview
```

## Package Management

### pnpm Workspace Structure

```
Root Package (handled/)
├── Dependencies: None (workspace config only)
├── Scripts: Workspace coordination commands
│
├── API Package (apps/backoffice/api/)
│   ├── Dependencies: fastify, prisma, zod
│   ├── DevDependencies: @types/*, eslint
│   └── Scripts: dev, build, test
│
└── Web Package (apps/backoffice/web/)
    ├── Dependencies: react, @radix-ui/*
    ├── DevDependencies: @types/react, vite
    └── Scripts: dev, build, lint
```

### Dependency Installation

```bash
# Install all workspace dependencies
pnpm install

# Add dependency to specific app
cd apps/backoffice/web && pnpm add new-package

# Add development dependency
pnpm add -D @types/new-package
```

## Database Operations

### Migration Strategy

The database follows a **three-concerns pattern**:

```
database/schemas/[schema]/
├── 001_structure_*.sql      # CREATE TABLE, DDL
├── 002_permissions_*.sql    # GRANT, access control
└── 003_seed_data*.sql       # INSERT, initial data
```

### Environment-Specific Commands

```bash
# Development (includes sample data)
bash database/run-migrations-dev.sh -dev

# Production (baseline only)
bash database/run-migrations-prod.sh -prod

# Test environment
bash database/run-migrations-dev.sh -test
```

## TypeScript Integration

### Compilation Process

```
TypeScript Source (.ts/.tsx)
         │
         ▼
   Type Checking
   • Interface validation
   • Null/undefined safety
   • IntelliSense support
         │
         ▼
JavaScript Output (.js)
   • Runtime compatible
   • No type overhead
   • Production ready
```

### Build-Time Benefits

- **Error Prevention**: Catches type errors before runtime
- **Developer Experience**: Autocomplete and refactoring support
- **Documentation**: Types serve as living documentation
- **Refactoring Safety**: Large-scale changes with confidence

## Testing Strategy

### Test Organization

```
API Tests (apps/backoffice/api/tests/)
├── Unit tests (individual functions)
├── Integration tests (API endpoints)
├── Database tests (Prisma operations)
└── RBAC tests (permission logic)

Web Tests (apps/backoffice/web/src/)
├── Component tests (React components)
├── Integration tests (user workflows)
└── E2E tests (full user journeys)
```

### Running Tests

```bash
# All tests
pnpm test

# API tests only
cd apps/backoffice/api && pnpm test

# Web tests only
cd apps/backoffice/web && pnpm test
```

## Architecture Principles

### Separation of Concerns

```
User Interface    Application Logic    Data Persistence
     │                   │                   │
     ▼                   ▼                   ▼
   Frontend ───────── Backend ───────── Database
   (React)           (Fastify)          (PostgreSQL)
```

### Development Principles

- **Type Safety**: TypeScript throughout the stack
- **Modular Architecture**: Clear boundaries between systems
- **Testable Code**: Comprehensive test coverage
- **Scalable Design**: Independent service scaling
- **Developer Experience**: Hot reload, fast builds, clear tooling

This architecture supports both rapid development iteration and reliable production deployment.
```
