import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { lucia } from '../auth/lucia.js';
import { hashPassword, verifyPassword } from '../auth/password.js';
import { prismaPrimary } from '../db/index.js';
import { sessionCache } from '../db/session-cache.js';
import { generateId } from 'lucia';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
});

export async function authRoutes(fastify: FastifyInstance) {
  // Login
  fastify.post('/login', {
    schema: { tags: ['Auth'] }
  }, async (request, reply) => {
    const body = loginSchema.parse(request.body);

    const user = await prismaPrimary.user.findUnique({
      where: { email: body.email },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  where: { granted: true },
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      return reply.status(401).send({ error: 'Invalid email or password' });
    }

    if (user.disabled) {
      return reply.status(403).send({ error: 'Account is disabled' });
    }

    const validPassword = await verifyPassword(user.hashedPassword, body.password);
    if (!validPassword) {
      return reply.status(401).send({ error: 'Invalid email or password' });
    }

    const session = await lucia.createSession(user.id, {});
    const sessionCookie = lucia.createSessionCookie(session.id);

    // Flatten permissions from ALL roles (UNION)
    const permissionsSet = new Set<string>();
    for (const userRole of user.userRoles) {
      for (const rolePerm of userRole.role.rolePermissions) {
        permissionsSet.add(rolePerm.permission.code);
      }
    }
    const permissions = Array.from(permissionsSet);
    const isAdmin = user.userRoles.some(ur => ur.role.code === 'admin');

    reply.setCookie(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);
    return { 
      user: { 
        id: user.id, 
        email: user.email, 
        name: user.name, 
        roles: user.userRoles.map(ur => ({
          id: ur.role.id,
          code: ur.role.code,
          name: ur.role.name
        })),
        permissions,
        isAdmin
      } 
    };
  });

  // Register (admin only in production, open in dev)
  fastify.post('/register', {
    schema: { tags: ['Auth'] }
  }, async (request, reply) => {
    const body = registerSchema.parse(request.body);

    const existingUser = await prismaPrimary.user.findUnique({
      where: { email: body.email },
    });

    if (existingUser) {
      return reply.status(400).send({ error: 'Email already registered' });
    }

    // Get admin role
    const adminRole = await prismaPrimary.role.findUnique({
      where: { code: 'admin' },
      include: {
        rolePermissions: {
          where: { granted: true },
          include: {
            permission: true,
          },
        },
      },
    });

    if (!adminRole) {
      return reply.status(500).send({ error: 'Admin role not found. Run migrations.' });
    }

    const hashedPassword = await hashPassword(body.password);
    const userId = generateId(15);

    const user = await prismaPrimary.user.create({
      data: {
        id: userId,
        email: body.email,
        hashedPassword,
        name: body.name,
        userRoles: {
          create: {
            roleId: adminRole.id
          }
        }
      },
      include: {
        userRoles: {
          include: {
            role: true
          }
        }
      }
    });

    const session = await lucia.createSession(user.id, {});
    const sessionCookie = lucia.createSessionCookie(session.id);

    const permissions = adminRole.rolePermissions.map(rp => rp.permission.code);

    reply.setCookie(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);
    return { 
      user: { 
        id: user.id, 
        email: user.email, 
        name: user.name, 
        roles: user.userRoles.map(ur => ({
          id: ur.role.id,
          code: ur.role.code,
          name: ur.role.name
        })),
        permissions,
        isAdmin: true
      } 
    };
  });

  // Logout
  fastify.post('/logout', {
    schema: { tags: ['Auth'] }
  }, async (request, reply) => {
    const sessionId = lucia.readSessionCookie(request.headers.cookie ?? '');
    
    if (sessionId) {
      await lucia.invalidateSession(sessionId);
      // Invalidate session cache
      sessionCache.invalidate(sessionId);
    }

    const blankCookie = lucia.createBlankSessionCookie();
    reply.setCookie(blankCookie.name, blankCookie.value, blankCookie.attributes);
    return { success: true };
  });

  // Get current user
  fastify.get('/me', {
    schema: { tags: ['Auth'] }
  }, async (request, reply) => {
    const sessionId = lucia.readSessionCookie(request.headers.cookie ?? '');
    
    if (!sessionId) {
      return reply.status(401).send({ error: 'Not authenticated' });
    }

    // Use cache to reduce PRIMARY DB load
    const sessionData = await sessionCache.get(
      sessionId,
      () => lucia.validateSession(sessionId)
    );
    
    if (!sessionData || !sessionData.session || !sessionData.user) {
      return reply.status(401).send({ error: 'Invalid session' });
    }

    const { user: sessionUser } = sessionData;

    // Fetch user with ALL roles and permissions
    const user = await prismaPrimary.user.findUnique({
      where: { id: sessionUser.id },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  where: { granted: true },
                  include: {
                    permission: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!user) {
      return reply.status(404).send({ error: 'User not found' });
    }

    if (user.disabled) {
      return reply.status(403).send({ error: 'Account is disabled' });
    }

    // Flatten permissions from ALL roles (UNION)
    const permissionsSet = new Set<string>();
    
    for (const userRole of user.userRoles) {
      for (const rolePerm of userRole.role.rolePermissions) {
        permissionsSet.add(rolePerm.permission.code);
      }
    }
    
    const permissions = Array.from(permissionsSet);

    // Check if user has admin role
    const isAdmin = user.userRoles.some(ur => ur.role.code === 'admin');

    return reply.send({
      id: user.id,
      email: user.email,
      name: user.name,
      // NEW: Array of roles instead of single role
      roles: user.userRoles.map(ur => ({
        id: ur.role.id,
        code: ur.role.code,
        name: ur.role.name
      })),
      permissions,
      isAdmin
    });
  });

  // Update profile
  fastify.put('/profile', {
    schema: { tags: ['Auth'] }
  }, async (request, reply) => {
    const sessionId = lucia.readSessionCookie(request.headers.cookie ?? '');
    
    if (!sessionId) {
      return reply.status(401).send({ error: 'Not authenticated' });
    }

    const sessionData = await sessionCache.get(
      sessionId,
      () => lucia.validateSession(sessionId)
    );

    if (!sessionData || !sessionData.session || !sessionData.user) {
      return reply.status(401).send({ error: 'Invalid session' });
    }

    const { user: sessionUser } = sessionData;

    const body = request.body as { name?: string };

    if (!body.name || !body.name.trim()) {
      return reply.status(400).send({ error: 'Name is required' });
    }

    // Update user
    const updatedUser = await prismaPrimary.user.update({
      where: { id: sessionUser.id },
      data: { name: body.name.trim() },
      include: {
        userRoles: {
          include: {
            role: true
          }
        }
      }
    });

    // Invalidate session cache to force refresh
    sessionCache.invalidate(sessionId);

    return reply.send({
      message: 'Profile updated successfully',
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
      }
    });
  });

  // Change password
  fastify.post('/change-password', {
    schema: { tags: ['Auth'] }
  }, async (request, reply) => {
    const sessionId = lucia.readSessionCookie(request.headers.cookie ?? '');
    
    if (!sessionId) {
      return reply.status(401).send({ error: 'Not authenticated' });
    }

    const sessionData = await sessionCache.get(
      sessionId,
      () => lucia.validateSession(sessionId)
    );

    if (!sessionData || !sessionData.session || !sessionData.user) {
      return reply.status(401).send({ error: 'Invalid session' });
    }

    const { user: sessionUser } = sessionData;

    const body = request.body as { currentPassword?: string; newPassword?: string };

    // Validate input
    if (!body.currentPassword || !body.newPassword) {
      return reply.status(400).send({ error: 'Current and new passwords are required' });
    }

    if (body.newPassword.length < 8) {
      return reply.status(400).send({ error: 'New password must be at least 8 characters' });
    }

    // Get user with hashed password
    const user = await prismaPrimary.user.findUnique({
      where: { id: sessionUser.id }
    });

    if (!user) {
      return reply.status(404).send({ error: 'User not found' });
    }

    // Verify current password
    const validPassword = await verifyPassword(user.hashedPassword, body.currentPassword);
    
    if (!validPassword) {
      return reply.status(400).send({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const hashedPassword = await hashPassword(body.newPassword);

    // Update password
    await prismaPrimary.user.update({
      where: { id: user.id },
      data: { hashedPassword }
    });

    // Invalidate all user sessions (force re-login on other devices)
    await lucia.invalidateUserSessions(user.id);

    return reply.send({ message: 'Password changed successfully. Please login again.' });
  });
}

