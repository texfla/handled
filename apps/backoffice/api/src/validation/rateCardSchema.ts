import { z } from 'zod';

// ============================================
// RATE STRUCTURES
// ============================================

// Receiving rates
export const receivingRatesSchema = z.object({
  standardPallet: z.number().positive().optional(),
  oversizePallet: z.number().positive().optional(),
  containerDevanning20ft: z.number().positive().optional(),
  containerDevanning40ft: z.number().positive().optional(),
  perItem: z.number().positive().optional(),
  perHour: z.number().positive().optional(),
}).strict();

// Storage rates
export const storageRatesSchema = z.object({
  palletMonthly: z.number().positive().optional(),
  palletDaily: z.number().positive().optional(),
  cubicFootMonthly: z.number().positive().optional(),
  longTermPenaltyMonthly: z.number().positive().optional(),
}).strict();

// Fulfillment rates
export const fulfillmentRatesSchema = z.object({
  baseOrder: z.number().positive().optional(),
  additionalItem: z.number().positive().optional(),
  b2bPallet: z.number().positive().optional(),
  pickPerLine: z.number().positive().optional(),
}).strict();

// Shipping rates
export const shippingRatesSchema = z.object({
  markupPercent: z.number().min(0).optional(), // No max - markups can exceed 100%
  labelFee: z.number().positive().optional(),
}).strict();

// Volume discount tier
export const volumeDiscountSchema = z.object({
  minOrdersMonthly: z.number().int().positive(),
  discountPercent: z.number().min(0).max(100), // Discounts are 0-100%
});

// Main rate card rates schema
export const rateCardRatesSchema = z.object({
  receiving: receivingRatesSchema.optional(),
  storage: storageRatesSchema.optional(),
  fulfillment: fulfillmentRatesSchema.optional(),
  shipping: shippingRatesSchema.optional(),
  vas: z.record(z.string(), z.number().positive()).optional(), // Flexible VAS: { kitting: 2.00, labeling: 0.50 }
  volumeDiscounts: z.array(volumeDiscountSchema).optional(),
}).strict();

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

