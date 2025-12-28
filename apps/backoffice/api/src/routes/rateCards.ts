import type { FastifyPluginAsync } from 'fastify';
import { prismaPrimary } from '../db/index.js';
import { RateCardService } from '../services/rateCardService.js';
import { requireAuth } from '../middleware/requirePermission.js';
import {
  createRateCardSchema,
  createAdjustmentSchema,
  updateRateCardSchema,
  addContractLinkSchema,
} from '../validation/rateCardSchema.js';

const rateCards: FastifyPluginAsync = async (fastify) => {
  const rateCardService = new RateCardService(prismaPrimary);

  // Get all rate cards for customer
  fastify.get('/customers/:customerId/rate-cards', {
    schema: {
      tags: ['rate-cards'],
      description: 'Get all rate card versions for a customer',
      params: {
        type: 'object',
        properties: {
          customerId: { type: 'string' },
        },
        required: ['customerId'],
      },
    },
  }, async (request) => {
    const { customerId } = request.params as { customerId: string };
    return rateCardService.getRateCardHistory(customerId);
  });

  // Get active rate card for customer
  fastify.get('/customers/:customerId/rate-cards/active', {
    schema: {
      tags: ['rate-cards'],
      description: 'Get currently active rate card for a customer',
      params: {
        type: 'object',
        properties: {
          customerId: { type: 'string' },
        },
        required: ['customerId'],
      },
    },
  }, async (request) => {
    const { customerId } = request.params as { customerId: string };
    return rateCardService.getActiveRateCard(customerId);
  });

  // Create NEW rate card (v1 - no parent)
  fastify.post('/customers/:customerId/rate-cards', {
    schema: {
      tags: ['rate-cards'],
      description: 'Create a brand new rate card (v1) for a customer',
      params: {
        type: 'object',
        properties: {
          customerId: { type: 'string' },
        },
        required: ['customerId'],
      },
      body: {
        type: 'object',
        properties: {
          effectiveDate: { type: 'string', format: 'date-time' },
          rates: { type: 'object' },
          billingCycles: { type: 'object' },
          minimumMonthlyCharge: { type: 'number' },
          basedOnTemplate: { type: 'string' },
          notes: { type: 'string' },
          contractIds: { type: 'array', items: { type: 'string' }, minItems: 1 },
        },
        required: ['effectiveDate', 'rates', 'contractIds'],
      },
    },
  }, async (request, reply) => {
    const { customerId } = request.params as { customerId: string };
    const userId = (request.user as any)?.id; // Optional, only if authenticated

    // Validate input
    const validatedInput = createRateCardSchema.parse(request.body);

    try {
      const rateCard = await rateCardService.createStandardRateCard(
        customerId,
        validatedInput,
        userId
      );

      return reply.code(201).send(rateCard);
    } catch (error) {
      return reply.code(400).send({ error: (error as Error).message });
    }
  });

  // Create ADJUSTMENT rate card for existing parent
  fastify.post('/rate-cards/:parentId/adjustments', {
    schema: {
      tags: ['rate-cards'],
      description: 'Create an adjustment rate card for an existing parent rate card',
      params: {
        type: 'object',
        properties: {
          parentId: { type: 'string' },
        },
        required: ['parentId'],
      },
      body: {
        type: 'object',
        properties: {
          effectiveDate: { type: 'string', format: 'date-time' },
          expiresDate: { type: 'string', format: 'date-time' },
          rates: { type: 'object' },
          billingCycles: { type: 'object' },
          minimumMonthlyCharge: { type: 'number' },
          notes: { type: 'string' },
          contractIds: { type: 'array', items: { type: 'string' } },
        },
        required: ['effectiveDate', 'rates'],
      },
    },
  }, async (request, reply) => {
    const { parentId } = request.params as { parentId: string };
    const userId = (request.user as any)?.id;

    // Validate input
    const validatedInput = createAdjustmentSchema.parse(request.body);

    try {
      const adjustmentCard = await rateCardService.createAdjustmentRateCard(
        parentId,
        validatedInput,
        userId
      );

      return reply.code(201).send(adjustmentCard);
    } catch (error) {
      return reply.code(400).send({ error: (error as Error).message });
    }
  });

  // Get specific rate card by ID
  fastify.get('/rate-cards/:id', {
    schema: {
      tags: ['rate-cards'],
      description: 'Get a specific rate card by ID',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
        required: ['id'],
      },
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const rateCard = await rateCardService.getRateCardById(id);

    if (!rateCard) {
      return reply.code(404).send({ error: 'Rate card not found' });
    }

    return rateCard;
  });

  // Edit rate card (creates new version with parent reference)
  fastify.put('/rate-cards/:id', {
    schema: {
      tags: ['rate-cards'],
      description: 'Edit a rate card (creates v2+ with parent reference)',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
        required: ['id'],
      },
      body: {
        type: 'object',
        properties: {
          effectiveDate: { type: 'string', format: 'date-time' },
          rates: { type: 'object' },
          billingCycles: { type: 'object' },
          minimumMonthlyCharge: { type: 'number', nullable: true },
          basedOnTemplate: { type: 'string', nullable: true },
          notes: { type: 'string' },
          contractIds: { type: 'array', items: { type: 'string' } },
        },
        required: ['effectiveDate'],
      },
    },
    preHandler: requireAuth,
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = (request.user as any).id; // Now guaranteed to exist due to authentication

    // Validate input
    const validatedInput = updateRateCardSchema.parse(request.body);

    try {
      const rateCard = await rateCardService.createRateCardVersion(id, validatedInput, userId);
      return rateCard;
    } catch (error) {
      return reply.code(400).send({ error: (error as Error).message });
    }
  });

  // Add contract to rate card
  fastify.post('/rate-cards/:id/contracts', {
    schema: {
      tags: ['rate-cards'],
      description: 'Link an additional contract to a rate card',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
        required: ['id'],
      },
      body: {
        type: 'object',
        properties: {
          contractId: { type: 'string' },
          linkType: { type: 'string', enum: ['primary', 'addendum', 'amendment'] },
          notes: { type: 'string' },
        },
        required: ['contractId', 'linkType'],
      },
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = (request.user as any)?.id; // Optional, only if authenticated

    // Validate input
    const validatedInput = addContractLinkSchema.parse(request.body);

    try {
      const link = await rateCardService.addContractLink(id, validatedInput, userId);
      return reply.code(201).send(link);
    } catch (error) {
      return reply.code(400).send({ error: (error as Error).message });
    }
  });

  // Remove contract from rate card
  fastify.delete('/rate-cards/:id/contracts/:contractId', {
    schema: {
      tags: ['rate-cards'],
      description: 'Remove a contract link from a rate card',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          contractId: { type: 'string' },
        },
        required: ['id', 'contractId'],
      },
    },
  }, async (request, reply) => {
    const { id, contractId } = request.params as { id: string; contractId: string };

    try {
      await rateCardService.removeContractLink(id, contractId);
      return reply.code(204).send();
    } catch (error) {
      return reply.code(400).send({ error: (error as Error).message });
    }
  });

  // Deactivate rate card
  fastify.post('/rate-cards/:id/deactivate', {
    schema: {
      tags: ['rate-cards'],
      description: 'Deactivate a rate card (expire it immediately)',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
        required: ['id'],
      },
    },
  }, async (request) => {
    const { id } = request.params as { id: string };
    return rateCardService.deactivateRateCard(id);
  });

  // Archive (soft delete) rate card
  fastify.delete('/rate-cards/:id', {
    schema: {
      tags: ['rate-cards'],
      description: 'Archive (soft delete) a rate card following the app\'s deletion philosophy',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
        required: ['id'],
      },
      body: {
        type: 'object',
        properties: {
          reason: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { reason } = (request.body as any) || {};
    const userId = (request.user as any)?.id;

    if (!userId) {
      return reply.code(401).send({ error: 'Authentication required to archive rate cards' });
    }

    const rateCard = await rateCardService.archiveRateCard(id, userId, reason);
    return reply.code(200).send(rateCard);
  });

  // Restore archived rate card
  fastify.post('/rate-cards/:id/restore', {
    schema: {
      tags: ['rate-cards'],
      description: 'Restore an archived rate card',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
        required: ['id'],
      },
    },
  }, async (request) => {
    const { id } = request.params as { id: string };
    return rateCardService.restoreRateCard(id);
  });
};

export default rateCards;

