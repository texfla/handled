/**
 * Integration Registry
 * 
 * Central registry of all available integrations.
 * Add new integrations here after creating their modules.
 */

import type { Integration, IntegrationCategory } from './types.js';
import { usZips } from './demographics/us-zips.js';
import { gazZcta } from './demographics/gaz-zcta.js';
import { upsZones } from './carriers/ups-zones.js';
import { upsGroundService } from './carriers/ups-ground-service.js';
import { usps3dBase } from './carriers/usps-3d-base.js';

// All registered integrations
export const integrations: Integration[] = [
  // Demographics
  usZips,
  gazZcta,
  
  // Carriers
  usps3dBase,
  upsZones,
  upsGroundService,
];

// Group by category
export const integrationsByCategory = integrations.reduce(
  (acc, integration) => {
    if (!acc[integration.category]) {
      acc[integration.category] = [];
    }
    acc[integration.category].push(integration);
    return acc;
  },
  {} as Record<IntegrationCategory, Integration[]>
);

// Lookup by ID
export function getIntegration(id: string): Integration | undefined {
  return integrations.find((i) => i.id === id);
}

// Get all categories that have integrations
export function getCategories(): IntegrationCategory[] {
  return Object.keys(integrationsByCategory) as IntegrationCategory[];
}

