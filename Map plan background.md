
## 📋 **Complete Deck.gl 9.2.5 Implementation Plan**

Based on your existing warehouse optimizer code and the handled project structure, here's a comprehensive plan to implement the mapping solution:

## 📦 **Phase 1: Dependencies & Setup**

### **Update `apps/backoffice/web/package.json`**
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

### **Update Vite Configuration** (`apps/backoffice/web/vite.config.ts`)
```typescript
export default defineConfig({
  // Add deck.gl optimization
  optimizeDeps: {
    include: ['@deck.gl/core', '@deck.gl/layers', '@deck.gl/react']
  },
  define: {
    global: 'globalThis',
  },
});
```

## 📁 **Phase 2: File Structure**

Create this directory structure:
```
src/components/
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

## 🔧 **Phase 3: Core Implementation**

### **1. Type Definitions** (`src/components/map/types/map.types.ts`)
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

### **2. Color Palette** (`src/components/map/utils/map-helpers.ts`)
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

### **3. Projection Utils** (`src/components/map/utils/projection-utils.ts`)
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

### **4. Layer Components**

**StateBackgroundLayer.ts:**
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

## 🎨 **Phase 4: Main Component**

### **DeckGLMap.tsx** (Core Component)
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
const zip3Url = '/data/zip3-boundaries.json'; // Place in public/data/

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

## 🎯 **Phase 5: Integration**

### **Add to Components Index** (`src/components/index.ts`)
```typescript
export { default as DeckGLMap } from './map/DeckGLMap';
export { MapLegend } from './ui/map-legend';
export { MapControls } from './ui/map-controls';
```

### **Sample Usage in ClientDetailPage**
```typescript
import { DeckGLMap, MapLegend, MapControls } from '@/components';

// In your component:
<DeckGLMap
  coverageData={coverageData}
  warehouses={warehouses} 
  deliveryGoal={2}
  displayMode="shaded"
  onWarehouseMove={handleWarehouseMove}
/>
```

## 📊 **Phase 6: Data Setup**

### **Create Public Data Directory**
```
public/
└── data/
    ├── zip3-boundaries.json    # ZIP3 GeoJSON from your warehouse optimizer
    └── states-10m.json         # Already available via CDN
```

### **Data Loading Service** (`src/services/mapDataService.ts`)
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

## ✅ **Phase 7: Testing & Validation**

### **Test Component** (`src/pages/MapTestPage.tsx`)
```typescript
// Create a test page to validate the implementation
export default function MapTestPage() {
  // Load sample data and test the component
}
```

### **Performance Benchmarks**
- [ ] Renders 10k+ ZIP3 boundaries smoothly
- [ ] Warehouse animations at 60fps
- [ ] Drag & drop responsive
- [ ] Memory usage stable

## 🚀 **Implementation Timeline**

- **Phase 1**: 30 minutes (dependencies)
- **Phase 2**: 1 hour (file structure)  
- **Phase 3**: 2-3 hours (core types & utils)
- **Phase 4**: 3-4 hours (main component & layers)
- **Phase 5**: 1 hour (integration)
- **Phase 6**: 1-2 hours (data setup)
- **Phase 7**: 2-3 hours (testing & refinement)

**Total: 10-14 hours** for a production-ready implementation!

## 🎯 **Key Benefits of This Approach**

1. **Direct Migration** from your existing deck.gl 8.9 → 9.0
2. **Maintains Visual Fidelity** - exact same look and feel
3. **Integrates Seamlessly** with your shadcn/ui design system
4. **Performance Optimized** for your use case
5. **Future-Proof** - latest deck.gl with React 18 support

Ready to start implementing? I'd recommend beginning with Phase 1 (dependencies) and then building the core component structure! 🚀

Would you like me to start with any specific phase or component?