declare module '@deck.gl/react' {
  import { ComponentType } from 'react';
  const DeckGL: ComponentType<any>;
  export default DeckGL;
}

declare module '@deck.gl/core' {
  export class OrthographicView {
    constructor(props: any);
  }
  export class MapView {
    constructor(props: any);
  }
  export interface PickingInfo {
    object?: any;
    layer?: any;
    index?: number;
    x?: number;
    y?: number;
  }
}

declare module '@deck.gl/layers' {
  export class GeoJsonLayer {
    constructor(props: any);
  }
  export class ScatterplotLayer {
    constructor(props: any);
  }
}

