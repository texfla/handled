import { z } from 'zod';

// ============================================
// SERVICE VALIDATION SCHEMAS
// ============================================

/**
 * Service tier validation
 */
export const serviceTierSchema = z.object({
  minVolume: z.number().int().min(0),
  maxVolume: z.number().int().positive().nullable(),
  rate: z.number().positive(),
}).refine(
  (tier) => !tier.maxVolume || tier.maxVolume > tier.minVolume,
  { message: 'maxVolume must be greater than minVolume when specified' }
);

/**
 * Service zone validation (for shipping)
 */
export const serviceZoneSchema = z.object({
  zone: z.string().min(1),
  tiers: z.array(serviceTierSchema).min(1),
}).strict();

/**
 * Service item validation (for VAS)
 */
export const serviceItemSchema = z.object({
  item: z.string().min(1),
  unit: z.string().min(1),
  rate: z.number().positive(),
}).strict();

/**
 * Individual service validation
 */
export const serviceRateSchema = z.object({
  serviceType: z.string().regex(/^[A-Za-z]+_[A-Za-z]+$/, 'Service type must be in Category_Service format'),
  description: z.string().min(1),
  unit: z.string().min(1),
  baseRate: z.number().positive().optional(),
  tiers: z.array(serviceTierSchema).optional(),
  zones: z.array(serviceZoneSchema).optional(),
  items: z.array(serviceItemSchema).optional(),
}).strict().refine(
  (service) => service.baseRate || service.tiers || service.zones || service.items,
  'Service must have at least one pricing mechanism (baseRate, tiers, zones, or items)'
);

/**
 * Surcharge validation
 */
export const surchargeSchema = z.object({
  type: z.string().min(1),
  amount: z.number().positive().optional(),
  percentage: z.number().min(0).max(100).optional(),
  appliesFrom: z.string().datetime().optional(),
  appliesTo: z.string().datetime().optional(),
  conditions: z.record(z.any()).optional(),
}).strict().refine(
  (surcharge) => surcharge.amount || surcharge.percentage,
  'Surcharge must have either amount or percentage'
);

/**
 * Updated rate card rates validation
 */
export const rateCardRatesSchema = z.object({
  services: z.array(serviceRateSchema).min(1, 'At least one service is required'),
  surcharges: z.array(surchargeSchema).optional(),
  minimums: z.object({
    monthlyMinimum: z.number().positive().optional(),
    orderMinimum: z.number().positive().optional(),
  }).optional(),
}).refine(
  (rates) => {
    // Validate all tier arrays (contiguous, no overlaps)
    return rates.services.every(service =>
      !service.tiers || validateTiers(service.tiers)
    );
  },
  { message: 'Service tiers must be contiguous with no overlaps or gaps' }
);

// Helper function for tier validation
function validateTiers(tiers: Array<{minVolume: number, maxVolume: number | null, rate: number}>): boolean {
  if (!tiers || tiers.length === 0) return true;

  const sorted = [...tiers].sort((a, b) => a.minVolume - b.minVolume);

  // Check for gaps or overlaps
  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i];
    const next = sorted[i + 1];

    if (current.maxVolume === null) {
      // Can't have tiers after an unbounded tier
      return false;
    }
    if (current.maxVolume >= next.minVolume) {
      // Overlapping tiers
      return false;
    }
  }

  return true;
}

// ============================================
// BILLING CYCLES
// ============================================

// Helper to convert empty strings to undefined for optional enums
const optionalEnum = <T extends [string, ...string[]]>(values: T) =>
  z.preprocess(
    (val) => (val === '' || val === null ? undefined : val),
    z.enum(values).optional()
  );

export const billingCyclesSchema = z.object({
  shipping: optionalEnum(['immediate', 'weekly', 'monthly']),
  receiving: optionalEnum(['weekly', 'monthly']),
  storage: optionalEnum(['monthly']),
  fulfillment: optionalEnum(['weekly', 'monthly']),
  vas: optionalEnum(['weekly', 'monthly']),
}).strict();

// ============================================
// CREATE RATE CARD
// ============================================

export const createRateCardSchema = z.object({
  effectiveDate: z.string().datetime().or(z.date()),
  expiresDate: z.string().datetime().or(z.date()).nullable().optional(),
  name: z.string().optional(),
  rates: rateCardRatesSchema,
  billingCycles: billingCyclesSchema.optional(),
  minimumMonthlyCharge: z.number().positive().optional(),
  basedOnTemplate: z.string().optional(),
  notes: z.string().optional(),
  contractIds: z.array(z.string()).min(1, 'At least one contract is required'),
});

// ============================================
// CREATE ADJUSTMENT RATE CARD
// ============================================

export const createAdjustmentSchema = z.object({
  effectiveDate: z.string().datetime().or(z.date()),
  expiresDate: z.string().datetime().or(z.date()).optional(),
  rates: rateCardRatesSchema, // Can be partial - only override what's changing
  billingCycles: billingCyclesSchema.optional(),
  minimumMonthlyCharge: z.number().positive().nullable().optional(), // Can clear with null
  notes: z.string().optional(),
  contractIds: z.array(z.string()).optional(), // Inherit from parent if not provided
});

// ============================================
// UPDATE RATE CARD (creates new version)
// ============================================

export const updateRateCardSchema = z.object({
  effectiveDate: z.string().datetime().or(z.date()),
  expiresDate: z.string().datetime().or(z.date()).nullable().optional(),
  name: z.string().optional(),
  rates: rateCardRatesSchema.optional(), // Optional for partial updates
  billingCycles: billingCyclesSchema.optional(),
  minimumMonthlyCharge: z.number().positive().nullable().optional(),
  basedOnTemplate: z.string().nullable().optional(),
  notes: z.string().optional(),
  contractIds: z.array(z.string()).min(1).optional(), // Can update contract links
});

// ============================================
// ADD CONTRACT LINK
// ============================================

export const addContractLinkSchema = z.object({
  contractId: z.string(),
  linkType: z.enum(['primary', 'addendum', 'amendment']),
  notes: z.string().optional(),
});

// ============================================
// TYPE EXPORTS
// ============================================

export type CreateRateCardInput = z.infer<typeof createRateCardSchema>;
export type UpdateRateCardInput = z.infer<typeof updateRateCardSchema>;
export type AddContractLinkInput = z.infer<typeof addContractLinkSchema>;
export type RateCardRates = z.infer<typeof rateCardRatesSchema>;
export type BillingCycles = z.infer<typeof billingCyclesSchema>;
export type ReceivingRates = z.infer<typeof receivingRatesSchema>;
export type StorageRates = z.infer<typeof storageRatesSchema>;
export type FulfillmentRates = z.infer<typeof fulfillmentRatesSchema>;
export type ShippingRates = z.infer<typeof shippingRatesSchema>;
export type VolumeDiscount = z.infer<typeof volumeDiscountSchema>;

