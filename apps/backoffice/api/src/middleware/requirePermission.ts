import { FastifyRequest, FastifyReply } from 'fastify';
import { lucia } from '../auth/lucia.js';
import { prismaPrimary } from '../db/index.js';
import { sessionCache } from '../db/session-cache.js';
import { hasEffectivePermission } from './permissions.js';
import type { Permission } from '../auth/permissions.js';

declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      id: string;
      email: string;
      name: string;
      permissions: string[];
      isAdmin: boolean;
    };
  }
}

/**
 * Load user with roles and permissions into request
 */
async function loadUserWithPermissions(request: FastifyRequest, reply: FastifyReply) {
  // Read session from cookie
  const sessionId = lucia.readSessionCookie(request.headers.cookie ?? '');
  
  if (!sessionId) {
    return reply.status(401).send({ error: 'Authentication required' });
  }

  // Validate session with cache
  const sessionData = await sessionCache.get(
    sessionId,
    () => lucia.validateSession(sessionId)
  );
  
  if (!sessionData || !sessionData.session || !sessionData.user) {
    return reply.status(401).send({ error: 'Invalid session' });
  }

  const { user: sessionUser } = sessionData;

  // Fetch user with roles and permissions
  const user = await prismaPrimary.user.findUnique({
    where: { id: sessionUser.id },
    include: {
      userRoles: {
        include: {
          role: {
            include: {
              rolePermissions: {
                where: { granted: true },
                include: { permission: true }
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

  // Flatten permissions from all roles
  const permissionsSet = new Set<string>();
  for (const userRole of user.userRoles) {
    for (const rolePerm of userRole.role.rolePermissions) {
      permissionsSet.add(rolePerm.permission.code);
    }
  }
  const permissions = Array.from(permissionsSet);

  // Attach user to request
  request.user = {
    id: user.id,
    email: user.email,
    name: user.name,
    permissions,
    isAdmin: user.userRoles.some(ur => ur.role.code === 'admin')
  };
}

/**
 * Middleware: Require specific permission (with implications)
 */
export function requirePermission(permission: Permission | string) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    // Load user if not already loaded
    if (!request.user) {
      await loadUserWithPermissions(request, reply);
      if (reply.sent) return; // Error response already sent
    }

    // Check permission with implications
    const hasAccess = hasEffectivePermission(request.user!.permissions, permission);

    if (!hasAccess) {
      return reply.status(403).send({ 
        error: 'Forbidden',
        message: `This action requires the '${permission}' permission`
      });
    }
  };
}

/**
 * Middleware: Require ANY of the specified permissions (OR logic with implications)
 */
export function requireAnyPermission(...permissions: (Permission | string)[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    // Load user if not already loaded
    if (!request.user) {
      await loadUserWithPermissions(request, reply);
      if (reply.sent) return;
    }

    // Check if user has at least one permission (with implications)
    const hasAny = permissions.some(p => hasEffectivePermission(request.user!.permissions, p));
    
    if (!hasAny) {
      return reply.status(403).send({ 
        error: 'Permission denied',
        required: `Any of: ${permissions.join(', ')}`,
      });
    }
  };
}

/**
 * Middleware: Require ALL specified permissions (AND logic with implications)
 */
export function requireAllPermissions(...permissions: (Permission | string)[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    // Load user if not already loaded
    if (!request.user) {
      await loadUserWithPermissions(request, reply);
      if (reply.sent) return;
    }

    // Check if user has all permissions (with implications)
    const missingPermissions = permissions.filter(
      p => !hasEffectivePermission(request.user!.permissions, p)
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
 * Middleware: Require admin role (checks if ANY role is admin)
 * Admin role should have all permissions, but this provides a shortcut
 */
export async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
  // Load user if not already loaded
  if (!request.user) {
    await loadUserWithPermissions(request, reply);
    if (reply.sent) return;
  }

  // Check if user has admin role
  if (!request.user!.isAdmin) {
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

