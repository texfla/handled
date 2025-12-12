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
  fastify.post('/login', async (request, reply) => {
    const body = loginSchema.parse(request.body);

    const user = await prismaPrimary.user.findUnique({
      where: { email: body.email },
      include: {
        userRole: {
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

    const permissions = user.userRole.rolePermissions.map(rp => rp.permission.code);

    reply.setCookie(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);
    return { 
      user: { 
        id: user.id, 
        email: user.email, 
        name: user.name, 
        role: user.role,
        roleId: user.roleId,
        roleName: user.userRole.name,
        roleCode: user.userRole.code,
        permissions,
      } 
    };
  });

  // Register (admin only in production, open in dev)
  fastify.post('/register', async (request, reply) => {
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
        role: 'admin', // Deprecated field
        roleId: adminRole.id,
      },
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
        role: user.role,
        roleId: user.roleId,
        roleName: adminRole.name,
        roleCode: adminRole.code,
        permissions,
      } 
    };
  });

  // Logout
  fastify.post('/logout', async (request, reply) => {
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
  fastify.get('/me', async (request, reply) => {
    const sessionId = lucia.readSessionCookie(request.headers.cookie ?? '');
    
    if (!sessionId) {
      return reply.status(401).send({ error: 'Not authenticated' });
    }

    // Use cache to reduce PRIMARY DB load
    const { session, user: sessionUser } = await sessionCache.get(
      sessionId,
      () => lucia.validateSession(sessionId)
    );
    
    if (!session) {
      return reply.status(401).send({ error: 'Invalid session' });
    }

    // Get full user with permissions
    const user = await prismaPrimary.user.findUnique({
      where: { id: sessionUser.id },
      include: {
        userRole: {
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
    });

    if (!user) {
      return reply.status(401).send({ error: 'User not found' });
    }

    if (user.disabled) {
      return reply.status(403).send({ error: 'Account is disabled' });
    }

    const permissions = user.userRole.rolePermissions.map(rp => rp.permission.code);

    return { 
      user: { 
        id: user.id, 
        email: user.email, 
        name: user.name, 
        role: user.role,
        roleId: user.roleId,
        roleName: user.userRole.name,
        roleCode: user.userRole.code,
        permissions,
      } 
    };
  });
}

