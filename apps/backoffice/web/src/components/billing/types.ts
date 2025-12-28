/**
 * @fileoverview Shared TypeScript types for Billing Components
 *
 * This file contains all type definitions used across billing-related React components.
 * Centralizes type definitions to ensure consistency and maintainability.
 */

/**
 * Core RateCard entity with all properties used across billing components
 */
export interface RateCard {
  id: string;
  name: string;
  version?: number;
  effectiveDate: string;
  expiresDate?: string | null;
  isActive: boolean;
  rates: any; // Complex nested rate structure
  billingCycles?: any; // Service-level billing cycle overrides
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
