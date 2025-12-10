/**
 * Export Service
 * 
 * Generates JSON files for the warehouse-optimizer project.
 * Updated for code-based schema (carrier_code/service_code instead of IDs).
 */

import { prisma } from '../db/index.js';

interface Zip3ReferenceEntry {
  lat: number;
  lng: number;
  city: string;
  state: string;
  population: number;
}

interface Zip3ReferenceOutput {
  [zip3: string]: Zip3ReferenceEntry;
}

interface ZoneMatrixOutput {
  origins: string[];
  destinations: string[];
  matrix: number[][];
}

export class ExportService {
  /**
   * Generate zip3-reference.json
   * 
   * Format: { "006": { lat, lng, city, state, population }, ... }
   */
  async generateZip3Reference(): Promise<Zip3ReferenceOutput> {
    const rows = await prisma.$queryRaw<Array<{
      zip3: string;
      total_population: number;
      primary_state: string | null;
      primary_city: string | null;
      pop_weighted_lat: number | null;
      pop_weighted_lng: number | null;
      geo_centroid_lat: number | null;
      geo_centroid_lng: number | null;
    }>>`
      SELECT 
        zip3,
        total_population,
        primary_state,
        primary_city,
        pop_weighted_lat,
        pop_weighted_lng,
        geo_centroid_lat,
        geo_centroid_lng
      FROM reference.zip3_reference
      ORDER BY zip3
    `;

    const output: Zip3ReferenceOutput = {};

    for (const row of rows) {
      // Use population-weighted lat/lng, fall back to geo centroid
      const lat = row.pop_weighted_lat ?? row.geo_centroid_lat ?? 0;
      const lng = row.pop_weighted_lng ?? row.geo_centroid_lng ?? 0;

      output[row.zip3] = {
        lat: Number(lat),
        lng: Number(lng),
        city: row.primary_city ?? '',
        state: row.primary_state ?? '',
        population: row.total_population ?? 0,
      };
    }

    return output;
  }

  /**
   * Generate zone-matrix.json
   * 
   * Format: { origins: [...], destinations: [...], matrix: [[...], ...] }
   * Matrix contains transit days for ground services (MIN across UPS GND, USPS PKG)
   * 
   * Uses carrier_code/service_code (not IDs) for stable identity.
   */
  async generateZoneMatrix(): Promise<ZoneMatrixOutput> {
    // Get all unique ZIP3s from zip3_reference
    const zip3Rows = await prisma.$queryRaw<Array<{ zip3: string }>>`
      SELECT zip3 FROM reference.zip3_reference ORDER BY zip3
    `;
    
    const allZip3s = zip3Rows.map((r: { zip3: string }) => r.zip3);
    const zip3ToIdx = new Map(allZip3s.map((zip3: string, idx: number) => [zip3, idx]));
    const numZip3s = allZip3s.length;

    // Initialize matrix with 99 (no service)
    const matrix: number[][] = Array.from({ length: numZip3s }, (): number[] =>
      Array(numZip3s).fill(99)
    );

    // Query delivery matrix for ground services by code
    // Ground services: UPS GND, USPS GAL/GAH/PKG
    // Takes MIN transit days across all ground options
    const routes = await prisma.$queryRaw<Array<{
      origin_zip3: string;
      dest_zip3: string;
      transit_days: number;
    }>>`
      SELECT
        origin_zip3,
        dest_zip3,
        MIN(transit_days) as transit_days
      FROM reference.delivery_matrix
      WHERE (carrier_code = 'UPS' AND service_code = 'GND')
         OR (carrier_code = 'USPS' AND service_code IN ('GAL', 'GAH', 'PKG'))
      GROUP BY origin_zip3, dest_zip3
    `;

    // Populate matrix
    for (const route of routes) {
      const originIdx = zip3ToIdx.get(route.origin_zip3);
      const destIdx = zip3ToIdx.get(route.dest_zip3);

      if (originIdx !== undefined && destIdx !== undefined) {
        matrix[originIdx!][destIdx!] = route.transit_days;
      }
    }

    return {
      origins: allZip3s,
      destinations: allZip3s,
      matrix,
    };
  }

  /**
   * Generate zone-matrix-{carrier}.json for a specific carrier
   * 
   * @param carrierCode - 'UPS' or 'USPS' (uppercase)
   * @returns Same format as generateZoneMatrix, filtered to single carrier
   */
  async generateZoneMatrixByCarrier(carrierCode: string): Promise<ZoneMatrixOutput> {
    // Get all unique ZIP3s from zip3_reference
    const zip3Rows = await prisma.$queryRaw<Array<{ zip3: string }>>`
      SELECT zip3 FROM reference.zip3_reference ORDER BY zip3
    `;
    
    const allZip3s = zip3Rows.map((r: { zip3: string }) => r.zip3);
    const zip3ToIdx = new Map(allZip3s.map((zip3: string, idx: number) => [zip3, idx]));
    const numZip3s = allZip3s.length;

    // Initialize matrix with 99 (no service)
    const matrix: number[][] = Array.from({ length: numZip3s }, (): number[] =>
      Array(numZip3s).fill(99)
    );

    // Build carrier-specific query
    let routes: Array<{ origin_zip3: string; dest_zip3: string; transit_days: number }>;

    if (carrierCode === 'UPS') {
      // UPS Ground only
      routes = await prisma.$queryRaw`
        SELECT
          origin_zip3,
          dest_zip3,
          MIN(transit_days) as transit_days
        FROM reference.delivery_matrix
        WHERE carrier_code = 'UPS' AND service_code = 'GND'
        GROUP BY origin_zip3, dest_zip3
      `;
    } else if (carrierCode === 'USPS') {
      // USPS Ground services: GAL, GAH, PKG
      routes = await prisma.$queryRaw`
        SELECT
          origin_zip3,
          dest_zip3,
          MIN(transit_days) as transit_days
        FROM reference.delivery_matrix
        WHERE carrier_code = 'USPS' AND service_code IN ('GAL', 'GAH', 'PKG')
        GROUP BY origin_zip3, dest_zip3
      `;
    } else {
      throw new Error(`Unknown carrier: ${carrierCode}`);
    }

    // Populate matrix
    for (const route of routes) {
      const originIdx = zip3ToIdx.get(route.origin_zip3);
      const destIdx = zip3ToIdx.get(route.dest_zip3);

      if (originIdx !== undefined && destIdx !== undefined) {
        matrix[originIdx!][destIdx!] = route.transit_days;
      }
    }

    return {
      origins: allZip3s,
      destinations: allZip3s,
      matrix,
    };
  }
}

export const exportService = new ExportService();
