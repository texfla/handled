/**
 * US ZIP Codes Integration
 * 
 * Source: SimpleMaps US ZIP Codes database
 * Format: CSV with comprehensive ZIP code data
 * Contains: ZIP, city, state, population, coordinates, etc.
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
      record[header.toLowerCase()] = values[index] || null;
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

export const usZips: Integration = {
  id: 'us-zips',
  name: 'US ZIP Codes',
  description: 'ZIP code reference data with population, coordinates, and demographics upszips.csv. From simplemaps.com free.',
  category: 'demographics',

  fileTypes: ['csv'],
  
  async parse(file: Buffer, _filename: string): Promise<ParsedRecord[]> {
    const content = file.toString('utf-8');
    const rawRecords = parseCSV(content);

    // Transform to our schema
    return rawRecords.map((raw) => ({
      zip: raw.zip?.toString().padStart(5, '0'),
      city: raw.city,
      state_id: raw.state_id,
      state_name: raw.state_name,
      county_name: raw.county_name,
      lat: raw.lat ? parseFloat(raw.lat as string) : null,
      lng: raw.lng ? parseFloat(raw.lng as string) : null,
      population: raw.population ? parseInt(raw.population as string, 10) : 0,
      density: raw.density ? parseFloat(raw.density as string) : null,
      timezone: raw.timezone,
    }));
  },

  validate(records: ParsedRecord[]): ValidationResult {
    const errors: { row?: number; field?: string; message: string }[] = [];

    records.forEach((record, index) => {
      if (!record.zip) {
        errors.push({ row: index + 1, field: 'zip', message: 'ZIP code is required' });
      }
      if (record.zip && (record.zip as string).length !== 5) {
        errors.push({ row: index + 1, field: 'zip', message: 'ZIP code must be 5 digits' });
      }
    });

    return {
      valid: errors.length === 0,
      errors,
    };
  },

  targetSchema: 'workspace',
  targetTable: 'us_zips',
  
  columns: [
    col('zip', 'VARCHAR(5)', { nullable: false, description: '5-digit ZIP code' }),
    col('city', 'VARCHAR(100)', { description: 'Primary city name' }),
    col('state_id', 'VARCHAR(2)', { description: 'State abbreviation' }),
    col('state_name', 'VARCHAR(100)', { description: 'Full state name' }),
    col('county_name', 'VARCHAR(100)', { description: 'County name' }),
    col('lat', 'NUMERIC(10,7)', { description: 'Latitude' }),
    col('lng', 'NUMERIC(10,7)', { description: 'Longitude' }),
    col('population', 'INTEGER', { description: 'Population estimate' }),
    col('density', 'NUMERIC(10,2)', { description: 'Population density' }),
    col('timezone', 'VARCHAR(50)', { description: 'Timezone' }),
  ],

  uniqueKey: ['zip'],
  importMode: 'replace',
};

