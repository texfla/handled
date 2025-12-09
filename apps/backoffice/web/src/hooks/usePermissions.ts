import { useAuth } from './useAuth';

export const PERMISSIONS = {
  // Admin permissions
  MANAGE_USERS: 'manage_users',
  MANAGE_ROLES: 'manage_roles',
  
  // Data management permissions (legacy - now under integrations)
  VIEW_DATA: 'view_data',
  IMPORT_DATA: 'import_data',
  EXPORT_DATA: 'export_data',
  RUN_TRANSFORMATIONS: 'run_transformations',

  // 3PL Module permissions
  VIEW_DASHBOARD: 'view_dashboard',
  VIEW_CLIENTS: 'view_clients',
  MANAGE_CLIENTS: 'manage_clients',
  VIEW_INVENTORY: 'view_inventory',
  MANAGE_INVENTORY: 'manage_inventory',
  VIEW_RECEIVING: 'view_receiving',
  MANAGE_RECEIVING: 'manage_receiving',
  VIEW_ORDERS: 'view_orders',
  MANAGE_ORDERS: 'manage_orders',
  VIEW_SHIPPING: 'view_shipping',
  MANAGE_SHIPPING: 'manage_shipping',
  VIEW_RETURNS: 'view_returns',
  MANAGE_RETURNS: 'manage_returns',
  VIEW_BILLING: 'view_billing',
  MANAGE_BILLING: 'manage_billing',
  VIEW_OPERATIONS: 'view_operations',
  MANAGE_OPERATIONS: 'manage_operations',
  VIEW_REPORTS: 'view_reports',
  VIEW_INTEGRATIONS: 'view_integrations',
  MANAGE_INTEGRATIONS: 'manage_integrations',
  VIEW_SETTINGS: 'view_settings',
  MANAGE_SETTINGS: 'manage_settings',
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

export function usePermissions() {
  const { user } = useAuth();
  
  const hasPermission = (permission: Permission | string): boolean => {
    if (!user || !user.permissions) return false;
    return user.permissions.includes(permission);
  };
  
  const hasAnyPermission = (...permissions: (Permission | string)[]): boolean => {
    if (!user || !user.permissions) return false;
    return permissions.some(p => user.permissions!.includes(p));
  };
  
  const hasAllPermissions = (...permissions: (Permission | string)[]): boolean => {
    if (!user || !user.permissions) return false;
    return permissions.every(p => user.permissions!.includes(p));
  };

  const isAdmin = (): boolean => {
    return user?.roleCode === 'admin';
  };
  
  return { 
    hasPermission, 
    hasAnyPermission, 
    hasAllPermissions,
    isAdmin,
    permissions: user?.permissions || [],
  };
}

