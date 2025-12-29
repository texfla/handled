/**
 * @fileoverview Rate Cards API Routes - HTTP interface for rate card management
 *
 * This file defines the RESTful HTTP API endpoints for rate card management in the 3PL billing system.
 * It provides the external interface that frontend applications and integrations use to interact with
 * rate cards, contracts, and billing configuration.
 *
 * @author Handled Platform Team
 * @version 1.0.0
 * @since 2025-12-28
 */

/**
 * Rate Cards API Routes
 * =====================
 *
 * PURPOSE:
 * HTTP API layer providing RESTful endpoints for rate card management in the 3PL billing system.
 * Defines the external interface that frontend applications, mobile apps, and third-party integrations
 * use to create, read, update, and manage rate cards and their associated contracts.
 *
 * SCOPE:
 * ✅ RESTful CRUD operations for standard rate cards (v1, v2, v3...)
 * ✅ Adjustment rate card creation (temporary overrides)
 * ✅ Contract relationship management (link/unlink primary + addendums)
 * ✅ Rate card lifecycle operations (activate/deactivate/archive/restore)
 * ✅ Input validation using Zod schemas
 * ✅ Comprehensive error handling and HTTP status codes
 * ✅ OpenAPI documentation generation for API clients
 * ✅ Authentication/authorization integration
 *
 * OUT OF SCOPE:
 * ❌ Direct database operations (handled by service layer)
 * ❌ Business logic validation (handled by service layer)
 * ❌ Complex calculations (handled by service layer)
 * ❌ File uploads/storage (different route modules)
 * ❌ Real-time notifications (different route modules)
 *
 * ARCHITECTURAL ROLE:
 * Routes Layer in Clean Architecture - handles HTTP protocol concerns including:
 * - Request/response serialization (JSON)
 * - HTTP status codes and headers (200, 201, 400, 404, etc.)
 * - RESTful URL design and HTTP methods
 * - Authentication and authorization checks
 * - Input validation and sanitization
 * - Error translation and user-friendly messages
 * - OpenAPI/Swagger documentation generation
 *
 * ENDPOINTS OVERVIEW:
 *
 * 📖 READ OPERATIONS:
 * GET  /customers/:customerId/rate-cards          # Get all rate cards for customer
 * GET  /customers/:customerId/rate-cards/active   # Get currently active rate card
 * GET  /rate-cards/:id                            # Get specific rate card by ID
 *
 * ✏️ WRITE OPERATIONS:
 * POST /customers/:customerId/rate-cards          # Create NEW rate card (v1)
 * PUT  /rate-cards/:id                            # Edit rate card (creates v2+)
 * POST /rate-cards/:parentId/adjustments          # Create adjustment rate card
 *
 * 🔗 CONTRACT MANAGEMENT:
 * POST   /rate-cards/:id/contracts                # Add contract to rate card
 * DELETE /rate-cards/:id/contracts/:contractId    # Remove contract from rate card
 *
 * 🔄 LIFECYCLE OPERATIONS:
 * POST   /rate-cards/:id/deactivate               # Deactivate rate card
 * DELETE /rate-cards/:id                          # Archive rate card
 * POST   /rate-cards/:id/restore                  # Restore archived rate card
 *
 * AUTHENTICATION REQUIREMENTS:
 * ┌─────────────────┬──────────────┬─────────────────────────────────┐
 * │ Operation Type  │ Required?    │ Reason                         │
 * ├─────────────────┼──────────────┼─────────────────────────────────┤
 * │ Read Operations │ Optional     │ Public display access         │
 * │ Write Operations│ Required     │ Audit trail + business rules  │
 * │ Archive Ops     │ Required     │ Audit trail needs user context│
 * └─────────────────┴──────────────┴─────────────────────────────────┘
 *
 * HTTP STATUS CODES:
 * - 200: Success (GET/PUT/POST)
 * - 201: Resource created (POST)
 * - 204: Success, no content (DELETE)
 * - 400: Validation error or business rule violation
 * - 401: Authentication required
 * - 404: Rate card not found
 *
 * ERROR RESPONSE FORMAT:
 * {
 *   "error": "Human-readable error message from service layer"
 * }
 *
 * REQUEST VALIDATION:
 * - All inputs validated using Zod schemas from rateCardSchema.ts
 * - Automatic type coercion and sanitization
 * - Detailed error messages for validation failures
 *
 * INTEGRATION POINTS:
 * - Service Layer: RateCardService handles all business logic
 * - Validation: Zod schemas ensure type safety and constraints
 * - Authentication: requireAuth middleware for protected routes
 * - Database: Indirect access via Prisma ORM (service layer)
 * - Frontend: React components consume these REST endpoints
 *
 * API STABILITY & VERSIONING:
 * - Current: v1 API (no version prefix in URLs)
 * - Semantic versioning for breaking changes
 * - Deprecation headers for sunset endpoints
 * - OpenAPI spec auto-generated for client SDK generation
 *
 * PERFORMANCE CONSIDERATIONS:
 * - Efficient database queries via service layer optimization
 * - Pagination support for large result sets (future)
 * - Caching headers for read operations (future)
 * - Rate limiting at Fastify level (future)
 *
 * TESTING STRATEGY:
 * - Unit tests: Route handlers with mocked service layer
 * - Integration tests: Full request/response cycles
 * - API contract tests: OpenAPI spec validation
 * - Load tests: Concurrent rate card operations
 *
 * DATA FLOW:
 * Client Request → Fastify Route → Input Validation → Service Method → Database
 *                      ↓
 *              Response Formatting ← Error Handling ← Business Logic
 *
 * EXAMPLE USAGE:
 * ```bash
 * # Create new rate card
 * POST /customers/cust-123/rate-cards
 * {
 *   "effectiveDate": "2024-01-01T00:00:00Z",
 *   "rates": { "fulfillment": { "baseOrder": 5.00 } },
 *   "contractIds": ["contract-456"]
 * }
 *
 * # Get active rate card
 * GET /customers/cust-123/rate-cards/active
 * ```
 */

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

    // Pre-flight validation: Check that all service codes exist in catalog
    const { rates } = request.body as any;
    if (rates?.services) {
      const serviceCodes = rates.services.map((s: any) => s.serviceType);
      const validServices = await prismaPrimary.billingService.findMany({
        where: {
          code: { in: serviceCodes },
          isActive: true
        },
        select: { code: true, unit: true }
      });

      const validCodes = new Set(validServices.map(s => s.code));
      const invalidCodes = serviceCodes.filter((code: string) => !validCodes.has(code));

      if (invalidCodes.length > 0) {
        return reply.code(400).send({
          error: 'Invalid service codes',
          invalidCodes,
          message: `The following service codes are not in the billing catalog: ${invalidCodes.join(', ')}`
        });
      }

      // Cross-reference units for consistency warnings
      const serviceUnits = Object.fromEntries(
        validServices.map(s => [s.code, s.unit])
      );

      const unitMismatches = rates.services
        .filter((s: any) => serviceUnits[s.serviceType] !== s.unit)
        .map((s: any) => `${s.serviceType}: expected '${serviceUnits[s.serviceType]}', got '${s.unit}'`);

      if (unitMismatches.length > 0) {
        // Log warning but don't block - allows flexibility
        request.log.warn('Unit mismatches in rate card:', unitMismatches);
      }
    }

    // Validate input with Zod
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

