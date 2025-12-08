/**
 * Transformation Registry
 */

import type { Transformation } from './types.js';
import { zip3Reference } from './zip3-reference.js';
import { deliveryMatrix } from './delivery-matrix.js';

// All registered transformations (order matters for dependencies)
export const transformations: Transformation[] = [
  zip3Reference,
  deliveryMatrix,
];

// Lookup by ID
export function getTransformation(id: string): Transformation | undefined {
  return transformations.find((t) => t.id === id);
}

// Get all transformations
export function getAllTransformations(): Transformation[] {
  return transformations;
}

export type { Transformation, TransformationResult } from './types.js';

