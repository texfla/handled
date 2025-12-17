import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Checkbox } from '../../components/ui/checkbox';
import { ChevronLeft, ChevronRight, Check, Plus, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import { cn } from '../../lib/utils';

const STEPS = [
  { id: 1, name: 'Organization', description: 'Basic client information' },
  { id: 2, name: 'Contact', description: 'Primary contact person' },
  { id: 3, name: 'Warehouse', description: 'Space allocation' },
  { id: 4, name: 'Contract', description: 'Billing and terms' },
  { id: 5, name: 'Review', description: 'Confirm and create' },
];

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function ClientOnboardingWizard() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [error, setError] = useState('');

  // Form state
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugChecking, setSlugChecking] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [emailValid, setEmailValid] = useState<boolean | null>(null);
  const [phone, setPhone] = useState('');
  const [contactTitle, setContactTitle] = useState('');
  
  // Support multiple warehouse allocations
  const [warehouseAllocations, setWarehouseAllocations] = useState<Array<{
    warehouseId: string;
    pallets: string;
    sqft: string;
    zoneAssignment: string;
    isPrimary: boolean;
  }>>([{
    warehouseId: '',
    pallets: '',
    sqft: '',
    zoneAssignment: '',
    isPrimary: true,
  }]);
  const [contractName, setContractName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [paymentTerms, setPaymentTerms] = useState('Net 30');

  // Fetch warehouses for step 3
  const { data: warehousesData } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => api.get<{ warehouses: any[] }>('/api/warehouses'),
  });

  const warehouses = warehousesData?.warehouses || [];

  // Create client mutation (single transactional call)
  const createClientMutation = useMutation({
    mutationFn: async () => {
      const filteredAllocations = warehouseAllocations.filter(a => a.warehouseId);

      const payload = {
        client: {
          name,
          slug,
          status: 'active',
        },
        contact: {
          first_name: firstName,
          last_name: lastName,
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          title: contactTitle.trim() || undefined,
        },
        warehouse_allocations: filteredAllocations.map(a => ({
          company_warehouse_id: a.warehouseId,
          space_allocated: {
            pallets: a.pallets ? parseInt(a.pallets) : undefined,
            sqft: a.sqft ? parseInt(a.sqft) : undefined,
          },
          zone_assignment: a.zoneAssignment || undefined,
          is_primary: a.isPrimary,
        })),
        contract: {
          name: contractName,
          start_date: startDate,
          end_date: endDate || undefined,
          billing_cycle: billingCycle,
          payment_terms: paymentTerms,
        },
      };

      const response = await api.post<{ client: { id: string } }>('/api/clients/onboard', payload);

      return response.client.id;
    },
    onSuccess: (clientId) => {
      navigate(`/clients/${clientId}`);
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to create client';
      
      // Handle specific errors
      if (errorMessage.includes('slug') || errorMessage.includes('already exists')) {
        setError(`The slug "${slug}" is already in use. Please choose a different client name or modify the slug.`);
        setCurrentStep(1); // Go back to step 1 to fix
      } else if (errorMessage.includes('Insufficient capacity')) {
        setError(errorMessage);
        setCurrentStep(3); // Go back to step 3 to adjust allocation
      } else {
        setError(errorMessage);
      }
    },
  });

  // Email validation
  const validateEmail = (email: string) => {
    if (!email.trim()) {
      setEmailValid(null);
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    setEmailValid(emailRegex.test(email));
  };

  // Check slug availability (debounced)
  useEffect(() => {
    if (!slug || slug.length < 2) {
      setSlugAvailable(null);
      return;
    }

    setSlugChecking(true);
    const timer = setTimeout(async () => {
      try {
        const response = await api.get<{ available: boolean }>(`/api/clients/check-slug/${slug}`);
        setSlugAvailable(response.available);
      } catch (error) {
        setSlugAvailable(null);
      } finally {
        setSlugChecking(false);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [slug]);

  // Auto-generate slug from name
  const handleNameChange = (value: string) => {
    setName(value);
    if (!slug || slug === generateSlug(name)) {
      setSlug(generateSlug(value));
    }
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    validateEmail(value);
  };

  const validateStep = (step: number): boolean => {
    setError('');
    
    switch (step) {
      case 1:
        if (!name.trim()) {
          setError('Client name is required');
          return false;
        }
        if (!slug.trim()) {
          setError('Slug is required');
          return false;
        }
        if (slugAvailable === false) {
          setError('This slug is already in use. Please choose a different one.');
          return false;
        }
        if (slugAvailable === null && slug.trim()) {
          setError('Checking slug availability...');
          return false;
        }
        return true;
      
      case 2:
        if (!firstName.trim() || !lastName.trim()) {
          setError('First and last name are required');
          return false;
        }
        if (email.trim() && emailValid === false) {
          setError('Please enter a valid email address');
          return false;
        }
        return true;
      
      case 3:
        // At least one warehouse must be selected
        const hasValidAllocation = warehouseAllocations.some(a => a.warehouseId);
        if (!hasValidAllocation) {
          setError('Please select at least one warehouse');
          return false;
        }
        
        // Validate no negative numbers
        for (const allocation of warehouseAllocations) {
          if (allocation.pallets && parseInt(allocation.pallets) < 0) {
            setError('Pallets cannot be negative');
            return false;
          }
          if (allocation.sqft && parseInt(allocation.sqft) < 0) {
            setError('Square feet cannot be negative');
            return false;
          }
        }
        return true;
      
      case 4:
        if (!contractName.trim()) {
          setError('Contract name is required');
          return false;
        }
        if (!startDate) {
          setError('Start date is required');
          return false;
        }
        return true;
      
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    setCurrentStep(currentStep - 1);
    setError('');
  };

  const handleCreate = () => {
    createClientMutation.mutate();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Onboard New Client</h1>
        <p className="text-muted-foreground mt-1">
          Complete the setup wizard to add a new client
        </p>
      </div>

      {/* Stepper */}
      <div className="flex items-center justify-between">
        {STEPS.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center border-2",
                  currentStep > step.id
                    ? "bg-primary border-primary text-primary-foreground"
                    : currentStep === step.id
                    ? "border-primary text-primary"
                    : "border-muted text-muted-foreground"
                )}
              >
                {currentStep > step.id ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <span>{step.id}</span>
                )}
              </div>
              <div className="mt-2 text-center">
                <div className="text-sm font-medium">{step.name}</div>
                <div className="text-xs text-muted-foreground">{step.description}</div>
              </div>
            </div>
            {index < STEPS.length - 1 && (
              <div
                className={cn(
                  "h-0.5 w-16 mx-4 mb-8",
                  currentStep > step.id ? "bg-primary" : "bg-muted"
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
          {error}
        </div>
      )}

      {/* Step Content */}
      <Card>
        <CardContent className="pt-6">
          {/* Step 1: Organization */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Client Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Acme Corporation"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">
                  Slug <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="slug"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="acme-corp"
                    className={cn(
                      slugAvailable === true && "border-green-500 pr-10",
                      slugAvailable === false && "border-destructive pr-10"
                    )}
                  />
                  {slugChecking && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                  {!slugChecking && slugAvailable === true && (
                    <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                  )}
                  {!slugChecking && slugAvailable === false && (
                    <XCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-destructive" />
                  )}
                </div>
                {slugAvailable === false && (
                  <p className="text-xs text-destructive">
                    This slug is already in use
                  </p>
                )}
                {slugAvailable === true && (
                  <p className="text-xs text-green-600">
                    This slug is available
                  </p>
                )}
                {slugAvailable === null && slug && !slugChecking && (
                  <p className="text-xs text-muted-foreground">
                    {slug ? `Client identifier: ${slug}` : 'Auto-generated from client name'}
                    {' '}(must be unique)
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Contact */}
          {currentStep === 2 && (
            <div className="space-y-4">
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
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => handleEmailChange(e.target.value)}
                    placeholder="john.doe@company.com"
                    className={cn(
                      email && emailValid === true && "border-green-500 pr-10",
                      email && emailValid === false && "border-destructive pr-10"
                    )}
                  />
                  {email && emailValid === true && (
                    <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                  )}
                  {email && emailValid === false && (
                    <XCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-destructive" />
                  )}
                </div>
                {email && emailValid === false && (
                  <p className="text-xs text-destructive">
                    Please enter a valid email address
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(555) 123-4567"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={contactTitle}
                  onChange={(e) => setContactTitle(e.target.value)}
                  placeholder="Operations Manager"
                />
              </div>
            </div>
          )}

          {/* Step 3: Warehouse (Multiple) */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="font-medium mb-1">Warehouse Allocations</h3>
                <p className="text-sm text-muted-foreground">
                  Allocate space at one or more warehouses for this client
                </p>
              </div>

              {warehouseAllocations.map((allocation, index) => (
                <Card key={index} className="p-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm">
                        Allocation {index + 1}
                        {allocation.isPrimary && (
                          <Badge variant="outline" className="ml-2 text-xs">Primary</Badge>
                        )}
                      </h4>
                      {warehouseAllocations.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setWarehouseAllocations(warehouseAllocations.filter((_, i) => i !== index));
                          }}
                        >
                          Remove
                        </Button>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>
                        Warehouse {index === 0 && <span className="text-destructive">*</span>}
                      </Label>
                      <Select
                        value={allocation.warehouseId}
                        onValueChange={(value) => {
                          const updated = [...warehouseAllocations];
                          updated[index].warehouseId = value;
                          setWarehouseAllocations(updated);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a warehouse" />
                        </SelectTrigger>
                        <SelectContent>
                          {warehouses.map((wh: any) => (
                            <SelectItem key={wh.id} value={wh.id}>
                              {wh.code} - {wh.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Pallets</Label>
                        <Input
                          type="number"
                          min="0"
                          value={allocation.pallets}
                          onChange={(e) => {
                            const updated = [...warehouseAllocations];
                            updated[index].pallets = e.target.value;
                            setWarehouseAllocations(updated);
                          }}
                          placeholder="500"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Square Feet</Label>
                        <Input
                          type="number"
                          min="0"
                          value={allocation.sqft}
                          onChange={(e) => {
                            const updated = [...warehouseAllocations];
                            updated[index].sqft = e.target.value;
                            setWarehouseAllocations(updated);
                          }}
                          placeholder="5000"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Zone Assignment</Label>
                      <Input
                        value={allocation.zoneAssignment}
                        onChange={(e) => {
                          const updated = [...warehouseAllocations];
                          updated[index].zoneAssignment = e.target.value;
                          setWarehouseAllocations(updated);
                        }}
                        placeholder="A1-A50 (optional)"
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={allocation.isPrimary}
                        onCheckedChange={(checked) => {
                          const updated = warehouseAllocations.map((a, i) => ({
                            ...a,
                            isPrimary: i === index ? (checked as boolean) : false,
                          }));
                          setWarehouseAllocations(updated);
                        }}
                      />
                      <Label className="text-sm cursor-pointer">
                        Set as primary warehouse
                      </Label>
                    </div>
                  </div>
                </Card>
              ))}

              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setWarehouseAllocations([
                    ...warehouseAllocations,
                    {
                      warehouseId: '',
                      pallets: '',
                      sqft: '',
                      zoneAssignment: '',
                      isPrimary: false,
                    },
                  ]);
                }}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Another Warehouse
              </Button>
            </div>
          )}

          {/* Step 4: Contract */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="contractName">
                  Contract Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="contractName"
                  value={contractName}
                  onChange={(e) => setContractName(e.target.value)}
                  placeholder="Standard Service Agreement"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">
                    Start Date <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endDate">
                    End Date <span className="text-muted-foreground">(Optional)</span>
                  </Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={startDate || undefined}
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave blank for ongoing contract
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="billingCycle">Billing Cycle</Label>
                  <Select value={billingCycle} onValueChange={setBillingCycle}>
                    <SelectTrigger id="billingCycle">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="per_order">Per Order</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="paymentTerms">Payment Terms</Label>
                  <Input
                    id="paymentTerms"
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                    placeholder="Net 30"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Review */}
          {currentStep === 5 && (
            <div className="space-y-4">
              <h3 className="font-semibold">Review Information</h3>
              
              <div className="grid gap-4">
                {/* Organization */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Organization</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm">
                    <div><strong>Name:</strong> {name}</div>
                    <div><strong>Slug:</strong> {slug}</div>
                  </CardContent>
                </Card>

                {/* Contact */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Primary Contact</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm">
                    <div><strong>Name:</strong> {firstName} {lastName}</div>
                    {email && <div><strong>Email:</strong> {email}</div>}
                    {phone && <div><strong>Phone:</strong> {phone}</div>}
                    {contactTitle && <div><strong>Title:</strong> {contactTitle}</div>}
                  </CardContent>
                </Card>

                {/* Warehouse Allocations */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Warehouse Allocations</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {warehouseAllocations.filter(a => a.warehouseId).map((allocation, index) => {
                      const warehouse = warehouses.find((w: any) => w.id === allocation.warehouseId);
                      return (
                        <div key={index} className="text-sm border-l-2 border-primary pl-3">
                          <div className="font-medium">
                            {warehouse?.code} - {warehouse?.name}
                            {allocation.isPrimary && (
                              <Badge variant="outline" className="ml-2 text-xs">Primary</Badge>
                            )}
                          </div>
                          {allocation.pallets && <div className="text-muted-foreground">Space: {allocation.pallets} pallets</div>}
                          {allocation.sqft && <div className="text-muted-foreground">Square Feet: {allocation.sqft}</div>}
                          {allocation.zoneAssignment && <div className="text-muted-foreground">Zone: {allocation.zoneAssignment}</div>}
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>

                {/* Contract */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Contract</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm">
                    <div><strong>Name:</strong> {contractName}</div>
                    <div><strong>Start Date:</strong> {new Date(startDate).toLocaleDateString()}</div>
                    {endDate && (
                      <div><strong>End Date:</strong> {new Date(endDate).toLocaleDateString()}</div>
                    )}
                    {!endDate && (
                      <div className="text-muted-foreground">Ongoing contract (no end date)</div>
                    )}
                    <div><strong>Billing Cycle:</strong> {billingCycle}</div>
                    <div><strong>Payment Terms:</strong> {paymentTerms}</div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={currentStep === 1 ? () => navigate('/clients') : handlePrevious}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          {currentStep === 1 ? 'Cancel' : 'Previous'}
        </Button>

        {currentStep < 5 ? (
          <Button onClick={handleNext}>
            Next
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button 
            onClick={handleCreate}
            disabled={createClientMutation.isPending}
          >
            {createClientMutation.isPending && (
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            )}
            Create Client
          </Button>
        )}
      </div>
    </div>
  );
}
