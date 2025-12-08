/**
 * USPS 3D Base Service Integration
 * 
 * Source: USPS Service Standards Directory
 * Format: CSV with 3-digit origin/destination and multiple service standards
 * Filename pattern: 3D_Base_Service_Standard_Directory_MMDDYYYY.csv
 */

import type { Integration, ParsedRecord, ValidationResult } from '../types.js';
import { col } from '../types.js';

// CSV parsing helper
function parseCSV(content: string): ParsedRecord[] {
  const lines = content.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]);
  const records: ParsedRecord[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const record: ParsedRecord = {};
    
    headers.forEach((header, index) => {
      // Normalize header names to lowercase with underscores
      const normalizedHeader = header.toLowerCase().trim();
      record[normalizedHeader] = values[index]?.trim() || null;
    });
    
    records.push(record);
  }

  return records;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

function parseIntOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = parseInt(String(value), 10);
  return isNaN(parsed) ? null : parsed;
}

export const usps3dBase: Integration = {
  id: 'usps-3d-base',
  name: 'USPS 3D Base Service',
  description: 'USPS service standards for 3-digit ZIP to 3-digit ZIP delivery times',
  category: 'carriers',

  fileTypes: ['csv'],
  filePattern: /^3D_Base_Service_Standard_Directory_\d+\.csv$/i,
  
  async parse(file: Buffer, _filename: string): Promise<ParsedRecord[]> {
    const content = file.toString('utf-8');
    const rawRecords = parseCSV(content);

    // Transform to our schema
    // Headers: Origin_ZIP_Code, Destination_ZIP_Code, PRI_Service_Standard, etc.
    return rawRecords.map((raw) => {
      return {
        origin_zip_code: String(raw.origin_zip_code || '').padStart(3, '0').substring(0, 3),
        destination_zip_code: String(raw.destination_zip_code || '').padStart(3, '0').substring(0, 3),
        pri_service_standard: parseIntOrNull(raw.pri_service_standard),
        gal_service_standard: parseIntOrNull(raw.gal_service_standard),
        mkt_service_standard: parseIntOrNull(raw.mkt_service_standard),
        per_service_standard: parseIntOrNull(raw.per_service_standard),
        pkg_service_standard: parseIntOrNull(raw.pkg_service_standard),
        fcm_service_standard: parseIntOrNull(raw.fcm_service_standard),
        gah_service_standard: parseIntOrNull(raw.gah_service_standard),
        pfc_service_standard: parseIntOrNull(raw.pfc_service_standard),
      };
    });
  },

  validate(records: ParsedRecord[]): ValidationResult {
    const errors: { row?: number; field?: string; message: string }[] = [];

    records.forEach((record, index) => {
      if (!record.origin_zip_code || record.origin_zip_code === '000') {
        errors.push({ row: index + 1, field: 'origin_zip_code', message: 'Origin ZIP is required' });
      }
      if (!record.destination_zip_code || record.destination_zip_code === '000') {
        errors.push({ row: index + 1, field: 'destination_zip_code', message: 'Destination ZIP is required' });
      }
    });

    // Only fail if there are many errors (allow some bad rows)
    const errorThreshold = Math.max(10, records.length * 0.01); // 1% or 10, whichever is larger
    
    return {
      valid: errors.length < errorThreshold,
      errors: errors.slice(0, 100), // Only return first 100 errors
    };
  },

  targetSchema: 'workspace',
  targetTable: 'usps_3d_base_service',
  
  columns: [
    col('origin_zip_code', 'VARCHAR(3)', { nullable: false, description: '3-digit origin ZIP' }),
    col('destination_zip_code', 'VARCHAR(3)', { nullable: false, description: '3-digit destination ZIP' }),
    col('pri_service_standard', 'INTEGER', { description: 'Priority Mail days' }),
    col('gal_service_standard', 'INTEGER', { description: 'Ground Advantage days' }),
    col('mkt_service_standard', 'INTEGER', { description: 'Marketing Mail days' }),
    col('per_service_standard', 'INTEGER', { description: 'Periodicals days' }),
    col('pkg_service_standard', 'INTEGER', { description: 'Parcel Select days' }),
    col('fcm_service_standard', 'INTEGER', { description: 'First-Class Mail days' }),
    col('gah_service_standard', 'INTEGER', { description: 'Ground Advantage Heavy days' }),
    col('pfc_service_standard', 'INTEGER', { description: 'Priority First-Class days' }),
  ],

  uniqueKey: ['origin_zip_code', 'destination_zip_code'],
  importMode: 'replace',
};

