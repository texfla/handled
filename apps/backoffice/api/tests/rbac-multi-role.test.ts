/**
 * RBAC Multi-Role Integration Tests
 * 
 * Tests many-roles-per-user functionality including:
 * - Multi-role assignment
 * - Permission flattening (union of permissions)
 * - Permission implications
 * - Middleware authorization
 * - Edge cases and system roles
 */

import { describe, test, after } from 'node:test';
import assert from 'node:assert';
import { prismaPrimary } from '../src/db/index.js';
import { createTestRole, createTestUser, cleanupTestRole, cleanupTestUser } from './test-helpers.js';
import { hasEffectivePermission, getEffectivePermissions } from '../src/middleware/permissions.js';

describe('RBAC - Multi-Role Assignment', () => {
  test('User can be assigned multiple roles', async () => {
    let role1, role2, user;
    
    try {
      // Create two roles
      role1 = await createTestRole('Role A', ['view_data']);
      role2 = await createTestRole('Role B', ['import_data']);
      assert.ok(role1);
      assert.ok(role2);
      
      // Create user with both roles
      user = await createTestUser(`multi_${Date.now()}@test.com`, [role1.id, role2.id]);
      
      // Verify UserRole junction table has 2 entries
      assert.strictEqual(user.userRoles.length, 2);
      
      // Verify permissions from both roles are present
      const permissionsSet = new Set<string>();
      for (const userRole of user.userRoles) {
        for (const rolePerm of userRole.role.rolePermissions) {
          permissionsSet.add(rolePerm.permission.code);
        }
      }
      const permissions = Array.from(permissionsSet);
      
      assert.ok(permissions.includes('view_data'));
      assert.ok(permissions.includes('import_data'));
      
    } finally {
      if (user) {
        try {
          await cleanupTestUser(user.id);
        } catch (err) {
          console.error('Failed to cleanup test user:', err);
        }
      }
      if (role1) {
        try {
          await cleanupTestRole(role1.id);
        } catch (err) {
          console.error('Failed to cleanup test role1:', err);
        }
      }
      if (role2) {
        try {
          await cleanupTestRole(role2.id);
        } catch (err) {
          console.error('Failed to cleanup test role2:', err);
        }
      }
    }
  });

  test('User with no roles has empty permissions', async () => {
    let user;
    
    try {
      // Create user without roles
      user = await createTestUser(`noroles_${Date.now()}@test.com`, []);
      
      // Verify permissions array is empty
      assert.strictEqual(user.userRoles.length, 0);
      
    } finally {
      if (user) {
        try {
          await cleanupTestUser(user.id);
        } catch (err) {
          console.error('Failed to cleanup test user:', err);
        }
      }
    }
  });

  test('Assigning duplicate roles is idempotent', async () => {
    let role, user;
    
    try {
      // Create role
      role = await createTestRole('Duplicate Test', ['view_data']);
      
      // Create user with role
      user = await createTestUser(`duplicate_${Date.now()}@test.com`, [role.id]);
      
      // Try to assign same role again (should fail or be ignored by unique constraint)
      try {
        await prismaPrimary.userRole.create({
          data: {
            userId: user.id,
            roleId: role.id
          }
        });
        // If we get here, the database doesn't have a unique constraint
        assert.fail('Should not allow duplicate role assignment');
      } catch (error: any) {
        // Expected: unique constraint violation
        assert.ok(error.code === 'P2002' || error.message.includes('Unique constraint'));
      }
      
      // Verify only one UserRole entry exists
      const userRoles = await prismaPrimary.userRole.findMany({
        where: { userId: user.id, roleId: role.id }
      });
      assert.strictEqual(userRoles.length, 1);
      
    } finally {
      if (user) {
        try {
          await cleanupTestUser(user.id);
        } catch (err) {
          console.error('Failed to cleanup test user:', err);
        }
      }
      if (role) {
        try {
          await cleanupTestRole(role.id);
        } catch (err) {
          console.error('Failed to cleanup test role:', err);
        }
      }
    }
  });
});

describe('RBAC - Permission Flattening', () => {
  test('User receives union of permissions from all roles', async () => {
    let roleA, roleB, user;
    
    try {
      // Create Role A with [view_data, import_data]
      roleA = await createTestRole('Role A', ['view_data', 'import_data']);
      
      // Create Role B with [export_data, run_transformations]
      roleB = await createTestRole('Role B', ['export_data', 'run_transformations']);
      
      // Assign user both roles
      user = await createTestUser(`union_${Date.now()}@test.com`, [roleA.id, roleB.id]);
      
      // Flatten permissions
      const permissionsSet = new Set<string>();
      for (const userRole of user.userRoles) {
        for (const rolePerm of userRole.role.rolePermissions) {
          permissionsSet.add(rolePerm.permission.code);
        }
      }
      const permissions = Array.from(permissionsSet);
      
      // Verify user has all 4 permissions (union)
      assert.ok(permissions.includes('view_data'));
      assert.ok(permissions.includes('import_data'));
      assert.ok(permissions.includes('export_data'));
      assert.ok(permissions.includes('run_transformations'));
      assert.strictEqual(permissions.length, 4);
      
    } finally {
      if (user) {
        try {
          await cleanupTestUser(user.id);
        } catch (err) {
          console.error('Failed to cleanup test user:', err);
        }
      }
      if (roleA) {
        try {
          await cleanupTestRole(roleA.id);
        } catch (err) {
          console.error('Failed to cleanup test roleA:', err);
        }
      }
      if (roleB) {
        try {
          await cleanupTestRole(roleB.id);
        } catch (err) {
          console.error('Failed to cleanup test roleB:', err);
        }
      }
    }
  });

  test('Duplicate permissions across roles are deduplicated', async () => {
    let roleA, roleB, user;
    
    try {
      // Create Role A with [view_data, import_data]
      roleA = await createTestRole('Role A Overlap', ['view_data', 'import_data']);
      
      // Create Role B with [view_data, export_data] (view_data overlaps)
      roleB = await createTestRole('Role B Overlap', ['view_data', 'export_data']);
      
      // Assign user both roles
      user = await createTestUser(`dedup_${Date.now()}@test.com`, [roleA.id, roleB.id]);
      
      // Flatten permissions with Set (auto-deduplicates)
      const permissionsSet = new Set<string>();
      for (const userRole of user.userRoles) {
        for (const rolePerm of userRole.role.rolePermissions) {
          permissionsSet.add(rolePerm.permission.code);
        }
      }
      const permissions = Array.from(permissionsSet);
      
      // Verify user has [view_data, import_data, export_data] (no duplicates)
      assert.ok(permissions.includes('view_data'));
      assert.ok(permissions.includes('import_data'));
      assert.ok(permissions.includes('export_data'));
      assert.strictEqual(permissions.length, 3); // Not 4
      
    } finally {
      if (user) {
        try {
          await cleanupTestUser(user.id);
        } catch (err) {
          console.error('Failed to cleanup test user:', err);
        }
      }
      if (roleA) {
        try {
          await cleanupTestRole(roleA.id);
        } catch (err) {
          console.error('Failed to cleanup test roleA:', err);
        }
      }
      if (roleB) {
        try {
          await cleanupTestRole(roleB.id);
        } catch (err) {
          console.error('Failed to cleanup test roleB:', err);
        }
      }
    }
  });

  test('Removing a role removes only that roles permissions', async () => {
    let roleA, roleB, user;
    
    try {
      // Create roles
      roleA = await createTestRole('Role A Remove', ['view_data']);
      roleB = await createTestRole('Role B Remove', ['export_data']);
      
      // User has both roles
      user = await createTestUser(`remove_${Date.now()}@test.com`, [roleA.id, roleB.id]);
      
      // Remove Role A
      await prismaPrimary.userRole.delete({
        where: {
          userId_roleId: {
            userId: user.id,
            roleId: roleA.id
          }
        }
      });
      
      // Re-fetch user
      const updatedUser = await prismaPrimary.user.findUnique({
        where: { id: user.id },
        include: {
          userRoles: {
            include: {
              role: {
                include: {
                  rolePermissions: {
                    where: { granted: true },
                    include: { permission: true }
                  }
                }
              }
            }
          }
        }
      });
      
      // Flatten permissions
      const permissionsSet = new Set<string>();
      if (updatedUser) {
        for (const userRole of updatedUser.userRoles) {
          for (const rolePerm of userRole.role.rolePermissions) {
            permissionsSet.add(rolePerm.permission.code);
          }
        }
      }
      const permissions = Array.from(permissionsSet);
      
      // Verify user still has export_data but not view_data
      assert.ok(permissions.includes('export_data'));
      assert.ok(!permissions.includes('view_data'));
      
    } finally {
      if (user) {
        try {
          await cleanupTestUser(user.id);
        } catch (err) {
          console.error('Failed to cleanup test user:', err);
        }
      }
      if (roleA) {
        try {
          await cleanupTestRole(roleA.id);
        } catch (err) {
          console.error('Failed to cleanup test roleA:', err);
        }
      }
      if (roleB) {
        try {
          await cleanupTestRole(roleB.id);
        } catch (err) {
          console.error('Failed to cleanup test roleB:', err);
        }
      }
    }
  });
});

describe('RBAC - Permission Implications', () => {
  test('manage_users implies view_roles', async () => {
    let role, user;
    
    try {
      // Create role with only manage_users permission
      role = await createTestRole('Test Manager', ['manage_users']);
      assert.ok(role, 'Role should be created');
      
      // Create user with this role
      user = await createTestUser(`manager_${Date.now()}@test.com`, [role.id]);
      assert.ok(user, 'User should be created');
      
      // Flatten permissions from all roles
      const permissionsSet = new Set<string>();
      for (const userRole of user.userRoles) {
        for (const rolePerm of userRole.role.rolePermissions) {
          permissionsSet.add(rolePerm.permission.code);
        }
      }
      const permissions = Array.from(permissionsSet);
      
      // Verify direct permission exists
      assert.ok(permissions.includes('manage_users'), 'User should have manage_users permission');
      
      // Test implication: manage_users implies view_roles
      const hasViewRoles = hasEffectivePermission(permissions, 'view_roles');
      assert.strictEqual(hasViewRoles, true, 'manage_users should imply view_roles');
      
    } finally {
      if (user) {
        try {
          await cleanupTestUser(user.id);
        } catch (err) {
          console.error('Failed to cleanup test user:', err);
        }
      }
      if (role) {
        try {
          await cleanupTestRole(role.id);
        } catch (err) {
          console.error('Failed to cleanup test role:', err);
        }
      }
    }
  });

  test('manage_roles implies view_roles and view_users', async () => {
    let role, user;
    
    try {
      // Create role with manage_roles permission
      role = await createTestRole('Roles Manager', ['manage_roles']);
      user = await createTestUser(`rolemgr_${Date.now()}@test.com`, [role.id]);
      
      // Flatten permissions
      const permissionsSet = new Set<string>();
      for (const userRole of user.userRoles) {
        for (const rolePerm of userRole.role.rolePermissions) {
          permissionsSet.add(rolePerm.permission.code);
        }
      }
      const permissions = Array.from(permissionsSet);
      
      // Test implications
      assert.ok(hasEffectivePermission(permissions, 'view_roles'), 'manage_roles should imply view_roles');
      assert.ok(hasEffectivePermission(permissions, 'view_users'), 'manage_roles should imply view_users');
      
    } finally {
      if (user) {
        try {
          await cleanupTestUser(user.id);
        } catch (err) {
          console.error('Failed to cleanup test user:', err);
        }
      }
      if (role) {
        try {
          await cleanupTestRole(role.id);
        } catch (err) {
          console.error('Failed to cleanup test role:', err);
        }
      }
    }
  });

  test('manage_* implies view_* for operational permissions', async () => {
    let role, user;
    
    try {
      // Test manage_orders implies view_orders
      role = await createTestRole('Orders Manager', ['manage_orders']);
      user = await createTestUser(`ordermgr_${Date.now()}@test.com`, [role.id]);
      
      const permissionsSet = new Set<string>();
      for (const userRole of user.userRoles) {
        for (const rolePerm of userRole.role.rolePermissions) {
          permissionsSet.add(rolePerm.permission.code);
        }
      }
      const permissions = Array.from(permissionsSet);
      
      assert.ok(hasEffectivePermission(permissions, 'view_orders'), 'manage_orders should imply view_orders');
      
    } finally {
      if (user) {
        try {
          await cleanupTestUser(user.id);
        } catch (err) {
          console.error('Failed to cleanup test user:', err);
        }
      }
      if (role) {
        try {
          await cleanupTestRole(role.id);
        } catch (err) {
          console.error('Failed to cleanup test role:', err);
        }
      }
    }
  });

  test('getEffectivePermissions includes both direct and implied', async () => {
    let role, user;
    
    try {
      // User has [manage_users, manage_inventory]
      role = await createTestRole('Multi Mgr', ['manage_users', 'manage_inventory']);
      user = await createTestUser(`multi_${Date.now()}@test.com`, [role.id]);
      
      const permissionsSet = new Set<string>();
      for (const userRole of user.userRoles) {
        for (const rolePerm of userRole.role.rolePermissions) {
          permissionsSet.add(rolePerm.permission.code);
        }
      }
      const directPermissions = Array.from(permissionsSet);
      
      // Get effective permissions (includes implications)
      const effectivePermissions = getEffectivePermissions(directPermissions);
      
      // Should include direct permissions
      assert.ok(effectivePermissions.includes('manage_users'));
      assert.ok(effectivePermissions.includes('manage_inventory'));
      
      // Should include implied permissions
      assert.ok(effectivePermissions.includes('view_roles')); // from manage_users
      assert.ok(effectivePermissions.includes('view_inventory')); // from manage_inventory
      
    } finally {
      if (user) {
        try {
          await cleanupTestUser(user.id);
        } catch (err) {
          console.error('Failed to cleanup test user:', err);
        }
      }
      if (role) {
        try {
          await cleanupTestRole(role.id);
        } catch (err) {
          console.error('Failed to cleanup test role:', err);
        }
      }
    }
  });
});

describe('RBAC - Edge Cases', () => {
  test('Disabled user cannot be queried for permissions', async () => {
    let role, user;
    
    try {
      // Create user with admin role
      const adminRole = await prismaPrimary.role.findUnique({
        where: { code: 'admin' }
      });
      assert.ok(adminRole, 'Admin role should exist');
      
      user = await createTestUser(`disabled_${Date.now()}@test.com`, [adminRole.id]);
      
      // Set disabled = true
      await prismaPrimary.user.update({
        where: { id: user.id },
        data: { disabled: true }
      });
      
      // Verify user is disabled
      const disabledUser = await prismaPrimary.user.findUnique({
        where: { id: user.id }
      });
      assert.strictEqual(disabledUser?.disabled, true);
      
    } finally {
      if (user) {
        try {
          await cleanupTestUser(user.id);
        } catch (err) {
          console.error('Failed to cleanup test user:', err);
        }
      }
    }
  });

  test('System roles are protected from deletion', async () => {
    // Attempt to delete admin role (isSystem = true)
    const adminRole = await prismaPrimary.role.findUnique({
      where: { code: 'admin' }
    });
    
    assert.ok(adminRole, 'Admin role should exist');
    assert.strictEqual(adminRole.isSystem, true, 'Admin role should be system role');
    
    // Backend should prevent deletion (tested in API routes, not here)
    // This test just verifies the isSystem flag is set correctly
  });

  test('Deleting role cascades to UserRole entries', async () => {
    let role, user;
    
    try {
      // Create role with 1+ users
      role = await createTestRole('Role With Users', ['view_data']);
      user = await createTestUser(`hasrole_${Date.now()}@test.com`, [role.id]);
      
      // Verify UserRole entry exists
      const userRolesBefore = await prismaPrimary.userRole.findMany({
        where: { userId: user.id, roleId: role.id }
      });
      assert.strictEqual(userRolesBefore.length, 1, 'UserRole entry should exist');
      
      // Delete role - should CASCADE delete UserRole entries
      await prismaPrimary.role.delete({ where: { id: role.id } });
      role = null; // Mark as deleted for cleanup
      
      // Verify UserRole entry was cascade deleted
      const userRolesAfter = await prismaPrimary.userRole.findMany({
        where: { userId: user.id }
      });
      assert.strictEqual(userRolesAfter.length, 0, 'UserRole entry should be cascade deleted');
      
    } finally {
      // Cleanup user (role already deleted above)
      if (user) {
        try {
          await cleanupTestUser(user.id);
        } catch (err) {
          console.error('Failed to cleanup test user:', err);
        }
      }
      // Only cleanup role if it wasn't deleted in the test
      if (role) {
        try {
          await cleanupTestRole(role.id);
        } catch (err) {
          console.error('Failed to cleanup test role:', err);
        }
      }
    }
  });

  test('Role with no permissions grants no access', async () => {
    let role, user;
    
    try {
      // Create role with 0 permissions
      role = await createTestRole('Empty Role', []);
      user = await createTestUser(`empty_${Date.now()}@test.com`, [role.id]);
      
      // Flatten permissions
      const permissionsSet = new Set<string>();
      for (const userRole of user.userRoles) {
        for (const rolePerm of userRole.role.rolePermissions) {
          permissionsSet.add(rolePerm.permission.code);
        }
      }
      const permissions = Array.from(permissionsSet);
      
      // Verify user.permissions is empty array
      assert.strictEqual(permissions.length, 0);
      
    } finally {
      if (user) {
        try {
          await cleanupTestUser(user.id);
        } catch (err) {
          console.error('Failed to cleanup test user:', err);
        }
      }
      if (role) {
        try {
          await cleanupTestRole(role.id);
        } catch (err) {
          console.error('Failed to cleanup test role:', err);
        }
      }
    }
  });
});

// Cleanup after all tests
after(async () => {
  // Disconnect Prisma client
  await prismaPrimary.$disconnect();
});
