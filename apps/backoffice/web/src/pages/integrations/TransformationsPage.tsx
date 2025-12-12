import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Play, CheckCircle, XCircle, Loader2, Database, ArrowRight } from 'lucide-react';
import { api } from '../../lib/api';

interface Transformation {
  id: string;
  name: string;
  description: string;
  sources: string[];
  targetTable: string;
  dependencies: string[];
}

interface TransformationResult {
  success: boolean;
  recordsAffected: number;
  duration: number;
  error?: string;
}

// Format duration from milliseconds to human-readable format
function formatDuration(ms: number): string {
  if (ms < 1000) {
    return '< 1 second';
  }
  
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

export function TransformationsPage() {
  const queryClient = useQueryClient();
  const [results, setResults] = useState<Record<string, TransformationResult>>({});

  const { data: transformations, isLoading } = useQuery({
    queryKey: ['transformations'],
    queryFn: () => api.get<Transformation[]>('/api/transformations'),
  });

  const runMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/transformations/${id}/run`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to run transformation');
      }
      return response.json() as Promise<TransformationResult>;
    },
    onSuccess: (result, id) => {
      setResults((prev) => ({ ...prev, [id]: result }));
      queryClient.invalidateQueries({ queryKey: ['transformations'] });
    },
  });

  const runAllMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/transformations/run-all', {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to run transformations');
      }
      return response.json() as Promise<{
        results: Record<string, TransformationResult>;
        summary: { total: number; success: number; failed: number };
      }>;
    },
    onSuccess: (data) => {
      setResults(data.results);
      queryClient.invalidateQueries({ queryKey: ['transformations'] });
    },
  });

  const isRunning = runMutation.isPending || runAllMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Transformations</h1>
          <p className="text-muted-foreground mt-1">
            Convert workspace data into reference tables
          </p>
        </div>
        <Button
          onClick={() => runAllMutation.mutate()}
          disabled={isRunning || !transformations?.length}
        >
          {runAllMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Running All...
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              Run All Transformations
            </>
          )}
        </Button>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-muted rounded w-1/4"></div>
              <div className="h-20 bg-muted rounded"></div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {transformations?.map((transformation) => {
            const result = results[transformation.id];
            
            return (
              <Card key={transformation.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Database className="h-5 w-5 text-muted-foreground" />
                        {transformation.name}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {transformation.description}
                      </CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => runMutation.mutate(transformation.id)}
                      disabled={isRunning}
                    >
                      {runMutation.isPending && runMutation.variables === transformation.id ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Running...
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-2" />
                          Run
                        </>
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Data flow visualization */}
                  <div className="flex items-center gap-2 text-sm mb-4">
                    <div className="flex flex-wrap gap-1">
                      {transformation.sources.map((source) => (
                        <span
                          key={source}
                          className="px-2 py-1 bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200 rounded text-xs font-mono"
                        >
                          {source}
                        </span>
                      ))}
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="px-2 py-1 bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-200 rounded text-xs font-mono">
                      {transformation.targetTable}
                    </span>
                  </div>

                  {/* Result */}
                  {result && (
                    <div
                      className={`flex items-center gap-2 p-3 rounded ${
                        result.success ? 'bg-green-50 dark:bg-green-950/30' : 'bg-red-50 dark:bg-red-950/30'
                      }`}
                    >
                      {result.success ? (
                        <>
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-green-800 dark:text-green-200">
                            {result.recordsAffected.toLocaleString()} records created in {formatDuration(result.duration)}
                          </span>
                        </>
                      ) : (
                        <>
                          <XCircle className="h-4 w-4 text-destructive" />
                          <span className="text-destructive">{result.error}</span>
                        </>
                      )}
                    </div>
                  )}

                  {/* Dependencies */}
                  {transformation.dependencies.length > 0 && (
                    <div className="text-xs text-muted-foreground mt-2">
                      Depends on: {transformation.dependencies.join(', ')}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}

          {transformations?.length === 0 && (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                No transformations configured yet.
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
