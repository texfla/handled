/**
 * Transformation Types
 * 
 * Code-driven transformations that convert workspace data into reference data.
 */

export interface TransformationResult {
  success: boolean;
  recordsAffected: number;
  duration: number; // milliseconds
  error?: string;
}

export interface Transformation {
  id: string;
  name: string;
  description: string;
  
  // Source tables (workspace schema)
  sources: string[];
  
  // Target table (reference schema)
  targetTable: string;
  
  // The transformation SQL
  // Will be wrapped in a transaction with TRUNCATE + INSERT
  getSql(): string;
  
  // Dependencies - other transformations that must run first
  dependencies?: string[];
}

