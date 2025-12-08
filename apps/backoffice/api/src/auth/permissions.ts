/**
 * Permission Constants
 * 
 * Centralized definition of all system permissions.
 * These must match the permission codes seeded in the database.
 */

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

export const PERMISSION_CATEGORIES = {
  ADMIN: 'admin',
  DATA: 'data',
  OPERATIONS: 'operations',
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];
export type PermissionCategory = typeof PERMISSION_CATEGORIES[keyof typeof PERMISSION_CATEGORIES];

/**
 * Permission metadata for UI display
 */
export const PERMISSION_INFO: Record<Permission, {
  name: string;
  description: string;
  category: PermissionCategory;
}> = {
  [PERMISSIONS.MANAGE_USERS]: {
    name: 'Manage Users',
    description: 'Create, edit, and delete user accounts',
    category: PERMISSION_CATEGORIES.ADMIN,
  },
  [PERMISSIONS.MANAGE_ROLES]: {
    name: 'Manage Roles',
    description: 'Configure role permissions',
    category: PERMISSION_CATEGORIES.ADMIN,
  },
  [PERMISSIONS.VIEW_DATA]: {
    name: 'View Data',
    description: 'View data and reports',
    category: PERMISSION_CATEGORIES.DATA,
  },
  [PERMISSIONS.IMPORT_DATA]: {
    name: 'Import Data',
    description: 'Upload and import data files',
    category: PERMISSION_CATEGORIES.DATA,
  },
  [PERMISSIONS.EXPORT_DATA]: {
    name: 'Export Data',
    description: 'Download and export data',
    category: PERMISSION_CATEGORIES.DATA,
  },
  [PERMISSIONS.RUN_TRANSFORMATIONS]: {
    name: 'Run Transformations',
    description: 'Execute data transformations',
    category: PERMISSION_CATEGORIES.DATA,
  },
};

/**
 * Get permissions grouped by category
 */
export function getPermissionsByCategory(): Record<PermissionCategory, Permission[]> {
  const grouped: Record<string, Permission[]> = {};
  
  for (const permission of Object.values(PERMISSIONS)) {
    const { category } = PERMISSION_INFO[permission];
    if (!grouped[category]) {
      grouped[category] = [];
    }
    grouped[category].push(permission);
  }
  
  return grouped as Record<PermissionCategory, Permission[]>;
}

