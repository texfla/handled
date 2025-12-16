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
  VIEW_USERS: 'view_users',
  VIEW_ROLES: 'view_roles',
  
  // Data management permissions (legacy - now under integrations)
  VIEW_DATA: 'view_data',
  IMPORT_DATA: 'import_data',
  EXPORT_DATA: 'export_data',
  RUN_TRANSFORMATIONS: 'run_transformations',

  // 3PL Module permissions
  VIEW_DASHBOARD: 'view_dashboard',
  VIEW_CLIENTS: 'view_clients',
  MANAGE_CLIENTS: 'manage_clients',
  VIEW_WAREHOUSES: 'view_warehouses',
  MANAGE_WAREHOUSES: 'manage_warehouses',
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

export const PERMISSION_CATEGORIES = {
  ADMIN: 'admin',
  DATA: 'data',
  OPERATIONS: 'operations',
  CLIENTS: 'clients',
  INVENTORY: 'inventory',
  FULFILLMENT: 'fulfillment',
  BILLING: 'billing',
  REPORTS: 'reports',
  INTEGRATIONS: 'integrations',
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
  // Admin
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
  [PERMISSIONS.VIEW_USERS]: {
    name: 'View Users',
    description: 'View user list and details',
    category: PERMISSION_CATEGORIES.ADMIN,
  },
  [PERMISSIONS.VIEW_ROLES]: {
    name: 'View Roles',
    description: 'View role structure and permissions',
    category: PERMISSION_CATEGORIES.ADMIN,
  },

  // Legacy Data (now Integrations)
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

  // Dashboard
  [PERMISSIONS.VIEW_DASHBOARD]: {
    name: 'View Dashboard',
    description: 'Access system dashboard and overview',
    category: PERMISSION_CATEGORIES.ADMIN,
  },

  // Clients
  [PERMISSIONS.VIEW_CLIENTS]: {
    name: 'View Clients',
    description: 'View client information and contracts',
    category: PERMISSION_CATEGORIES.CLIENTS,
  },
  [PERMISSIONS.MANAGE_CLIENTS]: {
    name: 'Manage Clients',
    description: 'Create and modify client records',
    category: PERMISSION_CATEGORIES.CLIENTS,
  },

  // Warehouses
  [PERMISSIONS.VIEW_WAREHOUSES]: {
    name: 'View Warehouses',
    description: 'View warehouse facilities and capacity',
    category: PERMISSION_CATEGORIES.OPERATIONS,
  },
  [PERMISSIONS.MANAGE_WAREHOUSES]: {
    name: 'Manage Warehouses',
    description: 'Create and modify warehouse facilities',
    category: PERMISSION_CATEGORIES.OPERATIONS,
  },

  // Inventory
  [PERMISSIONS.VIEW_INVENTORY]: {
    name: 'View Inventory',
    description: 'View stock levels and locations',
    category: PERMISSION_CATEGORIES.INVENTORY,
  },
  [PERMISSIONS.MANAGE_INVENTORY]: {
    name: 'Manage Inventory',
    description: 'Adjust inventory and manage locations',
    category: PERMISSION_CATEGORIES.INVENTORY,
  },

  // Receiving
  [PERMISSIONS.VIEW_RECEIVING]: {
    name: 'View Receiving',
    description: 'View inbound shipments and receipts',
    category: PERMISSION_CATEGORIES.OPERATIONS,
  },
  [PERMISSIONS.MANAGE_RECEIVING]: {
    name: 'Manage Receiving',
    description: 'Process receipts and putaway tasks',
    category: PERMISSION_CATEGORIES.OPERATIONS,
  },

  // Orders
  [PERMISSIONS.VIEW_ORDERS]: {
    name: 'View Orders',
    description: 'View order details and status',
    category: PERMISSION_CATEGORIES.FULFILLMENT,
  },
  [PERMISSIONS.MANAGE_ORDERS]: {
    name: 'Manage Orders',
    description: 'Process picks, packs, and shipments',
    category: PERMISSION_CATEGORIES.FULFILLMENT,
  },

  // Shipping
  [PERMISSIONS.VIEW_SHIPPING]: {
    name: 'View Shipping',
    description: 'View shipments and tracking',
    category: PERMISSION_CATEGORIES.FULFILLMENT,
  },
  [PERMISSIONS.MANAGE_SHIPPING]: {
    name: 'Manage Shipping',
    description: 'Create shipments and print labels',
    category: PERMISSION_CATEGORIES.FULFILLMENT,
  },

  // Returns
  [PERMISSIONS.VIEW_RETURNS]: {
    name: 'View Returns',
    description: 'View return requests and status',
    category: PERMISSION_CATEGORIES.FULFILLMENT,
  },
  [PERMISSIONS.MANAGE_RETURNS]: {
    name: 'Manage Returns',
    description: 'Process returns and dispositions',
    category: PERMISSION_CATEGORIES.FULFILLMENT,
  },

  // Billing
  [PERMISSIONS.VIEW_BILLING]: {
    name: 'View Billing',
    description: 'View invoices and payments',
    category: PERMISSION_CATEGORIES.BILLING,
  },
  [PERMISSIONS.MANAGE_BILLING]: {
    name: 'Manage Billing',
    description: 'Create invoices and process payments',
    category: PERMISSION_CATEGORIES.BILLING,
  },

  // Operations
  [PERMISSIONS.VIEW_OPERATIONS]: {
    name: 'View Operations',
    description: 'View labor and productivity metrics',
    category: PERMISSION_CATEGORIES.OPERATIONS,
  },
  [PERMISSIONS.MANAGE_OPERATIONS]: {
    name: 'Manage Operations',
    description: 'Manage tasks and warehouse operations',
    category: PERMISSION_CATEGORIES.OPERATIONS,
  },

  // Reports
  [PERMISSIONS.VIEW_REPORTS]: {
    name: 'View Reports',
    description: 'Access reports and analytics',
    category: PERMISSION_CATEGORIES.REPORTS,
  },

  // Integrations
  [PERMISSIONS.VIEW_INTEGRATIONS]: {
    name: 'View Integrations',
    description: 'View integration status and logs',
    category: PERMISSION_CATEGORIES.INTEGRATIONS,
  },
  [PERMISSIONS.MANAGE_INTEGRATIONS]: {
    name: 'Manage Integrations',
    description: 'Configure and run integrations',
    category: PERMISSION_CATEGORIES.INTEGRATIONS,
  },

  // Settings
  [PERMISSIONS.VIEW_SETTINGS]: {
    name: 'View Settings',
    description: 'View system settings',
    category: PERMISSION_CATEGORIES.ADMIN,
  },
  [PERMISSIONS.MANAGE_SETTINGS]: {
    name: 'Manage Settings',
    description: 'Modify system configuration',
    category: PERMISSION_CATEGORIES.ADMIN,
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

