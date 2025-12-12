import { PrismaClient as PrimaryClient } from '@prisma/client-primary';
import { PrismaClient as DataClient } from '@prisma/client-data';

// Lazy initialization to ensure env vars are loaded first
let _prismaPrimary: PrimaryClient | null = null;
let _prismaData: DataClient | null = null;

// Configure Prisma logging based on environment
const LOG_QUERIES = process.env.LOG_DB_QUERIES === 'true';
const LOG_LEVEL = LOG_QUERIES ? ['query', 'error', 'warn'] : ['error', 'warn'];

function getPrismaPrimary(): PrimaryClient {
  if (!_prismaPrimary) {
    const url = process.env.PRIMARY_DATABASE_URL;
    console.log('DEBUG: Initializing PRIMARY client with URL:', url || '(empty)');
    
    if (!url) {
      throw new Error('PRIMARY_DATABASE_URL environment variable is not set');
    }
    
    _prismaPrimary = new PrimaryClient({
      datasources: { 
        db: { url }
      },
      log: LOG_LEVEL
    });
  }
  return _prismaPrimary;
}

function getPrismaData(): DataClient {
  if (!_prismaData) {
    const url = process.env.DATA_DATABASE_URL || process.env.PRIMARY_DATABASE_URL;
    if (!url) {
      throw new Error('Neither DATA_DATABASE_URL nor PRIMARY_DATABASE_URL is set');
    }
    _prismaData = new DataClient({
      datasources: { 
        db: { url }
      },
      log: LOG_LEVEL
    });
  }
  return _prismaData;
}

// Export lazy getters
export const prismaPrimary = new Proxy({} as PrimaryClient, {
  get(target, prop) {
    return getPrismaPrimary()[prop as keyof PrimaryClient];
  }
});

export const prismaData = new Proxy({} as DataClient, {
  get(target, prop) {
    return getPrismaData()[prop as keyof DataClient];
  }
});

// Backward compatibility: deprecated export
export const prisma = prismaPrimary;

// Graceful shutdown
process.on('beforeExit', async () => {
  const promises = [];
  if (_prismaPrimary) promises.push(_prismaPrimary.$disconnect());
  if (_prismaData) promises.push(_prismaData.$disconnect());
  await Promise.all(promises);
});

