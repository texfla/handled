/**
 * Permission Implications
 * 
 * Some permissions logically imply others. For example:
 * - Managing users requires viewing roles (for assignment dropdown)
 * - Managing anything implies viewing it
 * 
 * This allows role definitions to be cleaner and more maintainable.
 */

export const PERMISSION_IMPLICATIONS: Record<string, string[]> = {
  // Admin implications
  'manage_users': ['view_roles'],  // Key: Superuser can assign roles
  'manage_roles': ['view_roles', 'view_users'],
  
  // Operational implications (manage implies view)
  'manage_orders': ['view_orders'],
  'manage_inventory': ['view_inventory'],
  'manage_clients': ['view_clients'],
  'manage_receiving': ['view_receiving'],
  'manage_shipping': ['view_shipping'],
  'manage_returns': ['view_returns'],
  'manage_billing': ['view_billing'],
};

/**
 * Check if user has effective permission
 * 
 * Checks both direct permissions and implied permissions.
 * Example: User with 'manage_users' effectively has 'view_roles'
 */
export function hasEffectivePermission(
  userPermissions: string[], 
  requiredPermission: string
): boolean {
  // Direct match
  if (userPermissions.includes(requiredPermission)) {
    return true;
  }
  
  // Check implications
  for (const [grantedPerm, impliedPerms] of Object.entries(PERMISSION_IMPLICATIONS)) {
    if (userPermissions.includes(grantedPerm) && impliedPerms.includes(requiredPermission)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Get all effective permissions for a user
 * 
 * Returns array including both direct and implied permissions.
 * Useful for frontend to understand full permission set.
 */
export function getEffectivePermissions(userPermissions: string[]): string[] {
  const effective = new Set(userPermissions);
  
  for (const grantedPerm of userPermissions) {
    const implied = PERMISSION_IMPLICATIONS[grantedPerm];
    if (implied) {
      implied.forEach(p => effective.add(p));
    }
  }
  
  return Array.from(effective);
}

