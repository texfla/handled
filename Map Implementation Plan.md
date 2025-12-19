
```markdown
# Deck.gl Mapping Solution Implementation Plan

## Overview
Implement a high-performance, interactive mapping component for 3PL logistics using deck.gl 9.x. This reusable React component will visualize warehouse coverage areas, ZIP3 boundaries, and support drag-and-drop warehouse relocation with real-time transit time calculations.

## Architecture Goals
- **Performance**: GPU-accelerated rendering with WebGL
- **Flexibility**: Reusable component for multiple 3PL logistics use cases
- **Interactivity**: Hover tooltips, drag & drop, display mode controls
- **Data Integration**: Support for shapefiles (ZIP3 boundaries) and location data
- **Visual Excellence**: Match the aesthetic of https://www.radioactivebanana.com/projects/wh_optimizer/

## 1. Project Setup & Dependencies

### Package.json Updates
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

### Vite Configuration
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

## 2. Component Architecture

### File Structure
```
apps/backoffice/web/src/components/map/
├── index.ts                          # Main exports
├── DeckGLMap.tsx                     # Main component
├── DeckGLMap.module.css              # Component styles
├── types/
│   └── map.types.ts                  # TypeScript interfaces
├── utils/
│   ├── map-helpers.ts               # Color schemes, legends
│   └── projection-utils.ts          # Geographic projections
├── layers/
│   ├── StateBackgroundLayer.ts      # US state outlines
│   ├── ZipBoundaryLayer.ts          # ZIP3 boundaries with coloring
│   └── WarehouseMarkerLayer.ts      # Animated warehouse markers
└── hooks/
    ├── useMapInstance.ts            # Map initialization, data loading
    ├── useMapLayers.ts             # Layer composition
    └── useMapInteractions.ts       # Hover, drag, tooltip logic
```

### Core Interfaces
```typescript
export interface DeckGLMapProps {
  coverageData: DestinationCoverage[];
  warehouses: WarehouseLocation[];
  deliveryGoal: DeliveryGoal;
  displayMode?: DisplayMode;
  zip3Reference?: Zip3ReferenceMap;
  onWarehouseMove?: (warehouseId: string, newPosition: [number, number]) => void;
  className?: string;
}

export interface DestinationCoverage {
  zip3: string;
  transitDays: number;
  coverageScore: number;
}

export interface WarehouseLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  capacity: number;
}
```

## 3. Geographic Data Handling

### Data Sources
- **States GeoJSON**: US state boundaries for background
- **ZIP3 Boundaries**: Coverage areas with transit time data
- **Warehouse Locations**: Draggable points with metadata

### Data Loading Strategy
- Static GeoJSON files served from `/public/data/`
- Dynamic coverage data from API endpoints
- Lazy loading with error boundaries

## 4. Layer Implementation

### 1. State Background Layer
- Light gray fill for US states
- Hover highlighting
- Albers USA projection

### 2. ZIP3 Boundary Layer
- Color-coded by transit days
- Multiple display modes: shaded/outlines/dots
- Interactive hover states

### 3. Warehouse Marker Layer
- Animated pulsing circles
- Size based on capacity
- Drag & drop support
- Hover tooltips

## 5. Interaction & Controls

### Display Mode Controls
- Shaded: Full color boundaries
- Outlines: Boundary lines only
- Dots: Centroid points only

### Interactive Features
- Hover tooltips for ZIP3 areas and warehouses
- Drag & drop warehouse relocation
- Responsive legend
- Zoom/pan controls (future)

### Legend System
- Transit time color mapping
- Delivery goal schemes (1-day, 2-day, 3-day)
- Responsive positioning

## 6. Performance & Optimization

### Rendering Optimizations
- GPU-accelerated with WebGL
- Layer compositing for efficient updates
- Viewport culling
- Texture atlas for markers

### Data Optimization
- TopoJSON for compressed geography
- Spatial indexing for large datasets
- Progressive loading

## 7. Integration & Testing

### Component Integration
- Embed in ClientDetailPage.tsx
- Responsive sizing with className props
- Clean API for data passing

### Testing Strategy
- Unit tests for utilities and hooks
- Visual regression tests
- Performance benchmarks
- Cross-browser compatibility

## Implementation Phases

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
```
