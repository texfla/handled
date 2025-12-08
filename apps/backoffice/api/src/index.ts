import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import multipart from '@fastify/multipart';
import { authRoutes } from './routes/auth.js';
import { integrationRoutes } from './routes/integrations.js';
import { uploadRoutes } from './routes/uploads.js';
import { transformationRoutes } from './routes/transformations.js';
import { exportRoutes } from './routes/exports.js';
import { adminRoutes } from './routes/admin.js';

const fastify = Fastify({
  logger: true,
});

// Plugins
await fastify.register(cors, {
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
});

await fastify.register(cookie);

await fastify.register(multipart, {
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB per file
    files: 1000, // Allow up to 1000 files in a batch
  },
});

// Routes
await fastify.register(authRoutes, { prefix: '/api/auth' });
await fastify.register(integrationRoutes, { prefix: '/api/integrations' });
await fastify.register(uploadRoutes, { prefix: '/api/upload' });
await fastify.register(transformationRoutes, { prefix: '/api/transformations' });
await fastify.register(exportRoutes, { prefix: '/api/exports' });
await fastify.register(adminRoutes, { prefix: '/api/admin' });

// Health check
fastify.get('/api/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// Start server
const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '3001', 10);
    const host = process.env.HOST || '0.0.0.0';
    
    await fastify.listen({ port, host });
    console.log(`Server running at http://${host}:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();

