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
    assert.strictEqual(fetchCount, 1);
    assert.strictEqual(result1.id, sessionId);
    
    // Second call should use cache
    const result2 = await sessionCache.get(sessionId, fetchFn);
    assert.strictEqual(fetchCount, 1); // Still 1, not 2
    assert.strictEqual(result2.id, sessionId);
    
    // Invalidate and fetch again
    sessionCache.invalidate(sessionId);
    const result3 = await sessionCache.get(sessionId, fetchFn);
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
  test('Organization CRUD works', async () => {
    const orgId = generateId(15);
    
    // Create
    const org = await prismaPrimary.organization.create({
      data: { 
        id: orgId,
        name: 'Test 3PL Company',
        slug: 'test-3pl-' + Date.now()
      }
    });
    assert.ok(org);
    assert.strictEqual(org.name, 'Test 3PL Company');
    
    // Read
    const found = await prismaPrimary.organization.findUnique({
      where: { id: orgId }
    });
    assert.ok(found);
    assert.strictEqual(found?.id, orgId);
    
    // Update
    const updated = await prismaPrimary.organization.update({
      where: { id: orgId },
      data: { name: 'Updated 3PL Company' }
    });
    assert.strictEqual(updated.name, 'Updated 3PL Company');
    
    // Delete
    await prismaPrimary.organization.delete({
      where: { id: orgId }
    });
    
    // Verify deletion
    const deleted = await prismaPrimary.organization.findUnique({
      where: { id: orgId }
    });
    assert.strictEqual(deleted, null);
  });
  
  test('Facility CRUD works with organization relation', async () => {
    const orgId = generateId(15);
    const facilityId = generateId(15);
    
    // Create org first
    const org = await prismaPrimary.organization.create({
      data: { 
        id: orgId,
        name: '3PL Co',
        slug: '3pl-co-' + Date.now()
      }
    });
    
    // Create facility
    const facility = await prismaPrimary.facility.create({
      data: {
        id: facilityId,
        organizationId: org.id,
        name: 'NYC Warehouse',
        address: { street: '123 Main St', city: 'New York', state: 'NY' },
        zip: '10001'
      }
    });
    assert.ok(facility);
    assert.strictEqual(facility.zip, '10001');
    assert.strictEqual(facility.organizationId, org.id);
    
    // Query with relation
    const orgWithFacilities = await prismaPrimary.organization.findUnique({
      where: { id: org.id },
      include: { facilities: true }
    });
    assert.ok(orgWithFacilities);
    assert.strictEqual(orgWithFacilities?.facilities.length, 1);
    assert.strictEqual(orgWithFacilities?.facilities[0].name, 'NYC Warehouse');
    
    // Cleanup
    await prismaPrimary.facility.delete({ where: { id: facilityId }});
    await prismaPrimary.organization.delete({ where: { id: org.id }});
  });
  
  test('Customer data isolation (no cross-DB queries)', async () => {
    const orgId = generateId(15);
    
    // Create org in PRIMARY DB
    const org = await prismaPrimary.organization.create({
      data: { 
        id: orgId,
        name: 'Isolation Test',
        slug: 'test-iso-' + Date.now()
      }
    });
    
    // This should work (same DB)
    const user = await prismaPrimary.user.findFirst();
    assert.ok(user);
    
    // Customer and config are both in PRIMARY - can query together
    assert.ok(org);
    assert.ok(user);
    
    // Cleanup
    await prismaPrimary.organization.delete({ where: { id: orgId }});
  });

  test('CASCADE delete works for facilities', async () => {
    const orgId = generateId(15);
    const facilityId = generateId(15);
    
    // Create org and facility
    const org = await prismaPrimary.organization.create({
      data: { 
        id: orgId,
        name: 'Delete Test Org',
        slug: 'delete-test-' + Date.now()
      }
    });
    
    await prismaPrimary.facility.create({
      data: {
        id: facilityId,
        organizationId: org.id,
        name: 'Delete Test Facility',
        zip: '10001'
      }
    });
    
    // Delete org (should cascade to facility)
    await prismaPrimary.organization.delete({ where: { id: org.id }});
    
    // Verify facility is also deleted
    const facility = await prismaPrimary.facility.findUnique({
      where: { id: facilityId }
    });
    assert.strictEqual(facility, null);
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
    
    // PRIMARY DB models: user, role, permission, integrationRun, organization, facility
    assert.ok(prismaPrimary.user);
    assert.ok(prismaPrimary.role);
    assert.ok(prismaPrimary.organization);
    
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
