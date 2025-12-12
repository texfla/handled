import { FastifyInstance } from 'fastify';
import { integrations, integrationsByCategory, getIntegration } from '../integrations/index.js';
import { prismaPrimary } from '../db/index.js';

// Type for API responses (subset of Integration)
interface IntegrationResponse {
  id: string;
  name: string;
  description: string;
  category: string;
  fileTypes: string[];
}

export async function integrationRoutes(fastify: FastifyInstance) {
  // List all integrations
  fastify.get('/', async () => {
    return {
      integrations: integrations.map((i): IntegrationResponse => ({
        id: i.id,
        name: i.name,
        description: i.description,
        category: i.category,
        fileTypes: i.fileTypes,
      })),
    };
  });

  // List integrations grouped by category
  fastify.get('/by-category', async () => {
    const result: Record<string, IntegrationResponse[]> = {};

    for (const [category, items] of Object.entries(integrationsByCategory)) {
      result[category] = items.map((i): IntegrationResponse => ({
        id: i.id,
        name: i.name,
        description: i.description,
        category: i.category,
        fileTypes: i.fileTypes,
      }));
    }

    return result;
  });

  // Get single integration details
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const integration = getIntegration(id);
    
    if (!integration) {
      return reply.status(404).send({ error: 'Integration not found' });
    }
    
    return {
      id: integration.id,
      name: integration.name,
      description: integration.description,
      category: integration.category,
      fileTypes: integration.fileTypes,
      targetTable: integration.targetTable,
      columns: integration.columns,
    };
  });

  // Get run history for an integration
  fastify.get('/:id/runs', async (request) => {
    const { id } = request.params as { id: string };
    
    const runs = await prismaPrimary.integrationRun.findMany({
      where: { integrationId: id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    
    return { runs };
  });
}

