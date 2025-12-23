/**
 * Export Routes
 * 
 * Generate and download JSON files for the warehouse-optimizer.
 */

import { FastifyInstance } from 'fastify';
import { exportService } from '../services/export.js';

interface ExportMetadata {
  id: string;
  name: string;
  description: string;
  filename: string;
  estimatedSize: string;
}

const availableExports: ExportMetadata[] = [
  {
    id: 'zip3-reference',
    name: 'ZIP3 Reference',
    description: 'Population, coordinates, and state for each 3-digit ZIP prefix',
    filename: 'zip3-reference.json',
    estimatedSize: '~150 KB',
  },
  {
    id: 'zone-matrix',
    name: 'Zone Matrix (All Carriers)',
    description: 'Transit time matrix combining UPS Ground + USPS Ground services',
    filename: 'zone-matrix.json',
    estimatedSize: '~15 MB',
  },
  {
    id: 'zone-matrix-ups',
    name: 'Zone Matrix (UPS)',
    description: 'Transit time matrix for UPS Ground service only',
    filename: 'zone-matrix-ups.json',
    estimatedSize: '~15 MB',
  },
  {
    id: 'zone-matrix-usps',
    name: 'Zone Matrix (USPS)',
    description: 'Transit time matrix for USPS Ground services (GAL, GAH, PKG)',
    filename: 'zone-matrix-usps.json',
    estimatedSize: '~15 MB',
  },
];

export async function exportRoutes(fastify: FastifyInstance) {
  // List available exports
  fastify.get('/', {
    schema: { tags: ['Exports'] }
  }, async () => {
    return availableExports;
  });

  // Generate and download zip3-reference.json
  fastify.get('/zip3-reference', {
    schema: { tags: ['Exports'] }
  }, async (_, reply) => {
    const { info, logTiming } = await import('../lib/logger.js');
    try {
      info('Generating zip3-reference.json...');
      const startTime = Date.now();
      
      const data = await exportService.generateZip3Reference();
      
      const json = JSON.stringify(data, null, 0); // Compact JSON
      const sizeKB = (json.length / 1024).toFixed(1);

      logTiming(`Generated zip3-reference.json: ${Object.keys(data).length} entries, ${sizeKB} KB`, startTime);
      
      reply
        .header('Content-Type', 'application/json')
        .header('Content-Disposition', 'attachment; filename="zip3-reference.json"')
        .send(json);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Export failed';
      console.error('Export zip3-reference failed:', message);
      return reply.status(500).send({ error: message });
    }
  });

  // Generate and download zone-matrix.json
  fastify.get('/zone-matrix', {
    schema: { tags: ['Exports'] }
  }, async (_, reply) => {
    const { info, logTiming } = await import('../lib/logger.js');
    try {
      info('Generating zone-matrix.json...');
      const startTime = Date.now();
      
      const data = await exportService.generateZoneMatrix();
      
      const json = JSON.stringify(data, null, 0); // Compact JSON
      const sizeMB = (json.length / 1024 / 1024).toFixed(1);

      logTiming(`Generated zone-matrix.json: ${data.origins.length}x${data.destinations.length} matrix, ${sizeMB} MB`, startTime);
      
      reply
        .header('Content-Type', 'application/json')
        .header('Content-Disposition', 'attachment; filename="zone-matrix.json"')
        .send(json);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Export failed';
      console.error('Export zone-matrix failed:', message);
      return reply.status(500).send({ error: message });
    }
  });

  // Generate and download zone-matrix-ups.json (UPS only)
  fastify.get('/zone-matrix-ups', {
    schema: { tags: ['Exports'] }
  }, async (_, reply) => {
    const { info, logTiming } = await import('../lib/logger.js');
    try {
      info('Generating zone-matrix-ups.json...');
      const startTime = Date.now();
      
      const data = await exportService.generateZoneMatrixByCarrier('UPS');

      const json = JSON.stringify(data, null, 0);
      const sizeMB = (json.length / 1024 / 1024).toFixed(1);

      logTiming(`Generated zone-matrix-ups.json: ${data.origins.length}x${data.destinations.length} matrix, ${sizeMB} MB`, startTime);
      
      reply
        .header('Content-Type', 'application/json')
        .header('Content-Disposition', 'attachment; filename="zone-matrix-ups.json"')
        .send(json);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Export failed';
      console.error('Export zone-matrix-ups failed:', message);
      return reply.status(500).send({ error: message });
    }
  });

  // Generate and download zone-matrix-usps.json (USPS only)
  fastify.get('/zone-matrix-usps', {
    schema: { tags: ['Exports'] }
  }, async (_, reply) => {
    const { info, logTiming } = await import('../lib/logger.js');
    try {
      info('Generating zone-matrix-usps.json...');
      const startTime = Date.now();
      
      const data = await exportService.generateZoneMatrixByCarrier('USPS');

      const json = JSON.stringify(data, null, 0);
      const sizeMB = (json.length / 1024 / 1024).toFixed(1);

      logTiming(`Generated zone-matrix-usps.json: ${data.origins.length}x${data.destinations.length} matrix, ${sizeMB} MB`, startTime);
      
      reply
        .header('Content-Type', 'application/json')
        .header('Content-Disposition', 'attachment; filename="zone-matrix-usps.json"')
        .send(json);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Export failed';
      console.error('Export zone-matrix-usps failed:', message);
      return reply.status(500).send({ error: message });
    }
  });
}

