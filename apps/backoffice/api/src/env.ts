/**
 * Load environment variables before any other imports
 * This must be imported first in index.ts
 */
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from the api directory
// Use override: true to override any env vars loaded by TSX or other tools
const envPath = join(__dirname, '../.env');
console.log('DEBUG: Loading .env from:', envPath);
const result = config({ path: envPath, override: true });

if (result.error) {
  console.warn('Warning: Could not load .env file:', result.error.message);
} else {
  const parsed = result.parsed || {};
  console.log(`✓ Loaded ${Object.keys(parsed).length} environment variables from .env (with override)`);
  console.log('DEBUG: PRIMARY_DATABASE_URL =', process.env.PRIMARY_DATABASE_URL || '(empty)');
  console.log('DEBUG: SPLIT_DB_MODE =', process.env.SPLIT_DB_MODE || '(empty)');
}

// Validate required env vars
const required = ['PRIMARY_DATABASE_URL', 'AUTH_SECRET'];
const missing = required.filter(key => !process.env[key]);

if (missing.length > 0) {
  console.error('ERROR: Missing required environment variables:', missing.join(', '));
  process.exit(1);
}
