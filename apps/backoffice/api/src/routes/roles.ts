import { FastifyInstance } from 'fastify';
import { prismaPrimary } from '../db/index.js';
import { requirePermission } from '../middleware/requirePermission.js';
import { PERMISSIONS, PERMISSION_INFO, Permission } from '../auth/permissions.js';
import { 
  getErrorMessage, 
  isPrismaUniqueConstraintError,
  createErrorResponse 
} from '../types/errors.js';
import {
  isValidIcon,
  generateRoleCode,
  validateRoleName,
  validateDescription,
  validatePermissions,
} from '../lib/validation.js';
import { error as logError } from '../lib/logger.js';

interface RoleParams {
  id: string;
}

interface UpdatePermissionsBody {
  permissions: string[];
}

interface CreateRoleBody {
  name: string;
  description?: string;
  icon?: string;
  permissions: string[];
}

interface UpdateRoleMetadataBody {
  description?: string;
  icon?: string;
}

export async function roleRoutes(fastify: FastifyInstance) {
  // GET /api/permissions - List all available permissions (no auth required for dropdown)
  fastify.get('/permissions', async (_request, reply) => {
    const permissions = await prismaPrimary.permission.findMany({
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });

    // Enrich with metadata from PERMISSION_INFO
    const enriched = permissions.map(p => {
      const info = PERMISSION_INFO[p.code as Permission];
      return {
        id: p.id,
        code: p.code,
        name: p.name,
        description: p.description,
        category: p.category,
        resource: info?.resource || 'other',
        action: info?.action || 'unknown'
      };
    });

    // Group by category for backward compatibility
    const grouped = enriched.reduce((acc, permission) => {
      const category = permission.category || 'other';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(permission);
      return acc;
    }, {} as Record<string, any[]>);

    return reply.send({
      permissions: enriched,
      grouped,
    });
  });

  // GET /api/roles - List all roles
  // CHANGED: Check for view_roles (with implications) instead of manage_roles
  fastify.get('/',
    { preHandler: requirePermission(PERMISSIONS.VIEW_ROLES) },
    async (_request, reply) => {
      const roles = await prismaPrimary.role.findMany({
        where: {
          retired: false,  // Exclude retired roles
        },
        include: {
          _count: {
            select: { userRoles: true }
          },
          rolePermissions: {
            where: { granted: true },
            include: {
              permission: true
            }
          }
        },
        orderBy: { name: 'asc' }
      });

      return reply.send({
        roles: roles.map(r => ({
          id: r.id,
          code: r.code,
          name: r.name,
          description: r.description,
          icon: r.icon,
          isSystem: r.isSystem,
          userCount: r._count.userRoles,
          permissions: r.rolePermissions.map(rp => rp.permission.code)
        }))
      });
    }
  );

  // GET /api/roles/:id/users - Get users with this role
  // IMPORTANT: Define BEFORE generic GET /:id to avoid route conflicts
  fastify.get<{ Params: RoleParams }>('/:id/users',
    { preHandler: requirePermission(PERMISSIONS.VIEW_ROLES) },
    async (request, reply) => {
      const roleId = parseInt(request.params.id, 10);

      if (isNaN(roleId)) {
        return reply.status(400).send({ error: 'Invalid role ID' });
      }

      const users = await prismaPrimary.user.findMany({
        where: {
          userRoles: {
            some: { roleId }
          }
        },
        select: {
          id: true,
          name: true,
          email: true
        },
        orderBy: { name: 'asc' }
      });

      return reply.send({ users, count: users.length });
    }
  );

  // GET /api/roles/:id - Get single role
  fastify.get<{ Params: RoleParams }>('/:id',
    { preHandler: requirePermission(PERMISSIONS.VIEW_ROLES) },
    async (request, reply) => {
      const roleId = parseInt(request.params.id, 10);
      
      if (isNaN(roleId)) {
        return reply.status(400).send({ error: 'Invalid role ID' });
      }

      const role = await prismaPrimary.role.findUnique({
        where: { id: roleId },
        include: {
          _count: {
            select: { userRoles: true }
          },
          rolePermissions: {
            where: { granted: true },
            include: {
              permission: true
            }
          }
        }
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
          icon: role.icon,
          isSystem: role.isSystem,
          userCount: role._count.userRoles,
          permissions: role.rolePermissions.map(rp => ({
            id: rp.permission.id,
            code: rp.permission.code,
            name: rp.permission.name,
            description: rp.permission.description,
            category: rp.permission.category
          }))
        }
      });
    }
  );

  // GET /api/roles/:id/permissions - Get role permissions
  fastify.get<{ Params: RoleParams }>('/:id/permissions',
    { preHandler: requirePermission(PERMISSIONS.VIEW_ROLES) },
    async (request, reply) => {
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
    }
  );

  // PUT /api/roles/:id/permissions - Update role permissions (bulk)
  // Requires manage_roles (not view_roles)
  fastify.put<{ Params: RoleParams; Body: UpdatePermissionsBody }>(
    '/:id/permissions',
    { preHandler: requirePermission(PERMISSIONS.MANAGE_ROLES) },
    async (request, reply) => {
      const roleId = parseInt(request.params.id, 10);
      const { permissions } = request.body;

      if (isNaN(roleId)) {
        return reply.status(400).send({ error: 'Invalid role ID' });
      }

      // Validate permissions
      const permsValidation = validatePermissions(permissions);
      if (!permsValidation.valid) {
        return reply.status(400).send(createErrorResponse(
          'Invalid permissions',
          permsValidation.error
        ));
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
          error: 'Invalid permissions provided',
          details: `Unknown permissions: ${invalidPermissions.join(', ')}`
        });
      }

      // Update permissions in a transaction
      try {
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
      } catch (error) {
        logError('Failed to update role permissions:', error);
        return reply.status(500).send(
          createErrorResponse(
            'Failed to update role permissions',
            getErrorMessage(error, 'Unknown error')
          )
        );
      }
    }
  );

  // POST /api/roles - Create new role
  fastify.post<{ Body: CreateRoleBody }>('/',
    { preHandler: requirePermission(PERMISSIONS.MANAGE_ROLES) },
    async (request, reply) => {
      const { name, description, icon, permissions } = request.body;

      // Validate name
      const nameValidation = validateRoleName(name);
      if (!nameValidation.valid) {
        return reply.status(400).send(createErrorResponse(
          'Invalid role name',
          nameValidation.error
        ));
      }

      // Validate description
      const descValidation = validateDescription(description);
      if (!descValidation.valid) {
        return reply.status(400).send(createErrorResponse(
          'Invalid description',
          descValidation.error
        ));
      }

      // Validate icon
      const iconValue = icon || 'shield';
      if (!isValidIcon(iconValue)) {
        return reply.status(400).send(createErrorResponse(
          'Invalid icon',
          `Icon must be one of the predefined values. Received: '${iconValue}'`
        ));
      }

      // Validate permissions
      const permsValidation = validatePermissions(permissions);
      if (!permsValidation.valid) {
        return reply.status(400).send(createErrorResponse(
          'Invalid permissions',
          permsValidation.error
        ));
      }

      // Generate code (immutable after creation)
      let code: string;
      try {
        code = generateRoleCode(name);
      } catch (error) {
        return reply.status(400).send(createErrorResponse(
          'Invalid role name',
          getErrorMessage(error, 'Unable to generate valid role code')
        ));
      }

      // Check for existing role
      const existingRole = await prismaPrimary.role.findUnique({ where: { code } });
      if (existingRole) {
        return reply.status(400).send(createErrorResponse(
          'Role already exists',
          `A role with the code '${code}' already exists. Try adding a distinguishing word to the name.`
        ));
      }

      try {
        // Pre-validate permissions exist (avoid race condition in transaction)
        const permRecords = await prismaPrimary.permission.findMany({
          where: { code: { in: permissions as string[] }},
          select: { id: true, code: true }
        });

        if (permRecords.length !== permissions.length) {
          const foundCodes = permRecords.map(p => p.code);
          const invalidPerms = (permissions as string[]).filter(p => !foundCodes.includes(p));
          return reply.status(400).send(createErrorResponse(
            'Invalid permissions',
            `Unknown permissions: ${invalidPerms.join(', ')}`
          ));
        }

        const role = await prismaPrimary.$transaction(async (tx) => {
          const newRole = await tx.role.create({
            data: {
              code,
              name: name.trim(),
              description: description?.trim() || null,
              icon: iconValue,
              isSystem: false
            }
          });

          // Create role-permission associations
          await tx.rolePermission.createMany({
            data: permRecords.map(p => ({
              roleId: newRole.id,
              permissionId: p.id,
              granted: true
            }))
          });

          return newRole;
        });

        return reply.status(201).send({
          message: 'Role created successfully',
          role: {
            id: role.id,
            code: role.code,
            name: role.name,
            description: role.description,
            icon: role.icon,
            isSystem: role.isSystem
          }
        });
      } catch (error) {
        logError('Failed to create role:', error);
        
        // Check for unique constraint violation
        if (isPrismaUniqueConstraintError(error)) {
          return reply.status(400).send(
            createErrorResponse(
              'Role code already exists',
              'This role name generates a code that already exists'
            )
          );
        }
        
        return reply.status(500).send(
          createErrorResponse(
            'Failed to create role',
            getErrorMessage(error, 'Unknown error')
          )
        );
      }
    }
  );

  // PUT /api/roles/:id/metadata - Update role metadata (description/icon only)
  fastify.put<{ Params: RoleParams; Body: UpdateRoleMetadataBody }>(
    '/:id/metadata',
    { preHandler: requirePermission(PERMISSIONS.MANAGE_ROLES) },
    async (request, reply) => {
      const roleId = parseInt(request.params.id, 10);
      const { description, icon } = request.body;

      if (isNaN(roleId)) {
        return reply.status(400).send({ error: 'Invalid role ID' });
      }

      // Validate description if provided
      if (description !== undefined) {
        const descValidation = validateDescription(description);
        if (!descValidation.valid) {
          return reply.status(400).send(createErrorResponse(
            'Invalid description',
            descValidation.error
          ));
        }
      }

      // Validate icon if provided
      if (icon && !isValidIcon(icon)) {
        return reply.status(400).send(createErrorResponse(
          'Invalid icon',
          `Icon must be one of the predefined values. Received: '${icon}'`
        ));
      }

      const role = await prismaPrimary.role.findUnique({ where: { id: roleId } });

      if (!role) {
        return reply.status(404).send({ error: 'Role not found' });
      }

      if (role.isSystem) {
        return reply.status(400).send({ error: 'Cannot modify system role' });
      }

      const updateData: { description?: string | null; icon?: string } = {};
      if (description !== undefined) {
        updateData.description = description?.trim() || null;
      }
      if (icon) {
        updateData.icon = icon;
      }

      const updatedRole = await prismaPrimary.role.update({
        where: { id: roleId },
        data: updateData
      });

      return reply.send({
        message: 'Role updated successfully',
        role: updatedRole
      });
    }
  );

  // DELETE /api/roles/:id - Retire role (never actually delete)
  fastify.delete<{ Params: RoleParams }>('/:id',
    { preHandler: requirePermission(PERMISSIONS.MANAGE_ROLES) },
    async (request, reply) => {
      const roleId = parseInt(request.params.id, 10);
      const { reason } = (request.body || {}) as { reason?: string };

      if (isNaN(roleId)) {
        return reply.status(400).send({ error: 'Invalid role ID' });
      }

      const role = await prismaPrimary.role.findUnique({
        where: { id: roleId },
        include: { _count: { select: { userRoles: true } } }
      });

      if (!role) {
        return reply.status(404).send({ error: 'Role not found' });
      }

      if (role.isSystem) {
        return reply.status(400).send({
          error: 'Cannot retire system role',
          message: 'System roles are permanent and cannot be modified'
        });
      }

      if (role._count.userRoles > 0) {
        return reply.status(409).send({
          error: 'Cannot retire role with active users',
          message: `This role is assigned to ${role._count.userRoles} user(s). Remove all assignments first.`,
          userCount: role._count.userRoles
        });
      }

      // No active users - retire the role (preserve forever, never delete)
      await prismaPrimary.role.update({
        where: { id: roleId },
        data: {
          retired: true,
          retiredAt: new Date(),
          retiredBy: (request as any).user?.id || null,
          retiredReason: reason || 'Role no longer needed'
        }
      });

      return reply.send({ 
        message: 'Role retired successfully (preserved for audit trail)',
        note: 'Roles are never deleted, only retired'
      });
    }
  );
}

