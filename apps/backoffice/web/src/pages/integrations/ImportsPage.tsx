import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Upload, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { api } from '../../lib/api';

interface Integration {
  id: string;
  name: string;
  description: string;
  category: string;
  fileTypes: string[];
}

interface IntegrationsByCategory {
  [category: string]: Integration[];
}

interface FileResult {
  filename: string;
  success: boolean;
  recordsProcessed?: number;
  recordsFailed?: number;
  error?: string;
}

interface BatchResult {
  totalFiles: number;
  successCount: number;
  failedCount: number;
  results: FileResult[];
}

export function ImportsPage() {
  const queryClient = useQueryClient();
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [uploadResult, setUploadResult] = useState<BatchResult | null>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  const { data: integrationsData, isLoading } = useQuery({
    queryKey: ['integrations', 'by-category'],
    queryFn: () => api.get<IntegrationsByCategory>('/api/integrations/by-category'),
  });

  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      if (!selectedIntegration) throw new Error('No integration selected');
      
      const formData = new FormData();
      files.forEach((file) => {
        formData.append('files', file);
      });

      const response = await fetch(`/api/upload/${selectedIntegration.id}`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      return response.json() as Promise<BatchResult>;
    },
    onSuccess: (result) => {
      setUploadResult(result);
      setPendingFiles([]);
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
    },
    onError: (error) => {
      setUploadResult({
        totalFiles: pendingFiles.length,
        successCount: 0,
        failedCount: pendingFiles.length,
        results: [{
          filename: 'Upload failed',
          success: false,
          error: error instanceof Error ? error.message : 'Upload failed',
        }],
      });
      setPendingFiles([]);
    },
  });

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      if (selectedIntegration && !uploadMutation.isPending) {
        setPendingFiles(acceptedFiles);
        setUploadResult(null);
        uploadMutation.mutate(acceptedFiles);
      }
    },
    accept: selectedIntegration
      ? Object.fromEntries(
          selectedIntegration.fileTypes.map((ext) => [`.${ext}`, []])
        )
      : undefined,
    disabled: !selectedIntegration || uploadMutation.isPending,
    multiple: true,
  });

  const categories = Object.entries(integrationsData || {});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Import Files</h1>
        <p className="text-muted-foreground mt-1">
          Upload data files to import into the system
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Integration Selection */}
        <div className="lg:col-span-2 space-y-4">
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
            categories.map(([category, integrations]) => (
              <Card key={category}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg capitalize">{category}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {integrations.map((integration) => (
                      <button
                        key={integration.id}
                        onClick={() => {
                          setSelectedIntegration(integration);
                          setUploadResult(null);
                        }}
                        disabled={uploadMutation.isPending}
                        className={`w-full text-left p-3 rounded-lg border transition-colors ${
                          selectedIntegration?.id === integration.id
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:bg-accent/50'
                        } ${uploadMutation.isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{integration.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {integration.description}
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {integration.fileTypes.join(', ')}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Upload Area */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Upload Files</CardTitle>
              <CardDescription>
                {selectedIntegration
                  ? `Upload ${selectedIntegration.fileTypes.join('/')} files for ${selectedIntegration.name}`
                  : 'Select an integration first'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  !selectedIntegration || uploadMutation.isPending
                    ? 'opacity-50 cursor-not-allowed'
                    : isDragActive
                    ? 'border-primary bg-primary/5 cursor-pointer'
                    : 'border-border hover:border-primary/50 cursor-pointer'
                }`}
              >
                <input {...getInputProps()} />
                {uploadMutation.isPending ? (
                  <div className="space-y-2">
                    <Loader2 className="h-10 w-10 mx-auto text-primary animate-spin" />
                    <p className="text-primary font-medium">
                      Processing {pendingFiles.length} file{pendingFiles.length !== 1 ? 's' : ''}...
                    </p>
                  </div>
                ) : (
                  <>
                    <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
                    {isDragActive ? (
                      <p className="text-primary">Drop the files here</p>
                    ) : (
                      <div>
                        <p className="text-muted-foreground">
                          Drag & drop files here, or click to select
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          You can select multiple files or drop a folder
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Results */}
          {uploadResult && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  {uploadResult.failedCount === 0 ? (
                    <>
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      Import Complete
                    </>
                  ) : uploadResult.successCount === 0 ? (
                    <>
                      <XCircle className="h-5 w-5 text-destructive" />
                      Import Failed
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-5 w-5 text-amber-500" />
                      Partial Success
                    </>
                  )}
                </CardTitle>
                <CardDescription>
                  {uploadResult.successCount} of {uploadResult.totalFiles} files imported successfully
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Summary */}
                <div className="flex gap-4 mb-4 text-sm">
                  <div className="flex items-center gap-1">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>{uploadResult.successCount} succeeded</span>
                  </div>
                  {uploadResult.failedCount > 0 && (
                    <div className="flex items-center gap-1">
                      <XCircle className="h-4 w-4 text-destructive" />
                      <span>{uploadResult.failedCount} failed</span>
                    </div>
                  )}
                </div>

                {/* File Results (scrollable if many) */}
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {uploadResult.results.map((result, index) => (
                    <div
                      key={index}
                      className={`flex items-start gap-2 p-2 rounded text-sm ${
                        result.success ? 'bg-green-50 dark:bg-green-950/30' : 'bg-red-50 dark:bg-red-950/30'
                      }`}
                    >
                      {result.success ? (
                        <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      ) : (
                        <XCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{result.filename}</div>
                        {result.success ? (
                          <div className="text-xs text-muted-foreground">
                            {result.recordsProcessed} records
                            {result.recordsFailed! > 0 && ` (${result.recordsFailed} failed)`}
                          </div>
                        ) : (
                          <div className="text-xs text-destructive">{result.error}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
