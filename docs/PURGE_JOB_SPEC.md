# Automated Purge Job Specification

## Purpose

Hard-delete records marked as `deleted: true` after 180-day retention window.

## Entities Eligible for Purging

- **Customers** (`deleted: true`)
- **Warehouses** (`deleted: true`)
- **Contacts** (`deleted: true`)
- **Facilities** (`deleted: true`)
- **Users** (`deleted: true`)

## Entities NEVER Purged

- **Contracts** - Legal documents, no `deleted` column, preserved forever
- **Roles** - Only retired, never deleted, preserved forever
- **Any entity with `retired_at` set** - Retired != deleted

## Implementation (Post-Launch)

### Query Pattern

```sql
-- Find eligible records
SELECT id FROM customer.customers 
WHERE deleted = true 
  AND deleted_at < NOW() - INTERVAL '180 days'
  AND retired_at IS NULL;  -- Never purge retired records
```

### Cascade Hard Delete Strategy (CRITICAL)

**Problem**: With orphan approach, child records remain when parent is soft-deleted.

**Solution**: Cascade hard delete to orphaned children in transaction:

```typescript
// Purge customer with all children
async function purgeCustomer(customerId: string) {
  await prismaPrimary.$transaction(async (tx) => {
    // 1. Hard delete all children first (orphaned by soft-delete)
    await tx.contact.deleteMany({ 
      where: { customerId } 
    });
    
    await tx.customerFacility.deleteMany({ 
      where: { customerId } 
    });
    
    await tx.warehouseAllocation.deleteMany({ 
      where: { customerId } 
    });
    
    // 2. Hard delete parent last
    await tx.customer.delete({ 
      where: { id: customerId } 
    });
    
    // 3. Audit log the purge
    await tx.auditLog.create({
      data: {
        action: 'PURGE',
        entityType: 'customer',
        entityId: customerId,
        details: 'Hard deleted after 180 day retention',
        timestamp: new Date()
      }
    });
  });
}
```

### Why This Is Safe

1. **Children inherit parent's deleted state** at query time (via joins)
2. **180 days is long enough** for any recovery needs
3. **Transaction atomicity** prevents partial deletions
4. **Audit log** preserves record of what was purged

### Cron Schedule

- Runs daily at 2am
- Dry-run mode for first 30 days (log what would be purged, don't actually delete)
- Admin notification email with purge summary

### Safety Rails

```typescript
// Before purging, verify eligibility
const eligibleForPurge = (record: any): boolean => {
  // Never purge if retired
  if (record.retiredAt) return false;
  
  // Must be deleted for 180+ days
  const purgeThreshold = new Date();
  purgeThreshold.setDate(purgeThreshold.getDate() - 180);
  if (record.deletedAt > purgeThreshold) return false;
  
  // Must be marked deleted
  if (!record.deleted) return false;
  
  return true;
};
```

### Admin Dashboard (Future)

- View purge history
- Manual purge trigger (with confirmation)
- Dry-run simulator
- Purge statistics by entity type

## Testing Checklist

- [ ] Test purge with orphaned children (should cascade)
- [ ] Test purge attempt on retired record (should be blocked)
- [ ] Test purge before 180 days (should be blocked)
- [ ] Test transaction rollback on error (should be atomic)
- [ ] Test audit log creation
- [ ] Test dry-run mode

## Implementation Steps

### 1. Create Audit Log Table

```sql
CREATE TABLE config.audit_log (
  id SERIAL PRIMARY KEY,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  details TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_log_entity ON config.audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_timestamp ON config.audit_log(timestamp DESC);
```

### 2. Create Purge Service

```typescript
// apps/backoffice/api/src/services/purge.ts
import { prismaPrimary } from '../db/index.js';

interface PurgeResult {
  entityType: string;
  entityId: string;
  deletedAt: Date;
  childrenPurged: Record<string, number>;
}

export async function runPurgeJob(dryRun: boolean = false): Promise<PurgeResult[]> {
  const purgeThreshold = new Date();
  purgeThreshold.setDate(purgeThreshold.getDate() - 180);
  
  const results: PurgeResult[] = [];
  
  // Find eligible customers
  const customersToDelete = await prismaPrimary.customer.findMany({
    where: {
      deleted: true,
      deletedAt: { lt: purgeThreshold },
      retiredAt: null
    },
    select: {
      id: true,
      deletedAt: true,
      _count: {
        select: {
          contacts: true,
          facilities: true,
          warehouseAllocations: true
        }
      }
    }
  });
  
  for (const customer of customersToDelete) {
    if (dryRun) {
      console.log(`[DRY RUN] Would purge customer ${customer.id} and ${customer._count.contacts + customer._count.facilities + customer._count.warehouseAllocations} children`);
      results.push({
        entityType: 'customer',
        entityId: customer.id,
        deletedAt: customer.deletedAt!,
        childrenPurged: {
          contacts: customer._count.contacts,
          facilities: customer._count.facilities,
          warehouseAllocations: customer._count.warehouseAllocations
        }
      });
    } else {
      await purgeCustomer(customer.id);
      results.push({
        entityType: 'customer',
        entityId: customer.id,
        deletedAt: customer.deletedAt!,
        childrenPurged: {
          contacts: customer._count.contacts,
          facilities: customer._count.facilities,
          warehouseAllocations: customer._count.warehouseAllocations
        }
      });
    }
  }
  
  // Similar logic for warehouses, contacts, facilities, users
  
  return results;
}

async function purgeCustomer(customerId: string) {
  await prismaPrimary.$transaction(async (tx) => {
    // Hard delete children
    await tx.contact.deleteMany({ where: { customerId } });
    await tx.customerFacility.deleteMany({ where: { customerId } });
    await tx.warehouseAllocation.deleteMany({ where: { customerId } });
    
    // Hard delete parent
    await tx.customer.delete({ where: { id: customerId } });
    
    // Audit log
    await tx.$executeRaw`
      INSERT INTO config.audit_log (action, entity_type, entity_id, details)
      VALUES ('PURGE', 'customer', ${customerId}, 'Hard deleted after 180 day retention')
    `;
  });
}
```

### 3. Create Cron Job

```typescript
// apps/backoffice/api/src/jobs/purge-cron.ts
import cron from 'node-cron';
import { runPurgeJob } from '../services/purge.js';

export function startPurgeCron() {
  // Run daily at 2am
  cron.schedule('0 2 * * *', async () => {
    console.log('[PURGE JOB] Starting daily purge job');
    
    try {
      const results = await runPurgeJob(false);
      
      console.log(`[PURGE JOB] Completed: ${results.length} entities purged`);
      
      // TODO: Send admin notification email
      
    } catch (error) {
      console.error('[PURGE JOB] Failed:', error);
      // TODO: Send error notification
    }
  });
  
  console.log('[PURGE JOB] Cron job scheduled (daily at 2am)');
}
```

### 4. Add to Server Startup

```typescript
// apps/backoffice/api/src/index.ts
import { startPurgeCron } from './jobs/purge-cron.js';

// After server starts
if (process.env.NODE_ENV === 'production') {
  startPurgeCron();
}
```

## Monitoring

### Metrics to Track

- Number of entities purged per day
- Time taken for purge job
- Errors encountered
- Dry-run vs actual purge comparison

### Alerts

- Purge job fails
- Purge job takes > 1 hour
- Unexpected number of entities purged (> 1000/day)

## Rollback Plan

If purge job accidentally deletes wrong data:

1. **Audit log** contains record of what was purged
2. **Database backups** can restore data (within backup retention window)
3. **Dry-run mode** should catch issues before production

**Best Practice**: Run dry-run mode for 30 days in production before enabling actual purge.

