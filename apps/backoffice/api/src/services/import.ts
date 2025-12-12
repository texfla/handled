import { prismaPrimary, prismaData } from '../db/index.js';
import type { Integration, ParsedRecord } from '../integrations/types.js';

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
            errors: validation.errors as any,
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
      const message = error instanceof Error ? error.message : 'Unknown error';
      
      await prismaPrimary.integrationRun.update({
        where: { id: run.id },
        data: {
          status: 'failed',
          completedAt: new Date(),
          errors: { message } as any,
        },
      });
      
      throw error;
    }
  }

  private async insertRecords(
    integration: Integration,
    records: ParsedRecord[]
  ): Promise<{ processed: number; failed: number }> {
    const tableName = `${integration.targetSchema}.${integration.targetTable}`;
    let processed = 0;
    let failed = 0;

    // Build column list from integration definition
    const columns = integration.columns.map((c) => c.name);
    
    // If replace mode, truncate table first (use DATA DB)
    if (integration.importMode === 'replace') {
      await prismaData.$executeRawUnsafe(`TRUNCATE TABLE ${tableName}`);
    }
    
    // Process in batches
    const batchSize = 1000;
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      
      try {
        if (integration.importMode === 'upsert' && integration.uniqueKey) {
          // Upsert using raw SQL
          await this.upsertBatch(tableName, columns, batch, integration.uniqueKey);
        } else {
          // Simple insert
          await this.insertBatch(tableName, columns, batch);
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
    tableName: string,
    columns: string[],
    records: ParsedRecord[]
  ) {
    if (records.length === 0) return;

    const placeholders = records
      .map((_, i) => `(${columns.map((_, j) => `$${i * columns.length + j + 1}`).join(', ')})`)
      .join(', ');

    const values = records.flatMap((record) =>
      columns.map((col) => record[col] ?? null)
    );

    const sql = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES ${placeholders}`;
    await prismaData.$executeRawUnsafe(sql, ...values);
  }

  private async upsertBatch(
    tableName: string,
    columns: string[],
    records: ParsedRecord[],
    uniqueKey: string[]
  ) {
    if (records.length === 0) return;

    const placeholders = records
      .map((_, i) => `(${columns.map((_, j) => `$${i * columns.length + j + 1}`).join(', ')})`)
      .join(', ');

    const values = records.flatMap((record) =>
      columns.map((col) => record[col] ?? null)
    );

    const updateCols = columns
      .filter((c) => !uniqueKey.includes(c))
      .map((c) => `${c} = EXCLUDED.${c}`)
      .join(', ');

    const sql = `
      INSERT INTO ${tableName} (${columns.join(', ')}) 
      VALUES ${placeholders}
      ON CONFLICT (${uniqueKey.join(', ')}) 
      DO UPDATE SET ${updateCols}
    `;
    
    await prismaData.$executeRawUnsafe(sql, ...values);
  }
}

export const importService = new ImportService();

