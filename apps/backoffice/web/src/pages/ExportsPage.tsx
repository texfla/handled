import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Download, Loader2, CheckCircle, FileJson, XCircle } from 'lucide-react';
import { api } from '../lib/api';

interface ExportMetadata {
  id: string;
  name: string;
  description: string;
  filename: string;
  estimatedSize: string;
}

interface ExportStatus {
  [id: string]: {
    loading: boolean;
    success?: boolean;
    error?: string;
    lastExported?: Date;
  };
}

export function ExportsPage() {
  const [exportStatus, setExportStatus] = useState<ExportStatus>({});

  const { data: exports, isLoading } = useQuery({
    queryKey: ['exports'],
    queryFn: () => api.get<ExportMetadata[]>('/api/exports'),
  });

  const handleDownload = async (exportItem: ExportMetadata) => {
    setExportStatus((prev) => ({
      ...prev,
      [exportItem.id]: { loading: true },
    }));

    try {
      const response = await fetch(`/api/exports/${exportItem.id}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      // Get the blob and trigger download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = exportItem.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setExportStatus((prev) => ({
        ...prev,
        [exportItem.id]: {
          loading: false,
          success: true,
          lastExported: new Date(),
        },
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Download failed';
      setExportStatus((prev) => ({
        ...prev,
        [exportItem.id]: {
          loading: false,
          success: false,
          error: message,
        },
      }));
    }
  };

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Exports</h1>
        <p className="text-muted-foreground mt-1">
          Generate data files for external tools like the warehouse optimizer
        </p>
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
          {exports?.map((exportItem) => {
            const status = exportStatus[exportItem.id];
            
            return (
              <Card key={exportItem.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <FileJson className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{exportItem.name}</CardTitle>
                        <CardDescription className="mt-1">
                          {exportItem.description}
                        </CardDescription>
                      </div>
                    </div>
                    <Button
                      onClick={() => handleDownload(exportItem)}
                      disabled={status?.loading}
                      className="min-w-[160px]"
                    >
                      {status?.loading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4 mr-2" />
                          Generate & Download
                        </>
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-4 text-muted-foreground">
                      <span>Format: JSON</span>
                      <span>Estimated: {exportItem.estimatedSize}</span>
                      <span className="font-mono text-xs">{exportItem.filename}</span>
                    </div>
                    
                    {/* Status indicator */}
                    {status && !status.loading && (
                      <div className="flex items-center gap-2">
                        {status.success ? (
                          <>
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span className="text-green-600">
                              Downloaded {status.lastExported && formatTimestamp(status.lastExported)}
                            </span>
                          </>
                        ) : status.error ? (
                          <>
                            <XCircle className="h-4 w-4 text-destructive" />
                            <span className="text-destructive">{status.error}</span>
                          </>
                        ) : null}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {exports?.length === 0 && (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                No exports available.
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Usage info */}
      <Card className="bg-muted/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Usage</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>
            These exports are designed for the <strong>warehouse-optimizer</strong> project.
            Copy the downloaded files to <code className="text-xs bg-muted px-1 py-0.5 rounded">public/data/</code> in that project.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

