/**
 * WebGL Coverage Map - GPU-accelerated version using deck.gl
 * Adapted from warehouse-optimizer-demo for handled backoffice
 */
import { useMemo, useState, useEffect, useRef } from 'react';
import DeckGL from '@deck.gl/react';
import { GeoJsonLayer, ScatterplotLayer } from '@deck.gl/layers';
import { OrthographicView } from '@deck.gl/core';
import { geoAlbersUsa } from 'd3-geo';
import { feature } from 'topojson-client';
import type { DestinationCoverage, Zip3ReferenceMap, WebGLCoverageMapProps } from './types';
import { haversineDistance } from './utils/distance';
import { MapDataService } from '@/services/mapDataService';

const statesUrl = 'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json';
const zip3Url = `${import.meta.env.BASE_URL}data/zip3-boundaries.json`;

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

// Color palette
const COLOR_PALETTE = {
  darkGreen: { hex: '#22c55e', rgb: [34, 197, 94] as [number, number, number] },
  lightGreen: { hex: '#84cc16', rgb: [132, 204, 22] as [number, number, number] },
  yellow: { hex: '#eab308', rgb: [234, 179, 8] as [number, number, number] },
  orange: { hex: '#f97316', rgb: [249, 115, 22] as [number, number, number] },
  red: { hex: '#ef4444', rgb: [239, 68, 68] as [number, number, number] },
  gray: { hex: '#e5e7eb', rgb: [229, 231, 235] as [number, number, number] },
} as const;

type ColorKey = keyof typeof COLOR_PALETTE;

// Delivery goal schemes
const DELIVERY_GOAL_SCHEMES = {
  2: {
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

function getColorForDays(days: number, goal: DeliveryGoal) {
  const clampedDays = Math.max(1, Math.min(5, Math.round(days))) as 1 | 2 | 3 | 4 | 5;
  const scheme = DELIVERY_GOAL_SCHEMES[goal];
  const colorKey = scheme.colorMapping[clampedDays];
  return COLOR_PALETTE[colorKey];
}

function getLegendItems(goal: DeliveryGoal) {
  return DELIVERY_GOAL_SCHEMES[goal].legend.map(item => ({
    ...COLOR_PALETTE[item.colorKey],
    label: item.label,
  }));
}

function isPointInPolygon(point: [number, number], polygon: any): boolean {
  const [lng, lat] = point;
  
  if (polygon.type === 'MultiPolygon') {
    return polygon.coordinates.some((poly: any) => 
      checkSinglePolygon(lng, lat, poly[0])
    );
  }
  
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

function findZip3ForDropPosition(
  screenX: number,
  screenY: number,
  zip3GeoJson: any,
  zip3Reference: Zip3ReferenceMap,
  projection: any
): string | null {
  if (!zip3GeoJson || !projection) return null;
  
  const inverted = projection.invert([screenX, screenY]);
  if (!inverted) return null;
  
  const [lng, lat] = inverted;
  
  for (const feature of zip3GeoJson.features) {
    const zip3 = feature.properties.ZIP3 || feature.properties.ZCTA3 || feature.properties.GEOID10;
    
    if (isPointInPolygon([lng, lat], feature.geometry)) {
      return zip3;
    }
  }
  
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

export default function WebGLCoverageMap({
  warehouses,
  deliveryGoal = 2,
  zip3Reference,
  onWarehouseMove,
  className
}: WebGLCoverageMapProps) {
  const [statesGeoJson, setStatesGeoJson] = useState<any>(null);
  const [zip3GeoJson, setZip3GeoJson] = useState<any>(null);
  const [loadedZip3Reference, setLoadedZip3Reference] = useState<Zip3ReferenceMap | null>(null);
  const [coverageData, setCoverageData] = useState<DestinationCoverage[]>([]);
  const [webglError, setWebglError] = useState<string | null>(null);
  const [hoveredZip3, setHoveredZip3] = useState<string | null>(null);
  const [hoveredState, setHoveredState] = useState<string | null>(null);
  const [hoveredWarehouse, setHoveredWarehouse] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0, scale: BASE_SCALE });
  const [animationTime, setAnimationTime] = useState(0);
  const [draggedWarehouse, setDraggedWarehouse] = useState<{ zip3: string; startPos: [number, number] } | null>(null);
  const [dragPreviewZip3, setDragPreviewZip3] = useState<string | null>(null);
  const [dragPosition, setDragPosition] = useState<[number, number] | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const effectiveZip3Reference = zip3Reference || loadedZip3Reference;
  
  const projection = useMemo(() => {
    const verticalPosition = containerWidth <= 650
      ? dimensions.height * 0.42
      : dimensions.height / 2 + 20;
    return geoAlbersUsa()
      .scale(dimensions.scale)
      .translate([dimensions.width / 2, verticalPosition]);
  }, [dimensions, containerWidth]);
  
  const aspectRatio = useMemo(() => {
    return containerWidth <= 650 ? 1.35 : BASE_WIDTH / BASE_HEIGHT;
  }, [containerWidth]);

  // Animation clock
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

  // Responsive sizing
  useEffect(() => {
    const updateDimensions = () => {
      if (!containerRef.current) return;

      const currentWidth = containerRef.current.clientWidth;
      const currentHeight = containerRef.current.clientHeight;
      setContainerWidth(currentWidth);

      // Use actual container dimensions (CSS aspect-ratio sets them)
      const width = Math.min(currentWidth, BASE_WIDTH);
      const height = Math.min(currentHeight, BASE_HEIGHT);
      const scale = (width / BASE_WIDTH) * BASE_SCALE;

      setDimensions({ width, height, scale });
    };

    // Initial sizing with small delay to ensure container is laid out
    const timeoutId = setTimeout(updateDimensions, 0);

    const resizeObserver = new ResizeObserver(() => {
      updateDimensions();
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      clearTimeout(timeoutId);
      resizeObserver.disconnect();
    };
  }, []);

  // Load states TopoJSON
  useEffect(() => {
    if (statesGeoJson) return;
    
    fetch(statesUrl)
      .then(res => res.json())
      .then(topology => {
        const geojson = feature(topology, topology.objects.states);
        setStatesGeoJson(geojson);
      })
      .catch(err => console.error('Failed to load states:', err));
  }, [statesGeoJson]);

  // Load ZIP3 GeoJSON
  useEffect(() => {
    if (zip3GeoJson) return;
    
    fetch(zip3Url)
      .then(res => res.json())
      .then(data => {
        setZip3GeoJson(data);
      })
      .catch(err => console.error('Failed to load ZIP3 GeoJSON:', err));
  }, [zip3GeoJson]);

  // Load ZIP3 reference if not provided
  useEffect(() => {
    if (zip3Reference || loadedZip3Reference) return;
    
    MapDataService.loadZip3Reference()
      .then(data => setLoadedZip3Reference(data))
      .catch(err => console.error('Failed to load ZIP3 reference:', err));
  }, [zip3Reference, loadedZip3Reference]);

  // Calculate coverage when warehouses change
  useEffect(() => {
    if (!warehouses || warehouses.length === 0 || !effectiveZip3Reference) {
      setCoverageData([]);
      return;
    }

    console.log('WebGLCoverageMap: Calculating coverage for warehouses:', warehouses);

    MapDataService.loadZoneMatrix()
      .then(zoneMatrix => {
        console.log('WebGLCoverageMap: Zone matrix loaded');
        console.log('  Origins:', zoneMatrix.origins?.length || 'N/A');
        console.log('  Destinations:', zoneMatrix.destinations?.length || 'N/A');
        
        const coverage: DestinationCoverage[] = [];

        // Iterate through all destinations (ZIP3s)
        Object.entries(effectiveZip3Reference).forEach(([destZip3, destData]) => {
          const destIdx = zoneMatrix.destinations.indexOf(destZip3);
          if (destIdx === -1) return; // Skip if destination not in matrix

          let minTransitDays = Infinity;

          // Check each warehouse to find minimum transit time
          warehouses.forEach((wh) => {
            const originIdx = zoneMatrix.origins.indexOf(wh.zip3);
            if (originIdx === -1) return; // Skip if origin not in matrix

            const transitDays = zoneMatrix.matrix[originIdx][destIdx];
            if (transitDays !== undefined && transitDays < minTransitDays) {
              minTransitDays = transitDays;
            }
          });

          if (minTransitDays !== Infinity) {
            coverage.push({
              zip3: destZip3,
              transit_days: minTransitDays,
              population: destData.population,
              lat: destData.lat,
              lng: destData.lng,
              city: destData.city,
              state: destData.state,
            });
          }
        });

        console.log('WebGLCoverageMap: Coverage calculated, zones:', coverage.length);
        setCoverageData(coverage);
      })
      .catch(err => console.error('WebGLCoverageMap: Failed to calculate coverage:', err));
  }, [warehouses, effectiveZip3Reference]);

  // Pre-project states GeoJSON
  const projectedStatesGeoJson = useMemo(() => {
    if (!statesGeoJson) return null;

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

    return {
      ...statesGeoJson,
      features: statesGeoJson.features.map((feature: any) => ({
        ...feature,
        geometry: projectGeometry(feature.geometry),
      })),
    };
  }, [statesGeoJson, dimensions, containerWidth]);

  // Pre-project ZIP3 GeoJSON
  const projectedGeoJson = useMemo(() => {
    if (!zip3GeoJson) return null;

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

    return {
      ...zip3GeoJson,
      features: zip3GeoJson.features.map((feature: any) => ({
        ...feature,
        geometry: projectGeometry(feature.geometry),
      })),
    };
  }, [zip3GeoJson, dimensions, containerWidth]);

  const getColor = (days: number | undefined): [number, number, number] => {
    if (!days || days <= 0) return COLOR_PALETTE.gray.rgb;
    return getColorForDays(days, deliveryGoal).rgb;
  };

  const coverageDataMap = useMemo(() => {
    const map = new Map<string, DestinationCoverage>();
    coverageData.forEach(d => map.set(d.zip3, d));
    return map;
  }, [coverageData]);

  // Project warehouses (lookup coordinates from zip3Reference if not provided)
  const projectedWarehouses = useMemo(() => {
    if (!effectiveZip3Reference) return [];
    
    const verticalPosition = containerWidth <= 650
      ? dimensions.height * 0.42
      : dimensions.height / 2 + 20;
    const projection = geoAlbersUsa()
      .scale(dimensions.scale)
      .translate([dimensions.width / 2, verticalPosition]);

    return warehouses
      .map(wh => {
        // If warehouse has lat/lng, use them; otherwise lookup from zip3Reference
        let lng = wh.lng;
        let lat = wh.lat;
        
        if ((!lng || !lat) && wh.zip3 && effectiveZip3Reference[wh.zip3]) {
          const ref = effectiveZip3Reference[wh.zip3];
          lng = ref.lng;
          lat = ref.lat;
          console.log(`WebGLCoverageMap: Looked up coordinates for warehouse ${wh.zip3}:`, { lat, lng });
        }
        
        if (!lng || !lat) {
          console.warn(`WebGLCoverageMap: No coordinates for warehouse ${wh.zip3}`);
          return null;
        }
        
        const projected = projection([lng, lat]);
        if (!projected) {
          console.warn(`WebGLCoverageMap: Failed to project warehouse ${wh.zip3} at [${lng}, ${lat}]`);
          return null;
        }

        return {
          ...wh,
          lat,
          lng,
          position: projected,
        };
      })
      .filter(Boolean);
  }, [warehouses, dimensions, containerWidth, effectiveZip3Reference]);

  // Create layers
  const layers = useMemo(() => {
    const layersArray: any[] = [];

    // Background states
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
            return isHovered ? [200, 205, 210, 255] : [229, 231, 235, 255];
          },
          getLineColor: (d: any) => {
            const stateName = d.properties?.name;
            const isHovered = hoveredState === stateName;
            return isHovered ? [100, 100, 100, 255] : [200, 200, 200, 180];
          },
          getLineWidth: (d: any) => {
            const stateName = d.properties?.name;
            const isHovered = hoveredState === stateName;
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

    // ZIP3 layer (always shaded)
    if (projectedGeoJson) {
      layersArray.push(
        new GeoJsonLayer({
          id: 'zip3-layer',
          data: projectedGeoJson,
          filled: true,
          stroked: true,
          getFillColor: (d: any) => {
            const zip3 = d.properties.ZIP3 || d.properties.ZCTA3 || d.properties.GEOID10;
            const coverage = coverageDataMap.get(zip3);

            // If no coverage data yet, show gray
            const color = coverage ? getColor(coverage.transit_days) : COLOR_PALETTE.gray.rgb;

            const isHovered = hoveredZip3 === zip3;
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
          },
          getLineColor: (d: any) => {
            const zip3 = d.properties.ZIP3 || d.properties.ZCTA3 || d.properties.GEOID10;
            const isHovered = hoveredZip3 === zip3;

            if (isHovered) {
              return [120, 120, 120, 255];
            }

            return [170, 170, 170, 160];
          },
          getLineWidth: (d: any) => {
            const zip3 = d.properties.ZIP3 || d.properties.ZCTA3 || d.properties.GEOID10;
            const isHovered = hoveredZip3 === zip3;
            return isHovered ? 1.5 : 0.75;
          },
          lineWidthUnits: 'pixels',
          pickable: true,
          updateTriggers: {
            getFillColor: [coverageDataMap, hoveredZip3],
            getLineColor: [hoveredZip3],
            getLineWidth: [hoveredZip3],
          },
        })
      );
    }

    // Warehouse markers
    if (projectedWarehouses.length > 0) {
      const maxCoverage = Math.max(...projectedWarehouses.map((w: any) => w.populationCovered || 1));
      
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
            const baseRadius = d.isRequired ? 7.7 : 6.6;
            
            if (hoveredWarehouse === d.zip3) {
              return baseRadius * 1.3;
            }
            
            const coverage = d.populationCovered || 1;
            const speed = coverage / maxCoverage;
            const cycleTime = 2000 / speed;
            const cycle = (animationTime % cycleTime) / cycleTime;
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
            data: [draggedWarehouse],
          },
        })
      );
      
      if (draggedWarehouse && dragPosition) {
        layersArray.push(
          new ScatterplotLayer({
            id: 'dragged-warehouse',
            data: [{ position: dragPosition }],
            getPosition: (d: any) => d.position,
            getFillColor: [37, 99, 235, 200],
            getRadius: 9.9,
            radiusUnits: 'pixels',
            stroked: true,
            lineWidthUnits: 'pixels',
            getLineWidth: 2,
            getLineColor: [255, 255, 255, 255],
            pickable: false,
            updateTriggers: {
              getPosition: [dragPosition],
            },
          })
        );
      }
    }

    return layersArray;
  }, [projectedGeoJson, projectedStatesGeoJson, coverageDataMap, projectedWarehouses, warehouses, hoveredState, hoveredZip3, animationTime, draggedWarehouse, dragPosition, coverageData.length]);

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

  const handleDragStart = (info: any) => {
    if (info.layer?.id === 'warehouses' && info.object) {
      const warehouseZip3 = info.object.zip3;
      setDraggedWarehouse({
        zip3: warehouseZip3,
        startPos: info.object.position
      });
      setDragPreviewZip3(warehouseZip3);
      setHoveredZip3(warehouseZip3);
    }
  };

  const handleDrag = (info: any) => {
    if (!draggedWarehouse || !effectiveZip3Reference) return;
    
    if (info.coordinate) {
      setDragPosition([info.coordinate[0], info.coordinate[1]]);
      
      const targetZip3 = findZip3ForDropPosition(
        info.coordinate[0],
        info.coordinate[1],
        zip3GeoJson,
        effectiveZip3Reference,
        projection
      );
      
      setDragPreviewZip3(targetZip3);
      
      if (targetZip3) {
        setHoveredZip3(targetZip3);
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
      setTooltipPosition(null);
      return;
    }
    
    const oldZip3 = draggedWarehouse.zip3;
    const newZip3 = dragPreviewZip3;
    
    if (newZip3 && newZip3 !== oldZip3) {
      onWarehouseMove(oldZip3, newZip3);
    }
    
    setDraggedWarehouse(null);
    setDragPreviewZip3(null);
    setDragPosition(null);
    setHoveredZip3(null);
    setTooltipPosition(null);
  };

  const handleHover = (info: any) => {
    if (info.layer?.id === 'warehouses') {
      const warehouseZip3 = info.object?.zip3;
      if (warehouseZip3) {
        setHoveredWarehouse(warehouseZip3);
        setHoveredZip3(warehouseZip3);
        setTooltipPosition({ x: info.x, y: info.y });
      } else {
        setHoveredWarehouse(null);
        setHoveredZip3(null);
        setTooltipPosition(null);
      }
    } else if (info.layer?.id === 'states-background') {
      const stateName = info.object?.properties?.name;
      setHoveredState(stateName || null);
      setHoveredZip3(null);
      setHoveredWarehouse(null);
      setTooltipPosition(stateName ? { x: info.x, y: info.y } : null);
    } else if (info.layer?.id?.startsWith('zip3-')) {
      const zip3 = info.object?.properties?.ZIP3 || info.object?.properties?.ZCTA3 || info.object?.properties?.GEOID10;
      if (zip3) {
        setHoveredZip3(zip3);
        setHoveredWarehouse(null);
        setTooltipPosition({ x: info.x, y: info.y });
      } else {
        setHoveredZip3(null);
        setHoveredWarehouse(null);
        setTooltipPosition(null);
      }
    } else {
      setHoveredZip3(null);
      setHoveredState(null);
      setHoveredWarehouse(null);
      setTooltipPosition(null);
    }
  };

  // Don't render if no warehouses
  if (warehouses.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
        No warehouse data available
      </div>
    );
  }

  // Show loading state while data is loading or dimensions not calculated
  const isDataLoading = !statesGeoJson || !zip3GeoJson || !effectiveZip3Reference || dimensions.width === 0;
  
  if (isDataLoading) {
    return (
      <div
        ref={containerRef}
        className="w-full aspect-[1.35] max-h-[600px] md:aspect-[16/9] flex items-center justify-center p-8 text-center text-muted-foreground"
        style={{
          isolation: 'isolate'
        }}
      >
        Loading map...
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`w-full aspect-[1.35] max-h-[600px] md:aspect-[16/9] ${className || ''}`}
      style={{
        isolation: 'isolate'
      }}
    >
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
            color: '#ef4444',
            padding: '2rem'
          }}>
            <div style={{ fontSize: '1.5rem' }}>⚠️</div>
            <div style={{ fontWeight: 600 }}>WebGL Error</div>
            <div style={{ fontSize: '0.875rem', textAlign: 'center' }}>{webglError}</div>
          </div>
        ) : projectedGeoJson && projectedStatesGeoJson ? (
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
              getCursor={() => (hoveredZip3 || hoveredState || hoveredWarehouse ? 'pointer' : 'default')}
            />
            
            {/* Tooltip */}
            {!draggedWarehouse && hoveredZip3 && tooltipPosition && coverageDataMap.get(hoveredZip3) && (() => {
              const offset = 35;
              const tooltipWidth = 150;
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
                    Time: {coverage.transit_days} Day{coverage.transit_days > 1 ? 's' : ''}
                  </div>
                  {coverage.state && (
                    <div style={{ fontSize: '0.8rem' }}>
                      {STATE_NAMES[coverage.state] || coverage.state}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Legend */}
            {containerWidth <= 650 ? (
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
                <div style={{ fontWeight: 600, marginBottom: '0.2rem', fontSize: '0.7rem' }}>Delivery:</div>
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
                    <span style={{ fontSize: '0.7rem' }}>{item.label}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            height: '100%',
            color: '#6b7280'
          }}>
            Loading map...
          </div>
        )}
      </div>
    </div>
  );
}
