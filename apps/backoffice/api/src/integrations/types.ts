/**
 * Integration Types
 * 
 * Each data integration is defined as a TypeScript module implementing this interface.
 * Integrations are code-driven (not database config) for version control and testability.
 */

export type IntegrationCategory = 'carriers' | 'demographics' | 'billing' | 'products';

export type ImportMode = 'insert' | 'upsert' | 'replace';

export interface ColumnDefinition {
  name: string;
  type: string;
  nullable?: boolean;
  description?: string;
}

export interface ValidationError {
  row?: number;
  field?: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings?: ValidationError[];
}

export type ParsedRecord = Record<string, unknown>;

export interface Integration {
  // Identity
  id: string;
  name: string;
  description: string;
  category: IntegrationCategory;

  // File handling
  fileTypes: string[];
  filePattern?: RegExp;

  // Processing
  parse(file: Buffer, filename: string): Promise<ParsedRecord[]>;
  validate(records: ParsedRecord[]): ValidationResult;

  // Target
  targetSchema: 'workspace';
  targetTable: string;
  columns: ColumnDefinition[];
  uniqueKey?: string[];
  importMode: ImportMode;
}

/**
 * Helper to create column definitions
 */
export function col(
  name: string,
  type: string,
  options?: { nullable?: boolean; description?: string }
): ColumnDefinition {
  return {
    name,
    type,
    nullable: options?.nullable ?? true,
    description: options?.description,
  };
}

