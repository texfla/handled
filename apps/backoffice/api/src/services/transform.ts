/**
 * Transformation Service
 * 
 * Executes transformations that convert workspace data into reference data.
 */

import { prismaData } from '../db/index.js';
import { safeTableName } from '../db/sql-utils.js';
import type { Transformation, TransformationResult } from '../transformations/types.js';

export class TransformService {
  /**
   * Run a transformation
   * - Truncates the target table
   * - Runs the transformation SQL
   * - Returns the result
   * 
   * All transformations work with workspace and reference schemas (DATA DB)
   */
  async runTransformation(transformation: Transformation): Promise<TransformationResult> {
    const startTime = Date.now();
    
    try {
      // Validate and safely quote the target table name
      const safeTarget = safeTableName(transformation.targetTable, 'reference');
      
      // Get the SQL
      const insertSql = transformation.getSql();
      
      // Run in a transaction: truncate + insert (use DATA DB)
      // Extended timeout for large transformations (5 minutes)
      await prismaData.$transaction(async (tx) => {
        // Truncate target table (using safe identifier)
        await tx.$executeRawUnsafe(`TRUNCATE TABLE ${safeTarget}`);
        
        // Run the transformation
        const affected = await tx.$executeRawUnsafe(insertSql);
        
        return affected;
      }, {
        timeout: 300000, // 5 minutes
        maxWait: 10000,  // 10 seconds to acquire connection
      });
      
      const duration = Date.now() - startTime;
      
      // Get actual row count (using safe identifier)
      const countResult = await prismaData.$queryRawUnsafe(
        `SELECT COUNT(*) as count FROM ${safeTarget}`
      ) as Array<{ count: bigint }>;
      const recordsAffected = Number(countResult[0]?.count ?? 0);

      const { info } = await import('../lib/logger.js');
      info(`Transformation ${transformation.id} completed: ${recordsAffected} records in ${duration}ms`);
      
      return {
        success: true,
        recordsAffected,
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const message = error instanceof Error ? error.message : 'Transformation failed';
      
      console.error(`Transformation ${transformation.id} failed:`, message);
      
      return {
        success: false,
        recordsAffected: 0,
        duration,
        error: message,
      };
    }
  }
  
  /**
   * Run multiple transformations in order, respecting dependencies
   */
  async runTransformations(transformations: Transformation[]): Promise<Map<string, TransformationResult>> {
    const results = new Map<string, TransformationResult>();
    const completed = new Set<string>();
    
    // Simple topological sort based on dependencies
    const pending = [...transformations];
    
    while (pending.length > 0) {
      const readyIndex = pending.findIndex((t) => {
        const deps = t.dependencies ?? [];
        return deps.every((d) => completed.has(d));
      });
      
      if (readyIndex === -1) {
        // No transformation is ready - circular dependency or missing dependency
        for (const t of pending) {
          results.set(t.id, {
            success: false,
            recordsAffected: 0,
            duration: 0,
            error: `Unmet dependencies: ${t.dependencies?.join(', ')}`,
          });
        }
        break;
      }
      
      const transformation = pending.splice(readyIndex, 1)[0];
      const result = await this.runTransformation(transformation);
      results.set(transformation.id, result);
      
      if (result.success) {
        completed.add(transformation.id);
      }
    }
    
    return results;
  }
}

export const transformService = new TransformService();

