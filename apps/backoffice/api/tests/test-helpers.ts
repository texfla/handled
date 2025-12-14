import { prismaPrimary } from '../src/db/index.js';
import { generateId } from 'lucia';
import { hashPassword } from '../src/auth/password.js';

/**
 * Create a test role with optional permissions
 * 
 * IMPORTANT: Role ID is auto-generated (INT AUTO_INCREMENT)
 * Do NOT use generateId() for role IDs
 */
export async function createTestRole(
  name: string, 
  permissionCodes: string[] = [],
  options: { isSystem?: boolean; icon?: string } = {}
) {
  // Generate unique code with timestamp to avoid conflicts
  const code = `test_${name.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;
  
  const role = await prismaPrimary.role.create({
    data: {
      code,
      name,
      icon: options.icon || 'shield',
      isSystem: options.isSystem || false,
    }
  });

  // Assign permissions if provided (batch operation)
  if (permissionCodes.length > 0) {
    const permissions = await prismaPrimary.permission.findMany({
      where: { code: { in: permissionCodes }}
    });
    
    if (permissions.length > 0) {
      await prismaPrimary.rolePermission.createMany({
        data: permissions.map(p => ({
          roleId: role.id,
          permissionId: p.id,
          granted: true
        }))
      });
    }
  }

  // Fetch with permissions for test assertions
  return await prismaPrimary.role.findUnique({
    where: { id: role.id },
    include: {
      rolePermissions: {
        where: { granted: true },
        include: { permission: true }
      }
    }
  });
}

/**
 * Create a test user with optional role assignments
 * User ID uses generateId (string) - this is correct
 */
export async function createTestUser(
  email: string, 
  roleIds: number[] = []
) {
  const userId = generateId(15);
  const user = await prismaPrimary.user.create({
    data: {
      id: userId,
      email,
      hashedPassword: await hashPassword('testpassword123'),
      name: 'Test User',
      userRoles: {
        create: roleIds.map(roleId => ({ roleId }))
      }
    },
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

  return user;
}

/**
 * Cleanup test role and all dependencies
 * Includes error handling to prevent cascade failures
 */
export async function cleanupTestRole(roleId: number) {
  try {
    await prismaPrimary.rolePermission.deleteMany({ where: { roleId } });
    await prismaPrimary.userRole.deleteMany({ where: { roleId } });
    await prismaPrimary.role.delete({ where: { id: roleId } });
  } catch (error) {
    console.error(`Failed to cleanup test role ${roleId}:`, error);
    throw error;
  }
}

/**
 * Cleanup test user and all dependencies
 * Includes error handling to prevent cascade failures
 */
export async function cleanupTestUser(userId: string) {
  try {
    await prismaPrimary.userRole.deleteMany({ where: { userId } });
    await prismaPrimary.user.delete({ where: { id: userId } });
  } catch (error) {
    console.error(`Failed to cleanup test user ${userId}:`, error);
    throw error;
  }
}
