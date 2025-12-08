/**
 * GAZ ZCTA National Integration
 * 
 * Source: Census Bureau Gazetteer Files
 * Format: Pipe-delimited TXT with header
 * Contains: ZCTA geographic centroids and land/water areas
 */

import type { Integration, ParsedRecord, ValidationResult } from '../types.js';
import { col } from '../types.js';

export const gazZcta: Integration = {
  id: 'gaz-zcta',
  name: 'GAZ ZCTA National',
  description: 'Census Bureau ZCTA geographic data with centroids and land/water areas',
  category: 'demographics',

  fileTypes: ['txt'],
  filePattern: /^\d{4}_Gaz_zcta_national\.txt$/i,
  
  async parse(file: Buffer, _filename: string): Promise<ParsedRecord[]> {
    const content = file.toString('utf-8');
    const lines = content.trim().split('\n');
    
    // Skip header row
    const dataLines = lines.slice(1);
    const records: ParsedRecord[] = [];
    
    for (const line of dataLines) {
      if (!line.trim()) continue;
      
      // Pipe-delimited: GEOID|GEOIDFQ|ALAND|AWATER|ALAND_SQMI|AWATER_SQMI|INTPTLAT|INTPTLONG
      const values = line.split('|');
      
      const geoid = values[0]?.trim();
      if (!geoid || geoid.length !== 5) continue;
      
      records.push({
        geoid: geoid,
        aland: values[2] ? parseInt(values[2], 10) : null,
        awater: values[3] ? parseInt(values[3], 10) : null,
        aland_sqmi: values[4] ? parseFloat(values[4]) : null,
        awater_sqmi: values[5] ? parseFloat(values[5]) : null,
        intptlat: values[6] ? parseFloat(values[6]) : null,
        intptlong: values[7] ? parseFloat(values[7]) : null,
      });
    }
    
    return records;
  },

  validate(records: ParsedRecord[]): ValidationResult {
    const errors: { row?: number; field?: string; message: string }[] = [];

    if (records.length === 0) {
      errors.push({ message: 'No valid records found in file' });
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  },

  targetSchema: 'workspace',
  targetTable: 'gaz_zcta_national',
  
  columns: [
    col('geoid', 'VARCHAR(5)', { nullable: false, description: '5-digit ZCTA code' }),
    col('aland', 'BIGINT', { description: 'Land area in square meters' }),
    col('awater', 'BIGINT', { description: 'Water area in square meters' }),
    col('aland_sqmi', 'NUMERIC(12,2)', { description: 'Land area in square miles' }),
    col('awater_sqmi', 'NUMERIC(12,2)', { description: 'Water area in square miles' }),
    col('intptlat', 'NUMERIC(10,7)', { description: 'Latitude of centroid' }),
    col('intptlong', 'NUMERIC(10,7)', { description: 'Longitude of centroid' }),
  ],

  uniqueKey: ['geoid'],
  importMode: 'replace',
};

