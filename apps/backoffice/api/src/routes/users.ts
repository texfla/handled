import { FastifyPluginAsync } from 'fastify';
import { prismaPrimary } from '../db';
import { checkEvidentaryValue } from '../services/usage-detection.js';

export const usersRoutes: FastifyPluginAsync = async (fastify) => {
  // DELETE /api/users/:id - Smart delete for users
  fastify.delete('/:id', {
    schema: { tags: ['Users'] }  // ← Creates "Roles" header
  },async (request, reply) => {
    const { id } = request.params as { id: string };
    const { reason } = (request.body || {}) as { reason?: string };

    // Check if user has evidentiary value
    const valueCheck = await checkEvidentaryValue('user', id);

    if (valueCheck.hasValue) {
      return reply.status(409).send({
        error: 'Cannot delete user with activity',
        reason: valueCheck.reason,
        details: valueCheck.details,
        suggestion: {
          action: 'disable',
          message: 'This user has activity or audit trail records. Please disable instead.',
          endpoint: `PATCH /api/users/${id}`,
          payload: { 
            disabled: true
          }
        }
      });
    }

    // Safe to soft-delete (test account with no activity)
    await prismaPrimary.user.update({
      where: { id },
      data: {
        deleted: true,
        deletedAt: new Date(),
        deletedBy: (request as any).user?.id || null,
        deletedReason: reason || 'Test account with no activity - safe to purge'
      }
    });

    return reply.status(204).send();
  });
};

