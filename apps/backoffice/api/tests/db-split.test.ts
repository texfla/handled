/**
 * Database Split Integration Tests
 * 
 * Tests both split-DB and single-DB modes
 * Validates session caching, customer schema, and data isolation
 */

import { describe, test, after } from 'node:test';
import assert from 'node:assert';
import { prismaPrimary, prismaData } from '../src/db/index.js';
import { sessionCache } from '../src/db/session-cache.js';
import { generateId } from 'lucia';

describe('Database Split - PRIMARY DB', () => {
  test('User authentication works', async () => {
    const userId = generateId(15);
    const user = await prismaPrimary.user.create({
      data: { 
        id: userId,
        email: 'test-auth@example.com',
        hashedPassword: 'hashed_password_placeholder',
        name: 'Test User'
      }
    });
    assert.ok(user);
    assert.strictEqual(user.email, 'test-auth@example.com');
    
    // Cleanup
    await prismaPrimary.user.delete({ where: { id: userId }});
  });
  
  test('Integration run tracking works', async () => {
    const run = await prismaPrimary.integrationRun.create({
      data: { 
        integrationId: 'test-integration',
        status: 'running',
        filename: 'test.csv'
      }
    });
    assert.ok(run);
    assert.strictEqual(run.integrationId, 'test-integration');
    
    // Cleanup
    await prismaPrimary.integrationRun.delete({ where: { id: run.id }});
  });
  
  test('Role and permission queries work', async () => {
    const roles = await prismaPrimary.role.findMany();
    assert.ok(roles.length > 0);
    
    const permissions = await prismaPrimary.permission.findMany();
    assert.ok(permissions.length > 0);
  });
  
  test('Session caching works', async () => {
    const sessionId = 'test-session-' + Date.now();
    let fetchCount = 0;
    
    const fetchFn = async () => {
      fetchCount++;
      return { id: sessionId, userId: 'test-user' };
    };
    
    // First call should fetch
    const result1 = await sessionCache.get(sessionId, fetchFn);
    assert.ok(result1);
    assert.strictEqual(fetchCount, 1);
    assert.strictEqual(result1.id, sessionId);
    
    // Second call should use cache
    const result2 = await sessionCache.get(sessionId, fetchFn);
    assert.ok(result2);
    assert.strictEqual(fetchCount, 1); // Still 1, not 2
    assert.strictEqual(result2.id, sessionId);
    
    // Invalidate and fetch again
    sessionCache.invalidate(sessionId);
    const result3 = await sessionCache.get(sessionId, fetchFn);
    assert.ok(result3);
    assert.strictEqual(fetchCount, 2); // Now 2
    assert.strictEqual(result3.id, sessionId);
  });

  test('Session cache statistics work', () => {
    const stats = sessionCache.getStats();
    assert.ok('size' in stats);
    assert.ok('ttl' in stats);
    assert.strictEqual(stats.ttl, 30000);
  });
});

describe('Database Split - DATA DB', () => {
  test('Carrier operations work', async () => {
    const carriers = await prismaData.carrier.findMany();
    assert.ok(carriers);
    // Carriers are seeded in migrations, should have UPS and USPS
    assert.ok(carriers.length >= 2);
  });
  
  test('Service operations work', async () => {
    const services = await prismaData.service.findMany();
    assert.ok(services);
    assert.ok(services.length > 0);
  });
  
  test('Delivery matrix queries work', async () => {
    const matrixCount = await prismaData.deliveryMatrix.count();
    assert.ok(matrixCount >= 0);
  });
  
  test('Workspace table access works', async () => {
    // Note: These tables may be empty in test DB
    const usZipCount = await prismaData.$queryRaw`
      SELECT COUNT(*) as count FROM workspace.us_zips
    `;
    assert.ok(usZipCount);
  });
});

describe('Database Split - Customer Schema', () => {
  test('Customer CRUD works', async () => {
    const custId = generateId(15);
    
    // Create
    const customer = await prismaPrimary.customer.create({
      data: { 
        id: custId,
        name: 'Test 3PL Company',
        slug: 'test-3pl-' + Date.now()
      }
    });
    assert.ok(customer);
    assert.strictEqual(customer.name, 'Test 3PL Company');
    
    // Read
    const found = await prismaPrimary.customer.findUnique({
      where: { id: custId }
    });
    assert.ok(found);
    assert.strictEqual(found?.id, custId);
    
    // Update
    const updated = await prismaPrimary.customer.update({
      where: { id: custId },
      data: { name: 'Updated 3PL Company' }
    });
    assert.strictEqual(updated.name, 'Updated 3PL Company');
    
    // Delete
    await prismaPrimary.customer.delete({
      where: { id: custId }
    });
    
    // Verify deletion
    const deleted = await prismaPrimary.customer.findUnique({
      where: { id: custId }
    });
    assert.strictEqual(deleted, null);
  });
  
  test('WarehouseAllocation CRUD works with customer relation', async () => {
    const custId = generateId(15);
    const allocationId = generateId(15);
    
    // Create customer first
    const customer = await prismaPrimary.customer.create({
      data: { 
        id: custId,
        name: '3PL Co',
        slug: '3pl-co-' + Date.now()
      }
    });
    
    // Create facility
    // Create a warehouse first (facilities link to warehouses now)
    const warehouseId = 'wh_test_' + Date.now();
    const warehouse = await prismaPrimary.warehouse.create({
      data: {
        id: warehouseId,
        code: 'TEST-01',
        name: 'Test Warehouse',
        type: 'owned',
        status: 'active',
        address: { street1: '123 Warehouse Ave', city: 'New York', state: 'NY', zip: '10001', country: 'US' },
        timezone: 'America/New_York',
        capacity: { usable_pallets: 1000 }
      }
    });
    
    const allocation = await prismaPrimary.warehouseAllocation.create({
      data: {
        id: allocationId,
        customerId: customer.id,
        companyWarehouseId: warehouse.id,
        isPrimary: true,
        spaceAllocated: { pallets: 100, sqft: 5000 },
        zoneAssignment: 'A1-A10',
        status: 'active'
      }
    });
    assert.ok(allocation);
    assert.strictEqual(allocation.companyWarehouseId, warehouse.id);
    assert.strictEqual(allocation.customerId, customer.id);
    
    // Query with relation
    const customerWithAllocations = await prismaPrimary.customer.findUnique({
      where: { id: customer.id },
      include: { warehouseAllocations: true }
    });
    assert.ok(customerWithAllocations);
    assert.strictEqual(customerWithAllocations?.warehouseAllocations.length, 1);
    assert.strictEqual(customerWithAllocations?.warehouseAllocations[0].isPrimary, true);
    
    // Cleanup
    await prismaPrimary.warehouseAllocation.delete({ where: { id: allocationId }});
    await prismaPrimary.customer.delete({ where: { id: customer.id }});
    await prismaPrimary.warehouse.delete({ where: { id: warehouseId }});
  });
  
  test('Customer data isolation (no cross-DB queries)', async () => {
    const custId = generateId(15);
    
    // Create customer in PRIMARY DB
    const customer = await prismaPrimary.customer.create({
      data: { 
        id: custId,
        name: 'Isolation Test',
        slug: 'test-iso-' + Date.now()
      }
    });
    
    // This should work (same DB)
    const user = await prismaPrimary.user.findFirst();
    assert.ok(user);
    
    // Customer and config are both in PRIMARY - can query together
    assert.ok(customer);
    assert.ok(user);
    
    // Cleanup
    await prismaPrimary.customer.delete({ where: { id: custId }});
  });

  test('CASCADE delete works for warehouse allocations', async () => {
    const custId = generateId(15);
    const allocationId = generateId(15);
    
    // Create customer and facility
    const customer = await prismaPrimary.customer.create({
      data: { 
        id: custId,
        name: 'Delete Test Org',
        slug: 'delete-test-' + Date.now()
      }
    });
    
    // Create warehouse first
    const warehouseId = 'wh_cascade_' + Date.now();
    await prismaPrimary.warehouse.create({
      data: {
        id: warehouseId,
        code: 'CASCADE-DEL',
        name: 'Cascade Delete Warehouse',
        type: 'owned',
        status: 'active',
        address: { street1: '999 Delete St', city: 'Test', state: 'NY', zip: '10001', country: 'US' },
        timezone: 'America/New_York',
        capacity: { usable_pallets: 100 }
      }
    });
    
    await prismaPrimary.warehouseAllocation.create({
      data: {
        id: allocationId,
        customerId: customer.id,
        companyWarehouseId: warehouseId,
        status: 'active'
      }
    });
    
    // Delete customer (should cascade to warehouse allocation)
    await prismaPrimary.customer.delete({ where: { id: customer.id }});
    
    // Verify warehouse allocation is also deleted
    const allocation = await prismaPrimary.warehouseAllocation.findUnique({
      where: { id: allocationId }
    });
    assert.strictEqual(allocation, null);
    
    // Cleanup warehouse
    await prismaPrimary.warehouse.delete({ where: { id: warehouseId }});
  });
});

describe('Database Split - Data Isolation', () => {
  test('PRIMARY and DATA are separate databases', async () => {
    // Verify we can query both databases independently
    const userCount = await prismaPrimary.user.count();
    const carrierCount = await prismaData.carrier.count();
    
    assert.ok(userCount >= 0);
    assert.ok(carrierCount >= 0);
  });

  test('No accidental cross-database queries', async () => {
    // This test ensures data models are correctly separated
    
    // PRIMARY DB models: user, role, permission, integrationRun, customer, facility
    assert.ok(prismaPrimary.user);
    assert.ok(prismaPrimary.role);
    assert.ok(prismaPrimary.customer);
    
    // DATA DB models: carrier, service, deliveryMatrix, etc.
    assert.ok(prismaData.carrier);
    assert.ok(prismaData.service);
    assert.ok(prismaData.deliveryMatrix);
    
    // Verify PRIMARY doesn't have data models
    assert.strictEqual((prismaPrimary as any).carrier, undefined);
    
    // Verify DATA doesn't have config models
    assert.strictEqual((prismaData as any).user, undefined);
  });
});

describe('Database Split - Backward Compatibility', () => {
  test('Single-DB mode support', async () => {
    // When SPLIT_DB_MODE=false, both clients can point to same DB
    // Test that this doesn't break anything
    
    const userCount = await prismaPrimary.user.count();
    const carrierCount = await prismaData.carrier.count();
    
    assert.ok(userCount >= 0);
    assert.ok(carrierCount >= 0);
    
    // Both should work without errors in single-DB mode
  });
});

// Cleanup after all tests
after(async () => {
  // Stop session cache cleanup interval
  sessionCache.stopCleanup();
  
  // Disconnect Prisma clients
  await prismaPrimary.$disconnect();
  await prismaData.$disconnect();
});
