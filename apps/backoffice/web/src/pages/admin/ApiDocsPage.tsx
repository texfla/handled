import { useEffect, useState } from 'react';
import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';

export function ApiDocsPage() {
  const [spec, setSpec] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSpec = async () => {
      try {
        const apiUrl = import.meta.env.DEV
          ? 'http://localhost:3001/api/docs/json'
          : '/api/docs/json';

        const response = await fetch(apiUrl, {
          credentials: 'include', // Include cookies for authentication
        });

        if (!response.ok) {
          throw new Error(`Failed to load API spec: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        setSpec(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load API docs');
      } finally {
        setLoading(false);
      }
    };

    fetchSpec();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading API documentation...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-destructive text-center">
          <div className="text-lg font-semibold mb-2">Error Loading API Documentation</div>
          <div>{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">API Documentation</h1>
        <p className="text-muted-foreground mt-1">
          Interactive documentation for the Handled API endpoints
        </p>
      </div>

      <div className="flex-1 border rounded-lg overflow-hidden bg-card">
        <SwaggerUI
          spec={spec}
          docExpansion="list"
          deepLinking={false}
          presets={[SwaggerUI.presets.apis]}
          requestInterceptor={(req) => {
            // Ensure cookies are included for authenticated requests
            return req;
          }}
          onComplete={() => {
            // Hide the default Swagger header after load
            const topbar = document.querySelector('.swagger-ui .topbar');
            if (topbar) {
              (topbar as HTMLElement).style.display = 'none';
            }
          }}
        />
      </div>
    </div>
  );
}
