import type { Zip3ReferenceMap, ZoneMatrix } from '@/components/map';

export class MapDataService {
  private static zip3Reference: Zip3ReferenceMap | null = null;
  private static zoneMatrix: ZoneMatrix | null = null;
  private static zip3Boundaries: any | null = null;

  /**
   * Load ZIP3 reference data (coordinates, cities, states, population)
   */
  static async loadZip3Reference(): Promise<Zip3ReferenceMap> {
    if (this.zip3Reference) {
      return this.zip3Reference;
    }

    const response = await fetch(`${import.meta.env.BASE_URL}data/zip3-reference.json`);
    if (!response.ok) {
      throw new Error(`Failed to load ZIP3 reference: ${response.statusText}`);
    }
    const data = await response.json();
    this.zip3Reference = data;
    return data;
  }

  /**
   * Load zone matrix (origin-destination transit times)
   */
  static async loadZoneMatrix(): Promise<ZoneMatrix> {
    if (this.zoneMatrix) {
      return this.zoneMatrix;
    }

    const response = await fetch(`${import.meta.env.BASE_URL}data/zone-matrix.json`);
    if (!response.ok) {
      throw new Error(`Failed to load zone matrix: ${response.statusText}`);
    }
    const data = await response.json();
    this.zoneMatrix = data;
    return data;
  }

  /**
   * Load ZIP3 boundaries GeoJSON
   */
  static async loadZip3Boundaries(): Promise<any> {
    if (this.zip3Boundaries) {
      return this.zip3Boundaries;
    }

    const response = await fetch(`${import.meta.env.BASE_URL}data/zip3-boundaries.json`);
    if (!response.ok) {
      throw new Error(`Failed to load ZIP3 boundaries: ${response.statusText}`);
    }
    this.zip3Boundaries = await response.json();
    return this.zip3Boundaries;
  }

  /**
   * Get coordinates for a ZIP3 code
   */
  static async getZip3Coordinates(zip3: string): Promise<{ lat: number; lng: number } | null> {
    const reference = await this.loadZip3Reference();
    const data = reference[zip3];
    return data ? { lat: data.lat, lng: data.lng } : null;
  }

  /**
   * Calculate transit days between two ZIP3 codes
   */
  static async calculateTransitDays(originZip3: string, destZip3: string): Promise<number | null> {
    const matrix = await this.loadZoneMatrix();
    const originIdx = matrix.origins.indexOf(originZip3);
    const destIdx = matrix.destinations.indexOf(destZip3);
    
    if (originIdx === -1 || destIdx === -1) return null;
    return matrix.matrix[originIdx][destIdx];
  }

  /**
   * Clear cache (useful for testing)
   */
  static clearCache(): void {
    this.zip3Reference = null;
    this.zoneMatrix = null;
    this.zip3Boundaries = null;
  }
}

