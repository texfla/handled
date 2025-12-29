/**
 * @fileoverview Shared TypeScript types for Billing Components
 *
 * This file contains all type definitions used across billing-related React components.
 * Centralizes type definitions to ensure consistency and maintainability.
 */

/**
 * @fileoverview Rate Card Type Definitions
 *
 * Comprehensive type definitions for rate card structures including:
 * - Service-focused rate organization
 * - Tiered pricing support
 * - Billing cycle configurations
 * - Validation schemas for runtime enforcement
 */

// ============================================
// SERVICE DEFINITIONS
// ============================================

/**
 * Individual service rate with optional tiering
 */
export interface ServiceRate {
  /** Unique service identifier (e.g., 'Fulfillment_BaseOrder') */
  serviceType: string;

  /** Human-readable description */
  description: string;

  /** Unit of measurement (order, pallet, item, sku, etc.) */
  unit: string;

  /** Base rate for simple services (no tiers) */
  baseRate?: number;

  /** Volume-based tiered pricing */
  tiers?: ServiceTier[];

  /** Zone-based pricing (for shipping) */
  zones?: ServiceZone[];

  /** Sub-items for complex services (VAS) */
  items?: ServiceItem[];
}

/**
 * Volume-based pricing tier
 */
export interface ServiceTier {
  /** Minimum volume threshold (inclusive) */
  minVolume: number;

  /** Maximum volume threshold (exclusive, null = unbounded) */
  maxVolume: number | null;

  /** Rate for this volume range */
  rate: number;
}

/**
 * Geographic zone pricing (shipping)
 */
export interface ServiceZone {
  /** Zone identifier (Domestic, International, Zone1, etc.) */
  zone: string;

  /** Pricing tiers within this zone */
  tiers: ServiceTier[];
}

/**
 * Sub-items for complex services
 */
export interface ServiceItem {
  /** Item name (Labeling, Kitting, etc.) */
  item: string;

  /** Unit of measurement */
  unit: string;

  /** Rate per unit */
  rate: number;
}

// ============================================
// RATE CARD STRUCTURE
// ============================================

/**
 * Complete rate card rates structure
 */
export interface RateCardRates {
  /** Array of service definitions with pricing */
  services: ServiceRate[];

  /** Special pricing rules */
  surcharges?: Surcharge[];

  /** Minimum charges */
  minimums?: {
    monthlyMinimum?: number;
    orderMinimum?: number;
  };
}

/**
 * Surcharges and special pricing rules
 */
export interface Surcharge {
  /** Surcharge type identifier */
  type: string;

  /** Fixed amount OR percentage */
  amount?: number;
  percentage?: number;

  /** Date restrictions */
  appliesFrom?: string;
  appliesTo?: string;

  /** Conditions for application */
  conditions?: Record<string, any>;
}

// ============================================
// BILLING CYCLES
// ============================================

/**
 * Billing frequency configuration per service category
 */
export interface BillingCycles {
  /** How shipping charges are billed */
  shipping?: 'immediate' | 'weekly' | 'monthly';

  /** How receiving charges are billed */
  receiving?: 'weekly' | 'monthly';

  /** How storage charges are billed */
  storage?: 'monthly';

  /** How fulfillment charges are billed */
  fulfillment?: 'weekly' | 'monthly';

  /** How VAS charges are billed */
  vas?: 'weekly' | 'monthly';
}

// ============================================
// MAIN RATE CARD INTERFACE
// ============================================

/**
 * Core RateCard entity with service-focused rate structure
 */
export interface RateCard {
  id: string;
  name: string;
  version?: number;
  effectiveDate: string;
  expiresDate?: string | null;
  isActive: boolean;

  /** Structured service-based rates (replaces loose 'any') */
  rates: RateCardRates;

  /** Billing frequency overrides */
  billingCycles?: BillingCycles;

  minimumMonthlyCharge?: number | null;
  notes?: string | null;
  rateCardType?: 'standard' | 'adjustment';
  parentRateCardId?: string;
  supersedesId?: string;

  // Relationships
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

  // Display/UI properties (added by components)
  previousVersionsCount?: number;
  allVersions?: RateCard[];
}

// ============================================
// BILLING CATALOG INTERFACES
// ============================================

/**
 * Billing service category from the catalog
 */
export interface BillingCategory {
  id: number;
  code: string;
  name: string;
  description?: string;
  sortOrder: number;
  isActive: boolean;
  services: BillingService[];
}

/**
 * Billing service from the catalog
 */
export interface BillingService {
  id: number;
  categoryId: number;
  code: string;
  name: string;
  description?: string;
  unit: string;
  isActive: boolean;
  sortOrder: number;
  category: BillingCategory;
}

/**
 * Props for the RateCardList component
 */
export interface RateCardListProps {
  customerId: string;
  canEdit?: boolean;
}

/**
 * Props for the RateCardForm component
 */
export interface RateCardFormProps {
  customerId: string;
  rateCard?: RateCard | null; // If provided and rateCardType === 'adjustment', this is the parent
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Props for the RateCardViewer component
 */
export interface RateCardViewerProps {
  rateCard: RateCard;
  isActive?: boolean;
  canEdit?: boolean;
  adjustments?: RateCard[];
  onEdit?: (rateCard: RateCard) => void;
  onCreateAdjustment?: (rateCard: RateCard) => void;
}

/**
 * Contract entity used in billing relationships
 */
export interface Contract {
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
  rateCards?: RateCard[];
}

/**
 * Customer entity with billing-relevant properties
 */
export interface Customer {
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

  // Relationships
  warehouseAllocations?: WarehouseAllocation[];
  facilities?: CustomerFacility[];
  contacts?: Contact[];
  contracts?: Contract[];
  settings?: any;

  // Computed properties
  _count?: {
    warehouseAllocations: number;
    facilities: number;
    contacts: number;
    contracts: number;
  };
}

/**
 * Warehouse allocation entity
 */
export interface WarehouseAllocation {
  id: string;
  customerId: string;
  companyWarehouseId: string;
  warehouse: {
    id: string;
    code: string;
    name: string;
    address?: {
      street1?: string;
      street2?: string;
      city?: string;
      state?: string;
      zip?: string;
      country?: string;
      timezone?: string;
    };
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

/**
 * Customer facility entity
 */
export interface CustomerFacility {
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

/**
 * Contact entity for customer relationships
 */
export interface Contact {
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
