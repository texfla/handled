import type { PrismaClient } from '@prisma/client-primary';
import type { CreateRateCardInput, UpdateRateCardInput, AddContractLinkInput } from '../validation/rateCardSchema.js';

export class RateCardService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Check if there's a date conflict with another active rate card
   * Ensures only one active rate card per customer for any given date
   */
  private async checkDateConflict(
    tx: any,
    customerId: string,
    effectiveDate: Date,
    expiresDate?: Date | null,
    excludeRateCardId?: string
  ) {
    const expiresCheck = expiresDate || new Date('9999-12-31');
    
    return await tx.rateCard.findFirst({
      where: {
        customerId,
        isActive: true,
        archivedAt: null,
        ...(excludeRateCardId && { id: { not: excludeRateCardId } }),
        OR: [
          // Existing card is active during new card's start date
          {
            AND: [
              { effectiveDate: { lte: effectiveDate } },
              {
                OR: [
                  { expiresDate: null },
                  { expiresDate: { gte: effectiveDate } }
                ]
              }
            ]
          },
          // Existing card starts during new card's active period
          {
            AND: [
              { effectiveDate: { gte: effectiveDate } },
              { effectiveDate: { lte: expiresCheck } }
            ]
          }
        ]
      }
    });
  }

  /**
   * Create a brand new rate card (v1)
   * - No parent (supersedesId is null)
   * - Version starts at 1
   * - Validates no date conflicts with existing active cards
   */
  async createStandardRateCard(
    customerId: string,
    input: CreateRateCardInput,
    createdBy?: string
  ) {
    return this.prisma.$transaction(async (tx) => {
      const effectiveDate = new Date(input.effectiveDate);
      
      // Check for date conflicts with other active cards
      const conflict = await this.checkDateConflict(
        tx, 
        customerId, 
        effectiveDate, 
        null // New cards don't have expiration initially
      );
      
      if (conflict) {
        throw new Error(
          `Cannot create rate card: Active rate card "${conflict.name}" already exists for this date (effective ${conflict.effectiveDate.toISOString().split('T')[0]})`
        );
      }

      // Create v1 with no parent
      const rateCard = await tx.rateCard.create({
        data: {
          customerId,
          name: input.name || `Rate Card v1`,
          version: 1,
          supersedesId: null, // No parent - this is a new card!
          effectiveDate,
          expiresDate: input.expiresDate ? new Date(input.expiresDate) : null,
          isActive: true,
          rates: input.rates as any,
          billingCycles: (input.billingCycles || {}) as any,
          minimumMonthlyCharge: input.minimumMonthlyCharge,
          basedOnTemplate: input.basedOnTemplate,
          notes: input.notes,
          rateCardType: 'standard' as any,
          createdBy,
        } as any,
      });

      // Link contracts
      await tx.rateCardContract.createMany({
        data: input.contractIds.map((contractId, index) => ({
          rateCardId: rateCard.id,
          contractId,
          linkType: index === 0 ? 'primary' : 'addendum',
          linkedBy: createdBy || undefined,
        })),
      });

      // Return with contracts and customer
      return tx.rateCard.findUnique({
        where: { id: rateCard.id },
        include: {
          contractLinks: {
            include: { contract: true },
          },
          customer: {
            select: { id: true, name: true, slug: true },
          },
        },
      });
    });
  }

  /**
   * Create an adjustment rate card for an existing parent rate card
   * - References parent rate card
   * - Can override specific rates for specific date ranges
   * - Constrained to parent's active period
   */
  async createAdjustmentRateCard(
    parentRateCardId: string,
    input: Omit<CreateRateCardInput, 'contractIds' | 'minimumMonthlyCharge'> & {
      contractIds?: string[];
      minimumMonthlyCharge?: number | null;
    },
    createdBy?: string
  ) {
    return this.prisma.$transaction(async (tx) => {
      const effectiveDate = new Date(input.effectiveDate);

      // Get parent rate card
      const parentCard = await tx.rateCard.findUnique({
        where: { id: parentRateCardId },
        select: {
          customerId: true,
          effectiveDate: true,
          expiresDate: true,
          version: true,
          name: true
        }
      });

      if (!parentCard) {
        throw new Error('Parent rate card not found');
      }

      // Validate adjustment dates are within parent bounds
      if (effectiveDate < parentCard.effectiveDate) {
        throw new Error('Adjustment cannot start before parent rate card');
      }

      if (input.expiresDate) {
        const expiresDate = new Date(input.expiresDate);
        if (parentCard.expiresDate && expiresDate > parentCard.expiresDate) {
          throw new Error('Adjustment cannot end after parent rate card');
        }
      }

      // Create adjustment rate card
      const adjustmentCard = await tx.rateCard.create({
        data: {
          customerId: parentCard.customerId,
          name: `${parentCard.name} - Adjustment`,
          rateCardType: 'adjustment' as any,
          parentRateCardId: parentRateCardId as any,
          effectiveDate,
          expiresDate: input.expiresDate ? new Date(input.expiresDate) : null,
          isActive: true,
          rates: input.rates as any,
          billingCycles: (input.billingCycles || {}) as any,
          minimumMonthlyCharge: input.minimumMonthlyCharge,
          notes: input.notes,
          createdBy,
        } as any,
      });

      // Link contracts (inherit from parent or use provided)
      const contractIds = (input.contractIds && input.contractIds.length > 0) ? input.contractIds :
        (await tx.rateCardContract.findMany({
          where: { rateCardId: parentRateCardId },
          select: { contractId: true }
        })).map(link => link.contractId);

      await tx.rateCardContract.createMany({
        data: contractIds.map((contractId, index) => ({
          rateCardId: adjustmentCard.id,
          contractId,
          linkType: index === 0 ? 'primary' : 'addendum',
          linkedBy: createdBy || undefined,
        })),
      });

      // Return with relationships
      return tx.rateCard.findUnique({
        where: { id: adjustmentCard.id },
        include: {
          contractLinks: {
            include: { contract: true },
          },
          parentRateCard: {
            select: { id: true, name: true, version: true }
          }
        },
      });
    });
  }

  /**
   * Get all active rate sources (standard + adjustments) for a customer on a specific date
   * Returns ordered by precedence (most recent effective date first)
   */
  async getActiveRateSources(customerId: string, activityDate: Date) {
    const rateSources = await this.prisma.rateCard.findMany({
      where: {
        customerId,
        isActive: true,
        effectiveDate: { lte: activityDate },
        OR: [
          { expiresDate: null },
          { expiresDate: { gte: activityDate } }
        ]
      },
      orderBy: { effectiveDate: 'desc' }, // Most recent first
      include: {
        contractLinks: {
          include: { contract: true },
        },
      }
    });

    return rateSources.map(card => ({
      type: (card as any).rateCardType || 'standard',
      card,
      effectiveDate: card.effectiveDate,
      isAdjustment: (card as any).rateCardType === 'adjustment'
    }));
  }

  /**
   * Resolve effective rates for a service using multiple rate sources
   * Service-by-service precedence: most recent source that defines the rate wins
   */
  resolveEffectiveRates(rateSources: any[], serviceType: string) {
    const rates: any = {};

    // Get all possible subtypes for this service
    const subtypes = this.getServiceSubtypes(serviceType);

    // For each subtype, find the most recent source that defines it
    for (const subtype of subtypes) {
      for (const source of rateSources) {
        const serviceRates = source.card.rates?.[serviceType];
        if (serviceRates && serviceRates[subtype] !== undefined) {
          rates[subtype] = serviceRates[subtype];
          break; // First source (most recent) wins
        }
      }
    }

    return rates;
  }

  /**
   * Resolve VAS rates by merging across all sources
   * Chronological order: parent first, then adjustments by effective date
   */
  resolveVASRates(rateSources: any[]) {
    const vasRates: Record<string, number> = {};

    // Sort sources chronologically (parent first, then by effective date)
    const chronologicalSources = rateSources
      .filter(s => !s.isAdjustment)
      .concat(rateSources.filter(s => s.isAdjustment).sort((a, b) =>
        a.effectiveDate.getTime() - b.effectiveDate.getTime()
      ));

    // Merge VAS rates (later sources override earlier ones)
    for (const source of chronologicalSources) {
      if (source.card.rates?.vas) {
        Object.assign(vasRates, source.card.rates.vas);
      }
    }

    return vasRates;
  }

  /**
   * Get all subtypes for a service type
   */
  private getServiceSubtypes(serviceType: string): string[] {
    const subtypeMap: Record<string, string[]> = {
      receiving: ['standardPallet', 'oversizePallet', 'containerDevanning20ft', 'containerDevanning40ft', 'perItem', 'perHour'],
      storage: ['palletMonthly', 'palletDaily', 'cubicFootMonthly', 'longTermPenaltyMonthly'],
      fulfillment: ['baseOrder', 'additionalItem', 'b2bPallet', 'pickPerLine'],
      shipping: ['markupPercent', 'labelFee']
    };
    return subtypeMap[serviceType] || [];
  }

  /**
   * Create a new version of an existing rate card (v2+)
   * - Has parent (supersedesId points to previous version)
   * - Version increments from parent
   * - Expires the parent card
   * - Becomes the new active card
   */
  async createRateCardVersion(
    parentRateCardId: string,
    input: UpdateRateCardInput,
    createdBy?: string
  ) {
    return this.prisma.$transaction(async (tx) => {
      // Get parent card
      const parentCard = await tx.rateCard.findUnique({
        where: { id: parentRateCardId },
        include: {
          contractLinks: true,
        },
      });

      if (!parentCard) {
        throw new Error('Parent rate card not found');
      }

      if (parentCard.archivedAt) {
        throw new Error('Cannot create version of an archived rate card');
      }

      if (!parentCard.customerId) {
        throw new Error('Parent rate card has no customer');
      }

      const effectiveDate = new Date(input.effectiveDate);
      const nextVersion = parentCard.version + 1;

      // Check for date conflicts (excluding the parent we're superseding)
      const conflict = await this.checkDateConflict(
        tx,
        parentCard.customerId,
        effectiveDate,
        null,
        parentRateCardId
      );

      if (conflict) {
        throw new Error(
          `Cannot create rate card version: Active rate card "${conflict.name}" already exists for this date (effective ${conflict.effectiveDate.toISOString().split('T')[0]})`
        );
      }

      // Expire parent card at the new version's effective date
      await tx.rateCard.update({
        where: { id: parentRateCardId },
        data: {
          isActive: false,
          expiresDate: effectiveDate,
        },
      });

      // Merge data from parent if partial update
      const newRates = input.rates
        ? { ...(parentCard.rates as any), ...input.rates }
        : parentCard.rates;

      const newBillingCycles = input.billingCycles
        ? { ...(parentCard.billingCycles as any), ...input.billingCycles }
        : parentCard.billingCycles;

      const newContractIds = input.contractIds ??
        (parentCard.contractLinks?.map(link => link.contractId) ?? []);

      // Ensure we have at least one contract
      if (newContractIds.length === 0) {
        throw new Error('At least one contract is required for rate card version');
      }

      // Create new version with parent reference
      const rateCard = await tx.rateCard.create({
        data: {
          customerId: parentCard.customerId,
          name: input.name || parentCard.name || `Rate Card v${nextVersion}`,
          version: nextVersion,
          supersedesId: parentRateCardId, // Point to parent!
          effectiveDate,
          expiresDate: input.expiresDate ? new Date(input.expiresDate) : null,
          isActive: true,
          rates: newRates as any,
          billingCycles: newBillingCycles as any,
          minimumMonthlyCharge: input.minimumMonthlyCharge ??
            (parentCard.minimumMonthlyCharge ?
              Number(parentCard.minimumMonthlyCharge) : undefined),
          basedOnTemplate: input.basedOnTemplate ??
            parentCard.basedOnTemplate ?? undefined,
          notes: input.notes ?? parentCard.notes ?? undefined,
          rateCardType: 'standard' as any,
          createdBy,
        } as any,
      });

      // Link contracts
      await tx.rateCardContract.createMany({
        data: newContractIds.map((contractId, index) => ({
          rateCardId: rateCard.id,
          contractId,
          linkType: index === 0 ? 'primary' : 'addendum',
          linkedBy: createdBy || undefined,
        })),
      });

      // Return with contracts, customer, and parent
      return tx.rateCard.findUnique({
        where: { id: rateCard.id },
        include: {
          contractLinks: {
            include: { contract: true },
          },
          customer: {
            select: { id: true, name: true, slug: true },
          },
          parentRateCard: {
            select: {
              id: true,
              name: true,
              version: true,
              effectiveDate: true,
              expiresDate: true,
            },
          },
        },
      });
    });
  }

  /**
   * Get active rate card for customer on specific date
   * This is used for rating activities
   * Excludes archived rate cards
   */
  async getRateCardForDate(customerId: string, date: Date) {
    return this.prisma.rateCard.findFirst({
      where: {
        customerId,
        archivedAt: null, // Exclude archived
        effectiveDate: { lte: date },
        OR: [
          { expiresDate: null },
          { expiresDate: { gt: date } },
        ],
      },
      include: {
        contractLinks: {
          include: { contract: true },
        },
      },
      orderBy: { effectiveDate: 'desc' },
    });
  }

  /**
   * Get current active rate card
   * Excludes archived rate cards
   */
  async getActiveRateCard(customerId: string) {
    return this.prisma.rateCard.findFirst({
      where: { 
        customerId, 
        isActive: true,
        archivedAt: null, // Exclude archived
      },
      include: {
        contractLinks: {
          include: { contract: true },
        },
        parentRateCard: {
          select: {
            id: true,
            name: true,
            version: true,
            effectiveDate: true,
            expiresDate: true,
          },
        },
      },
    });
  }

  /**
   * Get rate card by ID
   * Includes archived rate cards
   */
  async getRateCardById(rateCardId: string) {
    return this.prisma.rateCard.findUnique({
      where: { id: rateCardId },
      include: {
        contractLinks: {
          include: { contract: true },
        },
        customer: {
          select: { id: true, name: true, slug: true },
        },
        parentRateCard: {
          select: {
            id: true,
            name: true,
            version: true,
            effectiveDate: true,
            expiresDate: true,
          },
        },
        childVersions: {
          select: {
            id: true,
            name: true,
            version: true,
            effectiveDate: true,
            isActive: true,
            archivedAt: true,
          },
          orderBy: { version: 'asc' },
        },
      },
    });
  }

  /**
   * Get rate card history for customer
   * By default excludes archived, set includeArchived=true to see all
   */
  async getRateCardHistory(customerId: string, includeArchived = false) {
    return this.prisma.rateCard.findMany({
      where: { 
        customerId,
        ...(includeArchived ? {} : { archivedAt: null }),
      },
      include: {
        contractLinks: {
          include: { contract: true },
        },
        parentRateCard: {
          select: {
            id: true,
            name: true,
            version: true,
          },
        },
      },
      orderBy: { version: 'desc' },
    });
  }

  /**
   * Add contract to existing rate card
   */
  async addContractLink(
    rateCardId: string,
    input: AddContractLinkInput,
    linkedBy?: string
  ) {
    // Check if link already exists
    const existingLink = await this.prisma.rateCardContract.findUnique({
      where: {
        rateCardId_contractId: {
          rateCardId,
          contractId: input.contractId,
        },
      },
    });

    if (existingLink) {
      throw new Error('Contract is already linked to this rate card');
    }

    return this.prisma.rateCardContract.create({
      data: {
        rateCardId,
        contractId: input.contractId,
        linkType: input.linkType,
        notes: input.notes,
        linkedBy: linkedBy || undefined,
      },
      include: {
        contract: true,
      },
    });
  }

  /**
   * Remove contract link from rate card
   */
  async removeContractLink(rateCardId: string, contractId: string) {
    // Check if this is the last contract
    const linkCount = await this.prisma.rateCardContract.count({
      where: { rateCardId },
    });

    if (linkCount <= 1) {
      throw new Error('Cannot remove the last contract from a rate card. Rate cards must have at least one contract.');
    }

    return this.prisma.rateCardContract.delete({
      where: {
        rateCardId_contractId: {
          rateCardId,
          contractId,
        },
      },
    });
  }

  /**
   * Deactivate a rate card (expire it now)
   * This is used when superseding with a new version
   */
  async deactivateRateCard(rateCardId: string) {
    return this.prisma.rateCard.update({
      where: { id: rateCardId },
      data: {
        isActive: false,
        expiresDate: new Date(),
      },
    });
  }

  /**
   * Archive (soft delete) a rate card
   * This follows the app's deletion philosophy
   */
  async archiveRateCard(rateCardId: string, archivedBy: string, reason?: string) {
    return this.prisma.rateCard.update({
      where: { id: rateCardId },
      data: {
        archivedAt: new Date(),
        archivedBy,
        archivedReason: reason,
        isActive: false, // Also deactivate when archiving
      },
    });
  }

  /**
   * Restore an archived rate card
   */
  async restoreRateCard(rateCardId: string) {
    return this.prisma.rateCard.update({
      where: { id: rateCardId },
      data: {
        archivedAt: null,
        archivedBy: null,
        archivedReason: null,
        // Don't automatically reactivate - let user decide
      },
    });
  }
}
