/**
 * @fileoverview Rate Card Viewer Component
 *
 * Read-only component for displaying rate card information in a clean, structured format.
 * Shows all rate card details including rates, billing cycles, contracts, and adjustments.
 * Provides action buttons for editing and creating adjustments when editing is enabled.
 *
 * @purpose Display rate card data in read-only mode
 * @scope Single rate card presentation with related adjustments
 * @dependencies Uses shared types from ./types, UI components from ../ui
 */

import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import type { RateCard, RateCardViewerProps } from './types';

export function RateCardViewer({
  rateCard,
  isActive = false,
  canEdit = false,
  adjustments = [],
  onEdit,
  onCreateAdjustment
}: RateCardViewerProps) {
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
    <Card className={isActive ? "border-primary ring-1 ring-primary/20" : ""}>
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
                {rateCard.rateCardType === 'adjustment' ? 'Adjustment' : 'Standard'}
              </Badge>
              {isActive && (
                <Badge variant="default" className="bg-green-600">
                  Active
                </Badge>
              )}
              {rateCard.previousVersionsCount && rateCard.previousVersionsCount > 0 && (
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
              {rateCard.rateCardType !== 'adjustment' && onCreateAdjustment && (
                <Button variant="outline" size="sm" onClick={() => onCreateAdjustment(rateCard)}>
                  Create Adjustment
                </Button>
              )}
              {onEdit && (
                <Button variant="outline" size="sm" onClick={() => onEdit(rateCard)}>
                  Edit
                </Button>
              )}
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

        {/* Notes */}
        {rateCard.notes && (
          <div className="text-sm">
            <span className="text-muted-foreground">Notes:</span>{' '}
            <span>{rateCard.notes}</span>
          </div>
        )}
      </CardContent>

      {/* Adjustments for this rate card */}
      {adjustments.length > 0 && (
        <CardContent className="border-t bg-muted/20">
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">
              Adjustments ({adjustments.length})
            </h4>
            <div className="space-y-2">
              {adjustments.map((adjustment) => (
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
                  {canEdit && onEdit && (
                    <Button variant="ghost" size="sm" onClick={() => onEdit(adjustment)}>
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
}
