import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Upload, Layers, Database } from 'lucide-react';
import { api } from '../lib/api';
import { Link } from 'react-router-dom';

interface Integration {
  id: string;
  name: string;
  description: string;
  category: string;
  fileTypes: string[];
}

export function DataOverviewPage() {
  const { data: integrationsData } = useQuery({
    queryKey: ['integrations'],
    queryFn: () => api.get<{ integrations: Integration[] }>('/api/integrations'),
  });

  const integrations = integrationsData?.integrations || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Data Overview</h1>
        <p className="text-muted-foreground mt-1">
          Manage data imports, transformations, and exports
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Integrations</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{integrations.length}</div>
            <p className="text-xs text-muted-foreground">Available data sources</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(integrations.map((i) => i.category)).size}
            </div>
            <p className="text-xs text-muted-foreground">Data categories</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quick Action</CardTitle>
            <Upload className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Link
              to="/data/imports"
              className="text-primary hover:underline text-sm font-medium"
            >
              Import Files →
            </Link>
            <p className="text-xs text-muted-foreground mt-1">Upload new data</p>
          </CardContent>
        </Card>
      </div>

      {/* Available Integrations */}
      <Card>
        <CardHeader>
          <CardTitle>Available Integrations</CardTitle>
          <CardDescription>Data sources ready for import</CardDescription>
        </CardHeader>
        <CardContent>
          {integrations.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No integrations available. Check backend connection.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {integrations.map((integration) => (
                <div
                  key={integration.id}
                  className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                >
                  <div className="font-medium">{integration.name}</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {integration.description}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs bg-secondary px-2 py-1 rounded">
                      {integration.category}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {integration.fileTypes.join(', ')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

