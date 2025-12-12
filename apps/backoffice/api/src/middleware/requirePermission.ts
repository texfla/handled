import { FastifyRequest, FastifyReply } from 'fastify';
import { lucia } from '../auth/lucia.js';
import { prismaPrimary } from '../db/index.js';
import { sessionCache } from '../db/session-cache.js';
import type { Permission } from '../auth/permissions.js';

declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      id: string;
      email: string;
      name: string;
      roleId: number;
      roleName: string;
      roleCode: string;
      permissions: string[];
    };
  }
}

/**
 * Load user with role and permissions into request
 */
async function loadUserWithPermissions(request: FastifyRequest, reply: FastifyReply) {
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

  // Get full user with role and permissions from PRIMARY DB
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

  // Extract permissions
  const permissions = user.userRole.rolePermissions.map(rp => rp.permission.code);

  // Attach enriched user to request
  request.user = {
    id: user.id,
    email: user.email,
    name: user.name,
    roleId: user.userRole.id,
    roleName: user.userRole.name,
    roleCode: user.userRole.code,
    permissions,
  };
}

/**
 * Middleware: Require specific permission
 */
export function requirePermission(permission: Permission | string) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    // Load user if not already loaded
    if (!request.user) {
      await loadUserWithPermissions(request, reply);
      if (reply.sent) return; // Error response already sent
    }

    // Check permission
    if (!request.user!.permissions.includes(permission)) {
      return reply.status(403).send({ 
        error: 'Permission denied',
        required: permission,
      });
    }
  };
}

/**
 * Middleware: Require ANY of the specified permissions (OR logic)
 */
export function requireAnyPermission(...permissions: (Permission | string)[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    // Load user if not already loaded
    if (!request.user) {
      await loadUserWithPermissions(request, reply);
      if (reply.sent) return;
    }

    // Check if user has at least one permission
    const hasAny = permissions.some(p => request.user!.permissions.includes(p));
    
    if (!hasAny) {
      return reply.status(403).send({ 
        error: 'Permission denied',
        required: `Any of: ${permissions.join(', ')}`,
      });
    }
  };
}

/**
 * Middleware: Require ALL specified permissions (AND logic)
 */
export function requireAllPermissions(...permissions: (Permission | string)[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    // Load user if not already loaded
    if (!request.user) {
      await loadUserWithPermissions(request, reply);
      if (reply.sent) return;
    }

    // Check if user has all permissions
    const missingPermissions = permissions.filter(
      p => !request.user!.permissions.includes(p)
    );
    
    if (missingPermissions.length > 0) {
      return reply.status(403).send({ 
        error: 'Permission denied',
        missing: missingPermissions,
      });
    }
  };
}

/**
 * Middleware: Require admin role (backward compatible)
 * Admin role should have all permissions, but this provides a shortcut
 */
export async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
  // Load user if not already loaded
  if (!request.user) {
    await loadUserWithPermissions(request, reply);
    if (reply.sent) return;
  }

  // Check if user has admin role
  if (request.user!.roleCode !== 'admin') {
    return reply.status(403).send({ error: 'Admin access required' });
  }
}

/**
 * Middleware: Just authenticate user (no permission check)
 * Useful for routes that need user info but no specific permission
 */
export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  if (!request.user) {
    await loadUserWithPermissions(request, reply);
  }
}

