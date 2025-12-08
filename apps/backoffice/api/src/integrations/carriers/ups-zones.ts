/**
 * UPS Zone Charts Integration
 * 
 * Source: UPS Zone Chart Excel files
 * Format: Excel (.xls) with zone data for each destination ZIP3
 * Filename: {origin_zip3}.xls (e.g., 007.xls, 945.xls)
 * 
 * File Structure:
 * - Rows 0-7: Headers/metadata (skip)
 * - Row 8: Column headers
 * - Rows 9-909: Zone data
 * - Rows 910+: Footer (filtered out)
 * 
 * Zone codes are 3-digit (e.g., "008", "308") - stored as-is
 * Dash "-" means service not available (stored as NULL)
 */

import * as XLSX from 'xlsx';
import type { Integration, ParsedRecord, ValidationResult } from '../types.js';
import { col } from '../types.js';

export const upsZones: Integration = {
  id: 'ups-zones',
  name: 'UPS Zone Charts',
  description: 'UPS zone charts by origin ZIP3. Filename must be the 3-digit origin ZIP (e.g., 007.xls)',
  category: 'carriers',

  fileTypes: ['xls', 'xlsx'],
  filePattern: /^\d{3}\.xlsx?$/i,
  
  async parse(file: Buffer, filename: string): Promise<ParsedRecord[]> {
    // Extract origin ZIP from filename (e.g., "007.xls" -> "007")
    const originZip = filename.replace(/\.xlsx?$/i, '').padStart(3, '0');
    
    // Parse Excel file
    const workbook = XLSX.read(file, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    // Convert to array of arrays, skipping first 8 rows (metadata)
    const rawData = XLSX.utils.sheet_to_json<string[]>(sheet, { 
      header: 1,
      defval: '',
    });
    
    // Skip first 8 rows (0-7), row 8 is headers
    const dataRows = rawData.slice(8);
    
    if (dataRows.length === 0) {
      return [];
    }
    
    // Column mapping (based on standard UPS zone chart format)
    // Columns: Dest ZIP, Ground, 3 Day Select, 2nd Day Air, 2nd Day Air A.M., Next Day Air Saver, Next Day Air
    const records: ParsedRecord[] = [];
    
    for (const row of dataRows) {
      if (!row || row.length === 0) continue;
      
      const destZip = String(row[0] || '').trim();
      
      // Skip if dest_zip is empty, not 3 digits, or is a footnote/5-digit ZIP
      if (!destZip || destZip.length !== 3 || !/^\d{3}$/.test(destZip)) {
        continue;
      }
      
      // Helper to clean zone values
      const cleanZone = (val: unknown): string | null => {
        if (val === null || val === undefined) return null;
        const str = String(val).trim();
        if (str === '' || str === '-') return null;
        return str;
      };
      
      records.push({
        origin_zip: originZip,
        dest_zip: destZip,
        ground_zone: cleanZone(row[1]),
        three_day_zone: cleanZone(row[2]),
        two_day_zone: cleanZone(row[3]),
        two_day_am_zone: cleanZone(row[4]),
        nda_saver_zone: cleanZone(row[5]),
        next_day_zone: cleanZone(row[6]),
      });
    }
    
    return records;
  },

  validate(records: ParsedRecord[]): ValidationResult {
    const errors: { row?: number; field?: string; message: string }[] = [];

    if (records.length === 0) {
      errors.push({ message: 'No valid zone data found in file' });
    }

    records.forEach((record, index) => {
      if (!record.origin_zip) {
        errors.push({ row: index + 1, field: 'origin_zip', message: 'Origin ZIP is required' });
      }
      if (!record.dest_zip) {
        errors.push({ row: index + 1, field: 'dest_zip', message: 'Destination ZIP is required' });
      }
    });

    return {
      valid: errors.length === 0,
      errors: errors.slice(0, 100),
    };
  },

  targetSchema: 'workspace',
  targetTable: 'ups_zones',
  
  columns: [
    col('origin_zip', 'VARCHAR(3)', { nullable: false, description: '3-digit origin ZIP (from filename)' }),
    col('dest_zip', 'VARCHAR(3)', { nullable: false, description: '3-digit destination ZIP' }),
    col('ground_zone', 'VARCHAR(3)', { description: 'UPS Ground zone code' }),
    col('three_day_zone', 'VARCHAR(3)', { description: 'UPS 3 Day Select zone code' }),
    col('two_day_zone', 'VARCHAR(3)', { description: 'UPS 2nd Day Air zone code' }),
    col('two_day_am_zone', 'VARCHAR(3)', { description: 'UPS 2nd Day Air A.M. zone code' }),
    col('nda_saver_zone', 'VARCHAR(3)', { description: 'UPS Next Day Air Saver zone code' }),
    col('next_day_zone', 'VARCHAR(3)', { description: 'UPS Next Day Air zone code' }),
  ],

  uniqueKey: ['origin_zip', 'dest_zip'],
  importMode: 'upsert', // Upsert because we import many files into same table
};

