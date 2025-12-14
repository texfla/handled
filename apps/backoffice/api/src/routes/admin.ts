import { FastifyInstance } from 'fastify';
import { prismaPrimary } from '../db/index.js';
import { sessionCache } from '../db/session-cache.js';
import { requirePermission } from '../middleware/requirePermission.js';
import { PERMISSIONS } from '../auth/permissions.js';
import { Argon2id } from 'oslo/password';
import { generateId } from 'lucia';

interface CreateUserBody {
  email: string;
  password: string;
  name: string;
  roleIds: number[];  // CHANGED: Array of role IDs
}

interface UpdateUserBody {
  email?: string;
  name?: string;
  roleIds?: number[];  // CHANGED: Array of role IDs
  disabled?: boolean;
}

interface AssignRolesBody {
  roleIds: number[];
}

interface ResetPasswordBody {
  newPassword: string;
}

interface UserParams {
  id: string;
}

export async function adminRoutes(fastify: FastifyInstance) {
  // Apply permission check to all routes in this plugin
  fastify.addHook('preHandler', requirePermission(PERMISSIONS.MANAGE_USERS));

  // GET /api/admin/users - List all users
  fastify.get('/users', async (_request, reply) => {
    const users = await prismaPrimary.user.findMany({
      include: {
        userRoles: {
          include: {
            role: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return reply.send({
      users: users.map(u => ({
        id: u.id,
        email: u.email,
        name: u.name,
        disabled: u.disabled,
        // CHANGED: Array of roles
        roles: u.userRoles.map(ur => ({
          id: ur.role.id,
          code: ur.role.code,
          name: ur.role.name
        })),
        createdAt: u.createdAt,
        updatedAt: u.updatedAt
      }))
    });
  });

  // GET /api/admin/users/:id - Get single user
  fastify.get<{ Params: UserParams }>('/users/:id', async (request, reply) => {
    const { id } = request.params;
    
    const user = await prismaPrimary.user.findUnique({
      where: { id },
      include: {
        userRoles: {
          include: {
            role: true
          }
        }
      }
    });

    if (!user) {
      return reply.status(404).send({ error: 'User not found' });
    }

    return reply.send({ 
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        disabled: user.disabled,
        roles: user.userRoles.map(ur => ({
          id: ur.role.id,
          code: ur.role.code,
          name: ur.role.name
        })),
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });
  });

  // POST /api/admin/users - Create new user
  fastify.post<{ Body: CreateUserBody }>('/users', async (request, reply) => {
    const { email, password, name, roleIds } = request.body;

    // Validate roleIds
    if (!roleIds || roleIds.length === 0) {
      return reply.status(400).send({ error: 'At least one role is required' });
    }

    // Check if email already exists
    const existingUser = await prismaPrimary.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return reply.status(400).send({ error: 'Email already in use' });
    }

    // Hash password
    const hashedPassword = await new Argon2id().hash(password);
    const userId = generateId(15);

    // Create user
    const user = await prismaPrimary.user.create({
      data: {
        id: userId,
        email,
        hashedPassword,
        name,
        // Create role assignments
        userRoles: {
          create: roleIds.map(roleId => ({
            roleId
          }))
        }
      },
      include: {
        userRoles: {
          include: { role: true }
        }
      }
    });

    return reply.status(201).send({
      message: 'User created successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        roles: user.userRoles.map(ur => ({
          id: ur.role.id,
          code: ur.role.code,
          name: ur.role.name
        }))
      }
    });
  });

  // PUT /api/admin/users/:id - Update user
  fastify.put<{ Params: UserParams; Body: UpdateUserBody }>('/users/:id', async (request, reply) => {
    const { id } = request.params;
    const { email, name, roleIds, disabled } = request.body;

    // Build update data
    const updateData: {
      email?: string;
      name?: string;
      disabled?: boolean;
      userRoles?: {
        create: Array<{ roleId: number }>;
      };
    } = {};
    if (email) updateData.email = email;
    if (name) updateData.name = name;
    if (disabled !== undefined) updateData.disabled = disabled;

    // If roleIds provided, update role assignments
    if (roleIds !== undefined) {
      // Delete existing assignments
      await prismaPrimary.userRole.deleteMany({
        where: { userId: id }
      });

      // Create new assignments
      updateData.userRoles = {
        create: roleIds.map(roleId => ({
          roleId
        }))
      };
    }

    const user = await prismaPrimary.user.update({
      where: { id },
      data: updateData,
      include: {
        userRoles: {
          include: { role: true }
        }
      }
    });

    return reply.send({
      message: 'User updated successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        roles: user.userRoles.map(ur => ({
          id: ur.role.id,
          code: ur.role.code,
          name: ur.role.name
        }))
      }
    });
  });

  // POST /api/admin/users/:id/reset-password - Reset user password
  fastify.post<{ Params: UserParams; Body: ResetPasswordBody }>('/users/:id/reset-password', async (request, reply) => {
    const { id } = request.params;
    const { newPassword } = request.body;

    if (!newPassword) {
      return reply.status(400).send({ error: 'New password is required' });
    }

    // Check user exists
    const existingUser = await prismaPrimary.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return reply.status(404).send({ error: 'User not found' });
    }

    // Hash new password
    const hashedPassword = await new Argon2id().hash(newPassword);

    await prismaPrimary.user.update({
      where: { id },
      data: { hashedPassword },
    });

    // Get all session IDs for this user before deleting them
    const userSessions = await prismaPrimary.session.findMany({
      where: { userId: id },
      select: { id: true },
    });

    // Invalidate all sessions for this user (database + cache)
    await prismaPrimary.session.deleteMany({
      where: { userId: id },
    });

    // Invalidate cached sessions
    userSessions.forEach(session => {
      sessionCache.invalidate(session.id);
    });

    return reply.send({ message: 'Password reset successfully. User will need to log in again.' });
  });

  // POST /api/admin/users/:id/disable - Disable user
  fastify.post<{ Params: UserParams }>('/users/:id/disable', async (request, reply) => {
    const { id } = request.params;

    // Prevent self-disable
    if (request.user?.id === id) {
      return reply.status(400).send({ error: 'Cannot disable your own account' });
    }

    const user = await prismaPrimary.user.update({
      where: { id },
      data: { disabled: true },
      include: {
        userRoles: {
          include: {
            role: true
          }
        }
      }
    });

    // Get all session IDs for this user before deleting them
    const userSessions = await prismaPrimary.session.findMany({
      where: { userId: id },
      select: { id: true },
    });

    // Invalidate all sessions for disabled user (database + cache)
    await prismaPrimary.session.deleteMany({
      where: { userId: id },
    });

    // Invalidate cached sessions
    userSessions.forEach(session => {
      sessionCache.invalidate(session.id);
    });

    return reply.send({ 
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        disabled: user.disabled,
        roles: user.userRoles.map(ur => ({
          id: ur.role.id,
          code: ur.role.code,
          name: ur.role.name
        }))
      },
      message: 'User disabled successfully' 
    });
  });

  // POST /api/admin/users/:id/enable - Enable user
  fastify.post<{ Params: UserParams }>('/users/:id/enable', async (request, reply) => {
    const { id } = request.params;

    const user = await prismaPrimary.user.update({
      where: { id },
      data: { disabled: false },
      include: {
        userRoles: {
          include: {
            role: true
          }
        }
      }
    });

    return reply.send({ 
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        disabled: user.disabled,
        roles: user.userRoles.map(ur => ({
          id: ur.role.id,
          code: ur.role.code,
          name: ur.role.name
        }))
      },
      message: 'User enabled successfully' 
    });
  });

  // DELETE /api/admin/users/:id - Delete user
  fastify.delete<{ Params: UserParams }>('/users/:id', async (request, reply) => {
    const { id } = request.params;

    // Prevent self-delete
    if (request.user?.id === id) {
      return reply.status(400).send({ error: 'Cannot delete your own account' });
    }

    // Check user exists
    const existingUser = await prismaPrimary.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return reply.status(404).send({ error: 'User not found' });
    }

    // Get all session IDs for this user before deleting
    const userSessions = await prismaPrimary.session.findMany({
      where: { userId: id },
      select: { id: true },
    });

    // Delete user (sessions will cascade delete due to FK constraint)
    await prismaPrimary.user.delete({
      where: { id },
    });

    // Invalidate cached sessions
    userSessions.forEach(session => {
      sessionCache.invalidate(session.id);
    });

    return reply.send({ message: 'User deleted successfully' });
  });

  // NEW: POST /api/admin/users/:id/roles - Assign roles (dedicated endpoint)
  fastify.post<{
    Params: UserParams;
    Body: AssignRolesBody;
  }>('/users/:id/roles', async (request, reply) => {
    const { id } = request.params;
    const { roleIds } = request.body;

    if (!roleIds || roleIds.length === 0) {
      return reply.status(400).send({ error: 'At least one role is required' });
    }

    // Verify user exists
    const user = await prismaPrimary.user.findUnique({
      where: { id }
    });

    if (!user) {
      return reply.status(404).send({ error: 'User not found' });
    }

    // Delete existing role assignments
    await prismaPrimary.userRole.deleteMany({
      where: { userId: id }
    });

    // Create new role assignments
    await prismaPrimary.userRole.createMany({
      data: roleIds.map(roleId => ({
        userId: id,
        roleId
      }))
    });

    // Fetch updated user with roles
    const updatedUser = await prismaPrimary.user.findUnique({
      where: { id },
      include: {
        userRoles: {
          include: { role: true }
        }
      }
    });

    return reply.send({
      message: 'Roles updated successfully',
      user: {
        id: updatedUser!.id,
        email: updatedUser!.email,
        name: updatedUser!.name,
        roles: updatedUser!.userRoles.map(ur => ({
          id: ur.role.id,
          code: ur.role.code,
          name: ur.role.name
        }))
      }
    });
  });
}

