import { PrismaClient as PrimaryClient } from '@prisma/client-primary';
import { PrismaClient as DataClient } from '@prisma/client-data';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { debug } from '../lib/logger.js';

// Lazy initialization to ensure env vars are loaded first
let _prismaPrimary: PrimaryClient | null = null;
let _prismaData: DataClient | null = null;
let _poolPrimary: Pool | null = null;
let _poolData: Pool | null = null;

// Configure Prisma logging based on environment
const LOG_QUERIES = process.env.LOG_DB_QUERIES === 'true';
const LOG_LEVEL: Array<'query' | 'error' | 'warn'> = LOG_QUERIES ? ['query', 'error', 'warn'] : ['error', 'warn'];

function getPrismaPrimary(): PrimaryClient {
  if (!_prismaPrimary) {
    const url = process.env.PRIMARY_DATABASE_URL;
    debug('Initializing PRIMARY client with URL:', url || '(empty)');
    
    if (!url) {
      throw new Error('PRIMARY_DATABASE_URL environment variable is not set');
    }
    
    // Create PostgreSQL pool and adapter for Prisma 7
    _poolPrimary = new Pool({ connectionString: url });
    const adapter = new PrismaPg(_poolPrimary);
    
    _prismaPrimary = new PrimaryClient({
      adapter,
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
    
    // Create PostgreSQL pool and adapter for Prisma 7
    _poolData = new Pool({ connectionString: url });
    const adapter = new PrismaPg(_poolData);
    
    _prismaData = new DataClient({
      adapter,
      log: LOG_LEVEL
    });
  }
  return _prismaData;
}

// Export lazy getters
export const prismaPrimary = new Proxy({} as PrimaryClient, {
  get(_target, prop) {
    return getPrismaPrimary()[prop as keyof PrimaryClient];
  }
});

export const prismaData = new Proxy({} as DataClient, {
  get(_target, prop) {
    return getPrismaData()[prop as keyof DataClient];
  }
});

// Backward compatibility: deprecated export
export const prisma = prismaPrimary;

// Graceful shutdown
process.on('beforeExit', async () => {
  const promises: Promise<void>[] = [];
  if (_prismaPrimary) promises.push(_prismaPrimary.$disconnect());
  if (_prismaData) promises.push(_prismaData.$disconnect());
  if (_poolPrimary) promises.push(_poolPrimary.end());
  if (_poolData) promises.push(_poolData.end());
  await Promise.all(promises);
});

