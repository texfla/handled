import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Plus, AlertCircle } from 'lucide-react';
import { RateCardForm } from './RateCardForm';
import { RateCardViewer } from './RateCardViewer';
import type { RateCard, RateCardListProps } from './types';

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
              <RateCardViewer
                key={rateCard.id}
                rateCard={rateCard}
                isActive={isActive}
                canEdit={canEdit}
                adjustments={cardAdjustments}
                onEdit={handleEdit}
                onCreateAdjustment={handleCreateAdjustment}
              />
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

