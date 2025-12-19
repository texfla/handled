# Deck.gl Mapping Solution Implementation Plan

## Overview
Implement a high-performance, interactive mapping component for 3PL logistics using deck.gl 9.2.5. This reusable React component will visualize warehouse coverage areas, ZIP3 boundaries, and support drag-and-drop warehouse relocation with real-time transit time calculations.

## Architecture Goals
- **Performance**: GPU-accelerated rendering with WebGL
- **Flexibility**: Reusable component for multiple 3PL logistics use cases
- **Interactivity**: Hover tooltips, drag & drop, display mode controls
- **Data Integration**: Support for shapefiles (ZIP3 boundaries) and location data
- **Visual Excellence**: Match the aesthetic of https://www.radioactivebanana.com/projects/wh_optimizer/

## Phase 1: Dependencies & Setup ✅

### Update `apps/backoffice/web/package.json`
```json
{
  "dependencies": {
    "@deck.gl/core": "^9.2.5",
    "@deck.gl/layers": "^9.2.5",
    "@deck.gl/react": "^9.2.5",
    "d3-geo": "^3.1.1",
    "topojson-client": "^3.1.1"
  },
  "devDependencies": {
    "@types/d3-geo": "^3.1.1",
    "@types/topojson-client": "^3.1.5"
  }
}
```

### Update Vite Configuration (`apps/backoffice/web/vite.config.ts`)
```typescript
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    include: ['@deck.gl/core', '@deck.gl/layers', '@deck.gl/react']
  },
  define: {
    global: 'globalThis',
  },
});
```

## Phase 2: File Structure & Types ✅

Create this directory structure in `apps/backoffice/web/src/components/`:
```
apps/backoffice/web/src/components/
├── map/
│   ├── DeckGLMap.tsx              # Main component
│   ├── DeckGLMap.module.css       # Component styles
│   ├── layers/
│   │   ├── StateBackgroundLayer.ts
│   │   ├── ZipBoundaryLayer.ts
│   │   └── WarehouseMarkerLayer.ts
│   ├── hooks/
│   │   ├── useMapInstance.ts
│   │   ├── useMapLayers.ts
│   │   └── useMapInteractions.ts
│   ├── utils/
│   │   ├── map-helpers.ts
│   │   └── projection-utils.ts
│   └── types/
│       └── map.types.ts
├── ui/
│   ├── map-legend.tsx            # Legend component
│   └── map-controls.tsx          # Display mode controls
└── index.ts                      # Export all components
```

### Type Definitions (`apps/backoffice/web/src/components/map/types/map.types.ts`)
```typescript
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

export interface DestinationCoverage {
  zip3: string;
  transit_days: number;
  carrier?: string;
  population: number;
  lat?: number;
  lng?: number;
  state?: string;
}

export interface WarehouseLocation {
  zip3: string;
  lat: number;
  lng: number;
  city: string;
  state: string;
  isRequired?: boolean;
  populationCovered?: number;
}

export type DisplayMode = 'shaded' | 'outlines' | 'dots';

export interface DeckGLMapProps {
  coverageData: DestinationCoverage[];
  warehouses: WarehouseLocation[];
  deliveryGoal: 2 | 3;
  displayMode?: DisplayMode;
  zip3Reference?: Zip3ReferenceMap;
  onWarehouseMove?: (oldZip3: string, newZip3: string) => void;
  className?: string;
}
```

## Phase 3: Core Implementation ✅

### Color Palette (`apps/backoffice/web/src/components/map/utils/map-helpers.ts`)
```typescript
export const COLOR_PALETTE = {
  darkGreen: { hex: '#22c55e', rgb: [34, 197, 94] },
  lightGreen: { hex: '#84cc16', rgb: [132, 204, 22] },
  yellow: { hex: '#eab308', rgb: [234, 179, 8] },
  orange: { hex: '#f97316', rgb: [249, 115, 22] },
  red: { hex: '#ef4444', rgb: [239, 68, 68] },
  gray: { hex: '#e5e7eb', rgb: [229, 231, 235] },
} as const;

export const DELIVERY_GOAL_SCHEMES = {
  2: {
    name: '2-Day Goal',
    goal: 2,
    colorMapping: {
      1: 'darkGreen',
      2: 'lightGreen',
      3: 'yellow',
      4: 'orange',
      5: 'red',
    },
  },
  3: {
    name: '3-Day Goal',
    goal: 3,
    colorMapping: {
      1: 'darkGreen',
      2: 'darkGreen',
      3: 'lightGreen',
      4: 'yellow',
      5: 'red',
    },
  },
} as const;
```

### Projection Utils (`apps/backoffice/web/src/components/map/utils/projection-utils.ts`)
```typescript
import { geoAlbersUsa } from 'd3-geo';

export function createAlbersProjection(width: number, height: number, scale: number) {
  // Position map based on screen width (matching your existing logic)
  const verticalPosition = width <= 650
    ? height * 0.42
    : height / 2 + 20;

  return geoAlbersUsa()
    .scale(scale)
    .translate([width / 2, verticalPosition]);
}
```

### State Background Layer (`apps/backoffice/web/src/components/map/layers/StateBackgroundLayer.ts`)
```typescript
import { GeoJsonLayer } from '@deck.gl/layers';
import type { GeoJsonLayerProps } from '@deck.gl/layers';

interface StateBackgroundLayerProps extends Omit<GeoJsonLayerProps, 'data'> {
  data: any;
  hoveredState?: string;
}

export function StateBackgroundLayer({ data, hoveredState, ...props }: StateBackgroundLayerProps) {
  return new GeoJsonLayer({
    id: 'states-background',
    data,
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
    ...props,
  });
}
```

## Phase 4: Main Component Implementation ✅

### DeckGLMap.tsx (Core Component)
```typescript
import { useMemo, useState, useEffect, useRef } from 'react';
import DeckGL from '@deck.gl/react';
import { OrthographicView } from '@deck.gl/core';
import { StateBackgroundLayer } from './layers/StateBackgroundLayer';
import { ZipBoundaryLayer } from './layers/ZipBoundaryLayer';
import { WarehouseMarkerLayer } from './layers/WarehouseMarkerLayer';
import { createAlbersProjection } from './utils/projection-utils';
import type { DeckGLMapProps } from './types/map.types';
import './DeckGLMap.module.css';

const statesUrl = 'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json';
const zip3Url = '/data/zip3-boundaries.json'; // Place in apps/backoffice/web/public/data/

export default function DeckGLMap({
  coverageData,
  warehouses,
  deliveryGoal,
  displayMode = 'shaded',
  zip3Reference,
  onWarehouseMove,
  className,
}: DeckGLMapProps) {
  const [statesGeoJson, setStatesGeoJson] = useState<any>(null);
  const [zip3GeoJson, setZip3GeoJson] = useState<any>(null);
  const [dimensions, setDimensions] = useState({ width: 960, height: 540, scale: 1100 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Responsive sizing logic (matching your existing implementation)
  useEffect(() => {
    const updateDimensions = () => {
      if (!containerRef.current) return;
      const currentWidth = containerRef.current.clientWidth;
      const aspectRatio = currentWidth <= 650 ? 1.35 : 960 / 540;
      const width = Math.min(currentWidth, 960);
      const height = width / aspectRatio;
      const scale = (width / 960) * 1100;
      setDimensions({ width, height, scale });
    };

    updateDimensions();
    const resizeObserver = new ResizeObserver(updateDimensions);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    return () => resizeObserver.disconnect();
  }, []);

  // Load GeoJSON data
  useEffect(() => {
    Promise.all([
      fetch(statesUrl).then(r => r.json()),
      fetch(zip3Url).then(r => r.json())
    ]).then(([statesTopo, zip3Data]) => {
      // Convert TopoJSON to GeoJSON
      const { feature } = await import('topojson-client');
      const statesGeo = feature(statesTopo, statesTopo.objects.states);
      setStatesGeoJson(statesGeo);
      setZip3GeoJson(zip3Data);
    });
  }, []);

  const layers = useMemo(() => {
    const layerArray = [];

    if (statesGeoJson) {
      layerArray.push(StateBackgroundLayer({ data: statesGeoJson }));
    }

    if (zip3GeoJson && coverageData.length > 0) {
      layerArray.push(ZipBoundaryLayer({
        data: zip3GeoJson,
        coverageData,
        displayMode,
        deliveryGoal
      }));
    }

    if (warehouses.length > 0) {
      layerArray.push(WarehouseMarkerLayer({
        data: warehouses,
        onWarehouseMove
      }));
    }

    return layerArray;
  }, [statesGeoJson, zip3GeoJson, coverageData, warehouses, displayMode, deliveryGoal]);

  const projection = useMemo(() =>
    createAlbersProjection(dimensions.width, dimensions.height, dimensions.scale),
    [dimensions]
  );

  const initialViewState = useMemo(() => ({
    ortho: {
      target: [dimensions.width / 2, dimensions.height / 2 + 20, 0],
      zoom: 0,
    }
  }), [dimensions]);

  return (
    <div ref={containerRef} className={className}>
      <DeckGL
        initialViewState={initialViewState}
        controller={false}
        layers={layers}
        views={[new OrthographicView({ id: 'ortho', controller: false, flipY: true })]}
        width={dimensions.width}
        height={dimensions.height}
        getCursor={({ isHovering }) => isHovering ? 'pointer' : 'default'}
      />
    </div>
  );
}
```

## Phase 5: Data Setup & Integration

### Create Public Data Directory
```
public/
└── data/
    ├── zip3-boundaries.json    # ZIP3 GeoJSON from your warehouse optimizer
    └── states-10m.json         # Already available via CDN
```

### Data Loading Service (`apps/backoffice/web/src/services/mapDataService.ts`)
```typescript
export class MapDataService {
  static async loadZip3Boundaries(): Promise<any> {
    const response = await fetch('/data/zip3-boundaries.json');
    return response.json();
  }

  static async loadCoverageData(clientId: string): Promise<DestinationCoverage[]> {
    // Your API call to get coverage data for a client
    const response = await api.get(`/clients/${clientId}/coverage`);
    return response.data;
  }
}
```

### Add to Components Index (`apps/backoffice/web/src/components/index.ts`)
```typescript
export { default as DeckGLMap } from './map/DeckGLMap';
export { MapLegend } from './ui/map-legend';
export { MapControls } from './ui/map-controls';
```

## Phase 6: ZIP3 Boundaries (Next)

### ZipBoundaryLayer Implementation
- Color-coded by transit days
- Multiple display modes: shaded/outlines/dots
- Interactive hover states

### Transit Time Coloring Logic
- Delivery goal schemes (1-day, 2-day, 3-day)
- Color mapping based on transit days
- Responsive legend

### Display Mode Controls
- Shaded: Full color boundaries
- Outlines: Boundary lines only
- Dots: Centroid points only

## Phase 7: Warehouse Features

### WarehouseMarkerLayer with Animations
- Animated pulsing circles
- Size based on capacity
- Drag & drop support
- Hover tooltips

### Drag & Drop Interactions
- Position update callbacks
- Real-time position changes
- Boundary constraints

## Phase 8: Polish & Optimization

### Hover Tooltips and Legends
- Interactive hover states
- Transit time information
- Warehouse details

### Performance Optimizations
- GPU acceleration with WebGL
- Layer compositing for efficient updates
- Viewport culling
- Texture atlas for markers

### Error Handling and Fallbacks
- WebGL compatibility checks
- Canvas fallback options
- Loading states and error boundaries

## Implementation Phases Summary

### Phase 1: Foundation ✅
- [x] Project dependencies and configuration
- [x] Basic component structure and types
- [x] Geographic projection utilities
- [x] Color schemes and legends

### Phase 2: Core Rendering ✅
- [x] State background layer
- [x] Basic DeckGL setup
- [x] Component integration

### Phase 3: ZIP3 Boundaries (Next)
- [ ] ZipBoundaryLayer implementation
- [ ] Transit time coloring logic
- [ ] Display mode controls

### Phase 4: Warehouse Features
- [ ] WarehouseMarkerLayer with animations
- [ ] Drag & drop interactions
- [ ] Position update callbacks

### Phase 5: Polish & Optimization
- [ ] Hover tooltips and legends
- [ ] Performance optimizations
- [ ] Error handling and fallbacks

### Phase 6: API Integration
- [ ] Connect to real coverage data
- [ ] Warehouse CRUD operations
- [ ] Real-time updates

## Success Criteria
- [ ] Matches visual design of reference implementation
- [ ] Smooth 60fps performance with 10k+ ZIP3 areas
- [ ] Intuitive drag & drop interactions
- [ ] Responsive across device sizes
- [ ] Type-safe TypeScript implementation
- [ ] Reusable across multiple pages

## Data Sources

### Static Files
- **States GeoJSON**: US state boundaries for background
- **ZIP3 Boundaries**: Coverage areas with transit time data

### Dynamic Data
- **Warehouse Locations**: Draggable points with metadata
- **Coverage Data**: Real-time transit time calculations
- **API Endpoints**: Client-specific coverage information

### Data Loading Strategy
- Static GeoJSON files served from `apps/backoffice/web/public/data/`
- Dynamic coverage data from API endpoints
- Lazy loading with error boundaries
- TopoJSON for compressed geography

## Performance & Optimization

### Rendering Optimizations
- GPU-accelerated with WebGL
- Layer compositing for efficient updates
- Viewport culling
- Texture atlas for markers

### Data Optimization
- TopoJSON for compressed geography
- Spatial indexing for large datasets
- Progressive loading
- Efficient data structures

## Integration & Testing

### Component Integration
- Embed in ClientDetailPage.tsx
- Responsive sizing with className props
- Clean API for data passing

### Testing Strategy
- Unit tests for utilities and hooks
- Visual regression tests
- Performance benchmarks
- Cross-browser compatibility

## Timeline

- **Phase 1**: 30 minutes (dependencies)
- **Phase 2**: 1 hour (file structure)
- **Phase 3**: 2-3 hours (core types & utils)
- **Phase 4**: 3-4 hours (main component & layers)
- **Phase 5**: 1 hour (integration)
- **Phase 6**: 1-2 hours (data setup)
- **Phase 7**: 2-3 hours (testing & refinement)

**Total: 10-14 hours** for a production-ready implementation!

## Risks & Mitigations

- **WebGL Compatibility**: Provide canvas fallback
- **Large Datasets**: Implement progressive loading
- **Browser Performance**: GPU acceleration with deck.gl
- **Data Loading**: Error boundaries and loading states

## Future Enhancements

- Route optimization visualization
- Historical coverage analysis
- Real-time delivery tracking
- Multi-warehouse scenario planning
