import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { calculateCapacityUtilization } from '../../lib/warehouse-utils';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Progress } from '../../components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { ArrowLeft, MapPin, Users, BarChart3, Settings as SettingsIcon } from 'lucide-react';
import { getStatusColor } from '../../lib/warehouse-utils';

interface WarehouseAllocation {
  id: string;
  customerId: string;
  customer: {
    id: string;
    name: string;
    slug: string;
  };
  spaceAllocated?: {
    pallets?: number;
    sqft?: number;
  };
  zoneAssignment?: string;
  isPrimary: boolean;
  status: string;
}

interface Warehouse {
  id: string;
  code: string;
  name: string;
  type: string;
  status: string;
  address: {
    street1: string;
    street2?: string;
    city: string;
    state: string;
    zip: string;
    country: string;
    timezone?: string;
  };
  timezone: string;
  capacity: {
    total_sqft?: number;
    usable_sqft?: number;
    usable_pallets?: number;
  };
  operatingHours?: Record<string, string>;
  capabilities: string[];
  manager?: {
    id: string;
    name: string;
    email: string;
  };
  _count?: {
    warehouseAllocations: number;
  };
  warehouseAllocations?: WarehouseAllocation[];
}

export function WarehouseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['warehouse', id],
    queryFn: () => api.get<{ warehouse: Warehouse }>(`/api/warehouses/${id}`).then(r => r.warehouse),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <h2 className="text-2xl font-bold">Warehouse not found</h2>
        <Button onClick={() => navigate('/warehouses')} className="mt-4">
          Back to Warehouses
        </Button>
      </div>
    );
  }

  const warehouse = data;
  const capacity = calculateCapacityUtilization(warehouse);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/warehouses')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>

      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{warehouse.code}</h1>
            <Badge variant={getStatusColor(warehouse.status) as any} className="text-sm">
              {warehouse.status}
            </Badge>
          </div>
          <p className="text-xl text-muted-foreground">{warehouse.name}</p>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
            <MapPin className="h-4 w-4" />
            <span>{warehouse.address.city}, {warehouse.address.state}</span>
            <span>•</span>
            <span className="capitalize">{warehouse.type} facility</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="clients">
            Clients ({warehouse._count?.warehouseAllocations || 0})
          </TabsTrigger>
          <TabsTrigger value="capacity">Capacity</TabsTrigger>
        </TabsList>

        {/* Tab 1: Overview */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Location Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Location
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-sm">
                  {warehouse.address.street1}
                  {warehouse.address.street2 && (
                    <div>{warehouse.address.street2}</div>
                  )}
                  <div>
                    {warehouse.address.city}, {warehouse.address.state} {warehouse.address.zip}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  Timezone: {warehouse.timezone.replace('America/', '')}
                </div>
              </CardContent>
            </Card>

            {/* Capacity Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Capacity
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Pallets:</span>
                    <span className="font-medium">
                      {capacity.used} / {capacity.total}
                    </span>
                  </div>
                  <Progress value={capacity.utilizationPercent} className="h-2" />
                  <div className="text-xs text-muted-foreground text-right">
                    {capacity.utilizationPercent}% utilized
                  </div>
                </div>
                {warehouse.capacity.usable_sqft && (
                  <div className="text-sm pt-2 border-t">
                    <span className="text-muted-foreground">Square Feet:</span>{' '}
                    {warehouse.capacity.usable_sqft.toLocaleString()}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Clients Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Clients
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {warehouse._count?.warehouseAllocations || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Active allocations
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Capabilities */}
          {warehouse.capabilities.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Capabilities</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {warehouse.capabilities.map((cap) => (
                    <Badge key={cap} variant="secondary">
                      {cap.replace(/_/g, ' ')}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Operating Hours */}
          {warehouse.operatingHours && Object.keys(warehouse.operatingHours).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Operating Hours</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((dayKey) => {
                    const dayLabels: Record<string, string> = {
                      mon: 'Monday',
                      tue: 'Tuesday',
                      wed: 'Wednesday',
                      thu: 'Thursday',
                      fri: 'Friday',
                      sat: 'Saturday',
                      sun: 'Sunday'
                    };
                    const hours = warehouse.operatingHours?.[dayKey] || 'Closed';
                    
                    return (
                      <div key={dayKey} className="flex justify-between items-center text-sm py-1">
                        <span className="font-medium w-24">{dayLabels[dayKey]}</span>
                        <span className={hours === 'Closed' ? 'text-muted-foreground italic' : 'font-mono'}>
                          {hours}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Manager */}
          {warehouse.manager && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Warehouse Manager</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-medium">{warehouse.manager.name}</div>
                    <div className="text-sm text-muted-foreground">{warehouse.manager.email}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab 2: Clients */}
        <TabsContent value="clients" className="space-y-4">
          {warehouse.warehouseAllocations && warehouse.warehouseAllocations.length > 0 ? (
            <Card>
              <CardContent className="p-0">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr className="border-b">
                      <th className="px-4 py-3 text-left text-sm font-medium">Client</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Space Allocated</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Zone</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Primary</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {warehouse.warehouseAllocations.map((allocation) => (
                      <tr key={allocation.id} className="border-b hover:bg-muted/50">
                        <td className="px-4 py-3">
                          <Button
                            variant="link"
                            className="p-0 h-auto"
                            onClick={() => navigate(`/clients/${allocation.customer.id}`)}
                          >
                            {allocation.customer.name}
                          </Button>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {allocation.spaceAllocated?.pallets 
                            ? `${allocation.spaceAllocated.pallets} pallets`
                            : 'Not specified'
                          }
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {allocation.zoneAssignment || '—'}
                        </td>
                        <td className="px-4 py-3">
                          {allocation.isPrimary && (
                            <Badge variant="outline" className="text-xs">Primary</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={allocation.status === 'active' ? 'default' : 'secondary'}>
                            {allocation.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">No clients allocated</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  This warehouse has available capacity for client allocations
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab 3: Capacity Analysis */}
        <TabsContent value="capacity" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Capacity Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Capacity Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Capacity:</span>
                    <span className="font-medium">{capacity.total} pallets</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Allocated:</span>
                    <span className="font-medium">{capacity.used} pallets</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Available:</span>
                    <span className="font-medium text-green-600">{capacity.available} pallets</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Utilization</span>
                    <span>{capacity.utilizationPercent}%</span>
                  </div>
                  <Progress value={capacity.utilizationPercent} className="h-3" />
                </div>

                {capacity.utilizationPercent > 90 && (
                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md p-3">
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                      ⚠️ Capacity above 90%. Consider restricting new allocations or expanding.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Space Distribution (if multiple clients) */}
            {warehouse.warehouseAllocations && warehouse.warehouseAllocations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Space Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {warehouse.warehouseAllocations.map((allocation) => {
                      const pallets = allocation.spaceAllocated?.pallets || 0;
                      const percent = capacity.total > 0 
                        ? Math.round((pallets / capacity.total) * 100)
                        : 0;
                      
                      return (
                        <div key={allocation.id} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="font-medium">{allocation.customer.name}</span>
                            <span className="text-muted-foreground">
                              {pallets} pallets ({percent}%)
                            </span>
                          </div>
                          <Progress value={percent} className="h-2" />
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

