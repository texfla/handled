/**
 * SQL Utilities
 * 
 * Safe SQL identifier handling to prevent SQL injection
 */

/**
 * Validates a PostgreSQL identifier (table name, column name, schema name)
 * 
 * PostgreSQL identifiers must:
 * - Start with a letter (a-z) or underscore
 * - Contain only letters, digits, underscores
 * - Be 63 characters or less
 * 
 * This prevents SQL injection even when using $executeRawUnsafe
 */
export function isValidIdentifier(identifier: string): boolean {
  if (!identifier || identifier.length === 0) {
    return false;
  }
  
  if (identifier.length > 63) {
    return false;
  }
  
  // Must start with letter or underscore
  if (!/^[a-z_]/i.test(identifier)) {
    return false;
  }
  
  // Must only contain letters, digits, underscores
  if (!/^[a-z_][a-z0-9_]*$/i.test(identifier)) {
    return false;
  }
  
  return true;
}

/**
 * Validates a fully qualified table name (schema.table)
 */
export function isValidQualifiedTableName(qualifiedName: string): boolean {
  const parts = qualifiedName.split('.');
  
  if (parts.length !== 2) {
    return false;
  }
  
  const [schema, table] = parts;
  return isValidIdentifier(schema) && isValidIdentifier(table);
}

/**
 * Validates a list of column names
 */
export function areValidColumnNames(columns: string[]): boolean {
  if (!Array.isArray(columns) || columns.length === 0) {
    return false;
  }
  
  return columns.every(col => isValidIdentifier(col));
}

/**
 * Allowed schemas for data operations (whitelist)
 */
const ALLOWED_SCHEMAS = ['workspace', 'reference'] as const;

/**
 * Validates that a schema is in the allowed list
 */
export function isAllowedSchema(schema: string): boolean {
  return ALLOWED_SCHEMAS.includes(schema as any);
}

/**
 * Safely quotes a PostgreSQL identifier
 * Uses double quotes to escape identifiers
 */
export function quoteIdentifier(identifier: string): string {
  if (!isValidIdentifier(identifier)) {
    throw new Error(`Invalid identifier: ${identifier}`);
  }
  
  // Escape double quotes by doubling them, then wrap in double quotes
  return `"${identifier.replace(/"/g, '""')}"`;
}

/**
 * Safely quotes a qualified table name (schema.table)
 */
export function quoteQualifiedTable(qualifiedName: string): string {
  if (!isValidQualifiedTableName(qualifiedName)) {
    throw new Error(`Invalid qualified table name: ${qualifiedName}`);
  }
  
  const [schema, table] = qualifiedName.split('.');
  
  if (!isAllowedSchema(schema)) {
    throw new Error(`Schema '${schema}' is not allowed. Allowed schemas: ${ALLOWED_SCHEMAS.join(', ')}`);
  }
  
  return `${quoteIdentifier(schema)}.${quoteIdentifier(table)}`;
}

/**
 * Validates and safely formats a table name for use in SQL
 * 
 * @param tableName - Either 'table' or 'schema.table'
 * @param defaultSchema - Schema to use if not specified
 * @returns Safely quoted qualified table name
 */
export function safeTableName(tableName: string, defaultSchema: string = 'workspace'): string {
  // If already qualified
  if (tableName.includes('.')) {
    return quoteQualifiedTable(tableName);
  }
  
  // Add default schema and validate
  const qualifiedName = `${defaultSchema}.${tableName}`;
  return quoteQualifiedTable(qualifiedName);
}

/**
 * Safely quotes an array of column names
 */
export function quoteColumns(columns: string[]): string[] {
  if (!areValidColumnNames(columns)) {
    throw new Error('Invalid column names provided');
  }
  
  return columns.map(col => quoteIdentifier(col));
}
