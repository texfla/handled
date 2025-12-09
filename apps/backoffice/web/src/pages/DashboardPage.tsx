import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { 
  Activity, 
  Upload, 
  Download, 
  Database, 
  ArrowRight,
  CheckCircle,
  Clock,
  Layers
} from 'lucide-react';

export function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Welcome to Handled - Your logistics operations platform
        </p>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Status</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-2xl font-bold text-green-600">Operational</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">All systems running</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Data Imports</CardTitle>
            <Upload className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Ready</div>
            <p className="text-xs text-muted-foreground mt-1">Carrier & demographic data</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transformations</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Configured</div>
            <p className="text-xs text-muted-foreground mt-1">Delivery matrix pipeline</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Exports</CardTitle>
            <Download className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Available</div>
            <p className="text-xs text-muted-foreground mt-1">Zone matrices & reference data</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks to get started</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link to="/integrations/imports" className="block">
              <Button variant="outline" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Import Carrier Data
                </span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/integrations/transformations" className="block">
              <Button variant="outline" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  Run Transformations
                </span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/integrations/exports" className="block">
              <Button variant="outline" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Download Exports
                </span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Data Pipeline</CardTitle>
            <CardDescription>Current pipeline status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-950">
                    <Upload className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Import</p>
                    <p className="text-xs text-muted-foreground">UPS, USPS, Demographics</p>
                  </div>
                </div>
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-950">
                    <Layers className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Transform</p>
                    <p className="text-xs text-muted-foreground">ZIP3 Reference, Delivery Matrix</p>
                  </div>
                </div>
                <Clock className="h-5 w-5 text-muted-foreground" />
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 dark:bg-green-950">
                    <Download className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Export</p>
                    <p className="text-xs text-muted-foreground">Zone Matrix JSON files</p>
                  </div>
                </div>
                <Clock className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
