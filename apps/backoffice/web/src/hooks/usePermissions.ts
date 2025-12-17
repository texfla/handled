import { useAuth } from './useAuth';

export const PERMISSIONS = {
  // Admin permissions
  VIEW_DASHBOARD: 'view_dashboard',
  VIEW_USERS: 'view_users',
  MANAGE_USERS: 'manage_users',
  VIEW_ROLES: 'view_roles',
  MANAGE_ROLES: 'manage_roles',
  VIEW_SETTINGS: 'view_settings',
  MANAGE_SETTINGS: 'manage_settings',
  
  // Operations permissions
  VIEW_CLIENTS: 'view_clients',
  MANAGE_CLIENTS: 'manage_clients',
  VIEW_WAREHOUSES: 'view_warehouses',
  MANAGE_WAREHOUSES: 'manage_warehouses',
  VIEW_INVENTORY: 'view_inventory',
  MANAGE_INVENTORY: 'manage_inventory',
  VIEW_RECEIVING: 'view_receiving',
  MANAGE_RECEIVING: 'manage_receiving',
  VIEW_OPERATIONS: 'view_operations',
  MANAGE_OPERATIONS: 'manage_operations',
  VIEW_ORDERS: 'view_orders',
  MANAGE_ORDERS: 'manage_orders',
  VIEW_SHIPPING: 'view_shipping',
  MANAGE_SHIPPING: 'manage_shipping',
  VIEW_RETURNS: 'view_returns',
  MANAGE_RETURNS: 'manage_returns',
  VIEW_BILLING: 'view_billing',
  MANAGE_BILLING: 'manage_billing',
  VIEW_REPORTS: 'view_reports',
  
  // Integration permissions
  VIEW_INTEGRATIONS: 'view_integrations',
  MANAGE_INTEGRATIONS: 'manage_integrations',

  // Demographics data permissions
  VIEW_DEMOGRAPHICS: 'view_demographics',
  MANAGE_DEMOGRAPHICS: 'manage_demographics',
  IMPORT_DEMOGRAPHICS: 'import_demographics',
  EXPORT_DEMOGRAPHICS: 'export_demographics',

  // Carrier rates permissions
  VIEW_CARRIER_RATES: 'view_carrier_rates',
  MANAGE_CARRIER_RATES: 'manage_carrier_rates',
  IMPORT_CARRIER_RATES: 'import_carrier_rates',
  EXPORT_CARRIER_RATES: 'export_carrier_rates',

  // Transformations permissions
  VIEW_TRANSFORMATIONS: 'view_transformations',
  MANAGE_TRANSFORMATIONS: 'manage_transformations',

  // Design system permissions
  VIEW_DESIGNS: 'view_designs',
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

// Match backend permission implications
const PERMISSION_IMPLICATIONS: Record<string, string[]> = {
  'manage_users': ['view_roles'],
  'manage_roles': ['view_roles', 'view_users'],
  'manage_settings': ['view_settings'],
  'manage_clients': ['view_clients'],
  'manage_warehouses': ['view_warehouses'],
  'manage_inventory': ['view_inventory'],
  'manage_receiving': ['view_receiving'],
  'manage_operations': ['view_operations'],
  'manage_orders': ['view_orders'],
  'manage_shipping': ['view_shipping'],
  'manage_returns': ['view_returns'],
  'manage_billing': ['view_billing'],
  'manage_demographics': ['view_demographics'],
  'manage_carrier_rates': ['view_carrier_rates'],
  'manage_transformations': ['view_transformations'],
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

