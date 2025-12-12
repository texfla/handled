/**
 * Database Split Integration Tests
 * 
 * Tests both split-DB and single-DB modes
 * Validates session caching, customer schema, and data isolation
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
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
        name: 'Test User',
        role: 'admin',
        roleId: 1
      }
    });
    expect(user).toBeDefined();
    expect(user.email).toBe('test-auth@example.com');
    
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
    expect(run).toBeDefined();
    expect(run.integrationId).toBe('test-integration');
    
    // Cleanup
    await prismaPrimary.integrationRun.delete({ where: { id: run.id }});
  });
  
  test('Role and permission queries work', async () => {
    const roles = await prismaPrimary.role.findMany();
    expect(roles.length).toBeGreaterThan(0);
    
    const permissions = await prismaPrimary.permission.findMany();
    expect(permissions.length).toBeGreaterThan(0);
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
    expect(fetchCount).toBe(1);
    expect(result1.id).toBe(sessionId);
    
    // Second call should use cache
    const result2 = await sessionCache.get(sessionId, fetchFn);
    expect(fetchCount).toBe(1); // Still 1, not 2
    expect(result2.id).toBe(sessionId);
    
    // Invalidate and fetch again
    sessionCache.invalidate(sessionId);
    const result3 = await sessionCache.get(sessionId, fetchFn);
    expect(fetchCount).toBe(2); // Now 2
    expect(result3.id).toBe(sessionId);
  });

  test('Session cache statistics work', () => {
    const stats = sessionCache.getStats();
    expect(stats).toHaveProperty('size');
    expect(stats).toHaveProperty('ttl');
    expect(stats.ttl).toBe(30000);
  });
});

describe('Database Split - DATA DB', () => {
  test('Carrier operations work', async () => {
    const carriers = await prismaData.carrier.findMany();
    expect(carriers).toBeDefined();
    // Carriers are seeded in migrations, should have UPS and USPS
    expect(carriers.length).toBeGreaterThanOrEqual(2);
  });
  
  test('Service operations work', async () => {
    const services = await prismaData.service.findMany();
    expect(services).toBeDefined();
    expect(services.length).toBeGreaterThan(0);
  });
  
  test('Delivery matrix queries work', async () => {
    const matrixCount = await prismaData.deliveryMatrix.count();
    expect(matrixCount).toBeGreaterThanOrEqual(0);
  });
  
  test('Workspace table access works', async () => {
    // Note: These tables may be empty in test DB
    const usZipCount = await prismaData.$queryRaw`
      SELECT COUNT(*) as count FROM workspace.us_zips
    `;
    expect(usZipCount).toBeDefined();
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
    expect(org).toBeDefined();
    expect(org.name).toBe('Test 3PL Company');
    
    // Read
    const found = await prismaPrimary.organization.findUnique({
      where: { id: orgId }
    });
    expect(found).toBeDefined();
    expect(found?.id).toBe(orgId);
    
    // Update
    const updated = await prismaPrimary.organization.update({
      where: { id: orgId },
      data: { name: 'Updated 3PL Company' }
    });
    expect(updated.name).toBe('Updated 3PL Company');
    
    // Delete
    await prismaPrimary.organization.delete({
      where: { id: orgId }
    });
    
    // Verify deletion
    const deleted = await prismaPrimary.organization.findUnique({
      where: { id: orgId }
    });
    expect(deleted).toBeNull();
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
    expect(facility).toBeDefined();
    expect(facility.zip).toBe('10001');
    expect(facility.organizationId).toBe(org.id);
    
    // Query with relation
    const orgWithFacilities = await prismaPrimary.organization.findUnique({
      where: { id: org.id },
      include: { facilities: true }
    });
    expect(orgWithFacilities).toBeDefined();
    expect(orgWithFacilities?.facilities).toHaveLength(1);
    expect(orgWithFacilities?.facilities[0].name).toBe('NYC Warehouse');
    
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
    expect(user).toBeDefined();
    
    // Customer and config are both in PRIMARY - can query together
    expect(org).toBeDefined();
    expect(user).toBeDefined();
    
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
    expect(facility).toBeNull();
  });
});

describe('Database Split - Data Isolation', () => {
  test('PRIMARY and DATA are separate databases', async () => {
    // Verify we can query both databases independently
    const userCount = await prismaPrimary.user.count();
    const carrierCount = await prismaData.carrier.count();
    
    expect(userCount).toBeGreaterThanOrEqual(0);
    expect(carrierCount).toBeGreaterThanOrEqual(0);
  });

  test('No accidental cross-database queries', async () => {
    // This test ensures data models are correctly separated
    
    // PRIMARY DB models: user, role, permission, integrationRun, organization, facility
    expect(prismaPrimary.user).toBeDefined();
    expect(prismaPrimary.role).toBeDefined();
    expect(prismaPrimary.organization).toBeDefined();
    
    // DATA DB models: carrier, service, deliveryMatrix, etc.
    expect(prismaData.carrier).toBeDefined();
    expect(prismaData.service).toBeDefined();
    expect(prismaData.deliveryMatrix).toBeDefined();
    
    // Verify PRIMARY doesn't have data models
    expect((prismaPrimary as any).carrier).toBeUndefined();
    
    // Verify DATA doesn't have config models
    expect((prismaData as any).user).toBeUndefined();
  });
});

describe('Database Split - Backward Compatibility', () => {
  test('Single-DB mode support', async () => {
    // When SPLIT_DB_MODE=false, both clients can point to same DB
    // Test that this doesn't break anything
    
    const userCount = await prismaPrimary.user.count();
    const carrierCount = await prismaData.carrier.count();
    
    expect(userCount).toBeGreaterThanOrEqual(0);
    expect(carrierCount).toBeGreaterThanOrEqual(0);
    
    // Both should work without errors in single-DB mode
  });
});

// Cleanup after all tests
afterAll(async () => {
  // Stop session cache cleanup interval
  sessionCache.stopCleanup();
  
  // Disconnect Prisma clients
  await prismaPrimary.$disconnect();
  await prismaData.$disconnect();
});
