// IMPORTANT: Load environment variables first, before any other imports
import './env.js';

import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import multipart from '@fastify/multipart';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { authRoutes } from './routes/auth.js';
import { integrationRoutes } from './routes/integrations.js';
import { uploadRoutes } from './routes/uploads.js';
import { transformationRoutes } from './routes/transformations.js';
import { exportRoutes } from './routes/exports.js';
import { adminRoutes } from './routes/admin.js';
import { roleRoutes } from './routes/roles.js';
import { warehousesRoutes } from './routes/warehouses.js';
import { clientsRoutes } from './routes/clients.js';
import { usersRoutes } from './routes/users.js';
import rateCardsRoutes from './routes/rateCards.js';
import billingServicesRoutes from './routes/billingServices.js';

const fastify = Fastify({
  logger: true,
});

// Register Swagger first (before other plugins)
await fastify.register(swagger, {
  openapi: {
    openapi: '3.0.0',
    info: {
      title: 'Handled API',
      description: 'Handled 3PL Platform API',
      version: '1.0.0'
    },
    tags: [
      {
        name: 'Admin',
        description: 'Administrative and system management'
      },
      {
        name: 'Auth',
        description: 'Authentication and user session management'
      },

      {
        name: 'Clients',
        description: 'Client organization management'
      },
      {
        name: 'Exports',
        description: 'Data export and reporting'
      },
      {
        name: 'Integrations',
        description: 'Data import/export and integration management'
      },
      {
        name: 'rate-cards',
        description: 'Rate card management and versioning'
      },
      {
        name: 'Roles',
        description: 'Role and permission management'
      },
      {
        name: 'Transformations',
        description: 'Data transformation and processing'
      },
      {
        name: 'Uploads',
        description: 'File upload and import management'
      },
      {
        name: 'Users',
        description: 'User account management and operations'
      },
      {
        name: 'Warehouses',
        description: 'Warehouse and facility management'
      },
    

    ],
    servers: [
      {
        url: process.env.NODE_ENV === 'production'
          ? 'https://ops.handledcommerce.com'
          : 'http://localhost:3001',
        description: process.env.NODE_ENV === 'production' ? 'Production server' : 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'session'
        }
      }
    },
    security: [{ cookieAuth: [] }]
  },
});

// Register Swagger UI (available in both dev and prod for admin users)
await fastify.register(swaggerUi, {
  routePrefix: '/api/docs',
  uiConfig: {
    docExpansion: 'list',
    deepLinking: false
  }
});

// Plugins
await fastify.register(cors, {
  origin: process.env.NODE_ENV === 'production'
    ? [
        'http://167.99.166.9',
        'http://64.23.147.101',
        'http://137.184.46.185',
        'https://ops.handledcommerce.com',
        'http://ops.handledcommerce.com', // Temporary for DNS testing before SSL
      ]
    : ['http://localhost:5173', 'http://localhost:3000'],
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
await fastify.register(roleRoutes, { prefix: '/api/roles' });
await fastify.register(warehousesRoutes, { prefix: '/api/warehouses' });
await fastify.register(clientsRoutes, { prefix: '/api/clients' });
await fastify.register(usersRoutes, { prefix: '/api/users' });
await fastify.register(rateCardsRoutes, { prefix: '/api' });
await fastify.register(billingServicesRoutes, { prefix: '/api' });

// Health check
fastify.get('/api/health', {
  schema: { tags: ['Admin'] }
}, async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// Start server
const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '3001', 10);
    const host = process.env.HOST || '0.0.0.0';
    
    await fastify.listen({ port, host });
    const { info } = await import('./lib/logger.js');
    info(`Server running at http://${host}:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();

