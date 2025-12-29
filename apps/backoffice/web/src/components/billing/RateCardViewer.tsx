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
import type { RateCard, RateCardViewerProps, ServiceRate, ServiceTier } from './types';
import { formatCurrency } from '../../utils/currency';

function TieredPricingDisplay({ tiers }: { tiers: ServiceTier[] }) {
  if (!tiers || tiers.length === 0) return null;

  return (
    <div className="border rounded p-3 bg-muted/20 mt-2">
      <h5 className="font-medium text-sm mb-3">Volume-Based Pricing</h5>
      <div className="space-y-2">
        {tiers.map((tier, index) => (
          <div key={index} className="flex items-center gap-4 text-sm">
            <span className="font-medium min-w-[120px]">
              {tier.minVolume === 0 ? '<' : tier.minVolume}
              {tier.maxVolume ? `-${tier.maxVolume}` : '+'} orders:
            </span>
            <span className="font-mono">
              {tier.rate ? formatCurrency(tier.rate) : 'Contact for pricing'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ServiceDisplay({ service }: { service: ServiceRate }) {
  return (
    <div className="service-item border rounded p-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-medium">{service.description}</h4>
        <Badge variant="outline" className="text-xs">
          {service.unit}
        </Badge>
      </div>

      {service.tiers ? (
        <TieredPricingDisplay tiers={service.tiers} />
      ) : service.baseRate ? (
        <div className="base-rate font-mono text-lg">
          {service.serviceType.includes('Percent') ? `${service.baseRate}%` : formatCurrency(service.baseRate)}
        </div>
      ) : (
        <div className="text-muted-foreground">Contact for pricing</div>
      )}
    </div>
  );
}

export function RateCardViewer({
  rateCard,
  isActive = false,
  canEdit = false,
  adjustments = [],
  onEdit,
  onCreateAdjustment
}: RateCardViewerProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
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
        {/* Service-Based Display */}
        {rateCard.rates.services && rateCard.rates.services.length > 0 && (
          <div className="space-y-4">
            {rateCard.rates.services.map((service, index) => (
              <ServiceDisplay key={`${service.serviceType}-${index}`} service={service} />
            ))}
          </div>
        )}

        {/* Minimums */}
        {rateCard.rates.minimums && (
          <div className="space-y-2">
            {rateCard.rates.minimums.monthlyMinimum && (
              <div className="text-sm">
                <span className="text-muted-foreground">Monthly Minimum:</span>{' '}
                <span className="font-medium">{formatCurrency(rateCard.rates.minimums.monthlyMinimum)}</span>
              </div>
            )}
            {rateCard.rates.minimums.orderMinimum && (
              <div className="text-sm">
                <span className="text-muted-foreground">Order Minimum:</span>{' '}
                <span className="font-medium">{formatCurrency(rateCard.rates.minimums.orderMinimum)}</span>
              </div>
            )}
          </div>
        )}

        {/* Surcharges */}
        {rateCard.rates.surcharges && rateCard.rates.surcharges.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Surcharges</h4>
            {rateCard.rates.surcharges.map((surcharge, index) => (
              <div key={index} className="text-sm">
                <span className="text-muted-foreground">{surcharge.type}:</span>{' '}
                <span className="font-medium">
                  {surcharge.percentage ? `${surcharge.percentage}%` : surcharge.amount ? formatCurrency(surcharge.amount) : 'Contact for pricing'}
                </span>
              </div>
            ))}
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
