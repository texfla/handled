import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { lucia } from '../auth/lucia.js';
import { hashPassword, verifyPassword } from '../auth/password.js';
import { prisma } from '../db/index.js';
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

    const user = await prisma.user.findUnique({
      where: { email: body.email },
    });

    if (!user) {
      return reply.status(401).send({ error: 'Invalid email or password' });
    }

    const validPassword = await verifyPassword(user.hashedPassword, body.password);
    if (!validPassword) {
      return reply.status(401).send({ error: 'Invalid email or password' });
    }

    const session = await lucia.createSession(user.id, {});
    const sessionCookie = lucia.createSessionCookie(session.id);

    reply.setCookie(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);
    return { user: { id: user.id, email: user.email, name: user.name, role: user.role } };
  });

  // Register (admin only in production, open in dev)
  fastify.post('/register', async (request, reply) => {
    const body = registerSchema.parse(request.body);

    const existingUser = await prisma.user.findUnique({
      where: { email: body.email },
    });

    if (existingUser) {
      return reply.status(400).send({ error: 'Email already registered' });
    }

    const hashedPassword = await hashPassword(body.password);
    const userId = generateId(15);

    const user = await prisma.user.create({
      data: {
        id: userId,
        email: body.email,
        hashedPassword,
        name: body.name,
        role: 'admin', // Default role
      },
    });

    const session = await lucia.createSession(user.id, {});
    const sessionCookie = lucia.createSessionCookie(session.id);

    reply.setCookie(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);
    return { user: { id: user.id, email: user.email, name: user.name, role: user.role } };
  });

  // Logout
  fastify.post('/logout', async (request, reply) => {
    const sessionId = lucia.readSessionCookie(request.headers.cookie ?? '');
    
    if (sessionId) {
      await lucia.invalidateSession(sessionId);
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

    const { session, user } = await lucia.validateSession(sessionId);
    
    if (!session) {
      return reply.status(401).send({ error: 'Invalid session' });
    }

    return { user: { id: user.id, email: user.email, name: user.name, role: user.role } };
  });
}

