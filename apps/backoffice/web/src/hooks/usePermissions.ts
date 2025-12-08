import { useAuth } from './useAuth';

export const PERMISSIONS = {
  // Admin permissions
  MANAGE_USERS: 'manage_users',
  MANAGE_ROLES: 'manage_roles',
  
  // Data management permissions
  VIEW_DATA: 'view_data',
  IMPORT_DATA: 'import_data',
  EXPORT_DATA: 'export_data',
  RUN_TRANSFORMATIONS: 'run_transformations',
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

