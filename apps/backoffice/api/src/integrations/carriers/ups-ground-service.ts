/**
 * UPS Ground Service Integration (5-digit ZIP)
 * 
 * Source: UPS Ground Service transit time files
 * Format: CSV without header
 * Columns: origin_zip, dest_zip, state, transit_days
 * Filename: {origin_zip}_Outbound.csv (e.g., 28602_Outbound.csv)
 */

import type { Integration, ParsedRecord, ValidationResult } from '../types.js';
import { col } from '../types.js';

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

export const upsGroundService: Integration = {
  id: 'ups-ground-service',
  name: 'UPS Ground Service (5-digit)',
  description: 'UPS Ground transit times from 5-digit origin to 5-digit destination. Filename: {zip}.csv or {zip}_Outbound.csv',
  category: 'carriers',

  fileTypes: ['csv'],
  // Accepts: 07657.csv OR 28602_Outbound.csv
  filePattern: /^\d{5}(_Outbound)?\.csv$/i,
  
  async parse(file: Buffer, _filename: string): Promise<ParsedRecord[]> {
    const content = file.toString('utf-8');
    const lines = content.trim().split('\n');
    
    const records: ParsedRecord[] = [];
    
    for (const line of lines) {
      if (!line.trim()) continue;
      
      const values = parseCSVLine(line);
      
      // Columns: origin_zip, dest_zip, state, transit_days, (empty)
      const originZip = String(values[0] || '').padStart(5, '0');
      const destZip = String(values[1] || '').padStart(5, '0');
      const destState = values[2] || null;
      const transitDays = values[3] ? parseInt(values[3], 10) : null;
      
      // Skip if essential data is missing
      if (!originZip || !destZip || originZip.length !== 5 || destZip.length !== 5) {
        continue;
      }
      
      records.push({
        origin_zip: originZip,
        dest_zip: destZip,
        dest_state: destState,
        transit_days: isNaN(transitDays as number) ? null : transitDays,
      });
    }
    
    return records;
  },

  validate(records: ParsedRecord[]): ValidationResult {
    const errors: { row?: number; field?: string; message: string }[] = [];

    if (records.length === 0) {
      errors.push({ message: 'No valid records found in file' });
    }

    // Sample validation on first few records
    records.slice(0, 100).forEach((record, index) => {
      if (!record.origin_zip) {
        errors.push({ row: index + 1, field: 'origin_zip', message: 'Origin ZIP is required' });
      }
      if (!record.dest_zip) {
        errors.push({ row: index + 1, field: 'dest_zip', message: 'Destination ZIP is required' });
      }
    });

    return {
      valid: errors.length === 0 || (errors.length < records.length * 0.01),
      errors: errors.slice(0, 100),
    };
  },

  targetSchema: 'workspace',
  targetTable: 'ups_ground_service_zip5',
  
  columns: [
    col('origin_zip', 'VARCHAR(5)', { nullable: false, description: '5-digit origin ZIP' }),
    col('dest_zip', 'VARCHAR(5)', { nullable: false, description: '5-digit destination ZIP' }),
    col('dest_state', 'VARCHAR(2)', { description: 'Destination state abbreviation' }),
    col('transit_days', 'INTEGER', { description: 'Transit days' }),
  ],

  uniqueKey: ['origin_zip', 'dest_zip'],
  importMode: 'upsert',
};

