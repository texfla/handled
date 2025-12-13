import { useAuth } from './useAuth';

export const PERMISSIONS = {
  // Admin permissions
  MANAGE_USERS: 'manage_users',
  MANAGE_ROLES: 'manage_roles',
  VIEW_USERS: 'view_users',
  VIEW_ROLES: 'view_roles',
  
  // Operations permissions
  VIEW_ORDERS: 'view_orders',
  MANAGE_ORDERS: 'manage_orders',
  VIEW_INVENTORY: 'view_inventory',
  MANAGE_INVENTORY: 'manage_inventory',
  VIEW_CLIENTS: 'view_clients',
  MANAGE_CLIENTS: 'manage_clients',
  VIEW_RECEIVING: 'view_receiving',
  MANAGE_RECEIVING: 'manage_receiving',
  VIEW_SHIPPING: 'view_shipping',
  MANAGE_SHIPPING: 'manage_shipping',
  VIEW_RETURNS: 'view_returns',
  MANAGE_RETURNS: 'manage_returns',
  VIEW_BILLING: 'view_billing',
  MANAGE_BILLING: 'manage_billing',
  VIEW_REPORTS: 'view_reports',
  
  // Integration permissions
  VIEW_INTEGRATIONS: 'view_integrations',
  IMPORT_DATA: 'import_data',
  EXPORT_DATA: 'export_data',
  RUN_TRANSFORMATIONS: 'run_transformations',
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

// Match backend permission implications
const PERMISSION_IMPLICATIONS: Record<string, string[]> = {
  'manage_users': ['view_roles'],
  'manage_roles': ['view_roles', 'view_users'],
  'manage_orders': ['view_orders'],
  'manage_inventory': ['view_inventory'],
  'manage_clients': ['view_clients'],
  'manage_receiving': ['view_receiving'],
  'manage_shipping': ['view_shipping'],
  'manage_returns': ['view_returns'],
  'manage_billing': ['view_billing'],
};

function hasEffectivePermission(userPermissions: string[], required: string): boolean {
  // Direct match
  if (userPermissions.includes(required)) return true;
  
  // Check implications
  for (const [granted, implied] of Object.entries(PERMISSION_IMPLICATIONS)) {
    if (userPermissions.includes(granted) && implied.includes(required)) {
      return true;
    }
  }
  
  return false;
}

export function usePermissions() {
  const { user } = useAuth();
  
  const hasPermission = (permission: Permission | string): boolean => {
    if (!user || !user.permissions) return false;
    return hasEffectivePermission(user.permissions, permission);
  };
  
  const hasAnyPermission = (...permissions: (Permission | string)[]): boolean => {
    if (!user || !user.permissions) return false;
    return permissions.some(p => hasEffectivePermission(user.permissions, p));
  };
  
  const hasAllPermissions = (...permissions: (Permission | string)[]): boolean => {
    if (!user || !user.permissions) return false;
    return permissions.every(p => hasEffectivePermission(user.permissions, p));
  };
  
  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    permissions: user?.permissions || [],
    roles: user?.roles || [],
    isAdmin: user?.isAdmin || false,
  };
}

