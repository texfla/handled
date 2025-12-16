import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { calculateCapacityUtilization, formatAddress, getStatusColor, WAREHOUSE_CAPABILITIES, TIMEZONE_OPTIONS } from '../../lib/warehouse-utils';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../../components/ui/alert-dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Progress } from '../../components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Checkbox } from '../../components/ui/checkbox';
import { Textarea } from '../../components/ui/textarea';
import { Plus, Warehouse as WarehouseIcon, Edit, Trash2, MapPin, Users } from 'lucide-react';

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
  };
  _count?: {
    warehouseAllocations: number;
  };
  warehouseAllocations?: Array<{
    spaceAllocated?: { pallets?: number };
  }>;
}

export function WarehousesPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
  const [deleteWarehouse, setDeleteWarehouse] = useState<Warehouse | null>(null);

  // Form state
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState('owned');
  const [status, setStatus] = useState('active');
  const [street1, setStreet1] = useState('');
  const [street2, setStreet2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [country, setCountry] = useState('US');
  const [timezone, setTimezone] = useState('America/Chicago');
  const [usablePallets, setUsablePallets] = useState('');
  const [usableSqft, setUsableSqft] = useState('');
  const [selectedCapabilities, setSelectedCapabilities] = useState<string[]>([]);
  const [operatingHours, setOperatingHours] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  // Queries
  const { data: warehousesData, isLoading } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => api.get<{ warehouses: Warehouse[] }>('/api/warehouses'),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/api/warehouses', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      closeDialog();
    },
    onError: (error: any) => {
      setError(error.response?.data?.error || 'Failed to create warehouse');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      api.put(`/api/warehouses/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      closeDialog();
    },
    onError: (error: any) => {
      setError(error.response?.data?.error || 'Failed to update warehouse');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/warehouses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      setDeleteWarehouse(null);
    },
    onError: (error: any) => {
      setError(error.response?.data?.error || 'Failed to delete warehouse');
    },
  });

  const warehouses = warehousesData?.warehouses || [];

  const openCreateDialog = () => {
    setEditingWarehouse(null);
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (warehouse: Warehouse) => {
    setEditingWarehouse(warehouse);
    setCode(warehouse.code);
    setName(warehouse.name);
    setType(warehouse.type);
    setStatus(warehouse.status);
    setStreet1(warehouse.address.street1);
    setStreet2(warehouse.address.street2 || '');
    setCity(warehouse.address.city);
    setState(warehouse.address.state);
    setZip(warehouse.address.zip);
    setCountry(warehouse.address.country);
    setTimezone(warehouse.timezone);
    setUsablePallets(String(warehouse.capacity.usable_pallets || ''));
    setUsableSqft(String(warehouse.capacity.usable_sqft || ''));
    setSelectedCapabilities(warehouse.capabilities || []);
    setOperatingHours(warehouse.operatingHours || {});
    setError('');
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingWarehouse(null);
    resetForm();
  };

  const resetForm = () => {
    setCode('');
    setName('');
    setType('owned');
    setStatus('active');
    setStreet1('');
    setStreet2('');
    setCity('');
    setState('');
    setZip('');
    setCountry('US');
    setTimezone('America/Chicago');
    setUsablePallets('');
    setUsableSqft('');
    setSelectedCapabilities([]);
    setOperatingHours({});
    setNotes('');
    setError('');
  };

  const handleSave = () => {
    // Validation
    if (!code.trim()) {
      setError('Warehouse code is required');
      return;
    }
    if (!name.trim()) {
      setError('Warehouse name is required');
      return;
    }
    if (!street1.trim() || !city.trim() || !state.trim() || !zip.trim()) {
      setError('Complete address is required');
      return;
    }

    const warehouseData = {
      code: code.trim().toUpperCase(),
      name: name.trim(),
      type,
      status,
      address: {
        street1: street1.trim(),
        street2: street2.trim() || undefined,
        city: city.trim(),
        state: state.trim(),
        zip: zip.trim(),
        country: country,
        timezone: timezone,
      },
      timezone,
      capacity: {
        usable_pallets: usablePallets ? parseInt(usablePallets) : undefined,
        usable_sqft: usableSqft ? parseInt(usableSqft) : undefined,
      },
      operating_hours: Object.keys(operatingHours).length > 0 ? operatingHours : undefined,
      capabilities: selectedCapabilities,
      notes: notes.trim() || undefined,
    };

    if (editingWarehouse) {
      updateMutation.mutate({ id: editingWarehouse.id, data: warehouseData });
    } else {
      createMutation.mutate(warehouseData);
    }
  };

  const toggleCapability = (capability: string) => {
    setSelectedCapabilities(prev =>
      prev.includes(capability)
        ? prev.filter(c => c !== capability)
        : [...prev, capability]
    );
  };

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
          <h1 className="text-3xl font-bold">Warehouses</h1>
          <p className="text-muted-foreground mt-1">
            Manage your fulfillment facilities and capacity
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Add Warehouse
        </Button>
      </div>

      {/* Empty State */}
      {warehouses.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <WarehouseIcon className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">No warehouses configured</h3>
          <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
            Set up your first fulfillment facility to start serving clients.
            Add capacity details, operating hours, and capabilities.
          </p>
          <Button onClick={openCreateDialog} className="mt-6">
            <Plus className="mr-2 h-4 w-4" />
            Add Your First Warehouse
          </Button>
        </div>
      ) : (
        /* Warehouse Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {warehouses.map((warehouse) => {
            const capacity = calculateCapacityUtilization(warehouse);
            const statusColor = getStatusColor(warehouse.status);

            return (
              <Card 
                key={warehouse.id}
                className="group hover:shadow-xl transition-all duration-200 cursor-pointer border-2 hover:border-primary/50"
                onClick={() => navigate(`/warehouses/${warehouse.id}`)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                        <WarehouseIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{warehouse.code}</CardTitle>
                        <CardDescription className="text-sm">
                          {warehouse.name}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant={statusColor as any}>
                      {warehouse.status}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  {/* Location */}
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {warehouse.address.city}, {warehouse.address.state}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {warehouse.timezone.replace('America/', '')}
                    </span>
                  </div>

                  {/* Type */}
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Type:</span>
                    <span className="capitalize">{warehouse.type}</span>
                  </div>

                  {/* Clients */}
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {warehouse._count?.warehouseAllocations || 0} client
                      {warehouse._count?.warehouseAllocations !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Capacity */}
                  {capacity.total > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Capacity:</span>
                        <span className="font-medium">
                          {capacity.used} / {capacity.total} pallets
                        </span>
                      </div>
                      <Progress value={capacity.utilizationPercent} className="h-2" />
                      <p className="text-xs text-muted-foreground text-right">
                        {capacity.utilizationPercent}% utilized · {capacity.available} available
                      </p>
                    </div>
                  )}

                  {/* Capabilities */}
                  {warehouse.capabilities.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-xs text-muted-foreground font-medium">Capabilities</span>
                      <div className="flex flex-wrap gap-1.5">
                        {warehouse.capabilities.slice(0, 4).map((cap) => {
                          const capInfo = WAREHOUSE_CAPABILITIES.find(c => c.value === cap);
                          return (
                            <Badge 
                              key={cap} 
                              variant="secondary" 
                              className="text-xs font-normal"
                            >
                              <span className="mr-1">{capInfo?.icon}</span>
                              {capInfo?.label}
                            </Badge>
                          );
                        })}
                        {warehouse.capabilities.length > 4 && (
                          <Badge variant="secondary" className="text-xs">
                            +{warehouse.capabilities.length - 4}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Manager */}
                  {warehouse.manager && (
                    <div className="text-sm text-muted-foreground pt-2 border-t">
                      Manager: {warehouse.manager.name}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-3 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditDialog(warehouse);
                      }}
                    >
                      <Edit className="h-3 w-3 mr-2" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteWarehouse(warehouse);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingWarehouse ? 'Edit Warehouse' : 'Add Warehouse'}
            </DialogTitle>
            <DialogDescription>
              {editingWarehouse 
                ? 'Update warehouse details and capacity'
                : 'Set up a new fulfillment facility'
              }
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
              {error}
            </div>
          )}

          <div className="space-y-6 py-4">
            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm">Basic Information</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="code">
                    Warehouse Code <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="code"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="DFW-01"
                    maxLength={20}
                  />
                  <p className="text-xs text-muted-foreground">
                    Short identifier (e.g., DFW-01, LAX-02)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">
                    Warehouse Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Dallas Fulfillment Center"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Type</Label>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger id="type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="owned">Owned</SelectItem>
                      <SelectItem value="leased">Leased</SelectItem>
                      <SelectItem value="partner">Partner</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger id="status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="commissioning">Commissioning</SelectItem>
                      <SelectItem value="offline">Offline</SelectItem>
                      <SelectItem value="decommissioned">Decommissioned</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm">Address</h3>
              
              <div className="space-y-2">
                <Label htmlFor="street1">
                  Street Address <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="street1"
                  value={street1}
                  onChange={(e) => setStreet1(e.target.value)}
                  placeholder="123 Warehouse Drive"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="street2">Address Line 2</Label>
                <Input
                  id="street2"
                  value={street2}
                  onChange={(e) => setStreet2(e.target.value)}
                  placeholder="Suite 100"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">
                    City <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Dallas"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="state">
                    State <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="state"
                    value={state}
                    onChange={(e) => setState(e.target.value.toUpperCase())}
                    placeholder="TX"
                    maxLength={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="zip">
                    ZIP <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="zip"
                    value={zip}
                    onChange={(e) => setZip(e.target.value)}
                    placeholder="75201"
                    maxLength={10}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Select value={timezone} onValueChange={setTimezone}>
                  <SelectTrigger id="timezone">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONE_OPTIONS.map(tz => (
                      <SelectItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Capacity */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm">Capacity</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pallets">Usable Pallets</Label>
                  <Input
                    id="pallets"
                    type="number"
                    value={usablePallets}
                    onChange={(e) => setUsablePallets(e.target.value)}
                    placeholder="5000"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sqft">Usable Square Feet</Label>
                  <Input
                    id="sqft"
                    type="number"
                    value={usableSqft}
                    onChange={(e) => setUsableSqft(e.target.value)}
                    placeholder="50000"
                  />
                </div>
              </div>
            </div>

            {/* Operating Hours */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm">Operating Hours</h3>
              <p className="text-xs text-muted-foreground">
                Leave blank for 24/7 operation
              </p>
              
              <div className="space-y-3">
                {[
                  { key: 'mon', label: 'Monday' },
                  { key: 'tue', label: 'Tuesday' },
                  { key: 'wed', label: 'Wednesday' },
                  { key: 'thu', label: 'Thursday' },
                  { key: 'fri', label: 'Friday' },
                  { key: 'sat', label: 'Saturday' },
                  { key: 'sun', label: 'Sunday' }
                ].map(({ key, label }) => {
                  const [open, close] = (operatingHours[key] || '').split('-');
                  
                  return (
                    <div key={key} className="grid grid-cols-[100px_1fr_1fr] gap-3 items-center">
                      <Label className="text-sm">{label}</Label>
                      <Input
                        type="time"
                        value={open || ''}
                        onChange={(e) => {
                          const newHours = { ...operatingHours };
                          if (e.target.value) {
                            newHours[key] = `${e.target.value}-${close || '18:00'}`;
                          } else {
                            delete newHours[key];
                          }
                          setOperatingHours(newHours);
                        }}
                        placeholder="08:00"
                      />
                      <Input
                        type="time"
                        value={close || ''}
                        onChange={(e) => {
                          const newHours = { ...operatingHours };
                          if (open && e.target.value) {
                            newHours[key] = `${open}-${e.target.value}`;
                          } else {
                            delete newHours[key];
                          }
                          setOperatingHours(newHours);
                        }}
                        placeholder="18:00"
                      />
                    </div>
                  );
                })}
              </div>
              
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setOperatingHours({
                      mon: '08:00-18:00',
                      tue: '08:00-18:00',
                      wed: '08:00-18:00',
                      thu: '08:00-18:00',
                      fri: '08:00-18:00'
                    });
                  }}
                >
                  8am-6pm Weekdays
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setOperatingHours({})}
                >
                  Clear All
                </Button>
              </div>
            </div>

            {/* Capabilities */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm">Capabilities</h3>
              
              <div className="grid grid-cols-2 gap-3">
                {WAREHOUSE_CAPABILITIES.map((cap) => (
                  <div key={cap.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={cap.value}
                      checked={selectedCapabilities.includes(cap.value)}
                      onCheckedChange={() => toggleCapability(cap.value)}
                    />
                    <Label htmlFor={cap.value} className="text-sm cursor-pointer">
                      {cap.icon} {cap.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional information about this warehouse..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              )}
              {editingWarehouse ? 'Save Changes' : 'Create Warehouse'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog 
        open={!!deleteWarehouse} 
        onOpenChange={(open) => !open && setDeleteWarehouse(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {deleteWarehouse?.code}?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              {deleteWarehouse && deleteWarehouse._count && deleteWarehouse._count.warehouseAllocations > 0 ? (
                <>
                  <p className="text-destructive font-medium">
                    This warehouse has {deleteWarehouse._count.warehouseAllocations} active client allocation
                    {deleteWarehouse._count.warehouseAllocations !== 1 ? 's' : ''}.
                  </p>
                  <p className="text-sm">
                    You must remove all client allocations before deleting this warehouse.
                    Go to each client and reassign their space to a different warehouse.
                  </p>
                </>
              ) : (
                <>
                  <p>
                    This warehouse ({deleteWarehouse?.name}) has no active client allocations
                    and can be safely deleted.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    This action cannot be undone.
                  </p>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteWarehouse(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteWarehouse?._count && deleteWarehouse._count.warehouseAllocations > 0}
              onClick={() => deleteWarehouse && deleteMutation.mutate(deleteWarehouse.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending && (
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              )}
              Delete Warehouse
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

