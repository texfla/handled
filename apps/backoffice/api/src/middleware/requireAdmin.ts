import { FastifyRequest, FastifyReply } from 'fastify';
import { prismaPrimary } from '../db/index.js';
import { sessionCache } from '../db/session-cache.js';
import { lucia } from '../auth/lucia.js';

export async function requireAdmin(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const sessionId = lucia.readSessionCookie(request.headers.cookie ?? '');
  
  if (!sessionId) {
    return reply.status(401).send({ error: 'Not authenticated' });
  }

  const { session, user: sessionUser } = await sessionCache.get(
    sessionId,
    () => lucia.validateSession(sessionId)
  );

  if (!session || !sessionUser) {
    return reply.status(401).send({ error: 'Invalid session' });
  }

  const user = await prismaPrimary.user.findUnique({
    where: { id: sessionUser.id },
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

  // CHANGED: Check if ANY role is admin
  const isAdmin = user.userRoles.some(ur => ur.role.code === 'admin');

  if (!isAdmin) {
    return reply.status(403).send({ error: 'Admin access required' });
  }

  // Attach user to request
  request.user = {
    id: user.id,
    email: user.email,
    name: user.name,
    permissions: [], // Loaded separately if needed
    isAdmin: true
  };
}

