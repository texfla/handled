import { FastifyRequest, FastifyReply } from 'fastify';
import { lucia } from '../auth/lucia.js';
import { prismaPrimary } from '../db/index.js';
import { sessionCache } from '../db/session-cache.js';

// User type is already declared in requirePermission.ts
// This file uses the same user type for consistency

export async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
  // Read session from cookie
  const sessionId = lucia.readSessionCookie(request.headers.cookie ?? '');
  
  if (!sessionId) {
    return reply.status(401).send({ error: 'Authentication required' });
  }

  // Validate session with cache
  const { session, user: sessionUser } = await sessionCache.get(
    sessionId,
    () => lucia.validateSession(sessionId)
  );
  
  if (!session) {
    return reply.status(401).send({ error: 'Invalid session' });
  }

  // Get full user from database to check role and disabled status (PRIMARY DB)
  const user = await prismaPrimary.user.findUnique({
    where: { id: sessionUser.id },
    include: {
      userRole: true,
    },
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
    roleId: user.userRole.id,
    roleName: user.userRole.name,
    roleCode: user.userRole.code,
    permissions: [], // Will be loaded by requirePermission middleware if needed
  };
}

