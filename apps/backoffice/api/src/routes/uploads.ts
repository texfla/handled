import { FastifyInstance } from 'fastify';
import { getIntegration } from '../integrations/index.js';
import { importService } from '../services/import.js';
import { lucia } from '../auth/lucia.js';

interface FileResult {
  filename: string;
  success: boolean;
  recordsProcessed?: number;
  recordsFailed?: number;
  error?: string;
}

interface BatchResult {
  totalFiles: number;
  successCount: number;
  failedCount: number;
  results: FileResult[];
}

export async function uploadRoutes(fastify: FastifyInstance) {
  // Upload and import multiple files (batch)
  fastify.post('/:integrationId', async (request, reply) => {
    const { integrationId } = request.params as { integrationId: string };
    
    // Get integration
    const integration = getIntegration(integrationId);
    if (!integration) {
      return reply.status(404).send({ error: 'Integration not found' });
    }
    
    // Get current user (optional, for tracking)
    let userId: string | undefined;
    const sessionId = lucia.readSessionCookie(request.headers.cookie ?? '');
    if (sessionId) {
      const { user } = await lucia.validateSession(sessionId);
      userId = user?.id;
    }
    
    // Get all uploaded files
    const files = await request.files();
    const fileList: { filename: string; buffer: Buffer }[] = [];
    
    for await (const file of files) {
      const buffer = await file.toBuffer();
      fileList.push({ filename: file.filename, buffer });
    }
    
    if (fileList.length === 0) {
      return reply.status(400).send({ error: 'No files uploaded' });
    }
    
    // Process files sequentially
    const results: FileResult[] = [];
    let successCount = 0;
    let failedCount = 0;
    
    for (const file of fileList) {
      const { filename, buffer } = file;
      
      // Validate file type
      const ext = filename.split('.').pop()?.toLowerCase();
      if (!ext || !integration.fileTypes.includes(ext)) {
        results.push({
          filename,
          success: false,
          error: `Invalid file type. Expected: ${integration.fileTypes.join(', ')}`,
        });
        failedCount++;
        continue;
      }
      
      // Validate filename pattern if specified
      if (integration.filePattern && !integration.filePattern.test(filename)) {
        results.push({
          filename,
          success: false,
          error: 'Filename does not match expected pattern',
        });
        failedCount++;
        continue;
      }
      
      try {
        const result = await importService.runImport(integration, buffer, filename, userId);
        results.push({
          filename,
          success: result.success,
          recordsProcessed: result.recordsProcessed,
          recordsFailed: result.recordsFailed,
          error: result.errors?.[0]?.message,
        });
        if (result.success) {
          successCount++;
        } else {
          failedCount++;
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Import failed';
        results.push({
          filename,
          success: false,
          error: message,
        });
        failedCount++;
      }
    }
    
    const batchResult: BatchResult = {
      totalFiles: fileList.length,
      successCount,
      failedCount,
      results,
    };
    
    return batchResult;
  });
}

