/**
 * Input validation utilities
 */

// Valid icon names from role-icons.ts (frontend)
const VALID_ICON_NAMES = [
  'shield', 'shield-check', 'crown', 'user-cog', 'users',
  'package', 'package-check', 'warehouse', 'truck',
  'dollar-sign', 'calculator', 'briefcase',
  'trending-up', 'target', 'message-square', 'headphones',
  'clipboard-list', 'file-text', 'bar-chart-3',
  'settings', 'wrench',
] as const;

type ValidIcon = typeof VALID_ICON_NAMES[number];

/**
 * Validate icon name against whitelist
 */
export function isValidIcon(icon: string): icon is ValidIcon {
  return VALID_ICON_NAMES.includes(icon as ValidIcon);
}

/**
 * Sanitize and generate a valid role code from a name
 * - Converts to lowercase
 * - Replaces invalid characters with underscores
 * - Trims leading/trailing underscores
 * - Collapses multiple underscores
 * - Ensures minimum length
 */
export function generateRoleCode(name: string): string {
  if (!name || typeof name !== 'string') {
    throw new Error('Role name must be a non-empty string');
  }

  const sanitized = name
    .toLowerCase()
    .trim()
    // Replace any non-alphanumeric characters with underscore
    .replace(/[^a-z0-9]+/g, '_')
    // Remove leading/trailing underscores
    .replace(/^_+|_+$/g, '')
    // Collapse multiple underscores into one
    .replace(/_+/g, '_');

  if (sanitized.length < 2) {
    throw new Error('Role name too short (must produce at least 2 characters after sanitization)');
  }

  if (sanitized.length > 50) {
    throw new Error('Role name too long (maximum 50 characters after sanitization)');
  }

  return sanitized;
}

/**
 * Validate role name
 */
export function validateRoleName(name: unknown): { valid: boolean; error?: string } {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: 'Role name must be a string' };
  }

  const trimmed = name.trim();

  if (trimmed.length === 0) {
    return { valid: false, error: 'Role name is required' };
  }

  if (trimmed.length < 2) {
    return { valid: false, error: 'Role name must be at least 2 characters' };
  }

  if (trimmed.length > 100) {
    return { valid: false, error: 'Role name must be at most 100 characters' };
  }

  // Check if it would generate a valid code
  try {
    generateRoleCode(trimmed);
  } catch (error) {
    return { 
      valid: false, 
      error: error instanceof Error ? error.message : 'Invalid role name'
    };
  }

  return { valid: true };
}

/**
 * Validate description
 */
export function validateDescription(description: unknown): { valid: boolean; error?: string } {
  if (description === null || description === undefined || description === '') {
    return { valid: true }; // Optional field
  }

  if (typeof description !== 'string') {
    return { valid: false, error: 'Description must be a string' };
  }

  if (description.length > 500) {
    return { valid: false, error: 'Description must be at most 500 characters' };
  }

  return { valid: true };
}

/**
 * Validate permissions array
 */
export function validatePermissions(permissions: unknown): { valid: boolean; error?: string } {
  if (!Array.isArray(permissions)) {
    return { valid: false, error: 'Permissions must be an array' };
  }

  if (permissions.length === 0) {
    return { valid: false, error: 'At least one permission is required' };
  }

  if (permissions.length > 100) {
    return { valid: false, error: 'Too many permissions (maximum 100)' };
  }

  // Check all items are strings
  if (!permissions.every(p => typeof p === 'string')) {
    return { valid: false, error: 'All permissions must be strings' };
  }

  // Check for duplicates
  const unique = new Set(permissions);
  if (unique.size !== permissions.length) {
    return { valid: false, error: 'Duplicate permissions detected' };
  }

  // Check permission code format (should match database)
  const validFormat = /^[a-z0-9_]+$/;
  const invalidPerms = permissions.filter(p => !validFormat.test(p));
  if (invalidPerms.length > 0) {
    return { 
      valid: false, 
      error: `Invalid permission format: ${invalidPerms.slice(0, 3).join(', ')}${invalidPerms.length > 3 ? '...' : ''}`
    };
  }

  return { valid: true };
}
