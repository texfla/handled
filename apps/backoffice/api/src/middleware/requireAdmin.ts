import { FastifyRequest, FastifyReply } from 'fastify';
import { lucia } from '../auth/lucia.js';
import { prisma } from '../db/index.js';

declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      id: string;
      email: string;
      name: string;
      role: string;
    };
  }
}

export async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
  // Read session from cookie
  const sessionId = lucia.readSessionCookie(request.headers.cookie ?? '');
  
  if (!sessionId) {
    return reply.status(401).send({ error: 'Authentication required' });
  }

  // Validate session
  const { session, user: sessionUser } = await lucia.validateSession(sessionId);
  
  if (!session) {
    return reply.status(401).send({ error: 'Invalid session' });
  }

  // Get full user from database to check role and disabled status
  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
  });

  if (!user) {
    return reply.status(401).send({ error: 'User not found' });
  }

  if (user.disabled) {
    return reply.status(403).send({ error: 'Account is disabled' });
  }

  if (user.role !== 'admin') {
    return reply.status(403).send({ error: 'Admin access required' });
  }

  // Attach user to request for downstream handlers
  request.user = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}

