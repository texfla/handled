import { FastifyInstance } from 'fastify';
import { prismaPrimary } from '../db/index.js';
import { requirePermission } from '../middleware/requirePermission.js';
import { PERMISSIONS } from '../auth/permissions.js';

interface RoleParams {
  id: string;
}

interface UpdatePermissionsBody {
  permissions: string[];
}

export async function roleRoutes(fastify: FastifyInstance) {
  // GET /api/permissions - List all available permissions (no auth required for dropdown)
  fastify.get('/permissions', async (_request, reply) => {
    const permissions = await prismaPrimary.permission.findMany({
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });

    // Group by category
    const grouped = permissions.reduce((acc, permission) => {
      if (!acc[permission.category]) {
        acc[permission.category] = [];
      }
      acc[permission.category].push({
        id: permission.id,
        code: permission.code,
        name: permission.name,
        description: permission.description,
        category: permission.category,
      });
      return acc;
    }, {} as Record<string, any[]>);

    return reply.send({
      permissions,
      grouped,
    });
  });

  // Apply permission check to role management routes
  fastify.addHook('preHandler', requirePermission(PERMISSIONS.MANAGE_ROLES));

  // GET /api/roles - List all roles
  fastify.get('/', async (_request, reply) => {
    const roles = await prismaPrimary.role.findMany({
      include: {
        _count: {
          select: { users: true },
        },
        rolePermissions: {
          where: { granted: true },
          include: {
            permission: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const rolesWithMeta = roles.map(role => ({
      id: role.id,
      code: role.code,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      userCount: role._count.users,
      permissions: role.rolePermissions.map(rp => rp.permission.code),
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    }));

    return reply.send({ roles: rolesWithMeta });
  });

  // GET /api/roles/:id - Get single role
  fastify.get<{ Params: RoleParams }>('/:id', async (request, reply) => {
    const roleId = parseInt(request.params.id, 10);
    
    if (isNaN(roleId)) {
      return reply.status(400).send({ error: 'Invalid role ID' });
    }

    const role = await prismaPrimary.role.findUnique({
      where: { id: roleId },
      include: {
        _count: {
          select: { users: true },
        },
        rolePermissions: {
          where: { granted: true },
          include: {
            permission: true,
          },
        },
      },
    });

    if (!role) {
      return reply.status(404).send({ error: 'Role not found' });
    }

    return reply.send({
      role: {
        id: role.id,
        code: role.code,
        name: role.name,
        description: role.description,
        isSystem: role.isSystem,
        userCount: role._count.users,
        permissions: role.rolePermissions.map(rp => ({
          id: rp.permission.id,
          code: rp.permission.code,
          name: rp.permission.name,
          description: rp.permission.description,
          category: rp.permission.category,
        })),
        createdAt: role.createdAt,
        updatedAt: role.updatedAt,
      },
    });
  });

  // GET /api/roles/:id/permissions - Get role permissions
  fastify.get<{ Params: RoleParams }>('/:id/permissions', async (request, reply) => {
    const roleId = parseInt(request.params.id, 10);
    
    if (isNaN(roleId)) {
      return reply.status(400).send({ error: 'Invalid role ID' });
    }

    const rolePermissions = await prismaPrimary.rolePermission.findMany({
      where: { roleId, granted: true },
      include: {
        permission: true,
      },
    });

    return reply.send({
      permissions: rolePermissions.map(rp => rp.permission.code),
    });
  });

  // PUT /api/roles/:id/permissions - Update role permissions (bulk)
  fastify.put<{ Params: RoleParams; Body: UpdatePermissionsBody }>(
    '/:id/permissions',
    async (request, reply) => {
      const roleId = parseInt(request.params.id, 10);
      const { permissions } = request.body;
      
      if (isNaN(roleId)) {
        return reply.status(400).send({ error: 'Invalid role ID' });
      }

      if (!Array.isArray(permissions)) {
        return reply.status(400).send({ error: 'Permissions must be an array' });
      }

      // Check if role exists
      const role = await prismaPrimary.role.findUnique({
        where: { id: roleId },
      });

      if (!role) {
        return reply.status(404).send({ error: 'Role not found' });
      }

      // Get all permission IDs
      const permissionRecords = await prismaPrimary.permission.findMany({
        where: { code: { in: permissions } },
      });

      const validPermissionCodes = permissionRecords.map(p => p.code);
      const invalidPermissions = permissions.filter(
        p => !validPermissionCodes.includes(p)
      );

      if (invalidPermissions.length > 0) {
        return reply.status(400).send({
          error: 'Invalid permissions',
          invalid: invalidPermissions,
        });
      }

      // Update permissions in a transaction
      await prismaPrimary.$transaction(async (tx) => {
        // Delete existing permissions for this role
        await tx.rolePermission.deleteMany({
          where: { roleId },
        });

        // Insert new permissions
        if (permissionRecords.length > 0) {
          await tx.rolePermission.createMany({
            data: permissionRecords.map(p => ({
              roleId,
              permissionId: p.id,
              granted: true,
            })),
          });
        }
      });

      return reply.send({
        message: 'Permissions updated successfully',
        permissions,
      });
    }
  );
}

