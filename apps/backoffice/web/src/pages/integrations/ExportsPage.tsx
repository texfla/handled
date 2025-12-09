import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Download, Loader2, FileJson } from 'lucide-react';
import { api } from '../../lib/api';

interface ExportMetadata {
  id: string;
  name: string;
  description: string;
  filename: string;
  estimatedSize: string;
}

export function ExportsPage() {
  const [downloading, setDownloading] = useState<string | null>(null);

  const { data: exports, isLoading } = useQuery({
    queryKey: ['exports'],
    queryFn: () => api.get<ExportMetadata[]>('/api/exports'),
  });

  const handleDownload = async (exportItem: ExportMetadata) => {
    setDownloading(exportItem.id);
    try {
      const response = await fetch(`/api/exports/${exportItem.id}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Download failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = exportItem.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download failed:', error);
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Exports</h1>
        <p className="text-muted-foreground mt-1">
          Download generated data files for the warehouse optimizer
        </p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-4">
                  <div className="h-4 bg-muted rounded w-1/2"></div>
                  <div className="h-3 bg-muted rounded w-3/4"></div>
                  <div className="h-10 bg-muted rounded w-1/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {exports?.map((exportItem) => (
            <Card key={exportItem.id}>
              <CardHeader>
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <FileJson className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg">{exportItem.name}</CardTitle>
                    <CardDescription>{exportItem.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    <span className="font-mono">{exportItem.filename}</span>
                    <span className="mx-2">·</span>
                    <span>{exportItem.estimatedSize}</span>
                  </div>
                  <Button
                    onClick={() => handleDownload(exportItem)}
                    disabled={downloading !== null}
                    size="sm"
                  >
                    {downloading === exportItem.id ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Downloading...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {exports?.length === 0 && (
            <Card className="col-span-2">
              <CardContent className="p-6 text-center text-muted-foreground">
                No exports available. Run transformations first.
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
