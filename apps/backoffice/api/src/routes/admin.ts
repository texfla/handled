import { FastifyInstance } from 'fastify';
import { prisma } from '../db/index.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import { Argon2id } from 'oslo/password';
import { generateId } from 'lucia';

interface CreateUserBody {
  email: string;
  password: string;
  name: string;
  role?: string;
}

interface UpdateUserBody {
  email?: string;
  name?: string;
  role?: string;
  disabled?: boolean;
}

interface ResetPasswordBody {
  newPassword: string;
}

interface UserParams {
  id: string;
}

export async function adminRoutes(fastify: FastifyInstance) {
  // Apply admin middleware to all routes in this plugin
  fastify.addHook('preHandler', requireAdmin);

  // GET /api/admin/users - List all users
  fastify.get('/users', async (_request, reply) => {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        disabled: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return reply.send({ users });
  });

  // GET /api/admin/users/:id - Get single user
  fastify.get<{ Params: UserParams }>('/users/:id', async (request, reply) => {
    const { id } = request.params;
    
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        disabled: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return reply.status(404).send({ error: 'User not found' });
    }

    return reply.send({ user });
  });

  // POST /api/admin/users - Create new user
  fastify.post<{ Body: CreateUserBody }>('/users', async (request, reply) => {
    const { email, password, name, role = 'admin' } = request.body;

    // Validate required fields
    if (!email || !password || !name) {
      return reply.status(400).send({ error: 'Email, password, and name are required' });
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return reply.status(400).send({ error: 'Email already in use' });
    }

    // Hash password
    const hashedPassword = await new Argon2id().hash(password);
    const userId = generateId(15);

    // Create user
    const user = await prisma.user.create({
      data: {
        id: userId,
        email,
        hashedPassword,
        name,
        role,
        disabled: false,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        disabled: true,
        createdAt: true,
      },
    });

    return reply.status(201).send({ user });
  });

  // PUT /api/admin/users/:id - Update user
  fastify.put<{ Params: UserParams; Body: UpdateUserBody }>('/users/:id', async (request, reply) => {
    const { id } = request.params;
    const { email, name, role, disabled } = request.body;

    // Check user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return reply.status(404).send({ error: 'User not found' });
    }

    // If changing email, check it's not already in use
    if (email && email !== existingUser.email) {
      const emailInUse = await prisma.user.findUnique({
        where: { email },
      });
      if (emailInUse) {
        return reply.status(400).send({ error: 'Email already in use' });
      }
    }

    // Build update data
    const updateData: Partial<UpdateUserBody> = {};
    if (email !== undefined) updateData.email = email;
    if (name !== undefined) updateData.name = name;
    if (role !== undefined) updateData.role = role;
    if (disabled !== undefined) updateData.disabled = disabled;

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        disabled: true,
        createdAt: true,
        updatedAt: true,
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
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return reply.status(404).send({ error: 'User not found' });
    }

    // Hash new password
    const hashedPassword = await new Argon2id().hash(newPassword);

    await prisma.user.update({
      where: { id },
      data: { hashedPassword },
    });

    // Optionally invalidate all sessions for this user
    await prisma.session.deleteMany({
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

    const user = await prisma.user.update({
      where: { id },
      data: { disabled: true },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        disabled: true,
      },
    });

    // Invalidate all sessions for disabled user
    await prisma.session.deleteMany({
      where: { userId: id },
    });

    return reply.send({ user, message: 'User disabled successfully' });
  });

  // POST /api/admin/users/:id/enable - Enable user
  fastify.post<{ Params: UserParams }>('/users/:id/enable', async (request, reply) => {
    const { id } = request.params;

    const user = await prisma.user.update({
      where: { id },
      data: { disabled: false },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        disabled: true,
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
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return reply.status(404).send({ error: 'User not found' });
    }

    // Delete user (sessions will cascade delete due to FK constraint)
    await prisma.user.delete({
      where: { id },
    });

    return reply.send({ message: 'User deleted successfully' });
  });
}

