import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Badge } from '../../components/ui/badge';
import { Plus, Search, Building2 } from 'lucide-react';

interface Client {
  id: string;
  name: string;
  slug: string;
  status: string;
  setupProgress?: any;
  createdAt: string;
  _count?: {
    warehouseAllocations: number;
    contacts: number;
    contracts: number;
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

export function ClientsPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: clientsData, isLoading } = useQuery({
    queryKey: ['clients', statusFilter],
    queryFn: () => {
      const params = statusFilter !== 'all' ? `?status=${statusFilter}` : '';
      return api.get<{ clients: Client[] }>(`/api/clients${params}`);
    },
  });

  const clients = clientsData?.clients || [];

  // Filter clients by search query
  const filteredClients = clients.filter(client => {
    const query = searchQuery.toLowerCase();
    return client.name.toLowerCase().includes(query) || 
           client.slug.toLowerCase().includes(query);
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Clients</h1>
          <p className="text-muted-foreground mt-1">
            Manage your customer accounts and warehouse allocations
          </p>
        </div>
        <Button onClick={() => navigate('/clients/onboard')}>
          <Plus className="h-4 w-4 mr-2" />
          Add Client
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search clients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="prospect">Prospect</SelectItem>
            <SelectItem value="setup">Setup</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
            <SelectItem value="terminated">Terminated</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Empty State */}
      {filteredClients.length === 0 && searchQuery === '' && statusFilter === 'all' ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No clients yet</h3>
            <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
              Get started by onboarding your first client. Set up their warehouse allocation,
              contacts, and contract details.
            </p>
            <Button onClick={() => navigate('/clients/onboard')} className="mt-6">
              <Plus className="mr-2 h-4 w-4" />
              Onboard Your First Client
            </Button>
          </CardContent>
        </Card>
      ) : filteredClients.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No clients match your search criteria</p>
          </CardContent>
        </Card>
      ) : (
        /* Client Table */
        <Card>
          <CardContent className="p-0">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr className="border-b">
                  <th className="px-4 py-3 text-left text-sm font-medium">Client</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Warehouses</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Contacts</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Contracts</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.map((client) => (
                  <tr 
                    key={client.id} 
                    className="border-b hover:bg-primary/5 cursor-pointer transition-all duration-200 hover:shadow-md"
                    onClick={() => navigate(`/clients/${client.id}`)}
                  >
                    <td className="px-4 py-3">
                      <div>
                        <div className="font-medium">{client.name}</div>
                        <div className="text-sm text-muted-foreground">{client.slug}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_COLORS[client.status] as any}>
                        {STATUS_LABELS[client.status] || client.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {client._count?.warehouseAllocations || 0} allocation{client._count?.warehouseAllocations !== 1 ? 's' : ''}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {client._count?.contacts || 0} contact{client._count?.contacts !== 1 ? 's' : ''}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {client._count?.contracts || 0} contract{client._count?.contracts !== 1 ? 's' : ''}
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/clients/${client.id}`);
                        }}
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
