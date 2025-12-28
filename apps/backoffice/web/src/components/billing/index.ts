/**
 * @fileoverview Billing Components Barrel Export
 *
 * Central export point for all billing-related React components and types.
 * Provides clean imports for rate card management components and their domain types.
 */

export { RateCardList } from './RateCardList';
export { RateCardForm } from './RateCardForm';
export { RateCardViewer } from './RateCardViewer';

// Re-export all shared types
export type {
  RateCard,
  RateCardListProps,
  RateCardFormProps,
  RateCardViewerProps,
  Contract,
  Customer,
  WarehouseAllocation,
  CustomerFacility,
  Contact
} from './types';
