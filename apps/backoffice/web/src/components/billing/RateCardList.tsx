import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Plus, AlertCircle } from 'lucide-react';
import { RateCardForm } from './RateCardForm';

interface RateCard {
  id: string;
  name: string;
  version?: number;
  effectiveDate: string;
  expiresDate?: string | null;
  isActive: boolean;
  rates: any;
  billingCycles?: any;
  minimumMonthlyCharge?: number | null;
  notes?: string | null;
  rateCardType?: 'standard' | 'adjustment';
  parentRateCardId?: string;
  supersedesId?: string;
  parent?: {
    id: string;
    name: string;
    version?: number;
  };
  adjustments?: RateCard[];
  contractLinks?: Array<{
    contract: {
      id: string;
      name: string;
      contractNumber?: string;
    };
    linkType?: string;
  }>;
  customer?: {
    id: string;
    name: string;
  };
  // Consolidated display properties
  previousVersionsCount?: number;
  allVersions?: RateCard[];
}

interface RateCardListProps {
  customerId: string;
  canEdit?: boolean;
}

export function RateCardList({ customerId, canEdit = false }: RateCardListProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedRateCard, setSelectedRateCard] = useState<RateCard | null>(null);

  // Fetch all rate cards for customer
  const { data: rateCards = [], isLoading } = useQuery<RateCard[]>({
    queryKey: ['rate-cards', customerId],
    queryFn: async () => {
      const response: any = await api.get(`/api/customers/${customerId}/rate-cards`);
      return response || [];
    },
  });

  // Fetch active rate card
  const { data: activeRateCard = null } = useQuery<RateCard | null>({
    queryKey: ['rate-cards', customerId, 'active'],
    queryFn: async () => {
      const response: any = await api.get(`/api/customers/${customerId}/rate-cards/active`);
      return response || null;
    },
  });

  const handleEdit = (rateCard: RateCard) => {
    setSelectedRateCard(rateCard);
    setIsFormOpen(true);
  };

  const handleCreateNew = () => {
    setSelectedRateCard(null);
    setIsFormOpen(true);
  };

  const handleCreateAdjustment = (parentCard: RateCard) => {
    setSelectedRateCard(parentCard);
    setIsFormOpen(true);
  };

  // Group rate cards by type
  const standardCards = rateCards.filter(card => card.rateCardType !== 'adjustment');
  const adjustmentCards = rateCards.filter(card => card.rateCardType === 'adjustment');

  // Group adjustments by parent
  const adjustmentsByParent = adjustmentCards.reduce((acc, adjustment) => {
    const parentId = adjustment.parentRateCardId;
    if (parentId) {
      if (!acc[parentId]) acc[parentId] = [];
      acc[parentId].push(adjustment);
    }
    return acc;
  }, {} as Record<string, RateCard[]>);

  // Consolidate rate cards: show only latest version of each logical rate card
  const consolidatedRateCards = standardCards.reduce((acc, card) => {
    // Find the root card (the first version in this chain)
    let rootId = card.id;
    let currentCard = card;

    // Trace back to find the root (card with no supersedesId)
    while (currentCard.supersedesId) {
      const parentCard = standardCards.find(c => c.id === currentCard.supersedesId);
      if (parentCard) {
        rootId = parentCard.id;
        currentCard = parentCard;
      } else {
        break;
      }
    }

    // Initialize or update the consolidated card for this root
    if (!acc[rootId]) {
      acc[rootId] = {
        ...card,
        previousVersionsCount: 0,
        allVersions: []
      };
    }

    // Add this card to the versions
    acc[rootId].allVersions.push(card);

    // If this card has a higher version, update the consolidated card
    const existingCard = acc[rootId];
    if (card.version && (!existingCard.version || card.version > existingCard.version)) {
      acc[rootId] = {
        ...existingCard,
        ...card,
        allVersions: existingCard.allVersions
      };
    }

    return acc;
  }, {} as Record<string, RateCard & { previousVersionsCount: number; allVersions: RateCard[] }>);

  // Calculate previous versions count for each consolidated card
  Object.values(consolidatedRateCards).forEach(consolidatedCard => {
    consolidatedCard.previousVersionsCount = consolidatedCard.allVersions.length - 1;
  });

  // Convert to array for rendering
  const displayCards = Object.values(consolidatedRateCards);

  const handleFormClose = () => {
    setIsFormOpen(false);
    setSelectedRateCard(null);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Loading rate cards...</p>
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (amount?: number | null) => {
    if (amount == null) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getGroupedServices = (rateCard: RateCard) => {
    const billingCycles = rateCard.billingCycles || {};
    const rates = rateCard.rates || {};

    return {
      shipping: {
        cycle: billingCycles.shipping,
        rates: {
          markupPercent: rates.shipping?.markupPercent,
          labelFee: rates.shipping?.labelFee
        }
      },
      fulfillment: {
        cycle: billingCycles.fulfillment,
        rates: {
          baseOrder: rates.fulfillment?.baseOrder,
          additionalItem: rates.fulfillment?.additionalItem,
          b2bPallet: rates.fulfillment?.b2bPallet,
          pickPerLine: rates.fulfillment?.pickPerLine
        }
      },
      receiving: {
        cycle: billingCycles.receiving,
        rates: {
          standardPallet: rates.receiving?.standardPallet,
          oversizePallet: rates.receiving?.oversizePallet,
          containerDevanning20ft: rates.receiving?.containerDevanning20ft,
          containerDevanning40ft: rates.receiving?.containerDevanning40ft,
          perItem: rates.receiving?.perItem,
          perHour: rates.receiving?.perHour
        }
      },
      storage: {
        cycle: billingCycles.storage,
        rates: {
          palletMonthly: rates.storage?.palletMonthly,
          palletDaily: rates.storage?.palletDaily,
          cubicFootMonthly: rates.storage?.cubicFootMonthly,
          longTermPenaltyMonthly: rates.storage?.longTermPenaltyMonthly
        }
      }
    };
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold">Rate Cards</h3>
            <p className="text-sm text-muted-foreground">
              Manage pricing and billing cycles for this customer
            </p>
          </div>
          {canEdit && (
            <Button onClick={handleCreateNew}>
              <Plus className="h-4 w-4 mr-2" />
              New Rate Card
            </Button>
          )}
        </div>

        {/* Consolidated Rate Cards with Adjustments */}
        <div className="space-y-6">
          {displayCards.map((rateCard) => {
            const isActive = activeRateCard?.id === rateCard.id;
            const cardAdjustments = adjustmentsByParent[rateCard.id] || [];

            return (
              <Card key={rateCard.id} className={isActive ? "border-primary ring-1 ring-primary/20" : ""}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">
                          {rateCard.name}
                          {rateCard.version && rateCard.version > 1 && (
                            <span className="text-sm font-normal text-muted-foreground ml-2">
                              (v{rateCard.version})
                            </span>
                          )}
                        </CardTitle>
                        <Badge variant="secondary">
                          Standard
                        </Badge>
                        {isActive && (
                          <Badge variant="default" className="bg-green-600">
                            Active
                          </Badge>
                        )}
                        {rateCard.previousVersionsCount > 0 && (
                          <Badge variant="outline" className="text-xs">
                            {rateCard.previousVersionsCount} previous version{rateCard.previousVersionsCount > 1 ? 's' : ''}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-sm">
                        <span className="text-muted-foreground">
                          Effective: <span className="font-medium text-foreground">{formatDate(rateCard.effectiveDate)}</span>
                        </span>
                        <span className="text-muted-foreground">
                          Expires: <span className={`font-medium ${(rateCard.expiresDate && rateCard.expiresDate !== null) ? (isActive ? 'text-foreground' : 'text-red-600') : 'text-green-600'}`}>
                            {(rateCard.expiresDate && rateCard.expiresDate !== null) ? formatDate(rateCard.expiresDate) : 'Open'}
                          </span>
                        </span>
                      </div>
                    </div>
                    {canEdit && (
                      <div className="flex gap-2">
                        {rateCard.rateCardType !== 'adjustment' && (
                          <Button variant="outline" size="sm" onClick={() => handleCreateAdjustment(rateCard)}>
                            Create Adjustment
                          </Button>
                        )}
                        <Button variant="outline" size="sm" onClick={() => handleEdit(rateCard)}>
                          Edit
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Grouped Services by Billing Cycle */}
                  <div className="space-y-4">
                    {Object.entries(getGroupedServices(rateCard)).map(([serviceType, serviceData]) => {
                      const hasRates = Object.values(serviceData.rates).some(rate => rate !== undefined && rate !== null);

                      if (!hasRates) return null;

                      return (
                        <div key={serviceType} className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium capitalize text-sm">{serviceType}:</span>
                            <Badge variant="outline" className="text-xs">
                              {serviceData.cycle ? `${serviceData.cycle} Billing` : 'Not Set'}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm pl-4">
                            {Object.entries(serviceData.rates).map(([rateName, value]) =>
                              value !== undefined && value !== null ? (
                                <div key={rateName} className="flex justify-between">
                                  <span className="text-muted-foreground capitalize">
                                    {rateName.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:
                                  </span>
                                  <span className="font-medium">
                                    {rateName.includes('Percent') ? `${value}%` : formatCurrency(value)}
                                  </span>
                                </div>
                              ) : null
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Minimum Monthly Charge */}
                  {rateCard.minimumMonthlyCharge && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Monthly Minimum:</span>{' '}
                      <span className="font-medium">{formatCurrency(rateCard.minimumMonthlyCharge)}</span>
                    </div>
                  )}

                  {/* Linked Contracts */}
                  {rateCard.contractLinks && rateCard.contractLinks.length > 0 && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Contracts:</span>{' '}
                      <span className="font-medium">
                        {rateCard.contractLinks.length} Contract{rateCard.contractLinks.length > 1 ? 's' : ''}: {' '}
                        {(() => {
                          const primary = rateCard.contractLinks.find(link => link.linkType === 'primary');
                          const addendums = rateCard.contractLinks.filter(link => link.linkType === 'addendum');

                          const parts = [];
                          if (primary) {
                            parts.push(primary.contract.contractNumber || primary.contract.name);
                          }
                          addendums.forEach((_, index) => {
                            parts.push(`Addendum ${index + 1}`);
                          });

                          return parts.join(', ');
                        })()}
                      </span>
                    </div>
                  )}

                  {rateCard.notes && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Notes:</span>{' '}
                      <span>{rateCard.notes}</span>
                    </div>
                  )}
                </CardContent>

                {/* Adjustments for this rate card */}
                {cardAdjustments.length > 0 && (
                  <CardContent className="border-t bg-muted/20">
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-muted-foreground">
                        Adjustments ({cardAdjustments.length})
                      </h4>
                      <div className="space-y-2">
                        {cardAdjustments.map((adjustment) => (
                          <div key={adjustment.id} className="flex items-center justify-between p-3 bg-background rounded border">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">{adjustment.name}</span>
                                <Badge variant="outline">Adjustment</Badge>
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {formatDate(adjustment.effectiveDate)}
                                {adjustment.expiresDate && ` - ${formatDate(adjustment.expiresDate)}`}
                              </div>
                            </div>
                            {canEdit && (
                              <Button variant="ghost" size="sm" onClick={() => handleEdit(adjustment)}>
                                Edit
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>


        {/* No Rate Cards */}
        {(!rateCards || rateCards.length === 0) && (
          <Card>
            <CardContent className="py-12 text-center">
              <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No rate card configured</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Create a rate card to define pricing for this customer
              </p>
              {canEdit && (
                <Button className="mt-4" onClick={handleCreateNew}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Rate Card
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Rate Card Form Dialog */}
      {isFormOpen && (
        <RateCardForm
          customerId={customerId}
          rateCard={selectedRateCard}
          isOpen={isFormOpen}
          onClose={handleFormClose}
        />
      )}
    </>
  );
}

