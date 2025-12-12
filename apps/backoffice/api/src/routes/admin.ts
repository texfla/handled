import { FastifyInstance } from 'fastify';
import { prismaPrimary } from '../db/index.js';
import { requirePermission } from '../middleware/requirePermission.js';
import { PERMISSIONS } from '../auth/permissions.js';
import { Argon2id } from 'oslo/password';
import { generateId } from 'lucia';

interface CreateUserBody {
  email: string;
  password: string;
  name: string;
  roleId: number;
}

interface UpdateUserBody {
  email?: string;
  name?: string;
  roleId?: number;
  disabled?: boolean;
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
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        roleId: true,
        disabled: true,
        createdAt: true,
        updatedAt: true,
        userRole: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return reply.send({ users });
  });

  // GET /api/admin/users/:id - Get single user
  fastify.get<{ Params: UserParams }>('/users/:id', async (request, reply) => {
    const { id } = request.params;
    
    const user = await prismaPrimary.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        roleId: true,
        disabled: true,
        createdAt: true,
        updatedAt: true,
        userRole: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    if (!user) {
      return reply.status(404).send({ error: 'User not found' });
    }

    return reply.send({ user });
  });

  // POST /api/admin/users - Create new user
  fastify.post<{ Body: CreateUserBody }>('/users', async (request, reply) => {
    const { email, password, name, roleId } = request.body;

    // Validate required fields
    if (!email || !password || !name || !roleId) {
      return reply.status(400).send({ error: 'Email, password, name, and roleId are required' });
    }

    // Check if email already exists
    const existingUser = await prismaPrimary.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return reply.status(400).send({ error: 'Email already in use' });
    }

    // Verify role exists
    const roleExists = await prismaPrimary.role.findUnique({
      where: { id: roleId },
    });

    if (!roleExists) {
      return reply.status(400).send({ error: 'Invalid role' });
    }

    // Hash password
    const hashedPassword = await new Argon2id().hash(password);
    const userId = generateId(15);

    // Create user - set both role (deprecated) and roleId for migration compatibility
    const user = await prismaPrimary.user.create({
      data: {
        id: userId,
        email,
        hashedPassword,
        name,
        role: roleExists.code,
        roleId,
        disabled: false,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        roleId: true,
        disabled: true,
        createdAt: true,
        userRole: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    return reply.status(201).send({ user });
  });

  // PUT /api/admin/users/:id - Update user
  fastify.put<{ Params: UserParams; Body: UpdateUserBody }>('/users/:id', async (request, reply) => {
    const { id } = request.params;
    const { email, name, roleId, disabled } = request.body;

    // Check user exists
    const existingUser = await prismaPrimary.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return reply.status(404).send({ error: 'User not found' });
    }

    // If changing email, check it's not already in use
    if (email && email !== existingUser.email) {
      const emailInUse = await prismaPrimary.user.findUnique({
        where: { email },
      });
      if (emailInUse) {
        return reply.status(400).send({ error: 'Email already in use' });
      }
    }

    // If changing role, verify it exists and update both role and roleId
    let roleCode: string | undefined;
    if (roleId !== undefined) {
      const newRole = await prismaPrimary.role.findUnique({
        where: { id: roleId },
      });
      if (!newRole) {
        return reply.status(400).send({ error: 'Invalid role' });
      }
      roleCode = newRole.code;
    }

    // Build update data
    const updateData: any = {};
    if (email !== undefined) updateData.email = email;
    if (name !== undefined) updateData.name = name;
    if (roleId !== undefined) {
      updateData.roleId = roleId;
      updateData.role = roleCode; // Keep deprecated field in sync
    }
    if (disabled !== undefined) updateData.disabled = disabled;

    const user = await prismaPrimary.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        roleId: true,
        disabled: true,
        createdAt: true,
        updatedAt: true,
        userRole: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    return reply.send({ user });
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

    // Optionally invalidate all sessions for this user
    await prismaPrimary.session.deleteMany({
      where: { userId: id },
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
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        roleId: true,
        disabled: true,
        userRole: {
          select: {
            name: true,
          },
        },
      },
    });

    // Invalidate all sessions for disabled user
    await prismaPrimary.session.deleteMany({
      where: { userId: id },
    });

    return reply.send({ user, message: 'User disabled successfully' });
  });

  // POST /api/admin/users/:id/enable - Enable user
  fastify.post<{ Params: UserParams }>('/users/:id/enable', async (request, reply) => {
    const { id } = request.params;

    const user = await prismaPrimary.user.update({
      where: { id },
      data: { disabled: false },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        roleId: true,
        disabled: true,
        userRole: {
          select: {
            name: true,
          },
        },
      },
    });

    return reply.send({ user, message: 'User enabled successfully' });
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

    // Delete user (sessions will cascade delete due to FK constraint)
    await prismaPrimary.user.delete({
      where: { id },
    });

    return reply.send({ message: 'User deleted successfully' });
  });
}

