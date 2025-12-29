import React from 'react';
import { Card, CardContent } from '../ui/card';
import { AlertTriangle } from 'lucide-react';

interface MapErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class MapErrorBoundary extends React.Component<
  React.PropsWithChildren<{}>,
  MapErrorBoundaryState
> {
  constructor(props: React.PropsWithChildren<{}>) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): MapErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Map component error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-muted-foreground">
              <AlertTriangle className="mx-auto h-12 w-12 mb-3 text-yellow-500" />
              <p className="font-medium">Map failed to load</p>
              <p className="text-xs mt-1">
                {this.state.error?.message || 'WebGL may not be supported in this browser'}
              </p>
              <button 
                onClick={() => window.location.reload()}
                className="mt-4 px-4 py-2 text-sm border rounded hover:bg-muted transition-colors"
              >
                Reload Page
              </button>
            </div>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

export default MapErrorBoundary;

