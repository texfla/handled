import { FastifyPluginAsync } from 'fastify';
import { prismaPrimary } from '../db/index.js';

const billingServicesRoutes: FastifyPluginAsync = async (app) => {
  // Get all billing services grouped by category
  app.get('/billing-services', {
    schema: {
      description: 'Get all active billing services grouped by category',
      tags: ['billing'],
      response: {
        200: {
          description: 'List of billing categories with their services',
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              code: { type: 'string' },
              name: { type: 'string' },
              description: { type: 'string' },
              sortOrder: { type: 'number' },
              isActive: { type: 'boolean' },
              services: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'number' },
                    categoryId: { type: 'number' },
                    code: { type: 'string' },
                    name: { type: 'string' },
                    description: { type: 'string' },
                    unit: { type: 'string' },
                    isActive: { type: 'boolean' },
                    sortOrder: { type: 'number' }
                  }
                }
              }
            }
          }
        }
      }
    }
  }, async () => {
    const categories = await prismaPrimary.billingCategory.findMany({
      where: { isActive: true },
      include: {
        services: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' }
        }
      },
      orderBy: { sortOrder: 'asc' }
    });
    
    return categories;
  });

  // Get single service by code
  app.get('/billing-services/:code', {
    schema: {
      description: 'Get a specific billing service by code',
      tags: ['billing'],
      params: {
        type: 'object',
        properties: {
          code: { type: 'string' }
        },
        required: ['code']
      },
      response: {
        200: {
          description: 'Billing service details',
          type: 'object',
          properties: {
            id: { type: 'number' },
            categoryId: { type: 'number' },
            code: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string', nullable: true },
            unit: { type: 'string' },
            isActive: { type: 'boolean' },
            sortOrder: { type: 'number' },
            createdAt: { type: 'string' },
            updatedAt: { type: 'string' },
            category: {
              type: 'object',
              properties: {
                id: { type: 'number' },
                code: { type: 'string' },
                name: { type: 'string' },
                description: { type: 'string', nullable: true },
                sortOrder: { type: 'number' },
                isActive: { type: 'boolean' }
              }
            }
          }
        },
        404: {
          description: 'Service not found',
          type: 'object',
          properties: {
            error: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    const { code } = request.params as { code: string };

    const service = await prismaPrimary.billingService.findFirst({
      where: { code, isActive: true },
      include: { category: true }
    });

    if (!service) {
      return reply.code(404).send({ error: 'Service not found' });
    }

    return service;
  });
};

export default billingServicesRoutes;
