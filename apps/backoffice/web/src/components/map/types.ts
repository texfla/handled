/**
 * TypeScript types for the Coverage Map
 */

export interface Zip3Reference {
  lat: number;
  lng: number;
  city: string;
  state: string;
  population: number;
}

export interface Zip3ReferenceMap {
  [zip3: string]: Zip3Reference;
}

export interface ZoneMatrixEntry {
  origin: string;
  destination: string;
  zone: number;
  transit_days: number;
}

export interface ZoneMatrix {
  carrier?: string;
  origins: string[];
  destinations: string[];
  matrix: number[][];
  carrierMap?: string[][];
}

export interface WarehouseLocation {
  zip3: string;
  lat?: number;
  lng?: number;
  city?: string;
  state?: string;
  isRequired?: boolean;
  populationCovered?: number;
}

export interface DestinationCoverage {
  zip3: string;
  transit_days: number;
  carrier?: string;
  population: number;
  lat?: number | null;
  lng?: number | null;
  city?: string | null;
  state?: string | null;
}


export interface WebGLCoverageMapProps {
  warehouses: WarehouseLocation[];
  deliveryGoal?: 2 | 3;
  zip3Reference?: Zip3ReferenceMap;
  onWarehouseMove?: (oldZip3: string, newZip3: string) => void;
  className?: string;

  // Feature flags (required - controlled by parent)
  enableDragging: boolean;
  enableHover: boolean;
  enableTooltips: boolean;
  enableZip3Boundaries: boolean;
  enableStateBoundaries: boolean;
  enableAnimation: boolean;
  enableLegend: boolean;

  // Lifecycle callbacks (optional)
  onMapReady?: () => void;
  onMapError?: (error: Error) => void;
}

// Type for just the feature flags (what the settings UI controls)
export type MapFeatureFlags = Pick<WebGLCoverageMapProps,
  'enableDragging' |
  'enableHover' |
  'enableTooltips' |
  'enableZip3Boundaries' |
  'enableStateBoundaries' |
  'enableAnimation' |
  'enableLegend'
>;
