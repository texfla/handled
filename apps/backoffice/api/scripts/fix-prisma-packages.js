#!/usr/bin/env node
/**
 * Fix Prisma 7 generated client packages by adding package.json files
 * This is needed because Prisma 7 doesn't generate package.json files for custom output paths
 */

import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const packages = [
  {
    name: '@prisma/client-primary',
    path: join(rootDir, 'node_modules', '@prisma', 'client-primary'),
  },
  {
    name: '@prisma/client-data',
    path: join(rootDir, 'node_modules', '@prisma', 'client-data'),
  },
];

for (const pkg of packages) {
  const packageJson = {
    name: pkg.name,
    version: '7.1.0',
    type: 'module',
    main: './client.ts',
    types: './client.ts',
    exports: {
      '.': {
        types: './client.ts',
        import: './client.ts',
        require: './client.ts',
      },
    },
  };

  const packageJsonPath = join(pkg.path, 'package.json');
  writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
  console.log(`✓ Created ${packageJsonPath}`);
}

console.log('✓ Fixed Prisma client packages');
