/**
 * Permission Constants
 * 
 * Centralized definition of all system permissions.
 * These must match the permission codes seeded in the database.
 */

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
  VIEW_ORDERS: 'view_orders',
  MANAGE_ORDERS: 'manage_orders',
  VIEW_SHIPPING: 'view_shipping',
  MANAGE_SHIPPING: 'manage_shipping',
  VIEW_RETURNS: 'view_returns',
  MANAGE_RETURNS: 'manage_returns',
  VIEW_OPERATIONS: 'view_operations',
  MANAGE_OPERATIONS: 'manage_operations',

  // Billing permissions
  VIEW_BILLING: 'view_billing',
  MANAGE_BILLING: 'manage_billing',

  // Reports permissions
  VIEW_REPORTS: 'view_reports',

  // Integrations permissions
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
  DESIGNS: 'designs',
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
  resource: string;
  action: string;
}> = {
  // Admin
  [PERMISSIONS.MANAGE_USERS]: {
    name: 'Manage Users',
    description: 'Create, edit, and delete user accounts',
    category: PERMISSION_CATEGORIES.ADMIN,
    resource: 'users',
    action: 'manage'
  },
  [PERMISSIONS.MANAGE_ROLES]: {
    name: 'Manage Roles',
    description: 'Configure role permissions',
    category: PERMISSION_CATEGORIES.ADMIN,
    resource: 'roles',
    action: 'manage'
  },
  [PERMISSIONS.VIEW_USERS]: {
    name: 'View Users',
    description: 'View user list and details',
    category: PERMISSION_CATEGORIES.ADMIN,
    resource: 'users',
    action: 'view'
  },
  [PERMISSIONS.VIEW_ROLES]: {
    name: 'View Roles',
    description: 'View role structure and permissions',
    category: PERMISSION_CATEGORIES.ADMIN,
    resource: 'roles',
    action: 'view'
  },

  // Dashboard
  [PERMISSIONS.VIEW_DASHBOARD]: {
    name: 'View Dashboard',
    description: 'Access system dashboard and overview',
    category: PERMISSION_CATEGORIES.ADMIN,
    resource: 'dashboard',
    action: 'view'
  },

  // Settings
  [PERMISSIONS.VIEW_SETTINGS]: {
    name: 'View Settings',
    description: 'View system settings',
    category: PERMISSION_CATEGORIES.ADMIN,
    resource: 'settings',
    action: 'view'
  },
  [PERMISSIONS.MANAGE_SETTINGS]: {
    name: 'Manage Settings',
    description: 'Modify system configuration',
    category: PERMISSION_CATEGORIES.ADMIN,
    resource: 'settings',
    action: 'manage'
  },

  // Clients
  [PERMISSIONS.VIEW_CLIENTS]: {
    name: 'View Clients',
    description: 'View client information and contracts',
    category: PERMISSION_CATEGORIES.CLIENTS,
    resource: 'clients',
    action: 'view'
  },
  [PERMISSIONS.MANAGE_CLIENTS]: {
    name: 'Manage Clients',
    description: 'Create and modify client records',
    category: PERMISSION_CATEGORIES.CLIENTS,
    resource: 'clients',
    action: 'manage'
  },

  // Warehouses
  [PERMISSIONS.VIEW_WAREHOUSES]: {
    name: 'View Warehouses',
    description: 'View warehouse facilities and capacity',
    category: PERMISSION_CATEGORIES.OPERATIONS,
    resource: 'warehouses',
    action: 'view'
  },
  [PERMISSIONS.MANAGE_WAREHOUSES]: {
    name: 'Manage Warehouses',
    description: 'Create and modify warehouse facilities',
    category: PERMISSION_CATEGORIES.OPERATIONS,
    resource: 'warehouses',
    action: 'manage'
  },

  // Inventory
  [PERMISSIONS.VIEW_INVENTORY]: {
    name: 'View Inventory',
    description: 'View stock levels and locations',
    category: PERMISSION_CATEGORIES.INVENTORY,
    resource: 'inventory',
    action: 'view'
  },
  [PERMISSIONS.MANAGE_INVENTORY]: {
    name: 'Manage Inventory',
    description: 'Adjust inventory and manage locations',
    category: PERMISSION_CATEGORIES.INVENTORY,
    resource: 'inventory',
    action: 'manage'
  },

  // Receiving
  [PERMISSIONS.VIEW_RECEIVING]: {
    name: 'View Receiving',
    description: 'View inbound shipments and receipts',
    category: PERMISSION_CATEGORIES.OPERATIONS,
    resource: 'receiving',
    action: 'view'
  },
  [PERMISSIONS.MANAGE_RECEIVING]: {
    name: 'Manage Receiving',
    description: 'Process receipts and putaway tasks',
    category: PERMISSION_CATEGORIES.OPERATIONS,
    resource: 'receiving',
    action: 'manage'
  },

  // Orders
  [PERMISSIONS.VIEW_ORDERS]: {
    name: 'View Orders',
    description: 'View order details and status',
    category: PERMISSION_CATEGORIES.FULFILLMENT,
    resource: 'orders',
    action: 'view'
  },
  [PERMISSIONS.MANAGE_ORDERS]: {
    name: 'Manage Orders',
    description: 'Process picks, packs, and shipments',
    category: PERMISSION_CATEGORIES.FULFILLMENT,
    resource: 'orders',
    action: 'manage'
  },

  // Shipping
  [PERMISSIONS.VIEW_SHIPPING]: {
    name: 'View Shipping',
    description: 'View shipments and tracking',
    category: PERMISSION_CATEGORIES.FULFILLMENT,
    resource: 'shipping',
    action: 'view'
  },
  [PERMISSIONS.MANAGE_SHIPPING]: {
    name: 'Manage Shipping',
    description: 'Create shipments and print labels',
    category: PERMISSION_CATEGORIES.FULFILLMENT,
    resource: 'shipping',
    action: 'manage'
  },

  // Returns
  [PERMISSIONS.VIEW_RETURNS]: {
    name: 'View Returns',
    description: 'View return requests and status',
    category: PERMISSION_CATEGORIES.FULFILLMENT,
    resource: 'returns',
    action: 'view'
  },
  [PERMISSIONS.MANAGE_RETURNS]: {
    name: 'Manage Returns',
    description: 'Process returns and dispositions',
    category: PERMISSION_CATEGORIES.FULFILLMENT,
    resource: 'returns',
    action: 'manage'
  },

  // Billing
  [PERMISSIONS.VIEW_BILLING]: {
    name: 'View Billing',
    description: 'View invoices and payments',
    category: PERMISSION_CATEGORIES.BILLING,
    resource: 'billing',
    action: 'view'
  },
  [PERMISSIONS.MANAGE_BILLING]: {
    name: 'Manage Billing',
    description: 'Create invoices and process payments',
    category: PERMISSION_CATEGORIES.BILLING,
    resource: 'billing',
    action: 'manage'
  },

  // Operations
  [PERMISSIONS.VIEW_OPERATIONS]: {
    name: 'View Operations',
    description: 'View labor and productivity metrics',
    category: PERMISSION_CATEGORIES.OPERATIONS,
    resource: 'operations',
    action: 'view'
  },
  [PERMISSIONS.MANAGE_OPERATIONS]: {
    name: 'Manage Operations',
    description: 'Manage tasks and warehouse operations',
    category: PERMISSION_CATEGORIES.OPERATIONS,
    resource: 'operations',
    action: 'manage'
  },

  // Reports
  [PERMISSIONS.VIEW_REPORTS]: {
    name: 'View Reports',
    description: 'Access reports and analytics',
    category: PERMISSION_CATEGORIES.REPORTS,
    resource: 'reports',
    action: 'view'
  },

  // Integrations
  [PERMISSIONS.VIEW_INTEGRATIONS]: {
    name: 'View Integrations',
    description: 'View integration status and logs',
    category: PERMISSION_CATEGORIES.INTEGRATIONS,
    resource: 'integrations',
    action: 'view'
  },
  [PERMISSIONS.MANAGE_INTEGRATIONS]: {
    name: 'Manage Integrations',
    description: 'Configure and run integrations',
    category: PERMISSION_CATEGORIES.INTEGRATIONS,
    resource: 'integrations',
    action: 'manage'
  },

  // Demographics data
  [PERMISSIONS.VIEW_DEMOGRAPHICS]: {
    name: 'View Demographics',
    description: 'View demographic and ZIP code data',
    category: PERMISSION_CATEGORIES.DATA,
    resource: 'demographics',
    action: 'view'
  },
  [PERMISSIONS.MANAGE_DEMOGRAPHICS]: {
    name: 'Manage Demographics',
    description: 'Manage demographic data and ZIP codes',
    category: PERMISSION_CATEGORIES.DATA,
    resource: 'demographics',
    action: 'manage'
  },
  [PERMISSIONS.IMPORT_DEMOGRAPHICS]: {
    name: 'Import Demographics',
    description: 'Upload demographic and ZIP code files',
    category: PERMISSION_CATEGORIES.DATA,
    resource: 'demographics',
    action: 'import'
  },
  [PERMISSIONS.EXPORT_DEMOGRAPHICS]: {
    name: 'Export Demographics',
    description: 'Download demographic data',
    category: PERMISSION_CATEGORIES.DATA,
    resource: 'demographics',
    action: 'export'
  },

  // Carrier rates
  [PERMISSIONS.VIEW_CARRIER_RATES]: {
    name: 'View Carrier Rates',
    description: 'View carrier pricing and zone data',
    category: PERMISSION_CATEGORIES.DATA,
    resource: 'carrier_rates',
    action: 'view'
  },
  [PERMISSIONS.MANAGE_CARRIER_RATES]: {
    name: 'Manage Carrier Rates',
    description: 'Manage carrier pricing data',
    category: PERMISSION_CATEGORIES.DATA,
    resource: 'carrier_rates',
    action: 'manage'
  },
  [PERMISSIONS.IMPORT_CARRIER_RATES]: {
    name: 'Import Carrier Rates',
    description: 'Upload carrier rate and zone files',
    category: PERMISSION_CATEGORIES.DATA,
    resource: 'carrier_rates',
    action: 'import'
  },
  [PERMISSIONS.EXPORT_CARRIER_RATES]: {
    name: 'Export Carrier Rates',
    description: 'Download carrier rate data',
    category: PERMISSION_CATEGORIES.DATA,
    resource: 'carrier_rates',
    action: 'export'
  },

  // Transformations
  [PERMISSIONS.VIEW_TRANSFORMATIONS]: {
    name: 'View Transformations',
    description: 'View transformation history and status',
    category: PERMISSION_CATEGORIES.DATA,
    resource: 'transformations',
    action: 'view'
  },
  [PERMISSIONS.MANAGE_TRANSFORMATIONS]: {
    name: 'Manage Transformations',
    description: 'Execute and configure transformations',
    category: PERMISSION_CATEGORIES.DATA,
    resource: 'transformations',
    action: 'manage'
  },

  // Design system permissions
  [PERMISSIONS.VIEW_DESIGNS]: {
    name: 'View Designs',
    description: 'Access component library, style guide, and design patterns',
    category: PERMISSION_CATEGORIES.DESIGNS,
    resource: 'designs',
    action: 'view'
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

