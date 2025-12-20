# Deck.gl Mapping Solution Implementation Plan

## Overview
Implement a high-performance, interactive mapping component for 3PL logistics using the proven deck.gl 8.9.36 approach from the working warehouse-optimizer-demo. This will adapt the tested implementation to work within the handled monorepo structure, visualizing warehouse coverage areas, ZIP3 boundaries, and supporting drag-and-drop warehouse relocation.

## Architecture Goals
- **Performance**: GPU-accelerated rendering with WebGL
- **Flexibility**: Reusable component for multiple 3PL logistics use cases
- **Interactivity**: Hover tooltips, drag & drop, display mode controls
- **Data Integration**: Support for shapefiles (ZIP3 boundaries) and location data
- **Proven Approach**: Copy working implementation from warehouse-optimizer-demo
- **Visual Excellence**: Match the aesthetic of https://www.radioactivebanana.com/projects/wh_optimizer/

## Phase 1: Dependencies & Setup ✅

### Update `apps/backoffice/web/package.json` (Copy from working demo)
```json
{
  "dependencies": {
    "@deck.gl/core": "^8.9.36",
    "@deck.gl/layers": "^8.9.36",
    "@deck.gl/react": "^8.9.36",
    "deck.gl": "^8.9.36",
    "d3-geo": "^3.1.0",
    "d3-scale": "^4.0.2",
    "topojson-client": "^3.1.0"
  },
  "devDependencies": {
    "@types/d3-geo": "^3.1.0",
    "@types/d3-scale": "^4.0.9",
    "@types/topojson-client": "^3.1.5"
  }
}
```

### Update Vite Configuration (`apps/backoffice/web/vite.config.ts`) (Copy from working demo)
```typescript
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  define: {
    global: 'globalThis',
  },
});
```

## Phase 2: Copy Working Implementation

### Adapt warehouse-optimizer-demo/src/components/WebGLCoverageMap.tsx

Copy the proven WebGLCoverageMap.tsx implementation and adapt it for the handled monorepo:

**Key adaptations needed:**
- Update import paths to match handled structure
- Modify data loading to use handled API endpoints
- Adapt warehouse/facility data structures
- Update component props to match handled data models
- Integrate with handled UI components (shadcn/ui)

**File structure (adapted from working demo):**
```
apps/backoffice/web/src/components/
├── map/
│   ├── WebGLCoverageMap.tsx       # Adapted from working demo
│   ├── types.ts                   # Adapted type definitions
│   └── utils/
│       └── map-helpers.ts         # Adapted utilities
└── index.ts                      # Export the adapted component
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

## Phase 3: Adapt Core Implementation

### Copy and Adapt WebGLCoverageMap.tsx

**Key adaptations from working demo:**
- Change import paths to match handled monorepo structure
- Update data loading to use handled API patterns
- Modify warehouse/facility data structures to match handled models
- Adapt component props for handled data requirements
- Update responsive logic to match handled UI patterns

### Implementation Approach:
1. **Copy** the working WebGLCoverageMap.tsx as starting point
2. **Adapt imports** to use handled paths and components
3. **Modify data structures** to work with handled warehouse/facility models
4. **Update API calls** to use handled backend endpoints
5. **Integrate styling** with shadcn/ui components

### Working Demo Key Features to Preserve:
- ✅ OrthographicView with flipY: true
- ✅ Pre-projection using geoAlbersUsa()
- ✅ Responsive sizing logic
- ✅ Color schemes and transit time mapping
- ✅ Hover interactions and tooltips
- ✅ Drag-and-drop warehouse positioning

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

### Phase 1: Dependencies & Setup ✅
- [x] Downgrade to proven deck.gl 8.9.36 (from broken 9.2.5)
- [x] Add missing packages (deck.gl, d3-scale)
- [x] Update Vite config to match working demo

### Phase 2: Copy Working Implementation ✅
- [x] Copy WebGLCoverageMap.tsx from warehouse-optimizer-demo
- [x] Adapt import paths for handled monorepo structure
- [x] Update file organization to match handled patterns

### Phase 3: Adapt for Handled Data Models (Next)
- [ ] Modify component props to match handled warehouse/facility structures
- [ ] Update data loading to use handled API endpoints
- [ ] Adapt responsive logic for handled UI patterns
- [ ] Integrate with shadcn/ui components

### Phase 4: Integration & Testing
- [ ] Embed in NewClientDetailPage.tsx
- [ ] Test with real client warehouse/facility data
- [ ] Verify Albers projection shows Alaska/Hawaii correctly
- [ ] Confirm drag-and-drop functionality works

### Phase 5: Polish & Optimization
- [ ] Add hover tooltips and legends
- [ ] Performance testing with large datasets
- [ ] Error handling and fallbacks
- [ ] Cross-browser compatibility

## Success Criteria
- [ ] **Working Map**: No WebGL device errors (unlike previous 9.2.5 attempt)
- [ ] **Proper Albers Projection**: Alaska and Hawaii positioned correctly
- [ ] **Handled Data Integration**: Works with real warehouse/facility data
- [ ] **Proven Performance**: Matches working demo's 60fps performance
- [ ] **Responsive Design**: Adapts to handled UI patterns
- [ ] **Drag & Drop**: Functional warehouse relocation

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

## Timeline (Adapted Approach)

- **Phase 1**: 15 minutes (update dependencies to working versions)
- **Phase 2**: 30 minutes (copy and organize working demo files)
- **Phase 3**: 2-3 hours (adapt for handled data models and APIs)
- **Phase 4**: 1-2 hours (integrate into NewClientDetailPage)
- **Phase 5**: 2-3 hours (testing, polishing, and optimization)

**Total: 6-9 hours** - Significantly faster by copying proven implementation!

## Risks & Mitigations

- **Version Compatibility**: Using proven 8.9.36 eliminates WebGL device errors from 9.2.5
- **Data Model Changes**: Working demo structure reduces adaptation complexity
- **Integration Issues**: Copying proven code minimizes unexpected bugs
- **Performance**: Established patterns from working demo ensure good performance

## Future Enhancements

- Route optimization visualization
- Historical coverage analysis
- Real-time delivery tracking
- Multi-warehouse scenario planning
