import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Checkbox } from '../ui/checkbox';
import { Badge } from '../ui/badge';
import { AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { RateCard, RateCardFormProps } from './types';

export function RateCardForm({ customerId, rateCard, isOpen, onClose }: RateCardFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEdit = !!rateCard;
  const isCreatingAdjustment = !isEdit && rateCard !== null && rateCard !== undefined && (rateCard as RateCard).rateCardType !== 'adjustment'; // rateCard passed but not an adjustment = creating adjustment for this parent

  // Fetch contracts for customer
  const { data: customerData } = useQuery({
    queryKey: ['client', customerId],
    queryFn: async () => {
      const response: any = await api.get(`/api/clients/${customerId}`);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/26b89348-0298-4d8a-845e-c1915c47fc05',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'RateCardForm.tsx:31',message:'RateCardForm client query - extracting .client',data:{customerId,hasClient:!!response.client,responseKeys:Object.keys(response)},timestamp:Date.now(),sessionId:'debug-session',runId:'run4',hypothesisId:'FIX2'})}).catch(()=>{});
      // #endregion
      return response.client; // Extract client to match ClientDetailPage structure
    },
    enabled: isOpen,
  });

  const contracts = customerData?.contracts || [];

  // Initialize form based on context
  useEffect(() => {
    if (isOpen) {
      if (isCreatingAdjustment && rateCard) {
        // Creating adjustment for parent
        const today = new Date().toISOString().split('T')[0];
        setEffectiveDate(today);
        setEffectiveDateDisplay(formatDateForInput(today));
        setExpiresDate(undefined);
        setExpiresDateDisplay('');

        // Pre-select contracts from parent
        const parentContracts = (rateCard as RateCard).contractLinks?.map((link: any) => link.contract.id) || [];
        setSelectedContracts(parentContracts);

        // Leave other fields empty for partial adjustments
        setName('');
        setMinimumMonthlyCharge('');
        setNotes('');
      } else if (isEdit && rateCard) {
        // Editing existing rate card - populate all fields
        const effectiveDateValue = new Date(rateCard.effectiveDate).toISOString().split('T')[0];
        setEffectiveDate(effectiveDateValue);
        setEffectiveDateDisplay(formatDateForInput(effectiveDateValue));
        const expiresDateValue = rateCard.expiresDate ? new Date(rateCard.expiresDate).toISOString().split('T')[0] : undefined;
        setExpiresDate(expiresDateValue);
        setExpiresDateDisplay(expiresDateValue ? formatDateForInput(expiresDateValue) : '');
        setName(rateCard.name || '');
        setSelectedContracts(rateCard.contractLinks?.map((link: any) => link.contract.id) || []);
        setMinimumMonthlyCharge(rateCard.minimumMonthlyCharge?.toString() || '');
        setNotes(rateCard.notes || '');
        setBillingCycles({
          shipping: rateCard.billingCycles?.shipping,
          receiving: rateCard.billingCycles?.receiving,
          storage: rateCard.billingCycles?.storage,
          fulfillment: rateCard.billingCycles?.fulfillment,
          vas: rateCard.billingCycles?.vas,
        });

        // Populate rates
        const rateData = rateCard.rates || {};
        setRates({
          receiving: {
            standardPallet: rateData.receiving?.standardPallet?.toString() || '',
            oversizePallet: rateData.receiving?.oversizePallet?.toString() || '',
            containerDevanning20ft: rateData.receiving?.containerDevanning20ft?.toString() || '',
            containerDevanning40ft: rateData.receiving?.containerDevanning40ft?.toString() || '',
            perItem: rateData.receiving?.perItem?.toString() || '',
            perHour: rateData.receiving?.perHour?.toString() || '',
          },
          storage: {
            palletMonthly: rateData.storage?.palletMonthly?.toString() || '',
            palletDaily: rateData.storage?.palletDaily?.toString() || '',
            cubicFootMonthly: rateData.storage?.cubicFootMonthly?.toString() || '',
            longTermPenaltyMonthly: rateData.storage?.longTermPenaltyMonthly?.toString() || '',
          },
          fulfillment: {
            baseOrder: rateData.fulfillment?.baseOrder?.toString() || '',
            additionalItem: rateData.fulfillment?.additionalItem?.toString() || '',
            b2bPallet: rateData.fulfillment?.b2bPallet?.toString() || '',
            pickPerLine: rateData.fulfillment?.pickPerLine?.toString() || '',
          },
          shipping: {
            markupPercent: rateData.shipping?.markupPercent?.toString() || '',
            labelFee: rateData.shipping?.labelFee?.toString() || '',
          },
          vas: rateData.vas || {},
        });
      } else {
        // Creating new standard rate card - reset to defaults
        const today = new Date().toISOString().split('T')[0];
        setEffectiveDate(today);
        setEffectiveDateDisplay(formatDateForInput(today));
        setExpiresDate(undefined);
        setExpiresDateDisplay('');
        setName('');
        setSelectedContracts([]);
        setMinimumMonthlyCharge('');
        setNotes('');
        setBillingCycles({});
        setRates({
          receiving: { standardPallet: '', oversizePallet: '', containerDevanning20ft: '', containerDevanning40ft: '', perItem: '', perHour: '' },
          storage: { palletMonthly: '', palletDaily: '', cubicFootMonthly: '', longTermPenaltyMonthly: '' },
          fulfillment: { baseOrder: '', additionalItem: '', b2bPallet: '', pickPerLine: '' },
          shipping: { markupPercent: '', labelFee: '' },
          vas: {},
        });
      }
    }
  }, [isOpen, isEdit, isCreatingAdjustment, rateCard]);

  // Form state
  const [effectiveDate, setEffectiveDate] = useState<string | undefined>(undefined);
  const [effectiveDateDisplay, setEffectiveDateDisplay] = useState('');
  const [expiresDate, setExpiresDate] = useState<string | undefined>(undefined);
  const [expiresDateDisplay, setExpiresDateDisplay] = useState('');
  const [name, setName] = useState('');
  const [selectedContracts, setSelectedContracts] = useState<string[]>([]);
  const [minimumMonthlyCharge, setMinimumMonthlyCharge] = useState('');
  const [notes, setNotes] = useState('');

  // Format date for display in input (YYYY-MM-DD to MM/DD/YYYY)
  const formatDateForInput = (dateString: string): string => {
    if (!dateString) return '';
    const parts = dateString.split('-');
    if (parts.length !== 3) return '';
    const year = parts[0];
    const month = parts[1];
    const day = parts[2];
    return `${month}/${day}/${year}`;
  };

  // Parse input date string to YYYY-MM-DD format
  const parseInputDate = (inputString: string): string | null => {
    if (!inputString) return null;
    const parts = inputString.split('/');
    if (parts.length !== 3) return null;
    const month = parts[0].padStart(2, '0');
    const day = parts[1].padStart(2, '0');
    const year = parts[2];
    return `${year}-${month}-${day}`;
  };

  // Billing cycle state - no defaults, explicitly set values only
  const [billingCycles, setBillingCycles] = useState<{
    shipping?: 'immediate' | 'weekly' | 'monthly';
    receiving?: 'weekly' | 'monthly';
    storage?: 'weekly' | 'monthly';
    fulfillment?: 'weekly' | 'monthly';
    vas?: 'weekly' | 'monthly';
  }>({});

  // Rate state
  const [rates, setRates] = useState({
    receiving: {
      standardPallet: '',
      oversizePallet: '',
      containerDevanning20ft: '',
      containerDevanning40ft: '',
      perItem: '',
      perHour: '',
    },
    storage: {
      palletMonthly: '',
      palletDaily: '',
      cubicFootMonthly: '',
      longTermPenaltyMonthly: '',
    },
    fulfillment: {
      baseOrder: '',
      additionalItem: '',
      b2bPallet: '',
      pickPerLine: '',
    },
    shipping: {
      markupPercent: '',
      labelFee: '',
    },
    vas: {},
  });

  // Initialize form with existing data
  useEffect(() => {
    if (rateCard) {
      setEffectiveDate(new Date().toISOString().split('T')[0]); // New effective date for version
      setSelectedContracts(rateCard.contractLinks?.map((link: any) => link.contract.id) || []);
      setMinimumMonthlyCharge(rateCard.minimumMonthlyCharge?.toString() || '');
      setNotes(rateCard.notes || '');
      setBillingCycles(rateCard.billingCycles || billingCycles);

      // Parse rates
      const existingRates = rateCard.rates || {};
      setRates({
        receiving: {
          standardPallet: existingRates.receiving?.standardPallet?.toString() || '',
          oversizePallet: existingRates.receiving?.oversizePallet?.toString() || '',
          containerDevanning20ft: existingRates.receiving?.containerDevanning20ft?.toString() || '',
          containerDevanning40ft: existingRates.receiving?.containerDevanning40ft?.toString() || '',
          perItem: existingRates.receiving?.perItem?.toString() || '',
          perHour: existingRates.receiving?.perHour?.toString() || '',
        },
        storage: {
          palletMonthly: existingRates.storage?.palletMonthly?.toString() || '',
          palletDaily: existingRates.storage?.palletDaily?.toString() || '',
          cubicFootMonthly: existingRates.storage?.cubicFootMonthly?.toString() || '',
          longTermPenaltyMonthly: existingRates.storage?.longTermPenaltyMonthly?.toString() || '',
        },
        fulfillment: {
          baseOrder: existingRates.fulfillment?.baseOrder?.toString() || '',
          additionalItem: existingRates.fulfillment?.additionalItem?.toString() || '',
          b2bPallet: existingRates.fulfillment?.b2bPallet?.toString() || '',
          pickPerLine: existingRates.fulfillment?.pickPerLine?.toString() || '',
        },
        shipping: {
          markupPercent: existingRates.shipping?.markupPercent?.toString() || '',
          labelFee: existingRates.shipping?.labelFee?.toString() || '',
        },
        vas: existingRates.vas || {},
      });
    } else {
      // Default to tomorrow for new rate cards
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setEffectiveDate(tomorrow.toISOString().split('T')[0]);
    }
  }, [rateCard]);

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response: any = await api.post(`/api/customers/${customerId}/rate-cards`, data);
      return response;
    },
    onSuccess: () => {
      // Invalidate queries to mark them stale, then close dialog
      // This allows React Query to naturally refetch when components need the data
      queryClient.invalidateQueries({ queryKey: ['rate-cards', customerId] });
      queryClient.invalidateQueries({ queryKey: ['rate-cards', customerId, 'active'] });
      queryClient.invalidateQueries({ queryKey: ['client', customerId] });
      
      toast({
        title: 'Rate Card Created',
        description: 'Rate Card v1 has been created successfully',
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: 'Error Creating Rate Card',
        description: error.response?.data?.error || error.message || 'Failed to create rate card',
        variant: 'destructive',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/26b89348-0298-4d8a-845e-c1915c47fc05',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'RateCardForm.tsx:156',message:'updateMutation.mutationFn START',data:{rateCardId:rateCard!.id,customerId,dataKeys:Object.keys(data)},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'H4'})}).catch(()=>{});
      // #endregion
      const response: any = await api.put(`/api/rate-cards/${rateCard!.id}`, data);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/26b89348-0298-4d8a-845e-c1915c47fc05',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'RateCardForm.tsx:157',message:'updateMutation.mutationFn RESPONSE',data:{responseKeys:response?Object.keys(response):null,hasData:!!response},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'H4'})}).catch(()=>{});
      // #endregion
      return response;
    },
    onSuccess: async (data: any) => {
      // #region agent log
      const cacheBeforeRefetch = queryClient.getQueryData(['client', customerId]);
      fetch('http://127.0.0.1:7242/ingest/26b89348-0298-4d8a-845e-c1915c47fc05',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'RateCardForm.tsx:159',message:'onSuccess START - cache before refetch',data:{customerId,responseVersion:data?.version,cacheExists:!!cacheBeforeRefetch,cacheKeys:cacheBeforeRefetch?Object.keys(cacheBeforeRefetch):null},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'H1,H6'})}).catch(()=>{});
      // #endregion
      
      // Invalidate queries to mark them stale, then close dialog
      // This allows React Query to naturally refetch when components need the data
      queryClient.invalidateQueries({ queryKey: ['rate-cards', customerId] });
      queryClient.invalidateQueries({ queryKey: ['rate-cards', customerId, 'active'] });
      queryClient.invalidateQueries({ queryKey: ['client', customerId] });
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/26b89348-0298-4d8a-845e-c1915c47fc05',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'RateCardForm.tsx:165',message:'AFTER invalidateQueries',data:{customerId},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'FIX'})}).catch(()=>{});
      // #endregion
      toast({
        title: 'New Version Created',
        description: `Rate Card v${data.version} is now active. Previous version has been expired.`,
      });
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/26b89348-0298-4d8a-845e-c1915c47fc05',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'RateCardForm.tsx:170',message:'BEFORE onClose',data:{customerId},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'H2,H6'})}).catch(()=>{});
      // #endregion
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: 'Error Creating Version',
        description: error.response?.data?.error || error.message || 'Failed to create new version',
        variant: 'destructive',
      });
    },
  });

  const createAdjustmentMutation = useMutation({
    mutationFn: async ({ parentId, payload }: { parentId: string; payload: any }) => {
      const response: any = await api.post(`/api/rate-cards/${parentId}/adjustments`, payload);
      return response;
    },
    onSuccess: (_data: any) => {
      // Invalidate queries to mark them stale
      queryClient.invalidateQueries({ queryKey: ['rate-cards', customerId] });
      queryClient.invalidateQueries({ queryKey: ['rate-cards', customerId, 'active'] });
      queryClient.invalidateQueries({ queryKey: ['client', customerId] });

      toast({
        title: 'Adjustment Created',
        description: 'Rate card adjustment has been created successfully',
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: 'Error Creating Adjustment',
        description: error.response?.data?.error || error.message || 'Failed to create adjustment',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedContracts.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'Please select at least one contract',
        variant: 'destructive',
      });
      return;
    }

    // Build rates object
    const ratesPayload: any = {};
    
    const receivingRates: any = {};
    if (rates.receiving.standardPallet) receivingRates.standardPallet = parseFloat(rates.receiving.standardPallet);
    if (rates.receiving.oversizePallet) receivingRates.oversizePallet = parseFloat(rates.receiving.oversizePallet);
    if (rates.receiving.containerDevanning20ft) receivingRates.containerDevanning20ft = parseFloat(rates.receiving.containerDevanning20ft);
    if (rates.receiving.containerDevanning40ft) receivingRates.containerDevanning40ft = parseFloat(rates.receiving.containerDevanning40ft);
    if (rates.receiving.perItem) receivingRates.perItem = parseFloat(rates.receiving.perItem);
    if (rates.receiving.perHour) receivingRates.perHour = parseFloat(rates.receiving.perHour);
    if (Object.keys(receivingRates).length > 0) ratesPayload.receiving = receivingRates;

    const storageRates: any = {};
    if (rates.storage.palletMonthly) storageRates.palletMonthly = parseFloat(rates.storage.palletMonthly);
    if (rates.storage.palletDaily) storageRates.palletDaily = parseFloat(rates.storage.palletDaily);
    if (rates.storage.cubicFootMonthly) storageRates.cubicFootMonthly = parseFloat(rates.storage.cubicFootMonthly);
    if (rates.storage.longTermPenaltyMonthly) storageRates.longTermPenaltyMonthly = parseFloat(rates.storage.longTermPenaltyMonthly);
    if (Object.keys(storageRates).length > 0) ratesPayload.storage = storageRates;

    const fulfillmentRates: any = {};
    if (rates.fulfillment.baseOrder) fulfillmentRates.baseOrder = parseFloat(rates.fulfillment.baseOrder);
    if (rates.fulfillment.additionalItem) fulfillmentRates.additionalItem = parseFloat(rates.fulfillment.additionalItem);
    if (rates.fulfillment.b2bPallet) fulfillmentRates.b2bPallet = parseFloat(rates.fulfillment.b2bPallet);
    if (rates.fulfillment.pickPerLine) fulfillmentRates.pickPerLine = parseFloat(rates.fulfillment.pickPerLine);
    if (Object.keys(fulfillmentRates).length > 0) ratesPayload.fulfillment = fulfillmentRates;

    const shippingRates: any = {};
    if (rates.shipping.markupPercent) shippingRates.markupPercent = parseFloat(rates.shipping.markupPercent);
    if (rates.shipping.labelFee) shippingRates.labelFee = parseFloat(rates.shipping.labelFee);
    if (Object.keys(shippingRates).length > 0) ratesPayload.shipping = shippingRates;

    if (!effectiveDate) {
      toast({
        title: 'Validation Error',
        description: 'Effective date is required',
        variant: 'destructive',
      });
      return;
    }

    const payload = {
      effectiveDate: new Date(effectiveDate).toISOString(),
      expiresDate: expiresDate ? new Date(expiresDate).toISOString() : undefined,
      name: name || undefined,
      rates: ratesPayload,
      billingCycles,
      minimumMonthlyCharge: minimumMonthlyCharge ? parseFloat(minimumMonthlyCharge) : undefined,
      notes: notes || undefined,
      contractIds: selectedContracts,
    };

    if (isCreatingAdjustment && rateCard) {
      // Create adjustment for parent rate card
      createAdjustmentMutation.mutate({ parentId: (rateCard as RateCard).id, payload });
    } else if (isEdit && rateCard) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  };

  const toggleContract = (contractId: string) => {
    setSelectedContracts((prev) =>
      prev.includes(contractId)
        ? prev.filter((id) => id !== contractId)
        : [...prev, contractId]
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isCreatingAdjustment && rateCard
              ? `Create Adjustment for ${(rateCard as RateCard).name}`
              : isEdit && rateCard
                ? `Create New Version (v${((rateCard as RateCard).version || 0) + 1})`
                : 'Create New Rate Card (v1)'}
          </DialogTitle>
          <DialogDescription asChild>
            {isCreatingAdjustment && rateCard ? (
              <span className="block space-y-1">
                <span className="block">Creating an adjustment for: <strong>{(rateCard as RateCard).name}</strong></span>
                <span className="block text-xs text-muted-foreground">
                  Adjustments allow you to correct specific rates for specific time periods.
                  Only specify the rates you want to change - others will use the parent card.
                </span>
              </span>
            ) : isEdit ? (
              <span className="block space-y-1">
                <span className="block">Creating a new version of: <strong>{rateCard?.name}</strong></span>
                <span className="block text-xs text-muted-foreground">
                  The previous version will be expired on the new effective date.
                  All data will be copied forward unless you change it.
                </span>
              </span>
            ) : (
              <span>Create a brand new rate card with pricing and billing cycles for this customer.</span>
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name and Dates */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Rate Card Name"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Optional name for this rate card
              </p>
            </div>
            <div>
              <Label htmlFor="effectiveDate">Effective Date *</Label>
              <Input
                id="effectiveDate"
                type="text"
                placeholder="MM/DD/YYYY"
                value={effectiveDateDisplay}
                onChange={(e) => {
                  const value = e.target.value;
                  setEffectiveDateDisplay(value);

                  if (value === '') {
                    setEffectiveDate(undefined);
                  } else {
                    const parsedDate = parseInputDate(value);
                    if (parsedDate) {
                      setEffectiveDate(parsedDate);
                    }
                  }
                }}
                onBlur={() => {
                  if (effectiveDate) {
                    setEffectiveDateDisplay(formatDateForInput(effectiveDate));
                  } else if (effectiveDateDisplay === '') {
                    setEffectiveDate(undefined);
                  }
                }}
                onFocus={() => {
                  if (effectiveDate && !effectiveDateDisplay) {
                    setEffectiveDateDisplay(formatDateForInput(effectiveDate));
                  }
                }}
                autoComplete="off"
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                When this rate card becomes active
              </p>
            </div>
            <div>
              <Label htmlFor="expiresDate">Expiration Date</Label>
              <Input
                id="expiresDate"
                type="text"
                placeholder="MM/DD/YYYY"
                value={expiresDateDisplay}
                onChange={(e) => {
                  const value = e.target.value;
                  setExpiresDateDisplay(value);

                  if (value === '') {
                    setExpiresDate(undefined);
                  } else {
                    const parsedDate = parseInputDate(value);
                    if (parsedDate) {
                      setExpiresDate(parsedDate);
                    }
                  }
                }}
                onBlur={() => {
                  // Format the display value when user leaves the field
                  if (expiresDate) {
                    setExpiresDateDisplay(formatDateForInput(expiresDate));
                  } else if (expiresDateDisplay && parseInputDate(expiresDateDisplay)) {
                    // Valid date entered, keep it formatted
                    const parsed = parseInputDate(expiresDateDisplay);
                    if (parsed) {
                      setExpiresDate(parsed);
                      setExpiresDateDisplay(formatDateForInput(parsed));
                    }
                  } else if (expiresDateDisplay === '') {
                    setExpiresDate(undefined);
                  }
                }}
                onFocus={() => {
                  // Allow editing the formatted value
                  if (expiresDate && !expiresDateDisplay) {
                    setExpiresDateDisplay(formatDateForInput(expiresDate));
                  }
                }}
                autoComplete="off"
              />
              <p className="text-xs text-muted-foreground mt-1">
                When this rate card expires (optional)
              </p>
            </div>
          </div>

          {/* Contract Selection */}
          <div>
            <Label>Linked Contracts *</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Select one or more contracts that this rate card applies to
            </p>
            {contracts.length > 0 ? (
              <div className="space-y-2 border rounded-md p-4">
                {contracts.map((contract: any) => (
                  <div key={contract.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`contract-${contract.id}`}
                      checked={selectedContracts.includes(contract.id)}
                      onCheckedChange={() => toggleContract(contract.id)}
                    />
                    <label
                      htmlFor={`contract-${contract.id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1 cursor-pointer"
                    >
                      {contract.name}
                      {contract.contractNumber && ` (#${contract.contractNumber})`}
                      <Badge
                        variant={contract.status === 'active' ? 'default' : 'secondary'}
                        className="ml-2"
                      >
                        {contract.status}
                      </Badge>
                    </label>
                  </div>
                ))}
              </div>
            ) : (
              <div className="border rounded-md p-4 text-center text-sm text-muted-foreground">
                <AlertCircle className="mx-auto h-8 w-8 mb-2" />
                No contracts found. Please create a contract first.
              </div>
            )}
          </div>


          {/* Grouped Services by Billing Cycle */}
          <div className="space-y-6">
            {/* Receiving */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Label className="text-base font-semibold">Receiving:</Label>
                <div className="flex items-center gap-2">
                  <Label htmlFor="cycle-receiving" className="text-sm">Billing Cycle</Label>
                  <Select
                    value={billingCycles.receiving || ''}
                    onValueChange={(value: any) =>
                      setBillingCycles({ ...billingCycles, receiving: value || undefined })
                    }
                  >
                    <SelectTrigger id="cycle-receiving" className="w-32">
                      <SelectValue placeholder="Not Set" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pl-4 border-l-2 border-muted">
                <div>
                  <Label htmlFor="rate-receiving-standardPallet" className="text-xs">Standard Pallet ($)</Label>
                  <Input
                    id="rate-receiving-standardPallet"
                    type="number"
                    step="0.01"
                    value={rates.receiving.standardPallet}
                    onChange={(e) =>
                      setRates({
                        ...rates,
                        receiving: { ...rates.receiving, standardPallet: e.target.value },
                      })
                    }
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="rate-receiving-oversizePallet" className="text-xs">Oversize Pallet ($)</Label>
                  <Input
                    id="rate-receiving-oversizePallet"
                    type="number"
                    step="0.01"
                    value={rates.receiving.oversizePallet}
                    onChange={(e) =>
                      setRates({
                        ...rates,
                        receiving: { ...rates.receiving, oversizePallet: e.target.value },
                      })
                    }
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="rate-receiving-container20" className="text-xs">Container Devanning (20ft) ($)</Label>
                  <Input
                    id="rate-receiving-container20"
                    type="number"
                    step="0.01"
                    value={rates.receiving.containerDevanning20ft}
                    onChange={(e) =>
                      setRates({
                        ...rates,
                        receiving: { ...rates.receiving, containerDevanning20ft: e.target.value },
                      })
                    }
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="rate-receiving-container40" className="text-xs">Container Devanning (40ft) ($)</Label>
                  <Input
                    id="rate-receiving-container40"
                    type="number"
                    step="0.01"
                    value={rates.receiving.containerDevanning40ft}
                    onChange={(e) =>
                      setRates({
                        ...rates,
                        receiving: { ...rates.receiving, containerDevanning40ft: e.target.value },
                      })
                    }
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="rate-receiving-perItem" className="text-xs">Per Item ($)</Label>
                  <Input
                    id="rate-receiving-perItem"
                    type="number"
                    step="0.01"
                    value={rates.receiving.perItem}
                    onChange={(e) =>
                      setRates({
                        ...rates,
                        receiving: { ...rates.receiving, perItem: e.target.value },
                      })
                    }
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="rate-receiving-perHour" className="text-xs">Per Hour ($)</Label>
                  <Input
                    id="rate-receiving-perHour"
                    type="number"
                    step="0.01"
                    value={rates.receiving.perHour}
                    onChange={(e) =>
                      setRates({
                        ...rates,
                        receiving: { ...rates.receiving, perHour: e.target.value },
                      })
                    }
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            {/* Storage */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Label className="text-base font-semibold">Storage:</Label>
                <div className="flex items-center gap-2">
                  <Label htmlFor="cycle-storage" className="text-sm">Billing Cycle</Label>
                  <Select
                    value={billingCycles.storage || ''}
                    onValueChange={(value: any) =>
                      setBillingCycles({ ...billingCycles, storage: value || undefined })
                    }
                  >
                    <SelectTrigger id="cycle-storage" className="w-32">
                      <SelectValue placeholder="Not Set" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pl-4 border-l-2 border-muted">
                <div>
                  <Label htmlFor="rate-storage-palletMonthly" className="text-xs">Pallet Monthly ($)</Label>
                  <Input
                    id="rate-storage-palletMonthly"
                    type="number"
                    step="0.01"
                    value={rates.storage.palletMonthly}
                    onChange={(e) =>
                      setRates({
                        ...rates,
                        storage: { ...rates.storage, palletMonthly: e.target.value },
                      })
                    }
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="rate-storage-palletDaily" className="text-xs">Pallet Daily ($)</Label>
                  <Input
                    id="rate-storage-palletDaily"
                    type="number"
                    step="0.01"
                    value={rates.storage.palletDaily}
                    onChange={(e) =>
                      setRates({
                        ...rates,
                        storage: { ...rates.storage, palletDaily: e.target.value },
                      })
                    }
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="rate-storage-cubicFootMonthly" className="text-xs">Cubic Foot Monthly ($)</Label>
                  <Input
                    id="rate-storage-cubicFootMonthly"
                    type="number"
                    step="0.01"
                    value={rates.storage.cubicFootMonthly}
                    onChange={(e) =>
                      setRates({
                        ...rates,
                        storage: { ...rates.storage, cubicFootMonthly: e.target.value },
                      })
                    }
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="rate-storage-longTermPenalty" className="text-xs">Long-Term Penalty Monthly ($)</Label>
                  <Input
                    id="rate-storage-longTermPenalty"
                    type="number"
                    step="0.01"
                    value={rates.storage.longTermPenaltyMonthly}
                    onChange={(e) =>
                      setRates({
                        ...rates,
                        storage: { ...rates.storage, longTermPenaltyMonthly: e.target.value },
                      })
                    }
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            {/* Fulfillment */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Label className="text-base font-semibold">Fulfillment:</Label>
                <div className="flex items-center gap-2">
                  <Label htmlFor="cycle-fulfillment" className="text-sm">Billing Cycle</Label>
                  <Select
                    value={billingCycles.fulfillment || ''}
                    onValueChange={(value: any) =>
                      setBillingCycles({ ...billingCycles, fulfillment: value || undefined })
                    }
                  >
                    <SelectTrigger id="cycle-fulfillment" className="w-32">
                      <SelectValue placeholder="Not Set" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pl-4 border-l-2 border-muted">
                <div>
                  <Label htmlFor="rate-fulfillment-baseOrder" className="text-xs">Base Order ($)</Label>
                  <Input
                    id="rate-fulfillment-baseOrder"
                    type="number"
                    step="0.01"
                    value={rates.fulfillment.baseOrder}
                    onChange={(e) =>
                      setRates({
                        ...rates,
                        fulfillment: { ...rates.fulfillment, baseOrder: e.target.value },
                      })
                    }
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="rate-fulfillment-additionalItem" className="text-xs">Additional Item ($)</Label>
                  <Input
                    id="rate-fulfillment-additionalItem"
                    type="number"
                    step="0.01"
                    value={rates.fulfillment.additionalItem}
                    onChange={(e) =>
                      setRates({
                        ...rates,
                        fulfillment: { ...rates.fulfillment, additionalItem: e.target.value },
                      })
                    }
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="rate-fulfillment-b2bPallet" className="text-xs">B2B Pallet ($)</Label>
                  <Input
                    id="rate-fulfillment-b2bPallet"
                    type="number"
                    step="0.01"
                    value={rates.fulfillment.b2bPallet}
                    onChange={(e) =>
                      setRates({
                        ...rates,
                        fulfillment: { ...rates.fulfillment, b2bPallet: e.target.value },
                      })
                    }
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="rate-fulfillment-pickPerLine" className="text-xs">Pick Per Line ($)</Label>
                  <Input
                    id="rate-fulfillment-pickPerLine"
                    type="number"
                    step="0.01"
                    value={rates.fulfillment.pickPerLine}
                    onChange={(e) =>
                      setRates({
                        ...rates,
                        fulfillment: { ...rates.fulfillment, pickPerLine: e.target.value },
                      })
                    }
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            {/* Shipping */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Label className="text-base font-semibold">Shipping:</Label>
                <div className="flex items-center gap-2">
                  <Label htmlFor="cycle-shipping" className="text-sm">Billing Cycle</Label>
                  <Select
                    value={billingCycles.shipping || ''}
                    onValueChange={(value: any) =>
                      setBillingCycles({ ...billingCycles, shipping: value || undefined })
                    }
                  >
                    <SelectTrigger id="cycle-shipping" className="w-32">
                      <SelectValue placeholder="Not Set" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="immediate">Immediate</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pl-4 border-l-2 border-muted">
                <div>
                  <Label htmlFor="rate-shipping-markupPercent" className="text-xs">Markup Percent (%)</Label>
                  <Input
                    id="rate-shipping-markupPercent"
                    type="number"
                    step="0.01"
                    value={rates.shipping.markupPercent}
                    onChange={(e) =>
                      setRates({
                        ...rates,
                        shipping: { ...rates.shipping, markupPercent: e.target.value },
                      })
                    }
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="rate-shipping-labelFee" className="text-xs">Label Fee ($)</Label>
                  <Input
                    id="rate-shipping-labelFee"
                    type="number"
                    step="0.01"
                    value={rates.shipping.labelFee}
                    onChange={(e) =>
                      setRates({
                        ...rates,
                        shipping: { ...rates.shipping, labelFee: e.target.value },
                      })
                    }
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Minimum Monthly Charge */}
          <div>
            <Label htmlFor="minimumMonthlyCharge">Minimum Monthly Charge ($)</Label>
            <Input
              id="minimumMonthlyCharge"
              type="number"
              step="0.01"
              value={minimumMonthlyCharge}
              onChange={(e) => setMinimumMonthlyCharge(e.target.value)}
              placeholder="0.00"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Optional minimum charge applied monthly
            </p>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes about this rate card..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending
                ? 'Saving...'
                : isEdit
                ? `Create v${(rateCard?.version || 0) + 1}`
                : 'Create Rate Card v1'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

