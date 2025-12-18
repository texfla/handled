import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { ArrowLeft, Warehouse, MapPin, Users as UsersIcon, Building, BarChart3, CheckCircle, TrendingUp, Activity } from 'lucide-react';

interface Client {
  id: string;
  name: string;
  slug: string;
  status: string;
  setupProgress?: any;
  createdAt: string;
  address?: any;
  _count?: {
    warehouseAllocations: number;
    facilities: number;
    contacts: number;
    contracts: number;
  };
  warehouseAllocations?: Array<{
    id: string;
    warehouse: {
      id: string;
      code: string;
      name: string;
      address?: any;
    };
    spaceAllocated?: {
      pallets?: number;
      sqft?: number;
    };
    zoneAssignment?: string;
    isPrimary: boolean;
    status: string;
  }>;
  facilities?: Array<{
    id: string;
    name: string;
    facilityType?: string;
    address?: any;
  }>;
  contacts?: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    title?: string;
    role?: string;
    isPrimary: boolean;
    active: boolean;
  }>;
  contracts?: Array<{
    id: string;
    name: string;
    status: string;
    startDate: string;
    endDate?: string;
  }>;
  settings?: {
    timezone?: string;
    portalEnabled?: boolean;
  };
}

const STATUS_COLORS: Record<string, string> = {
  prospect: 'secondary',
  setup: 'default',
  active: 'default',
  paused: 'destructive',
  terminated: 'outline'
};

const STATUS_LABELS: Record<string, string> = {
  prospect: 'Prospect',
  setup: 'Setup',
  active: 'Active',
  paused: 'Paused',
  terminated: 'Terminated'
};

export function NewClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: client, isLoading } = useQuery({
    queryKey: ['client', id],
    queryFn: () => api.get<{ client: Client }>(`/api/clients/${id}`),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!client?.client) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <Building className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Client Not Found</h2>
        <p className="text-muted-foreground mb-4">The client you're looking for doesn't exist.</p>
        <Button onClick={() => navigate('/clients')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Clients
        </Button>
      </div>
    );
  }

  const clientData = client.client;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/clients')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Clients
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{clientData.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={STATUS_COLORS[clientData.status] as any}>
                {STATUS_LABELS[clientData.status]}
              </Badge>
              <span className="text-muted-foreground">•</span>
              <span className="text-muted-foreground">{clientData.slug}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Warehouse className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Warehouse Allocations</span>
            </div>
            <div className="text-2xl font-bold mt-1">{clientData._count?.warehouseAllocations || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Building className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Facilities</span>
            </div>
            <div className="text-2xl font-bold mt-1">{clientData._count?.facilities || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <UsersIcon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Contacts</span>
            </div>
            <div className="text-2xl font-bold mt-1">{clientData._count?.contacts || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Contracts</span>
            </div>
            <div className="text-2xl font-bold mt-1">{clientData._count?.contracts || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="operations">Operations</TabsTrigger>
          <TabsTrigger value="communications">Communications</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Business Health Score */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Business Health Score
              </CardTitle>
              <CardDescription>Current account status and key metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <div>
                    <div className="font-medium">Onboarding</div>
                    <div className="text-sm text-muted-foreground">
                      {clientData.status === 'active' ? 'Complete' : 'In Progress'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <div>
                    <div className="font-medium">Warehouse Setup</div>
                    <div className="text-sm text-muted-foreground">
                      {clientData._count?.warehouseAllocations || 0} allocations
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <div>
                    <div className="font-medium">Contract Status</div>
                    <div className="text-sm text-muted-foreground">
                      {clientData._count?.contracts || 0} active contracts
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Warehouse Allocations & Facilities */}
            <div className="lg:col-span-2 space-y-6">
              {/* Warehouse Allocations */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Warehouse className="h-5 w-5" />
                    Warehouse Allocations
                  </CardTitle>
                  <CardDescription>Warehouses allocated to this client</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {clientData.warehouseAllocations?.map((allocation) => (
                      <div key={allocation.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                            <Warehouse className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <div className="font-medium">{allocation.warehouse.name}</div>
                            <div className="text-sm text-muted-foreground">{allocation.warehouse.code}</div>
                            {allocation.isPrimary && (
                              <Badge variant="outline" className="mt-1">Primary</Badge>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm">
                            {allocation.spaceAllocated?.pallets ? `${allocation.spaceAllocated.pallets} pallets` : 'No allocation'}
                          </div>
                          {allocation.zoneAssignment && (
                            <div className="text-xs text-muted-foreground">Zone: {allocation.zoneAssignment}</div>
                          )}
                        </div>
                      </div>
                    )) || (
                      <div className="text-center py-8 text-muted-foreground">
                        <Warehouse className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <div>No warehouse allocations</div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Facilities */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building className="h-5 w-5" />
                    Facilities
                  </CardTitle>
                  <CardDescription>Client's own warehouses and facilities</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {clientData.facilities?.map((facility) => (
                      <div key={facility.id} className="flex items-center gap-3 p-4 border rounded-lg">
                        <div className="w-10 h-10 bg-secondary/10 rounded-lg flex items-center justify-center">
                          <Building className="h-5 w-5 text-secondary-foreground" />
                        </div>
                        <div>
                          <div className="font-medium">{facility.name}</div>
                          {facility.facilityType && (
                            <div className="text-sm text-muted-foreground capitalize">{facility.facilityType}</div>
                          )}
                          {facility.address && (
                            <div className="text-xs text-muted-foreground">
                              {facility.address.city}, {facility.address.state}
                            </div>
                          )}
                        </div>
                      </div>
                    )) || (
                      <div className="text-center py-8 text-muted-foreground">
                        <Building className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <div>No facilities configured</div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Coverage Map & Contacts */}
            <div className="space-y-6">
              {/* Coverage Map Placeholder */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Coverage Map
                  </CardTitle>
                  <CardDescription>Geographic distribution of warehouses and facilities</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="aspect-square bg-muted rounded-lg flex items-center justify-center">
                    <MapPin className="h-16 w-16 text-muted-foreground opacity-50" />
                    <div className="text-center mt-2">
                      <div className="text-sm font-medium text-muted-foreground">Coverage Map</div>
                      <div className="text-xs text-muted-foreground">Coming Soon</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Contacts */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UsersIcon className="h-5 w-5" />
                    Key Contacts
                  </CardTitle>
                  <CardDescription>Primary contacts for this client</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {clientData.contacts?.filter(contact => contact.active).slice(0, 5).map((contact) => (
                      <div key={contact.id} className="flex items-center gap-3 p-3 border rounded-lg">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium">
                            {contact.firstName[0]}{contact.lastName[0]}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">
                            {contact.firstName} {contact.lastName}
                            {contact.isPrimary && <Badge variant="outline" className="ml-2 text-xs">Primary</Badge>}
                          </div>
                          {contact.title && (
                            <div className="text-sm text-muted-foreground truncate">{contact.title}</div>
                          )}
                          {contact.email && (
                            <div className="text-xs text-muted-foreground truncate">{contact.email}</div>
                          )}
                        </div>
                      </div>
                    )) || (
                      <div className="text-center py-8 text-muted-foreground">
                        <UsersIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <div>No contacts</div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Activity Volume Chart Placeholder */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Activity Volume Over Time
              </CardTitle>
              <CardDescription>Monthly shipment volume and trends</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 bg-muted rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <TrendingUp className="h-16 w-16 mx-auto text-muted-foreground opacity-50 mb-2" />
                  <div className="text-sm font-medium text-muted-foreground">Activity Chart</div>
                  <div className="text-xs text-muted-foreground">Coming Soon</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Operations Tab */}
        <TabsContent value="operations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Operations Dashboard</CardTitle>
              <CardDescription>Business activity and performance metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Activity className="h-16 w-16 mx-auto text-muted-foreground opacity-50 mb-4" />
                <h3 className="text-lg font-medium mb-2">Operations Dashboard</h3>
                <p className="text-muted-foreground">
                  Shipment tracking, error monitoring, and performance metrics coming soon.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Communications Tab */}
        <TabsContent value="communications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Communications</CardTitle>
              <CardDescription>Contact history and interaction timeline</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <UsersIcon className="h-16 w-16 mx-auto text-muted-foreground opacity-50 mb-4" />
                <h3 className="text-lg font-medium mb-2">Communications Hub</h3>
                <p className="text-muted-foreground">
                  Contact directory and communication history coming soon.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Account Tab */}
        <TabsContent value="account" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Account Configuration</CardTitle>
              <CardDescription>Portal settings, notifications, and account preferences</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Building className="h-16 w-16 mx-auto text-muted-foreground opacity-50 mb-4" />
                <h3 className="text-lg font-medium mb-2">Account Settings</h3>
                <p className="text-muted-foreground">
                  Portal configuration and account preferences coming soon.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}