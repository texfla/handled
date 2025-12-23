/**
 * Transformation Routes
 */

import { FastifyInstance } from 'fastify';
import { getAllTransformations, getTransformation } from '../transformations/index.js';
import { transformService } from '../services/transform.js';

export async function transformationRoutes(fastify: FastifyInstance) {
  // List all transformations
  fastify.get('/', {
    schema: { tags: ['Transformations'] }
  }, async () => {
    const transformations = getAllTransformations();
    return transformations.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      sources: t.sources,
      targetTable: t.targetTable,
      dependencies: t.dependencies ?? [],
    }));
  });

  // Run a specific transformation
  fastify.post('/:id/run', {
    schema: { tags: ['Transformations'] }
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    
    const transformation = getTransformation(id);
    if (!transformation) {
      return reply.status(404).send({ error: 'Transformation not found' });
    }
    
    const result = await transformService.runTransformation(transformation);
    return result;
  });

  // Run all transformations
  fastify.post('/run-all', {
    schema: { tags: ['Transformations'] }
  }, async () => {
    const transformations = getAllTransformations();
    const results = await transformService.runTransformations(transformations);
    
    return {
      results: Object.fromEntries(results),
      summary: {
        total: transformations.length,
        success: Array.from(results.values()).filter((r) => r.success).length,
        failed: Array.from(results.values()).filter((r) => !r.success).length,
      },
    };
  });
}

