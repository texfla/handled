declare module 'swagger-ui-react' {
  import { Component } from 'react';

  interface SwaggerUIProps {
    spec?: any;
    url?: string;
    docExpansion?: string;
    deepLinking?: boolean;
    presets?: any[];
    requestInterceptor?: (req: any) => any;
    onComplete?: () => void;
    [key: string]: any;
  }

  class SwaggerUI extends Component<SwaggerUIProps> {
    static presets: {
      apis: any;
    };
  }

  export default SwaggerUI;
}

declare module 'swagger-ui-react/swagger-ui.css' {
  const content: string;
  export default content;
}

