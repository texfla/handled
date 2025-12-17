# Data Lifecycle Philosophy

## Overview

This platform implements a **three-tier data lifecycle** that respects evidentiary persistence:

1. **Active** - Currently in use
2. **Retired/Terminated** - No longer active, but was once true (preserved forever)
3. **Deleted** - Never became true; test data or mistakes (purged after 180 days)

## Core Principle: Evidentiary Value

**The Question**: Did this data ever participate in real business operations?

- **Yes** → Preserve forever (retire/terminate)
- **No** → Safe to delete (will purge after 180 days)

## Entity-Specific Patterns

### Business Entities (Can Delete)

#### Customers
- **Active**: `status IN ('prospect', 'onboarding', 'active', 'paused')` AND `deleted = false`
- **Retired**: `status = 'terminated'` AND `retiredAt IS NOT NULL`
- **Deleted**: `deleted = true` (test data, never had allocations/contracts)

**Evidentiary checks**:
- Has warehouse allocations?
- Has contracts?
- Has communication history?
- Has facilities configured?
- Marked as test data (`isTestData = true`)?

#### Warehouses
- **Active**: `status IN ('active', 'commissioning', 'offline', 'decommissioned')` AND `deleted = false`
- **Retired**: `status = 'retired'` AND `retiredAt IS NOT NULL`
- **Deleted**: `deleted = true` (never had allocations)

**Evidentiary checks**:
- Has allocation history (ANY allocations, not just active)?
- Has zones configured?

#### Contacts
- **Active**: `active = true` AND `deleted = false`
- **Inactive**: `active = false` (has communication history, preserve)
- **Deleted**: `deleted = true` (no communication history)

**Evidentiary checks**:
- Has communication logs (`contactLog` entries)?
- Belongs to deleted/test customer?

#### Facilities (Customer-owned)
- **Active**: `deleted = false`
- **Deleted**: `deleted = true` (belongs to deleted/test customer)

**Evidentiary checks**:
- Parent customer status (inherits value from parent)

### Config Entities (Special Rules)

#### Users
- **Active**: `disabled = false` AND `deleted = false`
- **Disabled**: `disabled = true` (real user, preserve for audit trail)
- **Deleted**: `deleted = true` (test account, never logged in)

**Semantic distinction**:
- `disabled` = Tier 2 (Retired) - Cannot log in, preserved forever
- `deleted` = Tier 3 (Purge) - Test account with no activity

**Evidentiary checks**:
- Ever logged in (`sessions` count)?
- Has integration runs?
- Manages warehouses?
- Has contact logs?
- Part of audit trail (deleted/retired other entities)?

#### Roles
- **Active**: `retired = false`
- **Retired**: `retired = true` (preserved forever, never deleted)

**Pattern**: All roles are evidentiary - only retire, never delete.

**Rationale**:
- Roles define permissions that affected system behavior
- Historical significance (who had what access when?)
- Cost is negligible (roles are small, rarely created)

#### Contracts
- **Active**: `status = 'active'` AND `archivedAt IS NULL`
- **Archived**: `archivedAt IS NOT NULL` (expired/terminated contracts)

**Pattern**: Contracts are legal documents - no `deleted` column at all.

**Rationale**:
- Legal requirement: 7+ years retention
- Never deletable, only archivable

### Operational Config (Hard Delete)

#### WarehouseZones
- **Pattern**: Use hard delete (no lifecycle columns)
- **Rationale**: Operational configuration, no financial/legal implications
- **Future**: If zones gain transactional history, revisit lifecycle pattern

## API Patterns

### Smart DELETE Endpoints

All DELETE endpoints check evidentiary value before deletion:

```typescript
// DELETE /api/warehouses/:id
fastify.delete('/:id', async (request, reply) => {
  const valueCheck = await checkEvidentaryValue('warehouse', id);

  if (valueCheck.hasValue) {
    return reply.status(409).send({
      error: 'Cannot delete warehouse with history',
      reason: valueCheck.reason,
      details: valueCheck.details,
      suggestion: {
        action: 'retire',
        message: 'This warehouse has been used in operations. Please retire it instead.',
        endpoint: `PATCH /api/warehouses/${id}`,
        payload: { status: 'retired', retiredReason: reason }
      }
    });
  }

  // Safe to soft-delete
  await prisma.warehouse.update({
    where: { id },
    data: {
      deleted: true,
      deletedAt: new Date(),
      deletedBy: request.user.id,
      deletedReason: reason || 'Never used - safe to purge'
    }
  });

  return reply.status(204).send();
});
```

### Retirement Endpoints

Explicit retirement preserves full audit trail:

```typescript
// POST /api/warehouses/:id/retire
fastify.post('/:id/retire', async (request, reply) => {
  const { reason } = request.body;

  if (!reason || reason.trim().length < 10) {
    return reply.status(400).send({
      error: 'Retirement reason required',
      message: 'Please provide a detailed reason (minimum 10 characters)'
    });
  }

  const warehouse = await prisma.warehouse.update({
    where: { id },
    data: {
      status: 'retired',
      retiredAt: new Date(),
      retiredBy: request.user.id,
      retiredReason: reason.trim()
    }
  });

  return reply.send({ 
    message: 'Warehouse retired successfully',
    warehouse 
  });
});
```

## Query Patterns by Use Case

### 1. Default View (Active Only)

Most UI list views should exclude deleted AND exclude terminated/retired entities:

```typescript
// Customer list page
const customers = await prisma.customer.findMany({
  where: { 
    deleted: false, 
    status: { in: ['prospect', 'onboarding', 'active', 'paused'] } 
  },
  include: { 
    contacts: true  // Automatically filtered by parent (orphan approach)
  }
});
```

### 2. Historical Report (Active + Retired)

Revenue reports, churn analysis - include terminated customers, exclude deleted:

```typescript
// Monthly revenue trend
const customers = await prisma.customer.findMany({
  where: { deleted: false },  // Include all statuses except deleted
  include: { 
    contracts: { where: { archivedAt: null } }  // Exclude archived
  }
});
```

### 3. Admin Audit View (Everything)

Compliance audits, data exports - include deleted for full history:

```typescript
// Admin data audit
const customers = await prisma.customer.findMany({
  // No where clause - include deleted, terminated, everything
  include: { 
    contacts: true,
    deletedByUser: { select: { name: true } },
    retiredByUser: { select: { name: true } }
  },
  orderBy: { deletedAt: 'desc' }  // Show recently deleted first
});
```

### 4. Orphaned Children Query (Debug)

Find records whose parent is soft-deleted (useful for purge job testing):

```typescript
// Find contacts belonging to deleted customers
const orphanedContacts = await prisma.contact.findMany({
  where: {
    customer: { deleted: true }  // Parent is deleted
  },
  include: { customer: true }
});

// These are "invisible" in normal queries but still exist until purge
```

### 5. Toggle Pattern (Show Retired)

UI with "Show Terminated" checkbox:

```typescript
const includeRetired = request.query.includeRetired === 'true';

const customers = await prisma.customer.findMany({
  where: {
    deleted: false,
    status: includeRetired 
      ? undefined  // Include all statuses
      : { in: ['prospect', 'onboarding', 'active', 'paused'] }  // Exclude terminated
  }
});
```

## Cascade Behavior: Orphan Approach

**Decision**: Child records are NOT automatically marked as deleted when parent is deleted.

**Rationale**:
- When querying, we always filter by parent: `WHERE customer.deleted = false`
- This join automatically excludes children of deleted customers
- Simpler than cascading delete flags through the tree
- Prevents complex cascade logic and potential bugs
- Children can still be individually marked as deleted if needed

**Example**:

```typescript
// When customer is soft-deleted:
await prisma.customer.update({
  where: { id },
  data: { deleted: true, deletedAt: new Date(), deletedBy: userId }
});

// Contacts, facilities, etc. are NOT marked deleted
// But queries like this automatically exclude them:
const customers = await prisma.customer.findMany({
  where: { deleted: false },  // Only non-deleted customers
  include: {
    contacts: true,  // Automatically filtered by parent
    facilities: true
  }
});
```

## Database Constraints

### Status Transition Validation

Prevent conflicting lifecycle states:

```sql
-- Customers: Cannot be both deleted and terminated
ALTER TABLE customer.customers ADD CONSTRAINT check_deleted_or_terminated
  CHECK (
    (deleted = false) OR 
    (deleted = true AND status IN ('prospect', 'setup', 'active', 'paused'))
  );

-- Warehouses: Cannot be both deleted and retired
ALTER TABLE company.warehouses ADD CONSTRAINT check_deleted_or_retired
  CHECK (
    (deleted = false) OR 
    (deleted = true AND status IN ('active', 'commissioning', 'offline', 'decommissioned'))
  );

-- Roles: System roles cannot be retired
ALTER TABLE config.roles ADD CONSTRAINT check_system_not_retired
  CHECK (is_system = false OR retired = false);
```

## Audit Trail

All lifecycle changes record:
- **Who**: `deletedBy`, `retiredBy`, `archivedBy` (FK to users)
- **When**: `deletedAt`, `retiredAt`, `archivedAt` (timestamp)
- **Why**: `deletedReason`, `retiredReason`, `archivedReason` (text)

This creates a complete audit trail for compliance and debugging.

## Future: Automated Purge Job

See [PURGE_JOB_SPEC.md](./PURGE_JOB_SPEC.md) for implementation plan.

**Summary**:
- Runs daily at 2am
- Hard-deletes records marked `deleted: true` after 180 days
- Transaction-based cascade to orphaned children
- Audit log preserves record of what was purged
- Dry-run mode for testing

## Summary

| Entity | Active | Retired/Terminated | Deleted | Purge |
|--------|--------|-------------------|---------|-------|
| **Customer** | `status != 'terminated'` | `status = 'terminated'` | `deleted = true` | After 180 days |
| **Warehouse** | `status != 'retired'` | `status = 'retired'` | `deleted = true` | After 180 days |
| **Contact** | `active = true` | `active = false` | `deleted = true` | After 180 days |
| **Facility** | `deleted = false` | N/A | `deleted = true` | After 180 days |
| **User** | `disabled = false` | `disabled = true` | `deleted = true` | After 180 days |
| **Role** | `retired = false` | `retired = true` | Never | Never |
| **Contract** | `status = 'active'` | `archivedAt != null` | Never | Never |

**Key Takeaway**: If it was ever true in the real world, preserve it forever. If it never became true, safe to delete.

