import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { usePermissions, PERMISSIONS } from '../../hooks/usePermissions';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../../components/ui/alert-dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Checkbox } from '../../components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { ArrowLeft, Edit, Plus, Trash2, Warehouse, Users as UsersIcon, FileText, MapPin, BarChart3, Building } from 'lucide-react';

interface WarehouseAllocation {
  id: string;
  customerId: string;
  companyWarehouseId: string;
  warehouse: {
    id: string;
    code: string;
    name: string;
    capacity?: {
      usable_pallets?: number;
    };
  };
  spaceAllocated?: {
    pallets?: number;
    sqft?: number;
  };
  zoneAssignment?: string | null;
  isPrimary: boolean;
  status: string;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  title?: string;
  role?: string;
  isPrimary: boolean;
  active?: boolean;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  deleted?: boolean;
  deletedAt?: string | null;
  deletedBy?: string | null;
  deletedReason?: string | null;
}

interface Contract {
  id: string;
  contractNumber?: string;
  name: string;
  startDate: string;
  endDate?: string;
  status: string;
  billingCycle?: string;
  paymentTerms?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  archivedAt?: string | null;
  archivedBy?: string | null;
  archivedReason?: string | null;
  rateCards?: any[];
}

interface CustomerFacility {
  id: string;
  name: string;
  facilityType?: string;
  address: {
    street1: string;
    street2?: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  isSource: boolean;
  isDestination: boolean;
}

interface Client {
  id: string;
  name: string;
  slug: string;
  status: string;
  setupProgress?: any;
  address?: {
    street1: string;
    street2?: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  internalNotes?: string;
  createdAt: string;
  updatedAt: string;
  deleted?: boolean;
  deletedAt?: string | null;
  deletedBy?: string | null;
  deletedReason?: string | null;
  retiredAt?: string | null;
  retiredBy?: string | null;
  retiredReason?: string | null;
  isTestData?: boolean;
  warehouseAllocations?: WarehouseAllocation[];
  facilities?: CustomerFacility[];
  contacts?: Contact[];
  contracts?: Contract[];
  settings?: any;
  _count?: {
    warehouseAllocations: number;
    facilities: number;
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

export function ClientDetailPage() {
  const { hasPermission } = usePermissions();
  const canManageClients = hasPermission(PERMISSIONS.MANAGE_CLIENTS);
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Dialog state
  const [allocationDialogOpen, setAllocationDialogOpen] = useState(false);
  const [editingAllocation, setEditingAllocation] = useState<WarehouseAllocation | null>(null);
  const [facilityDialogOpen, setFacilityDialogOpen] = useState(false);
  const [editingFacility, setEditingFacility] = useState<CustomerFacility | null>(null);
  const mouseDownPos = useRef<{ x: number; y: number } | null>(null);
  const isSelectingRef = useRef(false);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [deleteAllocationConfirmed, setDeleteAllocationConfirmed] = useState(false);
  const [deleteFacilityConfirmed, setDeleteFacilityConfirmed] = useState(false);
  const [error, setError] = useState('');

  // Allocation form state
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
  const [pallets, setPallets] = useState('');
  const [sqft, setSqft] = useState('');
  const [zone, setZone] = useState('');
  const [isPrimary, setIsPrimary] = useState(false);

  // Facility form state
  const [facilityName, setFacilityName] = useState('');
  const [facilityType, setFacilityType] = useState('');
  const [facilityStreet1, setFacilityStreet1] = useState('');
  const [facilityStreet2, setFacilityStreet2] = useState('');
  const [facilityCity, setFacilityCity] = useState('');
  const [facilityState, setFacilityState] = useState('');
  const [facilityZip, setFacilityZip] = useState('');
  const [facilityCountry, setFacilityCountry] = useState('US');
  const [isSource, setIsSource] = useState(false);
  const [isDestination, setIsDestination] = useState(false);

  // Contact form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [title, setTitle] = useState('');
  const [contactRole, setContactRole] = useState('general');
  const [contactIsPrimary, setContactIsPrimary] = useState(false);
  
  // Delete confirmation state
  const [deleteContactConfirmed, setDeleteContactConfirmed] = useState(false);

  // Settings state
  const [portalEnabled, setPortalEnabled] = useState(false);
  const [portalSubdomain, setPortalSubdomain] = useState('');
  const [notificationEmail, setNotificationEmail] = useState('');
  const [timezone, setTimezone] = useState('America/Chicago');

  const { data, isLoading } = useQuery({
    queryKey: ['client', id],
    queryFn: () => api.get<{ client: Client }>(`/api/clients/${id}`).then(r => r.client),
  });

  // Fetch all warehouses for allocation dropdown
  const { data: warehousesData } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => api.get<{ warehouses: any[] }>('/api/warehouses'),
  });

  const warehouses = warehousesData?.warehouses || [];

  // Mutations
  const createAllocationMutation = useMutation({
    mutationFn: (data: any) => api.post(`/api/clients/${id}/warehouse-allocations`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client', id] });
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      closeAllocationDialog();
    },
    onError: (error: any) => {
      setError(error.response?.data?.error || 'Failed to create allocation');
    },
  });

  const updateAllocationMutation = useMutation({
    mutationFn: ({ allocationId, data }: { allocationId: string; data: any }) =>
      api.put(`/api/clients/${id}/warehouse-allocations/${allocationId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client', id] });
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      closeAllocationDialog();
    },
    onError: (error: any) => {
      setError(error.response?.data?.error || 'Failed to update allocation');
    },
  });

  const deleteAllocationMutation = useMutation({
    mutationFn: (allocationId: string) => api.delete(`/api/clients/${id}/warehouse-allocations/${allocationId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client', id] });
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      closeAllocationDialog();
      setDeleteAllocationConfirmed(false);
    },
  });

  const createFacilityMutation = useMutation({
    mutationFn: (data: any) => api.post(`/api/clients/${id}/facilities`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client', id] });
      closeFacilityDialog();
    },
    onError: (error: any) => {
      setError(error.response?.data?.error || 'Failed to create facility');
    },
  });

  const updateFacilityMutation = useMutation({
    mutationFn: ({ facilityId, data }: { facilityId: string; data: any }) =>
      api.put(`/api/clients/${id}/facilities/${facilityId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client', id] });
      closeFacilityDialog();
    },
    onError: (error: any) => {
      setError(error.response?.data?.error || 'Failed to update facility');
    },
  });

  const deleteFacilityMutation = useMutation({
    mutationFn: (facilityId: string) => api.delete(`/api/clients/${id}/facilities/${facilityId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client', id] });
      closeFacilityDialog();
      setDeleteFacilityConfirmed(false);
    },
  });

  const createContactMutation = useMutation({
    mutationFn: (data: any) => api.post(`/api/clients/${id}/contacts`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client', id] });
      closeContactDialog();
    },
    onError: (error: any) => {
      setError(error.response?.data?.error || 'Failed to create contact');
    },
  });

  const updateContactMutation = useMutation({
    mutationFn: ({ contactId, data }: { contactId: string; data: any }) => 
      api.put(`/api/clients/${id}/contacts/${contactId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client', id] });
      closeContactDialog();
    },
    onError: (error: any) => {
      setError(error.response?.data?.error || 'Failed to update contact');
    },
  });

  const deleteContactMutation = useMutation({
    mutationFn: (contactId: string) => api.delete(`/api/clients/${id}/contacts/${contactId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client', id] });
      closeContactDialog();
      setDeleteContactConfirmed(false);
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: (data: any) => api.put(`/api/clients/${id}/settings`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client', id] });
      setError('');
    },
    onError: (error: any) => {
      setError(error.response?.data?.error || 'Failed to update settings');
    },
  });

  // Handlers
  const openAddAllocation = () => {
    setEditingAllocation(null);
    setSelectedWarehouseId('');
    setPallets('');
    setSqft('');
    setZone('');
    setIsPrimary(false);
    setError('');
    setAllocationDialogOpen(true);
  };

  const closeAllocationDialog = () => {
    setAllocationDialogOpen(false);
    setEditingAllocation(null);
    setSelectedWarehouseId('');
    setPallets('');
    setSqft('');
    setZone('');
    setIsPrimary(false);
    setError('');
    setDeleteAllocationConfirmed(false);
  };

  const openAddFacility = () => {
    setEditingFacility(null);
    setFacilityName('');
    setFacilityType('');
    setFacilityStreet1('');
    setFacilityStreet2('');
    setFacilityCity('');
    setFacilityState('');
    setFacilityZip('');
    setFacilityCountry('US');
    setIsSource(false);
    setIsDestination(false);
    setError('');
    setFacilityDialogOpen(true);
  };

  const openEditFacility = (facility: CustomerFacility) => {
    setEditingFacility(facility);
    setFacilityName(facility.name);
    setFacilityType(facility.facilityType || '');
    setFacilityStreet1(facility.address.street1);
    setFacilityStreet2(facility.address.street2 || '');
    setFacilityCity(facility.address.city);
    setFacilityState(facility.address.state);
    setFacilityZip(facility.address.zip);
    setFacilityCountry(facility.address.country);
    setIsSource(facility.isSource);
    setIsDestination(facility.isDestination);
    setError('');
    setFacilityDialogOpen(true);
  };

  const closeFacilityDialog = () => {
    setFacilityDialogOpen(false);
    setEditingFacility(null);
    setFacilityName('');
    setFacilityType('');
    setFacilityStreet1('');
    setFacilityStreet2('');
    setFacilityCity('');
    setFacilityState('');
    setFacilityZip('');
    setFacilityCountry('US');
    setIsSource(false);
    setIsDestination(false);
    setError('');
  };

  const handleSaveAllocation = () => {
    if (!selectedWarehouseId) {
      setError('Please select a warehouse');
      return;
    }

    const allocationData = {
      company_warehouse_id: selectedWarehouseId,
      space_allocated: {
        pallets: pallets ? parseInt(pallets) : undefined,
        sqft: sqft ? parseInt(sqft) : undefined,
      },
      zone_assignment: zone || undefined,
      is_primary: isPrimary,
      status: 'active'
    };

    if (editingAllocation) {
      updateAllocationMutation.mutate({
        allocationId: editingAllocation.id,
        data: allocationData
      });
    } else {
      createAllocationMutation.mutate(allocationData);
    }
  };

  const handleSaveFacility = () => {
    if (!facilityName.trim()) {
      setError('Facility name is required');
      return;
    }

    if (!facilityStreet1.trim() || !facilityCity.trim() || !facilityState.trim() || !facilityZip.trim()) {
      setError('Complete address is required');
      return;
    }

    const facilityData = {
      name: facilityName.trim(),
      facility_type: facilityType || undefined,
      address: {
        street1: facilityStreet1.trim(),
        street2: facilityStreet2.trim() || undefined,
        city: facilityCity.trim(),
        state: facilityState.trim(),
        zip: facilityZip.trim(),
        country: facilityCountry,
      },
      is_source: isSource,
      is_destination: isDestination,
    };

    if (editingFacility) {
      updateFacilityMutation.mutate({
        facilityId: editingFacility.id,
        data: facilityData
      });
    } else {
      createFacilityMutation.mutate(facilityData);
    }
  };

  const openAddContact = () => {
    setEditingContact(null);
    setFirstName('');
    setLastName('');
    setEmail('');
    setPhone('');
    setTitle('');
    setContactRole('general');
    setContactIsPrimary(false);
    setError('');
    setContactDialogOpen(true);
  };

  const openEditContact = (contact: Contact) => {
    setEditingContact(contact);
    setFirstName(contact.firstName);
    setLastName(contact.lastName);
    setEmail(contact.email || '');
    setPhone(contact.phone || '');
    setTitle(contact.title || '');
    setContactRole(contact.role || 'general');
    setContactIsPrimary(contact.isPrimary);
    setError('');
    setContactDialogOpen(true);
  };

  const closeContactDialog = () => {
    setContactDialogOpen(false);
    setEditingContact(null);
    setFirstName('');
    setLastName('');
    setEmail('');
    setPhone('');
    setTitle('');
    setContactRole('general');
    setContactIsPrimary(false);
    setError('');
    setDeleteContactConfirmed(false);
  };

  const handleSaveContact = () => {
    if (!firstName.trim() || !lastName.trim()) {
      setError('First name and last name are required');
      return;
    }

    const contactData = {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      title: title.trim() || undefined,
      role: contactRole,
      is_primary: contactIsPrimary,
    };

    if (editingContact) {
      updateContactMutation.mutate({ contactId: editingContact.id, data: contactData });
    } else {
      createContactMutation.mutate(contactData);
    }
  };

  const handleSaveSettings = () => {
    const settingsData = {
      portal_enabled: portalEnabled,
      portal_subdomain: portalSubdomain || undefined,
      notification_email: notificationEmail || undefined,
      timezone,
    };

    updateSettingsMutation.mutate(settingsData);
  };

  // Initialize settings when client loads
  useEffect(() => {
    if (data?.settings && !portalSubdomain) {
      setPortalEnabled(data.settings.portalEnabled || false);
      setPortalSubdomain(data.settings.portalSubdomain || '');
      setNotificationEmail(data.settings.notificationEmail || '');
      setTimezone(data.settings.timezone || 'America/Chicago');
    }
  }, [data?.settings, portalSubdomain]);

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
        <h2 className="text-2xl font-bold">Client not found</h2>
        <Button onClick={() => navigate('/clients')} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Clients
        </Button>
      </div>
    );
  }

  const client = data;

  return (
    <div className="space-y-3">
      {/* Back Button */}
      <div className="flex items-center gap-4 -mb-1 -ml-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/clients')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{client.name}</h1>
        </div>

        <Button variant="outline" size="sm">
          <Edit className="h-4 w-4 mr-2" />
          Edit
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="allocations">
            Operations
          </TabsTrigger>
          <TabsTrigger value="contacts">
            Communications
          </TabsTrigger>
          <TabsTrigger value="contracts">
            Billing
          </TabsTrigger>
          <TabsTrigger value="integrations">
            Integrations
          </TabsTrigger>
          <TabsTrigger value="settings">Account Setup</TabsTrigger>
        </TabsList>

        {/* Tab 1: Overview */}
        <TabsContent value="overview" className="space-y-6">
          {/* Client Details & Primary Contact */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Client Details */}
            <Card>
              <CardHeader>
                <CardTitle>Client Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">Name:</span>
                  <span className="font-medium text-sm">{client.name}</span>
                  <Badge variant={STATUS_COLORS[client.status] as any}>
                    {client.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">Client ID:</span>
                  <span className="font-mono text-sm">{client.slug}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">Origin Date:</span>
                  <span className="text-sm">{new Date(client.createdAt).toLocaleDateString('en-US')}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">Agreements:</span>
                  <span className="text-sm">{client.contracts?.length || 0} Contracts</span>
                </div>
                {client.address && (
                  <div className="pt-1">
                    <p className="text-sm text-muted-foreground">Address</p>
                    <p className="text-sm">
                      {(client.address as any).street1}
                      {(client.address as any).street2 && <>, {(client.address as any).street2}</>}
                    </p>
                    <p className="text-sm">
                      {(client.address as any).city}, {(client.address as any).state} {(client.address as any).zip}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Primary Contact */}
            <Card>
              <CardHeader className="py-3 flex-row items-center justify-between space-y-0">
                <CardTitle className="flex items-center gap-2">
                  <UsersIcon className="h-4 w-4" />
                  Contacts ({client.contacts?.length || 0})
                </CardTitle>
                <Button variant="ghost" className="h-auto p-0 hover:bg-transparent" onClick={openAddContact}>
                  <Plus className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                {client.contacts && client.contacts.length > 0 ? (
                  <table className="w-full">
                    <tbody>
                      {(client.contacts || []).map((contact: Contact) => (
                        <tr
                          key={contact.id}
                          className="border-b hover:bg-muted/30 cursor-pointer transition-colors"
                          onMouseDown={(e) => {
                            mouseDownPos.current = { x: e.clientX, y: e.clientY };
                            isSelectingRef.current = false;
                          }}
                          onMouseMove={(e) => {
                            if (mouseDownPos.current && e.buttons === 1) {
                              const dx = Math.abs(e.clientX - mouseDownPos.current.x);
                              const dy = Math.abs(e.clientY - mouseDownPos.current.y);
                              if (dx > 5 || dy > 5) {
                                isSelectingRef.current = true;
                              }
                            }
                          }}
                          onMouseUp={() => {
                            mouseDownPos.current = null;
                          }}
                          onMouseLeave={() => {
                            mouseDownPos.current = null;
                            isSelectingRef.current = false;
                          }}
                          onClick={() => {
                            if (!isSelectingRef.current && !window.getSelection()?.toString()) {
                              openEditContact(contact);
                            }
                            mouseDownPos.current = null;
                            isSelectingRef.current = false;
                          }}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {canManageClients ? (
                                  <div className="font-medium text-sm text-primary hover:underline">
                                    {contact.firstName} {contact.lastName}
                                  </div>
                                ) : (
                                  <div className="font-medium text-sm">
                                    {contact.firstName} {contact.lastName}
                                  </div>
                                )}
                                {contact.isPrimary && (
                                  <Badge variant="outline" className="text-xs">Primary</Badge>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {contact.email}
                              </div>
                            </div>
                            <div className="flex items-center justify-between mt-1">
                              <div className="text-xs text-muted-foreground">
                                {contact.role && <span className="capitalize">{contact.role}</span>}
                                {contact.role && contact.title && ' • '}
                                {contact.title}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {contact.phone}
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <UsersIcon className="mx-auto h-6 w-6 mb-2" />
                    <p className="text-xs">No contacts</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Locations & Coverage */}
          <div className="grid gap-4 md:grid-cols-5">
            {/* Warehouse Allocations & Facilities */}
            <div className="md:col-span-2 space-y-4">
              <Card>
                <CardHeader className="py-3 flex-row items-center justify-between space-y-0">
                  <CardTitle className="flex items-center gap-2">
                  <Warehouse className="h-4 w-4" />
                  Warehouse Allocations ({client.warehouseAllocations?.length || 0})
                </CardTitle>
                  <Button variant="ghost" className="h-auto p-0 hover:bg-transparent" onClick={openAddAllocation}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  {client.warehouseAllocations && client.warehouseAllocations.length > 0 ? (
                    <table className="w-full">
                      <tbody>
                        {(client.warehouseAllocations || []).map((alloc: WarehouseAllocation) => (
                          <tr
                            key={alloc.id}
                            className="border-b hover:bg-muted/30 cursor-pointer transition-colors"
                            onMouseDown={(e) => {
                              mouseDownPos.current = { x: e.clientX, y: e.clientY };
                              isSelectingRef.current = false;
                            }}
                            onMouseMove={(e) => {
                              if (mouseDownPos.current && e.buttons === 1) {
                                const dx = Math.abs(e.clientX - mouseDownPos.current.x);
                                const dy = Math.abs(e.clientY - mouseDownPos.current.y);
                                if (dx > 5 || dy > 5) {
                                  isSelectingRef.current = true;
                                }
                              }
                            }}
                            onMouseUp={() => {
                              mouseDownPos.current = null;
                            }}
                            onMouseLeave={() => {
                              mouseDownPos.current = null;
                              isSelectingRef.current = false;
                            }}
                            onClick={() => {
                              if (!isSelectingRef.current && !window.getSelection()?.toString()) {
                                setEditingAllocation(alloc);
                                setSelectedWarehouseId(alloc.warehouse.id);
                                setPallets(alloc.spaceAllocated?.pallets?.toString() || '');
                                setSqft(alloc.spaceAllocated?.sqft?.toString() || '');
                                setZone(alloc.zoneAssignment || '');
                                setIsPrimary(alloc.isPrimary);
                                setAllocationDialogOpen(true);
                              }
                              mouseDownPos.current = null;
                              isSelectingRef.current = false;
                            }}
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  {canManageClients ? (
                                    <div className="font-medium text-sm text-primary hover:underline">{alloc.warehouse.code}</div>
                                  ) : (
                                    <div className="font-medium text-sm">{alloc.warehouse.code}</div>
                                  )}
                                  {alloc.isPrimary && (
                                    <Badge variant="outline" className="text-xs">Primary</Badge>
                                  )}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {(alloc.spaceAllocated?.pallets || alloc.spaceAllocated?.sqft) ? (
                                    <>
                                      {alloc.spaceAllocated?.pallets && `${alloc.spaceAllocated.pallets.toLocaleString()} pallets`}
                                      {alloc.spaceAllocated?.pallets && alloc.spaceAllocated?.sqft && ' • '}
                                      {alloc.spaceAllocated?.sqft && `${alloc.spaceAllocated.sqft.toLocaleString()} sqft`}
                                    </>
                                  ) : '—'}
                                </div>
                              </div>
                              <div className="flex items-center justify-between mt-1">
                                <div className="text-xs text-muted-foreground">
                                  {alloc.warehouse.name}
                                </div>
                                {alloc.zoneAssignment && (
                                  <div className="text-xs text-muted-foreground">
                                    Zone: {alloc.zoneAssignment}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground">
                      <Warehouse className="mx-auto h-6 w-6 mb-2" />
                      <p className="text-xs">No allocations</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Customer Facilities */}
              <Card>
                <CardHeader className="py-3 flex-row items-center justify-between space-y-0">
                  <CardTitle className="flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    Customer Facilities ({client.facilities?.length || 0})
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={openAddFacility}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  {client.facilities && client.facilities.length > 0 ? (
                    <table className="w-full">
                      <tbody>
                        {(client.facilities || []).map((facility: CustomerFacility) => (
                          <tr
                            key={facility.id}
                            className="border-b hover:bg-muted/30 cursor-pointer transition-colors"
                            onMouseDown={(e) => {
                              mouseDownPos.current = { x: e.clientX, y: e.clientY };
                              isSelectingRef.current = false;
                            }}
                            onMouseMove={(e) => {
                              if (mouseDownPos.current && e.buttons === 1) {
                                const dx = Math.abs(e.clientX - mouseDownPos.current.x);
                                const dy = Math.abs(e.clientY - mouseDownPos.current.y);
                                if (dx > 5 || dy > 5) {
                                  isSelectingRef.current = true;
                                }
                              }
                            }}
                            onMouseUp={() => {
                              mouseDownPos.current = null;
                            }}
                            onMouseLeave={() => {
                              mouseDownPos.current = null;
                              isSelectingRef.current = false;
                            }}
                            onClick={() => {
                              if (!isSelectingRef.current && !window.getSelection()?.toString()) {
                                openEditFacility(facility);
                              }
                              mouseDownPos.current = null;
                              isSelectingRef.current = false;
                            }}
                          >
                            <td className="px-4 py-3">
                              <div className="font-medium text-sm flex items-center gap-2">
                                {canManageClients ? (
                                  <div className="font-medium text-primary hover:underline">{facility.name}</div>
                                ) : (
                                  <div className="font-medium">{facility.name}</div>
                                )}
                                {facility.facilityType && (
                                  <Badge variant="outline" className="text-xs capitalize">
                                    {facility.facilityType}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center justify-between mt-1">
                                <div className="text-xs text-muted-foreground">
                                  {facility.address.city}, {facility.address.state}
                                </div>
                                {(facility.isSource || facility.isDestination) && (
                                  <div className="text-xs text-muted-foreground">
                                    {facility.isSource && 'Source'}
                                    {facility.isSource && facility.isDestination && ', '}
                                    {facility.isDestination && 'Destination'}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground">
                      <Building className="mx-auto h-6 w-6 mb-2" />
                      <p className="text-xs">No facilities</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Coverage Map */}
            <div className="md:col-span-3">
              <Card>
                <CardHeader>
                  <CardTitle>Location & Coverage Map</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] relative bg-muted/20 rounded-lg border-2 border-dashed flex items-center justify-center">
                    <div className="text-center">
                      <MapPin className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
                      <p className="text-sm font-medium">Interactive Coverage Map</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Coming soon - will show warehouse pins and delivery zones
                      </p>
                    </div>
                    
                    {/* Legend */}
                    <div className="absolute bottom-4 left-4 bg-background/95 backdrop-blur p-3 rounded-lg border shadow-lg">
                      <div className="space-y-2 text-xs">
                        <div className="font-medium mb-2">Legend</div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                          <span>Your Warehouses</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-green-500"></div>
                          <span>Customer Facilities</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-green-200 dark:bg-green-800 opacity-50"></div>
                          <span>1-Day Zone</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-blue-200 dark:bg-blue-800 opacity-50"></div>
                          <span>2-Day Zone</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-gray-200 dark:bg-gray-700 opacity-50"></div>
                          <span>3+ Days</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Activity Volume Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Activity Volume</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[200px] flex items-center justify-center bg-muted/20 rounded-lg border-2 border-dashed">
                <div className="text-center text-muted-foreground">
                  <BarChart3 className="mx-auto h-10 w-10 mb-2" />
                  <p className="text-sm font-medium">Volume Chart</p>
                  <p className="text-xs mt-1">
                    Coming soon - will show daily order/shipment trends
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Operations */}
        <TabsContent value="allocations" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Operations</h2>
            <Button onClick={openAddAllocation}>
              <Plus className="h-4 w-4 mr-2" />
              Add Allocation
            </Button>
          </div>

          {client.warehouseAllocations && client.warehouseAllocations.length > 0 ? (
            <Card>
              <CardContent className="p-0">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr className="border-b">
                      <th className="px-4 py-3 text-left text-sm font-medium">Warehouse</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Space Allocated</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Zone</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Primary</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(client.warehouseAllocations || []).map((allocation: WarehouseAllocation) => (
                      <tr 
                        key={allocation.id} 
                        className="border-b hover:bg-muted/30 cursor-pointer transition-colors"
                        onMouseDown={(e) => {
                          mouseDownPos.current = { x: e.clientX, y: e.clientY };
                          isSelectingRef.current = false;
                        }}
                        onMouseMove={(e) => {
                          if (mouseDownPos.current && e.buttons === 1) {
                            const dx = Math.abs(e.clientX - mouseDownPos.current.x);
                            const dy = Math.abs(e.clientY - mouseDownPos.current.y);
                            if (dx > 5 || dy > 5) {
                              isSelectingRef.current = true;
                            }
                          }
                        }}
                        onMouseUp={() => {
                          mouseDownPos.current = null;
                        }}
                        onMouseLeave={() => {
                          mouseDownPos.current = null;
                          isSelectingRef.current = false;
                        }}
                        onClick={() => {
                          if (!isSelectingRef.current && !window.getSelection()?.toString()) {
                            setEditingAllocation(allocation);
                            setSelectedWarehouseId(allocation.warehouse.id);
                            setPallets(allocation.spaceAllocated?.pallets?.toString() || '');
                            setSqft(allocation.spaceAllocated?.sqft?.toString() || '');
                            setZone(allocation.zoneAssignment || '');
                            setIsPrimary(allocation.isPrimary);
                            setAllocationDialogOpen(true);
                          }
                          mouseDownPos.current = null;
                          isSelectingRef.current = false;
                        }}
                      >
                        <td className="px-4 py-3">
                          <div>
                            {canManageClients ? (
                              <div className="font-medium text-primary hover:underline">{allocation.warehouse.code}</div>
                            ) : (
                              <div className="font-medium">{allocation.warehouse.code}</div>
                            )}
                            <div className="text-sm text-muted-foreground">{allocation.warehouse.name}</div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {allocation.spaceAllocated?.pallets 
                            ? `${allocation.spaceAllocated.pallets} pallets`
                            : 'Not specified'
                          }
                          {allocation.spaceAllocated?.sqft && (
                            <div className="text-xs text-muted-foreground">
                              {allocation.spaceAllocated.sqft} sqft
                            </div>
                          )}
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
                <Warehouse className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">No warehouse allocations</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Allocate space at one of your warehouses for this client
                </p>
                <Button onClick={openAddAllocation} className="mt-4">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Allocation
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab 3: Communications */}
        <TabsContent value="contacts" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Communications</h2>
            <Button onClick={openAddContact}>
              <Plus className="h-4 w-4 mr-2" />
              Add Contact
            </Button>
          </div>

          {client.contacts && client.contacts.length > 0 ? (
            <Card>
              <CardContent className="p-0">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr className="border-b">
                  <th className="px-4 py-3 text-left text-sm font-medium">Name</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Title</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Email</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Phone</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Role</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Primary</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(client.contacts || []).map((contact: Contact) => (
                      <tr 
                        key={contact.id} 
                        className="border-b hover:bg-muted/30 cursor-pointer transition-colors"
                        onMouseDown={(e) => {
                          mouseDownPos.current = { x: e.clientX, y: e.clientY };
                          isSelectingRef.current = false;
                        }}
                        onMouseMove={(e) => {
                          if (mouseDownPos.current && e.buttons === 1) {
                            const dx = Math.abs(e.clientX - mouseDownPos.current.x);
                            const dy = Math.abs(e.clientY - mouseDownPos.current.y);
                            if (dx > 5 || dy > 5) {
                              isSelectingRef.current = true;
                            }
                          }
                        }}
                        onMouseUp={() => {
                          mouseDownPos.current = null;
                        }}
                        onMouseLeave={() => {
                          mouseDownPos.current = null;
                          isSelectingRef.current = false;
                        }}
                        onClick={() => {
                          if (!isSelectingRef.current && !window.getSelection()?.toString()) {
                            openEditContact(contact);
                          }
                          mouseDownPos.current = null;
                          isSelectingRef.current = false;
                        }}
                      >
                        <td className="px-4 py-3">
                          {canManageClients ? (
                            <div className="font-medium text-primary hover:underline">
                              {contact.firstName} {contact.lastName}
                            </div>
                          ) : (
                            <div className="font-medium">
                              {contact.firstName} {contact.lastName}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {contact.title || '—'}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {contact.email || '—'}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {contact.phone || '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm capitalize">{contact.role || 'general'}</span>
                        </td>
                        <td className="px-4 py-3">
                          {contact.isPrimary && (
                            <Badge variant="outline" className="text-xs">Primary</Badge>
                          )}
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
                <UsersIcon className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">No contacts</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Add contacts for this client's team
                </p>
                <Button onClick={openAddContact} className="mt-4">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Contact
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab 4: Contracts */}
        <TabsContent value="contracts" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Contracts & Rate Cards</h2>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Contract
            </Button>
          </div>

          {client.contracts && client.contracts.length > 0 ? (
            <div className="space-y-4">
              {(client.contracts || []).map((contract: Contract) => (
                <Card key={contract.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">
                          {contract.name}
                        </CardTitle>
                        <CardDescription>
                          {contract.contractNumber && `#${contract.contractNumber} • `}
                          {new Date(contract.startDate).toLocaleDateString()}
                          {contract.endDate && ` - ${new Date(contract.endDate).toLocaleDateString()}`}
                        </CardDescription>
                      </div>
                      <Badge variant={contract.status === 'active' ? 'default' : 'secondary'}>
                        {contract.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Billing Cycle:</span>{' '}
                        <span className="capitalize">{contract.billingCycle || 'Not set'}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">No contracts</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Create a contract to establish billing and terms
                </p>
                <Button className="mt-4">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Contract
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab 5: Integrations */}
        <TabsContent value="integrations" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Integrations</h2>
          </div>

          <Card>
            <CardContent className="py-12 text-center">
              <div className="text-center text-muted-foreground">
                <h3 className="mt-4 text-lg font-semibold">Coming Soon</h3>
                <p className="mt-2 text-sm">
                  Integration settings will be available here
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 6: Account Setup */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Account Setup</CardTitle>
              <CardDescription>
                Configure portal access, notifications, and preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {error && (
                <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
                  {error}
                </div>
              )}

              {/* Portal Settings */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm">Portal Access</h3>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="portalEnabled"
                    checked={portalEnabled}
                    onCheckedChange={(checked) => setPortalEnabled(checked as boolean)}
                  />
                  <Label htmlFor="portalEnabled" className="text-sm cursor-pointer">
                    Enable client portal
                  </Label>
                </div>

                {portalEnabled && (
                  <div className="space-y-2 ml-6">
                    <Label htmlFor="subdomain">Portal Subdomain</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="subdomain"
                        value={portalSubdomain}
                        onChange={(e) => setPortalSubdomain(e.target.value)}
                        placeholder="acme"
                      />
                      <span className="text-sm text-muted-foreground">.handled.app</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Notification Settings */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm">Notifications</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="notificationEmail">Notification Email</Label>
                  <Input
                    id="notificationEmail"
                    type="email"
                    value={notificationEmail}
                    onChange={(e) => setNotificationEmail(e.target.value)}
                    placeholder="notifications@client.com"
                  />
                  <p className="text-xs text-muted-foreground">
                    Alerts and notifications will be sent to this email
                  </p>
                </div>
              </div>

              {/* General Settings */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm">General</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select value={timezone} onValueChange={setTimezone}>
                    <SelectTrigger id="timezone">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="America/New_York">Eastern (ET)</SelectItem>
                      <SelectItem value="America/Chicago">Central (CT)</SelectItem>
                      <SelectItem value="America/Denver">Mountain (MT)</SelectItem>
                      <SelectItem value="America/Los_Angeles">Pacific (PT)</SelectItem>
                      <SelectItem value="America/Phoenix">Arizona (MT - no DST)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="pt-4">
                <Button 
                  onClick={handleSaveSettings}
                  disabled={updateSettingsMutation.isPending}
                >
                  {updateSettingsMutation.isPending && (
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  )}
                  Save Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Contact Dialog */}
      <Dialog open={contactDialogOpen} onOpenChange={setContactDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingContact ? 'Edit' : 'Add'} Contact
            </DialogTitle>
            <DialogDescription>
              {editingContact ? 'Update' : 'Add'} contact information for this client
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
              {error}
            </div>
          )}

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">
                  First Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="John"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">
                  Last Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Doe"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john.doe@company.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(555) 123-4567"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactTitle">Title</Label>
              <Input
                id="contactTitle"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Operations Manager"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactRole">Role</Label>
              <Select value={contactRole} onValueChange={setContactRole}>
                <SelectTrigger id="contactRole">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="operations">Operations</SelectItem>
                  <SelectItem value="billing">Billing</SelectItem>
                  <SelectItem value="executive">Executive</SelectItem>
                  <SelectItem value="technical">Technical</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="contactPrimary"
                checked={contactIsPrimary}
                onCheckedChange={(checked) => setContactIsPrimary(checked as boolean)}
              />
              <Label htmlFor="contactPrimary" className="text-sm cursor-pointer">
                Set as primary contact
              </Label>
            </div>
          </div>

          <DialogFooter className="flex justify-between items-center">
            {editingContact && canManageClients && (
              <AlertDialog onOpenChange={() => setDeleteContactConfirmed(false)}>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="mr-auto" type="button">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Contact?</AlertDialogTitle>
                    <AlertDialogDescription className="space-y-3">
                      <p>Remove {editingContact.firstName} {editingContact.lastName} from {client.name}?</p>
                      <p className="text-sm">This action cannot be undone.</p>
                      <div className="flex items-start gap-2 border rounded p-3 bg-muted/50">
                        <input
                          type="checkbox"
                          id="confirm-delete-contact"
                          checked={deleteContactConfirmed}
                          onChange={(e) => setDeleteContactConfirmed(e.target.checked)}
                          className="mt-1 h-4 w-4 rounded"
                        />
                        <label htmlFor="confirm-delete-contact" className="text-sm cursor-pointer">
                          I understand this contact will be permanently deleted
                        </label>
                      </div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setDeleteContactConfirmed(false)}>
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      disabled={!deleteContactConfirmed || deleteContactMutation.isPending}
                      onClick={() => editingContact && deleteContactMutation.mutate(editingContact.id)}
                      className="bg-destructive hover:bg-destructive/90"
                    >
                      {deleteContactMutation.isPending ? 'Deleting...' : 'Delete'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={closeContactDialog}>
                Cancel
              </Button>
              <Button 
                onClick={handleSaveContact}
                disabled={createContactMutation.isPending || updateContactMutation.isPending}
              >
                {(createContactMutation.isPending || updateContactMutation.isPending) && (
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                )}
                {editingContact ? 'Save' : 'Add'} Contact
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Allocation Dialog */}
      <Dialog open={allocationDialogOpen} onOpenChange={setAllocationDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingAllocation ? 'Edit' : 'Add'} Warehouse Allocation
            </DialogTitle>
            <DialogDescription>
              Allocate space at one of your warehouses for this client
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
              {error}
            </div>
          )}

          <div className="space-y-4 py-4">
            {/* Warehouse Selector */}
            <div className="space-y-2">
              <Label htmlFor="warehouse">
                Warehouse <span className="text-destructive">*</span>
              </Label>
              <Select value={selectedWarehouseId} onValueChange={setSelectedWarehouseId}>
                <SelectTrigger id="warehouse">
                  <SelectValue placeholder="Select warehouse" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((wh: any) => {
                    // Check if this warehouse is already allocated (excluding current allocation when editing)
                    const isAllocated = client.warehouseAllocations?.some(
                      alloc => alloc.companyWarehouseId === wh.id && 
                               (!editingAllocation || alloc.id !== editingAllocation.id)
                    );
                    
                    return (
                      <SelectItem 
                        key={wh.id} 
                        value={wh.id}
                        disabled={isAllocated}
                      >
                        {wh.code} - {wh.name}
                        {wh.capacity?.usable_pallets && (
                          <span className="text-xs text-muted-foreground ml-2">
                            ({wh.capacity.usable_pallets} pallets)
                          </span>
                        )}
                        {isAllocated && (
                          <span className="text-xs text-muted-foreground ml-2">
                            • Already allocated
                          </span>
                        )}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Space Allocation */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pallets">Pallets</Label>
                <Input
                  id="pallets"
                  type="number"
                  min="0"
                  value={pallets}
                  onChange={(e) => setPallets(e.target.value)}
                  placeholder="500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sqft">Square Feet</Label>
                <Input
                  id="sqft"
                  type="number"
                  min="0"
                  value={sqft}
                  onChange={(e) => setSqft(e.target.value)}
                  placeholder="5000"
                />
              </div>
            </div>

            {/* Zone Assignment */}
            <div className="space-y-2">
              <Label htmlFor="zone">Zone Assignment</Label>
              <Input
                id="zone"
                value={zone}
                onChange={(e) => setZone(e.target.value)}
                placeholder="A1-A50 (optional)"
              />
            </div>

            {/* Primary */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="primary"
                checked={isPrimary}
                onCheckedChange={(checked) => setIsPrimary(checked as boolean)}
              />
              <Label htmlFor="primary" className="text-sm cursor-pointer">
                Set as primary warehouse for this client
              </Label>
            </div>
          </div>

          <DialogFooter className="flex justify-between items-center">
            {editingAllocation && canManageClients && (
              <AlertDialog onOpenChange={() => setDeleteAllocationConfirmed(false)}>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="mr-auto" type="button">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remove Allocation?</AlertDialogTitle>
                    <AlertDialogDescription className="space-y-3">
                      <p>Remove {client.name}'s allocation at {editingAllocation.warehouse.code}?</p>
                      <p className="text-sm">This will free up the allocated space.</p>
                      <div className="flex items-start gap-2 border rounded p-3 bg-muted/50">
                        <input
                          type="checkbox"
                          id="confirm-delete-allocation"
                          checked={deleteAllocationConfirmed}
                          onChange={(e) => setDeleteAllocationConfirmed(e.target.checked)}
                          className="mt-1 h-4 w-4 rounded"
                        />
                        <label htmlFor="confirm-delete-allocation" className="text-sm cursor-pointer">
                          I understand this allocation will be permanently removed
                        </label>
                      </div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setDeleteAllocationConfirmed(false)}>
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      disabled={!deleteAllocationConfirmed || deleteAllocationMutation.isPending}
                      onClick={() => editingAllocation && deleteAllocationMutation.mutate(editingAllocation.id)}
                      className="bg-destructive hover:bg-destructive/90"
                    >
                      {deleteAllocationMutation.isPending ? 'Removing...' : 'Remove'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={closeAllocationDialog}>
                Cancel
              </Button>
              <Button 
                onClick={handleSaveAllocation}
                disabled={createAllocationMutation.isPending || updateAllocationMutation.isPending}
              >
                {(createAllocationMutation.isPending || updateAllocationMutation.isPending) && (
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                )}
                {editingAllocation ? 'Save' : 'Add'} Allocation
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Facility Dialog */}
      <Dialog open={facilityDialogOpen} onOpenChange={setFacilityDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingFacility ? 'Edit' : 'Add'} Facility
            </DialogTitle>
            <DialogDescription>
              {editingFacility ? 'Update facility details' : 'Add a new facility for this client'}
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
              {error}
            </div>
          )}

          <div className="space-y-4 py-4">
            {/* Facility Name */}
            <div className="space-y-2">
              <Label htmlFor="facility-name">
                Facility Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="facility-name"
                value={facilityName}
                onChange={(e) => setFacilityName(e.target.value)}
                placeholder="Main Warehouse"
              />
            </div>

            {/* Facility Type */}
            <div className="space-y-2">
              <Label htmlFor="facility-type">Facility Type</Label>
              <Select value={facilityType} onValueChange={setFacilityType}>
                <SelectTrigger id="facility-type">
                  <SelectValue placeholder="Select type (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="warehouse">Warehouse</SelectItem>
                  <SelectItem value="manufacturing">Manufacturing</SelectItem>
                  <SelectItem value="retail">Retail</SelectItem>
                  <SelectItem value="office">Office</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Address */}
            <div className="space-y-4">
              <Label>Address</Label>

              <div className="space-y-2">
                <Input
                  placeholder="Street Address"
                  value={facilityStreet1}
                  onChange={(e) => setFacilityStreet1(e.target.value)}
                />
                <Input
                  placeholder="Street Address 2 (optional)"
                  value={facilityStreet2}
                  onChange={(e) => setFacilityStreet2(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="City"
                  value={facilityCity}
                  onChange={(e) => setFacilityCity(e.target.value)}
                />
                <Input
                  placeholder="State"
                  value={facilityState}
                  onChange={(e) => setFacilityState(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="ZIP Code"
                  value={facilityZip}
                  onChange={(e) => setFacilityZip(e.target.value)}
                />
                <Select value={facilityCountry} onValueChange={setFacilityCountry}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="US">United States</SelectItem>
                    <SelectItem value="CA">Canada</SelectItem>
                    <SelectItem value="MX">Mexico</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Source/Destination */}
            <div className="space-y-3">
              <Label>Facility Role</Label>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is-source"
                  checked={isSource}
                  onCheckedChange={(checked) => setIsSource(checked as boolean)}
                />
                <Label htmlFor="is-source" className="text-sm cursor-pointer">
                  Source facility (ships from here)
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is-destination"
                  checked={isDestination}
                  onCheckedChange={(checked) => setIsDestination(checked as boolean)}
                />
                <Label htmlFor="is-destination" className="text-sm cursor-pointer">
                  Destination facility (ships to here)
                </Label>
              </div>
            </div>
          </div>

          <DialogFooter className="flex justify-between items-center">
            {editingFacility && canManageClients && (
              <AlertDialog onOpenChange={() => setDeleteFacilityConfirmed(false)}>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="mr-auto" type="button">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remove Facility?</AlertDialogTitle>
                    <AlertDialogDescription className="space-y-3">
                      <p>Remove {editingFacility.name}?</p>
                      <p className="text-sm">This will permanently delete this facility.</p>
                      <div className="flex items-start gap-2 border rounded p-3 bg-muted/50">
                        <input
                          type="checkbox"
                          id="confirm-delete-facility"
                          checked={deleteFacilityConfirmed}
                          onChange={(e) => setDeleteFacilityConfirmed(e.target.checked)}
                          className="mt-1 h-4 w-4 rounded"
                        />
                        <label htmlFor="confirm-delete-facility" className="text-sm cursor-pointer">
                          I understand this facility will be permanently removed
                        </label>
                      </div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setDeleteFacilityConfirmed(false)}>
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      disabled={!deleteFacilityConfirmed || deleteFacilityMutation.isPending}
                      onClick={() => editingFacility && deleteFacilityMutation.mutate(editingFacility.id)}
                      className="bg-destructive hover:bg-destructive/90"
                    >
                      {deleteFacilityMutation.isPending ? 'Removing...' : 'Remove'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={closeFacilityDialog}>
                Cancel
              </Button>
              <Button
                onClick={handleSaveFacility}
                disabled={createFacilityMutation.isPending || updateFacilityMutation.isPending}
              >
                {(createFacilityMutation.isPending || updateFacilityMutation.isPending) && (
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                )}
                {editingFacility ? 'Save' : 'Add'} Facility
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
