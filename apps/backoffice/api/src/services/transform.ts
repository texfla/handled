/**
 * Transformation Service
 * 
 * Executes transformations that convert workspace data into reference data.
 */

import { prisma } from '../db/index.js';
import type { Transformation, TransformationResult } from '../transformations/types.js';

export class TransformService {
  /**
   * Run a transformation
   * - Truncates the target table
   * - Runs the transformation SQL
   * - Returns the result
   */
  async runTransformation(transformation: Transformation): Promise<TransformationResult> {
    const startTime = Date.now();
    
    try {
      // Get the SQL
      const insertSql = transformation.getSql();
      
      // Run in a transaction: truncate + insert
      // Extended timeout for large transformations (5 minutes)
      await prisma.$transaction(async (tx) => {
        // Truncate target table
        await tx.$executeRawUnsafe(`TRUNCATE TABLE ${transformation.targetTable}`);
        
        // Run the transformation
        const affected = await tx.$executeRawUnsafe(insertSql);
        
        return affected;
      }, {
        timeout: 300000, // 5 minutes
        maxWait: 10000,  // 10 seconds to acquire connection
      });
      
      const duration = Date.now() - startTime;
      
      // Get actual row count
      const countResult = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
        `SELECT COUNT(*) as count FROM ${transformation.targetTable}`
      );
      const recordsAffected = Number(countResult[0]?.count ?? 0);
      
      console.log(`Transformation ${transformation.id} completed: ${recordsAffected} records in ${duration}ms`);
      
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

