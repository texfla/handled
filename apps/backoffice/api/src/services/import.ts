import { prismaPrimary, prismaData } from '../db/index.js';
import { safeTableName, quoteColumns } from '../db/sql-utils.js';
import type { Integration, ParsedRecord, ValidationError } from '../integrations/types.js';
import { getErrorMessage } from '../types/errors.js';
import type { Prisma } from '@prisma/client-primary';

class ImportService {
  async runImport(
    integration: Integration,
    fileBuffer: Buffer,
    filename: string,
    userId?: string
  ) {
    // Create run record in PRIMARY DB (config schema)
    const run = await prismaPrimary.integrationRun.create({
      data: {
        integrationId: integration.id,
        filename,
        status: 'running',
        startedAt: new Date(),
        runBy: userId,
      },
    });

    try {
      // Parse file
      const records = await integration.parse(fileBuffer, filename);
      
      // Validate records
      const validation = integration.validate(records);
      
      if (!validation.valid) {
        await prismaPrimary.integrationRun.update({
          where: { id: run.id },
          data: {
            status: 'failed',
            completedAt: new Date(),
            errors: validation.errors as unknown as Prisma.JsonArray,
          },
        });
        
        return {
          success: false,
          runId: run.id,
          errors: validation.errors,
        };
      }
      
      // Insert/upsert records into DATA DB (workspace schema)
      const result = await this.insertRecords(integration, records);
      
      // Update run record in PRIMARY DB
      await prismaPrimary.integrationRun.update({
        where: { id: run.id },
        data: {
          status: 'success',
          completedAt: new Date(),
          recordsProcessed: result.processed,
          recordsFailed: result.failed,
        },
      });
      
      return {
        success: true,
        runId: run.id,
        recordsProcessed: result.processed,
        recordsFailed: result.failed,
      };
    } catch (error) {
      const message = getErrorMessage(error, 'Unknown error');
      
      const errorObj: ValidationError = { message };
      
      await prismaPrimary.integrationRun.update({
        where: { id: run.id },
        data: {
          status: 'failed',
          completedAt: new Date(),
          errors: [errorObj] as unknown as Prisma.JsonArray,
        },
      });
      
      throw error;
    }
  }

  private async insertRecords(
    integration: Integration,
    records: ParsedRecord[]
  ): Promise<{ processed: number; failed: number }> {
    // Validate and safely quote table name
    const qualifiedTableName = `${integration.targetSchema}.${integration.targetTable}`;
    const safeTable = safeTableName(qualifiedTableName);
    
    let processed = 0;
    let failed = 0;

    // Build column list from integration definition and validate
    const columns = integration.columns.map((c) => c.name);
    const safeColumns = quoteColumns(columns); // Validates and quotes column names
    
    // If replace mode, truncate table first (use DATA DB)
    if (integration.importMode === 'replace') {
      await prismaData.$executeRawUnsafe(`TRUNCATE TABLE ${safeTable}`);
    }
    
    // Process in batches
    const batchSize = 1000;
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      
      try {
        if (integration.importMode === 'upsert' && integration.uniqueKey) {
          // Upsert using raw SQL
          await this.upsertBatch(safeTable, columns, safeColumns, batch, integration.uniqueKey);
        } else {
          // Simple insert
          await this.insertBatch(safeTable, columns, safeColumns, batch);
        }
        processed += batch.length;
      } catch (error) {
        console.error(`Batch insert failed:`, error);
        failed += batch.length;
      }
    }

    return { processed, failed };
  }

  private async insertBatch(
    safeTableName: string,
    columnNames: string[],
    safeColumns: string[],
    records: ParsedRecord[]
  ) {
    if (records.length === 0) return;

    const placeholders = records
      .map((_, i) => `(${columnNames.map((_, j) => `$${i * columnNames.length + j + 1}`).join(', ')})`)
      .join(', ');

    const values = records.flatMap((record) =>
      columnNames.map((col) => record[col] ?? null)
    );

    // Use safe (quoted) identifiers for table and columns
    const sql = `INSERT INTO ${safeTableName} (${safeColumns.join(', ')}) VALUES ${placeholders}`;
    await prismaData.$executeRawUnsafe(sql, ...values);
  }

  private async upsertBatch(
    safeTableName: string,
    columnNames: string[],
    safeColumns: string[],
    records: ParsedRecord[],
    uniqueKey: string[]
  ) {
    if (records.length === 0) return;

    const placeholders = records
      .map((_, i) => `(${columnNames.map((_, j) => `$${i * columnNames.length + j + 1}`).join(', ')})`)
      .join(', ');

    const values = records.flatMap((record) =>
      columnNames.map((col) => record[col] ?? null)
    );

    // Build update clause with safe column names
    const updateCols = safeColumns
      .filter((_, idx) => !uniqueKey.includes(columnNames[idx]))
      .map((safeCol) => `${safeCol} = EXCLUDED.${safeCol}`)
      .join(', ');

    // Safely quote unique key columns
    const safeUniqueKey = quoteColumns(uniqueKey);

    // Use safe (quoted) identifiers for table, columns, and unique key
    const sql = `
      INSERT INTO ${safeTableName} (${safeColumns.join(', ')}) 
      VALUES ${placeholders}
      ON CONFLICT (${safeUniqueKey.join(', ')}) 
      DO UPDATE SET ${updateCols}
    `;
    
    await prismaData.$executeRawUnsafe(sql, ...values);
  }
}

export const importService = new ImportService();

