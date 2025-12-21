/**
 * WebGL Coverage Map - GPU-accelerated version using deck.gl
 * Renders warehouse coverage data on an interactive map
 */
import { useMemo, useState, useEffect, useRef } from 'react';
import DeckGL from '@deck.gl/react';
import { GeoJsonLayer, ScatterplotLayer } from '@deck.gl/layers';
import { OrthographicView } from '@deck.gl/core';
import { geoAlbersUsa } from 'd3-geo';
import { feature } from 'topojson-client';
import type { DestinationCoverage, WarehouseLocation, DisplayMode } from '../types';
import { haversineDistance } from '../utils/distance';
import type { Zip3ReferenceMap } from '../types';

const statesUrl = 'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json';
const zip3Url = `${import.meta.env.BASE_URL}data/zip3-boundaries.json`;

interface WebGLCoverageMapProps {
  coverageData: DestinationCoverage[];
  warehouses: WarehouseLocation[];
  deliveryGoal?: 2 | 3;
  initialStateMode?: boolean;
  statePopulations?: Map<string, number>;
  onWarehouseMove?: (oldZip3: string, newZip3: string) => void;
  zip3Reference?: Zip3ReferenceMap;
}

// Base dimensions for scaling calculations
const BASE_WIDTH = 960;
const BASE_HEIGHT = 540;
const BASE_SCALE = 1100;

// State name mapping for tooltips
const STATE_NAMES: Record<string, string> = {
  'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas', 'CA': 'California',
  'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware', 'FL': 'Florida', 'GA': 'Georgia',
  'HI': 'Hawaii', 'ID': 'Idaho', 'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa',
  'KS': 'Kansas', 'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
  'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi', 'MO': 'Missouri',
  'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada', 'NH': 'New Hampshire', 'NJ': 'New Jersey',
  'NM': 'New Mexico', 'NY': 'New York', 'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio',
  'OK': 'Oklahoma', 'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
  'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah', 'VT': 'Vermont',
  'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia', 'WI': 'Wisconsin', 'WY': 'Wyoming',
  'DC': 'District of Columbia', 'PR': 'Puerto Rico', 'VI': 'U.S. Virgin Islands', 'GU': 'Guam',
  'AS': 'American Samoa', 'MP': 'Northern Mariana Islands'
};

// Color palette - single source of truth
const COLOR_PALETTE = {
  darkGreen: { hex: '#22c55e', rgb: [34, 197, 94] as [number, number, number] },
  lightGreen: { hex: '#84cc16', rgb: [132, 204, 22] as [number, number, number] },
  yellow: { hex: '#eab308', rgb: [234, 179, 8] as [number, number, number] },
  orange: { hex: '#f97316', rgb: [249, 115, 22] as [number, number, number] },
  red: { hex: '#ef4444', rgb: [239, 68, 68] as [number, number, number] },
  gray: { hex: '#e5e7eb', rgb: [229, 231, 235] as [number, number, number] },
} as const;

type ColorKey = keyof typeof COLOR_PALETTE;

// Delivery goal schemes configuration
const DELIVERY_GOAL_SCHEMES = {
  2: {
    name: '2-Day Goal',
    goal: 2,
    colorMapping: {
      1: 'darkGreen' as ColorKey,
      2: 'lightGreen' as ColorKey,
      3: 'yellow' as ColorKey,
      4: 'orange' as ColorKey,
      5: 'red' as ColorKey,
    },
    legend: [
      { colorKey: 'darkGreen' as ColorKey, label: '1 day' },
      { colorKey: 'lightGreen' as ColorKey, label: '2 day' },
      { colorKey: 'yellow' as ColorKey, label: '3 day' },
      { colorKey: 'orange' as ColorKey, label: '4 day' },
      { colorKey: 'red' as ColorKey, label: '5+ day' },
    ],
  },
  3: {
    name: '3-Day Goal',
    goal: 3,
    colorMapping: {
      1: 'darkGreen' as ColorKey,
      2: 'darkGreen' as ColorKey,
      3: 'lightGreen' as ColorKey,
      4: 'yellow' as ColorKey,
      5: 'red' as ColorKey,
    },
    legend: [
      { colorKey: 'darkGreen' as ColorKey, label: '1-2 day' },
      { colorKey: 'lightGreen' as ColorKey, label: '3 day' },
      { colorKey: 'yellow' as ColorKey, label: '4 day' },
      { colorKey: 'red' as ColorKey, label: '5+ day' },
    ],
  },
} as const;

type DeliveryGoal = keyof typeof DELIVERY_GOAL_SCHEMES;

// Helper: Get color for a specific number of days based on goal
function getColorForDays(days: number, goal: DeliveryGoal) {
  const clampedDays = Math.max(1, Math.min(5, Math.round(days))) as 1 | 2 | 3 | 4 | 5;
  const scheme = DELIVERY_GOAL_SCHEMES[goal];
  const colorKey = scheme.colorMapping[clampedDays];
  return COLOR_PALETTE[colorKey];
}

// Helper: Get legend items for the current goal
function getLegendItems(goal: DeliveryGoal) {
  return DELIVERY_GOAL_SCHEMES[goal].legend.map(item => ({
    ...COLOR_PALETTE[item.colorKey],
    label: item.label,
  }));
}

// Helper: Point-in-polygon check using ray casting algorithm
function isPointInPolygon(point: [number, number], polygon: any): boolean {
  const [lng, lat] = point;
  
  // Handle MultiPolygon
  if (polygon.type === 'MultiPolygon') {
    return polygon.coordinates.some((poly: any) => 
      checkSinglePolygon(lng, lat, poly[0])
    );
  }
  
  // Handle Polygon
  if (polygon.type === 'Polygon') {
    return checkSinglePolygon(lng, lat, polygon.coordinates[0]);
  }
  
  return false;
}

function checkSinglePolygon(lng: number, lat: number, ring: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1];
    const xj = ring[j][0], yj = ring[j][1];
    
    const intersect = ((yi > lat) !== (yj > lat))
      && (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

// Helper: Find ZIP3 for drop position (point-in-polygon first, then distance fallback)
function findZip3ForDropPosition(
  screenX: number,
  screenY: number,
  zip3GeoJson: any,
  zip3Reference: Zip3ReferenceMap,
  projection: any
): string | null {
  if (!zip3GeoJson || !projection) return null;
  
  // Convert screen coords to geo coords
  const inverted = projection.invert([screenX, screenY]);
  if (!inverted) return null;
  
  const [lng, lat] = inverted;
  
  // 1. PRIMARY: Try point-in-polygon (most accurate)
  for (const feature of zip3GeoJson.features) {
    const zip3 = feature.properties.ZCTA3 || feature.properties.GEOID10 || feature.properties.ZIP3;
    
    if (isPointInPolygon([lng, lat], feature.geometry)) {
      return zip3;
    }
  }
  
  // 2. FALLBACK: Dropped outside all ZIP3s → find nearest centroid
  let nearestZip3: string | null = null;
  let minDistance = Infinity;
  
  for (const [zip3, ref] of Object.entries(zip3Reference)) {
    const distance = haversineDistance(lat, lng, ref.lat, ref.lng);
    if (distance < minDistance) {
      minDistance = distance;
      nearestZip3 = zip3;
    }
  }
  
  return nearestZip3;
}

export default function WebGLCoverageMap({ coverageData, warehouses, deliveryGoal = 2, initialStateMode = false, statePopulations, onWarehouseMove, zip3Reference }: WebGLCoverageMapProps) {
  const [displayMode, setDisplayMode] = useState<DisplayMode>('shaded');
  const [statesGeoJson, setStatesGeoJson] = useState<any>(null);
  const [zip3GeoJson, setZip3GeoJson] = useState<any>(null);
  const [webglError, setWebglError] = useState<string | null>(null);
  const [hoveredZip3, setHoveredZip3] = useState<string | null>(null);
  const [hoveredState, setHoveredState] = useState<string | null>(null);
  const [hoveredWarehouse, setHoveredWarehouse] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);
  const [dimensions, setDimensions] = useState({ width: BASE_WIDTH, height: BASE_HEIGHT, scale: BASE_SCALE });
  const [animationTime, setAnimationTime] = useState(0);
  const [draggedWarehouse, setDraggedWarehouse] = useState<{ zip3: string; startPos: [number, number] } | null>(null);
  const [dragPreviewZip3, setDragPreviewZip3] = useState<string | null>(null);
  const [dragPosition, setDragPosition] = useState<[number, number] | null>(null);
  const [containerWidth, setContainerWidth] = useState(BASE_WIDTH);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Create projection for coordinate conversion in drag handlers
  const projection = useMemo(() => {
    // On narrow screens, position map at top of taller canvas (legend goes below)
    const verticalPosition = containerWidth <= 650
      ? dimensions.height * 0.42  // Position toward top, leaving space for legend at bottom
      : dimensions.height / 2 + 20;  // Standard centering for wide screens
    return geoAlbersUsa()
      .scale(dimensions.scale)
      .translate([dimensions.width / 2, verticalPosition]);
  }, [dimensions, containerWidth]);
  
  // Calculate responsive aspect ratio
  const aspectRatio = useMemo(() => {
    return containerWidth <= 650 ? 1.35 : BASE_WIDTH / BASE_HEIGHT;
  }, [containerWidth]);

  // Animation clock for warehouse pulsing
  useEffect(() => {
    let animationFrameId: number;
    let startTime = Date.now();

    const animate = () => {
      setAnimationTime(Date.now() - startTime);
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // Handle responsive sizing
  useEffect(() => {
    const updateDimensions = () => {
      if (!containerRef.current) return;
      
      const currentWidth = containerRef.current.clientWidth;
      setContainerWidth(currentWidth);
      
      // On narrow screens, use taller canvas to fit map + legend without overlap
      const aspectRatio = currentWidth <= 650 
        ? 1.35  // Taller canvas to accommodate legend below map
        : BASE_WIDTH / BASE_HEIGHT; // Standard (960:540) for wide screens
      
      const width = Math.min(currentWidth, BASE_WIDTH);
      const height = width / aspectRatio;
      const scale = (width / BASE_WIDTH) * BASE_SCALE;
      
      setDimensions({ width, height, scale });
    };

    // Initial sizing
    updateDimensions();

    // Create resize observer
    const resizeObserver = new ResizeObserver(() => {
      updateDimensions();
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Load states TopoJSON and convert to GeoJSON
  useEffect(() => {
    if (statesGeoJson) return;
    
    console.log('WebGL: Loading states TopoJSON...');
    fetch(statesUrl)
      .then(res => res.json())
      .then(topology => {
        console.log('WebGL: States TopoJSON loaded, converting to GeoJSON...');
        const geojson = feature(topology, topology.objects.states);
        console.log('WebGL: States GeoJSON converted');
        setStatesGeoJson(geojson);
      })
      .catch(err => console.error('WebGL: Failed to load states:', err));
  }, [statesGeoJson]);

  // Load ZIP3 GeoJSON
  useEffect(() => {
    if (zip3GeoJson) return;
    
    console.log('WebGL: Loading ZIP3 GeoJSON...');
    fetch(zip3Url)
      .then(res => res.json())
      .then(data => {
        console.log('WebGL: ZIP3 GeoJSON loaded, features:', data.features?.length);
        setZip3GeoJson(data);
      })
      .catch(err => console.error('WebGL: Failed to load ZIP3 GeoJSON:', err));
  }, [zip3GeoJson]);

  // Pre-project states GeoJSON using geoAlbersUsa (responsive)
  const projectedStatesGeoJson = useMemo(() => {
    if (!statesGeoJson) return null;

    console.log('WebGL: Pre-projecting states with geoAlbersUsa...');
    const verticalPosition = containerWidth <= 650
      ? dimensions.height * 0.42
      : dimensions.height / 2 + 20;
    const projection = geoAlbersUsa()
      .scale(dimensions.scale)
      .translate([dimensions.width / 2, verticalPosition]);

    const projectCoordinate = (coord: [number, number]): [number, number] => {
      const projected = projection(coord);
      return projected ? [projected[0], projected[1]] : [0, 0];
    };

    const projectGeometry = (geometry: any): any => {
      if (geometry.type === 'Polygon') {
        return {
          ...geometry,
          coordinates: geometry.coordinates.map((ring: any) =>
            ring.map(projectCoordinate)
          ),
        };
      } else if (geometry.type === 'MultiPolygon') {
        return {
          ...geometry,
          coordinates: geometry.coordinates.map((polygon: any) =>
            polygon.map((ring: any) => ring.map(projectCoordinate))
          ),
        };
      }
      return geometry;
    };

    const projected = {
      ...statesGeoJson,
      features: statesGeoJson.features.map((feature: any) => ({
        ...feature,
        geometry: projectGeometry(feature.geometry),
      })),
    };

    console.log('WebGL: States projection complete');
    return projected;
  }, [statesGeoJson, dimensions, containerWidth]);

  // Pre-project ZIP3 GeoJSON using geoAlbersUsa (responsive)
  const projectedGeoJson = useMemo(() => {
    if (!zip3GeoJson) return null;

    console.log('WebGL: Pre-projecting ZIP3 with geoAlbersUsa...');
    const verticalPosition = containerWidth <= 650
      ? dimensions.height * 0.42
      : dimensions.height / 2 + 20;
    const projection = geoAlbersUsa()
      .scale(dimensions.scale)
      .translate([dimensions.width / 2, verticalPosition]);

    const projectCoordinate = (coord: [number, number]): [number, number] => {
      const projected = projection(coord);
      return projected ? [projected[0], projected[1]] : [0, 0];
    };

    const projectGeometry = (geometry: any): any => {
      if (geometry.type === 'Polygon') {
        return {
          ...geometry,
          coordinates: geometry.coordinates.map((ring: any) =>
            ring.map(projectCoordinate)
          ),
        };
      } else if (geometry.type === 'MultiPolygon') {
        return {
          ...geometry,
          coordinates: geometry.coordinates.map((polygon: any) =>
            polygon.map((ring: any) => ring.map(projectCoordinate))
          ),
        };
      }
      return geometry;
    };

    const projected = {
      ...zip3GeoJson,
      features: zip3GeoJson.features.map((feature: any) => ({
        ...feature,
        geometry: projectGeometry(feature.geometry),
      })),
    };

    console.log('WebGL: ZIP3 projection complete');
    return projected;
  }, [zip3GeoJson, dimensions, containerWidth]);

  // Early return if no data (unless in initial state mode)
  if (!initialStateMode) {
    if (!coverageData || !Array.isArray(coverageData) || coverageData.length === 0) {
      return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No coverage data available</div>;
    }
    
    if (!warehouses || !Array.isArray(warehouses) || warehouses.length === 0) {
      return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No warehouse data available</div>;
    }
  }

  // Color function based on delivery goal
  const getColor = (days: number | undefined): [number, number, number] => {
    if (!days || days <= 0) return COLOR_PALETTE.gray.rgb;
    return getColorForDays(days, deliveryGoal).rgb;
  };

  // Create lookup map for fast access
  const coverageDataMap = useMemo(() => {
    const map = new Map<string, DestinationCoverage>();
    coverageData.forEach(d => map.set(d.zip3, d));
    return map;
  }, [coverageData]);

  // Aggregate state populations for tooltips
  const statePopulationsMap = useMemo(() => {
    // Use passed prop in initial state mode, otherwise calculate from coverage data
    if (initialStateMode && statePopulations) {
      return statePopulations;
    }
    
    const map = new Map<string, number>();
    coverageData.forEach(coverage => {
      if (!coverage.state) return;
      const current = map.get(coverage.state) || 0;
      map.set(coverage.state, current + coverage.population);
    });
    return map;
  }, [coverageData, initialStateMode, statePopulations]);

  // Project coverage data dots (for dots mode) - responsive
  const projectedCoverageDots = useMemo(() => {
    const verticalPosition = containerWidth <= 650
      ? dimensions.height * 0.42
      : dimensions.height / 2 + 20;
    const projection = geoAlbersUsa()
      .scale(dimensions.scale)
      .translate([dimensions.width / 2, verticalPosition]);

    return coverageData
      .filter(d => {
        if (!d.lat || !d.lng || d.lat === 0 || d.lng === 0) return false;
        
        const isContinental = d.lat >= 24.5 && d.lat <= 49 && d.lng >= -125 && d.lng <= -66;
        const isAlaska = d.lat >= 51 && d.lat <= 71 && d.lng >= -180 && d.lng <= -130;
        const isHawaii = d.lat >= 18 && d.lat <= 23 && d.lng >= -161 && d.lng <= -154;
        
        return isContinental || isAlaska || isHawaii;
      })
      .map(d => {
        const projected = projection([d.lng as number, d.lat as number]);
        if (!projected) return null;

        return {
          ...d,
          position: projected,
        };
      })
      .filter(Boolean);
  }, [coverageData, dimensions, containerWidth]);

  // Project warehouse coordinates - responsive
  const projectedWarehouses = useMemo(() => {
    const verticalPosition = containerWidth <= 650
      ? dimensions.height * 0.42
      : dimensions.height / 2 + 20;
    const projection = geoAlbersUsa()
      .scale(dimensions.scale)
      .translate([dimensions.width / 2, verticalPosition]);

    return warehouses
      .map(wh => {
        const lng = wh.lng;
        const lat = wh.lat;
        
        if (!lng || !lat) return null;
        
        const projected = projection([lng, lat]);
        if (!projected) return null;

        return {
          ...wh,
          position: projected,
        };
      })
      .filter(Boolean);
  }, [warehouses, dimensions, containerWidth]);

  // Create layers
  const layers = useMemo(() => {
    const layersArray: any[] = [];

    // Background states layer (gray)
    if (projectedStatesGeoJson) {
      layersArray.push(
        new GeoJsonLayer({
          id: 'states-background',
          data: projectedStatesGeoJson,
          filled: true,
          stroked: true,
          getFillColor: (d: any) => {
            const stateName = d.properties?.name;
            const isHovered = hoveredState === stateName;
            
            if (isHovered) {
              // Lighter gray on hover
              return [200, 205, 210, 255];
            }
            return [229, 231, 235, 255];
          },
          getLineColor: (d: any) => {
            const stateName = d.properties?.name;
            const isHovered = hoveredState === stateName;
            
            if (isHovered) {
              // Darker border on hover
              return [100, 100, 100, 255];
            }
            // Lighter, semi-transparent border to avoid double-line effect
            return [200, 200, 200, 180];
          },
          getLineWidth: (d: any) => {
            const stateName = d.properties?.name;
            const isHovered = hoveredState === stateName;
            // Thinner default line to reduce overlap
            return isHovered ? 2 : 0.5;
          },
          lineWidthUnits: 'pixels',
          pickable: true,
          updateTriggers: {
            getFillColor: [hoveredState],
            getLineColor: [hoveredState],
            getLineWidth: [hoveredState],
          },
        })
      );
    }

    // In initial state mode, only show grey states
    if (initialStateMode) {
      return layersArray;
    }

    // Early return if no data for full render
    if (!projectedGeoJson) return layersArray;

    // ZIP3 layer (if not in dots mode)
    if (displayMode !== 'dots') {
      // Render all ZIP3s in one layer
      layersArray.push(
          new GeoJsonLayer({
            id: 'zip3-layer',
            data: projectedGeoJson,
            filled: true,
            stroked: true,
            getFillColor: (d: any) => {
              const zip3 = d.properties.ZCTA3 || d.properties.GEOID10 || d.properties.ZIP3;
              const coverage = coverageDataMap.get(zip3);
              const color = getColor(coverage?.transit_days);
              
              const isHovered = hoveredZip3 === zip3;
              
              if (displayMode === 'shaded') {
                const opacity = 230;
                if (isHovered) {
                  return [
                    Math.min(color[0] + 30, 255),
                    Math.min(color[1] + 30, 255),
                    Math.min(color[2] + 30, 255),
                    opacity
                  ];
                }
                return [...color, opacity];
              } else {
                return [0, 0, 0, 0];
              }
            },
            getLineColor: (d: any) => {
              const zip3 = d.properties.ZCTA3 || d.properties.GEOID10 || d.properties.ZIP3;
              const isHovered = hoveredZip3 === zip3;
              
              if (isHovered) {
                return [120, 120, 120, 255];
              }
              
              if (displayMode === 'shaded') {
                return [170, 170, 170, 160];
              }
              const coverage = coverageDataMap.get(zip3);
              const color = getColor(coverage?.transit_days);
              return [...color, 255];
            },
            getLineWidth: (d: any) => {
              const zip3 = d.properties.ZCTA3 || d.properties.GEOID10 || d.properties.ZIP3;
              const isHovered = hoveredZip3 === zip3;
              
              if (isHovered) {
                return 1.5;
              }
              return displayMode === 'shaded' ? 0.75 : 1;
            },
            lineWidthUnits: 'pixels',
            pickable: true,
            updateTriggers: {
              getFillColor: [coverageDataMap, displayMode, hoveredZip3],
              getLineColor: [coverageDataMap, displayMode, hoveredZip3],
              getLineWidth: [displayMode, hoveredZip3],
            },
          })
        );
    }

    // Coverage dots layer (for dots mode)
    if (displayMode === 'dots' && projectedCoverageDots.length > 0) {
      layersArray.push(
        new ScatterplotLayer({
          id: 'coverage-dots',
          data: projectedCoverageDots,
          getPosition: (d: any) => d.position,
          getFillColor: (d: any) => {
            const color = getColor(d.transit_days);
            return [...color, 178];
          },
          getRadius: 3,
          radiusUnits: 'pixels',
          stroked: true,
          lineWidthUnits: 'pixels',
          getLineWidth: 0.5,
          getLineColor: [255, 255, 255, 255],
          pickable: true,
          updateTriggers: {
            getFillColor: [projectedCoverageDots],
          },
        })
      );
    }

    // Warehouse markers layer
    if (projectedWarehouses.length > 0) {
      // Find max coverage for normalizing pulse speeds
      const maxCoverage = Math.max(...projectedWarehouses.map((w: any) => w.populationCovered || 1));
      
      // Filter out dragged warehouse from main layer
      const visibleWarehouses = draggedWarehouse 
        ? projectedWarehouses.filter((w: any) => w.zip3 !== draggedWarehouse.zip3)
        : projectedWarehouses;
      
      layersArray.push(
        new ScatterplotLayer({
          id: 'warehouses',
          data: visibleWarehouses,
          getPosition: (d: any) => d.position,
          getFillColor: [37, 99, 235, 255],
          getRadius: (d: any) => {
            const baseRadius = d.isRequired ? 7.7 : 6.6; // 10% larger
            
            // If hovered, show at full size (no pulsing)
            if (hoveredWarehouse === d.zip3) {
              return baseRadius * 1.3;
            }
            
            // Otherwise, pulse animation
            const coverage = d.populationCovered || 1;
            // Speed is proportional to coverage (higher coverage = faster pulse)
            const speed = coverage / maxCoverage;
            // Each warehouse has different cycle based on its speed
            const cycleTime = 2000 / speed; // Base 2s cycle, faster for more coverage
            const cycle = (animationTime % cycleTime) / cycleTime;
            // Pulse between 1.0 and 1.3
            const pulseScale = 1 + 0.3 * Math.sin(cycle * Math.PI * 2);
            return baseRadius * pulseScale;
          },
          radiusUnits: 'pixels',
          stroked: true,
          lineWidthUnits: 'pixels',
          getLineWidth: 2,
          getLineColor: [255, 255, 255, 255],
          pickable: true,
          updateTriggers: {
            getRadius: [warehouses, animationTime, hoveredWarehouse],
            data: [draggedWarehouse], // Re-render when drag state changes
          },
        })
      );
      
      // Dragged warehouse layer (follows cursor)
      if (draggedWarehouse && dragPosition) {
        layersArray.push(
          new ScatterplotLayer({
            id: 'dragged-warehouse',
            data: [{ position: dragPosition }],
            getPosition: (d: any) => d.position,
            getFillColor: [37, 99, 235, 200], // Slightly transparent
            getRadius: 9.9, // Larger while dragging (10% increase from base 9)
            radiusUnits: 'pixels',
            stroked: true,
            lineWidthUnits: 'pixels',
            getLineWidth: 2,
            getLineColor: [255, 255, 255, 255],
            pickable: false, // Don't interfere with drag
            updateTriggers: {
              getPosition: [dragPosition], // Update position when dragging
            },
          })
        );
      }
    }

    // State highlight layer
    if (hoveredState && projectedStatesGeoJson) {
      const hoveredFeature = projectedStatesGeoJson.features.find(
        (f: any) => f.properties.name === hoveredState
      );
      if (hoveredFeature) {
        layersArray.push(
          new GeoJsonLayer({
            id: 'state-highlight',
            data: {
              type: 'FeatureCollection',
              features: [hoveredFeature]
            },
            filled: false,
            stroked: true,
            getLineColor: [100, 100, 100, 120],
            getLineWidth: 2,
            lineWidthUnits: 'pixels',
            pickable: false,
          })
        );
      }
    }

    return layersArray;
  }, [projectedGeoJson, projectedStatesGeoJson, projectedCoverageDots, displayMode, coverageDataMap, projectedWarehouses, warehouses, hoveredState, hoveredZip3, animationTime, initialStateMode, draggedWarehouse, dragPosition]);

  const initialViewState = useMemo(() => {
    const verticalPosition = containerWidth <= 650
      ? dimensions.height * 0.45
      : dimensions.height / 2 + 20;
    return {
      ortho: {
        target: [dimensions.width / 2, verticalPosition, 0] as [number, number, number],
        zoom: 0,
      }
    };
  }, [dimensions, containerWidth]);

  // Drag handlers for warehouse movement
  const handleDragStart = (info: any) => {
    if (info.layer?.id === 'warehouses' && info.object) {
      const warehouseZip3 = info.object.zip3;
      setDraggedWarehouse({
        zip3: warehouseZip3,
        startPos: info.object.position
      });
      setDragPreviewZip3(warehouseZip3);
      
      // Set initial hover states for highlighting
      setHoveredZip3(warehouseZip3);
      const coverage = coverageDataMap.get(warehouseZip3);
      const stateCode = coverage?.state || zip3Reference?.[warehouseZip3]?.state;
      const stateName = stateCode ? STATE_NAMES[stateCode] : null;
      setHoveredState(stateName || null);
    }
  };

  const handleDrag = (info: any) => {
    if (!draggedWarehouse || !zip3Reference) return;
    
    // Update visual position (use coordinate from deck.gl)
    if (info.coordinate) {
      setDragPosition([info.coordinate[0], info.coordinate[1]]);
      
      // Find which ZIP3 contains the current drag position
      // Use the coordinate directly (already in projected space)
      const targetZip3 = findZip3ForDropPosition(
        info.coordinate[0],
        info.coordinate[1],
        zip3GeoJson,
        zip3Reference,
        projection
      );
      
      setDragPreviewZip3(targetZip3);
      
      // Set hover states to enable highlighting during drag
      if (targetZip3) {
        setHoveredZip3(targetZip3);
        
        // Get state for highlighting
        const coverage = coverageDataMap.get(targetZip3);
        const stateCode = coverage?.state || zip3Reference[targetZip3]?.state;
        const stateName = stateCode ? STATE_NAMES[stateCode] : null;
        setHoveredState(stateName || null);
      }
    }
    
    setTooltipPosition({ x: info.x, y: info.y });
  };

  const handleDragEnd = () => {
    if (!draggedWarehouse || !onWarehouseMove || !dragPreviewZip3) {
      setDraggedWarehouse(null);
      setDragPreviewZip3(null);
      setDragPosition(null);
      setHoveredZip3(null);
      setHoveredState(null);
      setTooltipPosition(null);
      return;
    }
    
    const oldZip3 = draggedWarehouse.zip3;
    const newZip3 = dragPreviewZip3;
    
    // Only trigger if actually moved to a different ZIP3
    if (newZip3 && newZip3 !== oldZip3) {
      onWarehouseMove(oldZip3, newZip3);
    }
    
    setDraggedWarehouse(null);
    setDragPreviewZip3(null);
    setDragPosition(null);
    setHoveredZip3(null);
    setHoveredState(null);
    setTooltipPosition(null);
  };

  const handleHover = (info: any) => {
    if (info.layer?.id === 'warehouses') {
      // Hovering over a warehouse
      const warehouseZip3 = info.object?.zip3;
      if (warehouseZip3) {
        setHoveredWarehouse(warehouseZip3);
        setHoveredZip3(warehouseZip3);
        setTooltipPosition({ x: info.x, y: info.y });
        
        // Highlight the underlying ZIP3 and state
        const coverage = coverageDataMap.get(warehouseZip3);
        const stateCode = coverage?.state;
        const stateName = stateCode ? STATE_NAMES[stateCode] : null;
        setHoveredState(stateName || null);
      } else {
        setHoveredWarehouse(null);
        setHoveredZip3(null);
        setTooltipPosition(null);
        setHoveredState(null);
      }
    } else if (info.layer?.id === 'states-background') {
      const stateName = info.object?.properties?.name;
      setHoveredState(stateName || null);
      setHoveredZip3(null);
      setHoveredWarehouse(null);
      setTooltipPosition(stateName ? { x: info.x, y: info.y } : null);
    } else if (info.layer?.id?.startsWith('zip3-') || info.layer?.id === 'coverage-dots') {
      const zip3 = info.object?.properties?.ZIP3 || info.object?.zip3;
      if (zip3) {
        setHoveredZip3(zip3);
        setHoveredWarehouse(null);
        setTooltipPosition({ x: info.x, y: info.y });
        const coverage = coverageDataMap.get(zip3);
        const stateCode = coverage?.state;
        const stateName = stateCode ? STATE_NAMES[stateCode] : null;
        setHoveredState(stateName || null);
      } else {
        setHoveredZip3(null);
        setHoveredWarehouse(null);
        setTooltipPosition(null);
        setHoveredState(null);
      }
    } else {
      setHoveredZip3(null);
      setHoveredState(null);
      setHoveredWarehouse(null);
      setTooltipPosition(null);
    }
  };

  return (
    <div ref={containerRef} style={{ width: '100%', margin: '0 auto', isolation: 'isolate' }}>
      {/* Display Mode Controls */}
      {!initialStateMode && (
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0', justifyContent: 'center', alignItems: 'center', marginTop: '-0.75rem' }}>
          {(['dots', 'outlines', 'shaded'] as DisplayMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setDisplayMode(mode)}
              style={{
                padding: '0.4rem 0.85rem',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                background: displayMode === mode ? 'var(--primary)' : 'var(--bg-secondary)',
                color: displayMode === mode ? '#fff' : 'var(--text-primary)',
                fontWeight: displayMode === mode ? 600 : 400,
                cursor: 'pointer',
                transition: 'all 0.2s',
                textTransform: 'capitalize',
              }}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>
      )}

        {/* WebGL Map */}
        <div style={{ 
          width: '100%', 
          height: 'auto', 
          overflow: 'hidden',
          position: 'relative',
          aspectRatio: aspectRatio.toString()
        }}>
          {webglError ? (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              height: '100%',
              flexDirection: 'column',
              gap: '1rem',
              color: 'var(--error)',
              padding: '2rem'
            }}>
              <div style={{ fontSize: '1.5rem' }}>⚠️</div>
              <div style={{ fontWeight: 600 }}>WebGL Error</div>
              <div style={{ fontSize: '0.875rem', textAlign: 'center' }}>{webglError}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                Try refreshing the page or use a different browser. WebGL rendering requires a modern browser with hardware acceleration enabled.
              </div>
            </div>
          ) : (initialStateMode && projectedStatesGeoJson) || (projectedGeoJson && projectedStatesGeoJson) ? (
            <>
              <DeckGL
                initialViewState={initialViewState}
                controller={false}
                layers={layers}
                views={[
                  new OrthographicView({
                    id: 'ortho',
                    controller: false,
                    flipY: true,
                  }),
                ]}
                style={{ position: 'relative' }}
                width={dimensions.width}
                height={dimensions.height}
                onHover={handleHover}
                onDragStart={handleDragStart}
                onDrag={handleDrag}
                onDragEnd={handleDragEnd}
                onError={(error: any) => {
                  console.error('DeckGL Error:', error);
                  setWebglError(error.message || 'WebGL rendering error');
                }}
                onWebGLInitialized={(gl: any) => {
                  console.log('WebGL v8 initialized:', gl);
                }}
                getCursor={() => (hoveredZip3 || hoveredState || hoveredWarehouse ? 'pointer' : 'default')}
              />
              
              {/* Tooltip */}
              {!initialStateMode && !draggedWarehouse && hoveredZip3 && tooltipPosition && coverageDataMap.get(hoveredZip3) && (() => {
                const offset = 35;
                const tooltipWidth = 150; // Estimated width for positioning
                const isLeftHalf = tooltipPosition.x < dimensions.width / 2;
                const isTopHalf = tooltipPosition.y < dimensions.height / 2;
                
                const left = isLeftHalf 
                  ? tooltipPosition.x + offset
                  : tooltipPosition.x - tooltipWidth - offset;
                
                const top = isTopHalf
                  ? tooltipPosition.y + offset
                  : tooltipPosition.y - 100 - offset;
                
                const coverage = coverageDataMap.get(hoveredZip3);
                if (!coverage) return null;
                
                return (
                  <div
                    style={{
                      position: 'absolute',
                      left: `${left}px`,
                      top: `${top}px`,
                      backgroundColor: 'rgba(0, 0, 0, 0.9)',
                      color: '#fff',
                      padding: '0.4rem 0.6rem',
                      borderRadius: '6px',
                      fontSize: '0.875rem',
                      pointerEvents: 'none',
                      zIndex: 1000,
                      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <div style={{ fontWeight: 600, marginBottom: '0.15rem' }}>
                      ZIP3: {hoveredZip3}
                    </div>
                    <div style={{ fontSize: '0.8rem', marginBottom: '0.15rem' }}>
                      Population: {coverage.population.toLocaleString()}
                    </div>
                    <div style={{ fontSize: '0.8rem', marginBottom: '0.15rem' }}>
                      Time: {coverage.transit_days} Day{coverage.transit_days > 1 ? 's' : ''}{coverage.carrier ? ` (${coverage.carrier.toUpperCase()})` : ''}
                    </div>
                    {coverage.state && (
                      <>
                        <div style={{ fontSize: '0.8rem', marginBottom: '0.15rem' }}>
                          {STATE_NAMES[coverage.state] || coverage.state}
                        </div>
                        <div style={{ fontSize: '0.8rem' }}>
                          State Total: {statePopulationsMap.get(coverage.state)?.toLocaleString() || 'N/A'}
                        </div>
                      </>
                    )}
                  </div>
                );
              })()}

              {/* Drag Preview Tooltip */}
              {draggedWarehouse && dragPreviewZip3 && tooltipPosition && zip3Reference && (() => {
                const offset = 35;
                const tooltipWidth = 180;
                const isLeftHalf = tooltipPosition.x < dimensions.width / 2;
                const isTopHalf = tooltipPosition.y < dimensions.height / 2;
                
                const left = isLeftHalf 
                  ? tooltipPosition.x + offset
                  : tooltipPosition.x - tooltipWidth - offset;
                
                const top = isTopHalf
                  ? tooltipPosition.y + offset
                  : tooltipPosition.y - 80 - offset;
                
                const targetRef = zip3Reference[dragPreviewZip3];
                const isDifferent = dragPreviewZip3 !== draggedWarehouse.zip3;
                
                return (
                  <div
                    style={{
                      position: 'absolute',
                      left: `${left}px`,
                      top: `${top}px`,
                      backgroundColor: 'rgba(0, 0, 0, 0.9)',
                      color: '#fff',
                      padding: '0.4rem 0.6rem',
                      borderRadius: '6px',
                      fontSize: '0.875rem',
                      pointerEvents: 'none',
                      zIndex: 1000,
                      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <div style={{ fontWeight: 600, marginBottom: '0.15rem' }}>
                      {isDifferent ? `ZIP3: ${draggedWarehouse.zip3} → ${dragPreviewZip3}` : `ZIP3: ${dragPreviewZip3}`}
                    </div>
                    {targetRef && (
                      <>
                        <div style={{ fontSize: '0.8rem' }}>
                          {targetRef.city}, {targetRef.state}
                        </div>
                      </>
                    )}
                  </div>
                );
              })()}

              {/* State Tooltip for Initial State Mode */}
              {initialStateMode && !draggedWarehouse && hoveredState && tooltipPosition && (() => {
                const offset = 35;
                const tooltipWidth = 180;
                const isLeftHalf = tooltipPosition.x < dimensions.width / 2;
                const isTopHalf = tooltipPosition.y < dimensions.height / 2;
                
                const left = isLeftHalf 
                  ? tooltipPosition.x + offset
                  : tooltipPosition.x - tooltipWidth - offset;
                
                const top = isTopHalf
                  ? tooltipPosition.y + offset
                  : tooltipPosition.y - 80 - offset;
                
                // Find state code from state name
                const stateCode = Object.entries(STATE_NAMES).find(([_, name]) => name === hoveredState)?.[0];
                const population = stateCode ? statePopulationsMap.get(stateCode) : null;
                
                return (
                  <div
                    style={{
                      position: 'absolute',
                      left: `${left}px`,
                      top: `${top}px`,
                      backgroundColor: 'rgba(0, 0, 0, 0.9)',
                      color: '#fff',
                      padding: '0.4rem 0.6rem',
                      borderRadius: '6px',
                      fontSize: '0.875rem',
                      pointerEvents: 'none',
                      zIndex: 1000,
                      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <div style={{ fontWeight: 600, marginBottom: '0.15rem' }}>
                      {hoveredState}
                    </div>
                    {population && (
                      <div style={{ fontSize: '0.8rem' }}>
                        Population: {population.toLocaleString()}
                      </div>
                    )}
                  </div>
                );
              })()}
            </>
          ) : (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              height: '100%',
              color: 'var(--text-secondary)'
            }}>
              Loading map...
            </div>
          )}

          {/* Legend - Responsive Layout */}
          {!initialStateMode && (
            containerWidth <= 650 ? (
              // Horizontal layout for narrow screens
              <div style={{ 
                position: 'absolute',
                bottom: '8px',
                left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex', 
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.7rem',
                padding: '0.3rem 0.5rem',
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                pointerEvents: 'none',
                zIndex: 10,
                color: '#1f2937',
                whiteSpace: 'nowrap'
              }}>
                <span style={{ fontWeight: 600, fontSize: '0.65rem' }}>Days:</span>
                {getLegendItems(deliveryGoal).map((item, idx) => (
                  <span key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <span style={{ 
                      width: '8px', 
                      height: '8px', 
                      borderRadius: '50%', 
                      background: item.hex,
                      border: '1px solid rgba(0,0,0,0.15)',
                      display: 'inline-block'
                    }} />
                    <span style={{ fontSize: '0.65rem' }}>{item.label.replace(' day', '')}</span>
                  </span>
                ))}
              </div>
            ) : (
              // Vertical layout for wide screens
              <div style={{ 
                position: 'absolute',
                top: '66%',
                right: '12px',
                transform: 'translateY(-66%)',
                display: 'flex', 
                flexDirection: 'column',
                gap: '0.35rem',
                fontSize: '0.75rem',
                padding: '0.75rem 0.85rem',
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                pointerEvents: 'none',
                zIndex: 10,
                color: '#1f2937'
              }}>
                <div style={{ fontWeight: 600, marginBottom: '0.2rem', fontSize: '0.7rem', color: '#1f2937' }}>Delivery:</div>
                {getLegendItems(deliveryGoal).map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <div style={{ 
                      width: '10px', 
                      height: '10px', 
                      borderRadius: '50%', 
                      background: item.hex,
                      border: '1px solid rgba(0,0,0,0.15)',
                      flexShrink: 0
                    }} />
                    <span style={{ fontSize: '0.7rem', color: '#1f2937' }}>{item.label}</span>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
    </div>
  );
}

