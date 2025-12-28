import {
  LayoutDashboard,
  Users as UsersIcon,
  Package,
  PackageCheck,
  ShoppingCart,
  Truck,
  Undo2,
  Receipt,
  Warehouse,
  BarChart3,
  Plug,
  Shield,
  Code,
  type LucideIcon,
} from 'lucide-react';
import { PERMISSIONS } from '../hooks/usePermissions';

export interface NavItem {
  id: string;
  label: string;
  href: string;
  implemented?: boolean;
  // NEW: Permission requirements
  requiredPermission?: string;
  requiredAnyPermission?: string[];
}

export interface NavSection {
  id: string;
  label: string;
  icon: LucideIcon;
  href?: string;
  implemented?: boolean;
  pinBottom?: boolean;
  // NEW: Permission requirements
  requiredPermission?: string;
  requiredAnyPermission?: string[];
  children?: NavItem[];
}

export const navigation: NavSection[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    href: '/',
    implemented: true,
    // No permission required - always visible
  },
  {
    id: 'clients',
    label: 'Clients',
    icon: UsersIcon,
    href: '/clients',
    implemented: true,
    requiredAnyPermission: ['view_clients', 'manage_clients'],
    children: [
      { id: 'clients-list', label: 'All Clients', href: '/clients', implemented: true, requiredAnyPermission: ['view_clients', 'manage_clients'] },
      { id: 'clients-onboard', label: 'Onboarding', href: '/clients/onboard', implemented: true, requiredPermission: 'manage_clients' },
    ],
  },
  {
    id: 'warehouses',
    label: 'Warehouses',
    icon: Warehouse,
    href: '/warehouses',
    implemented: true,
    requiredAnyPermission: ['view_warehouses', 'manage_warehouses'],
  },
  {
    id: 'inventory',
    label: 'Inventory',
    icon: Package,
    href: '/inventory',
    implemented: false,
    // permission: 'view_inventory', // TODO: Enable after database migration
    children: [
      { id: 'stock-overview', label: 'Stock Overview', href: '/inventory', implemented: false },
      { id: 'locations', label: 'Locations & Bins', href: '/inventory/locations', implemented: false },
      { id: 'lot-serial', label: 'Lot / Serial / Expiry', href: '/inventory/lot-serial', implemented: false },
      { id: 'cycle-counts', label: 'Cycle Counts', href: '/inventory/cycle-counts', implemented: false },
      { id: 'bundles', label: 'Bundles / Kitting', href: '/inventory/bundles', implemented: false },
      { id: 'inbound', label: 'Inbound Planning', href: '/inventory/inbound', implemented: false },
    ],
  },
  {
    id: 'receiving',
    label: 'Receiving',
    icon: PackageCheck,
    href: '/receiving',
    implemented: false,
    // permission: 'view_receiving', // TODO: Enable after database migration
    children: [
      { id: 'expected-receipts', label: 'Expected Receipts', href: '/receiving', implemented: false },
      { id: 'receive', label: 'Receive PO / ASN', href: '/receiving/receive', implemented: false },
      { id: 'putaway', label: 'Putaway Tasks', href: '/receiving/putaway', implemented: false },
      { id: 'quality-hold', label: 'Quality Hold / QC', href: '/receiving/qc', implemented: false },
    ],
  },
  {
    id: 'orders',
    label: 'Orders',
    icon: ShoppingCart,
    href: '/orders',
    implemented: false,
    // permission: 'view_orders', // TODO: Enable after database migration
    children: [
      { id: 'order-list', label: 'Order List', href: '/orders', implemented: false },
      { id: 'import-orders', label: 'Import Orders', href: '/orders/import', implemented: false },
      { id: 'allocation', label: 'Allocation & Waves', href: '/orders/allocation', implemented: false },
      { id: 'pick-lists', label: 'Pick Lists', href: '/orders/picks', implemented: false },
      { id: 'pack-verify', label: 'Pack & Verify', href: '/orders/pack', implemented: false },
      { id: 'problems', label: 'Problem Orders', href: '/orders/problems', implemented: false },
    ],
  },
  {
    id: 'shipping',
    label: 'Shipping',
    icon: Truck,
    href: '/shipping',
    implemented: false,
    // permission: 'view_shipping', // TODO: Enable after database migration
    children: [
      { id: 'shipments', label: 'Shipments Overview', href: '/shipping', implemented: false },
      { id: 'rate-shop', label: 'Rate Shop & Labels', href: '/shipping/rate-shop', implemented: false },
      { id: 'manifests', label: 'Manifests & EOD', href: '/shipping/manifests', implemented: false },
      { id: 'carrier-performance', label: 'Carrier Performance', href: '/shipping/performance', implemented: false },
      { id: 'tracking', label: 'Tracking & Exceptions', href: '/shipping/tracking', implemented: false },
    ],
  },
  {
    id: 'returns',
    label: 'Returns',
    icon: Undo2,
    href: '/returns',
    implemented: false,
    // permission: 'view_returns', // TODO: Enable after database migration
    children: [
      { id: 'return-requests', label: 'Return Requests', href: '/returns', implemented: false },
      { id: 'receive-returns', label: 'Receive Returns', href: '/returns/receive', implemented: false },
      { id: 'disposition', label: 'Disposition', href: '/returns/disposition', implemented: false },
    ],
  },
  {
    id: 'billing',
    label: 'Billing',
    icon: Receipt,
    href: '/billing',
    implemented: false,
    // permission: 'view_billing', // TODO: Enable after database migration
    children: [
      { id: 'invoices', label: 'Invoices', href: '/billing', implemented: false },
      { id: 'storage-billing', label: 'Storage Billing', href: '/billing/storage', implemented: false },
      { id: 'activity-charges', label: 'Activity Charges', href: '/billing/activity', implemented: false },
      { id: 'credit-notes', label: 'Credit Notes', href: '/billing/credits', implemented: false },
      { id: 'payments', label: 'Payments & AR', href: '/billing/payments', implemented: false },
      { id: 'reconciliation', label: 'Reconciliation', href: '/billing/reconciliation', implemented: false },
      { id: 'financial-reports', label: 'Financial Reports', href: '/billing/reports', implemented: false },
    ],
  },
  {
    id: 'operations',
    label: 'Operations',
    icon: Warehouse,
    href: '/operations',
    implemented: false,
    // permission: 'view_operations', // TODO: Enable after database migration
    children: [
      { id: 'tasks', label: 'Tasks & Labor', href: '/operations', implemented: false },
      { id: 'productivity', label: 'Productivity', href: '/operations/productivity', implemented: false },
      { id: 'slotting', label: 'Slotting', href: '/operations/slotting', implemented: false },
      { id: 'equipment', label: 'Equipment', href: '/operations/equipment', implemented: false },
    ],
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: BarChart3,
    href: '/reports',
    implemented: false,
    // permission: 'view_reports', // TODO: Enable after database migration
    children: [
      { id: 'standard-reports', label: 'Standard Reports', href: '/reports', implemented: false },
      { id: 'custom-builder', label: 'Report Builder', href: '/reports/builder', implemented: false },
      { id: 'kpi-dashboards', label: 'KPI Dashboards', href: '/reports/kpi', implemented: false },
      { id: 'client-reports', label: 'Client Reports', href: '/reports/clients', implemented: false },
    ],
  },
  {
    id: 'integrations',
    label: 'Integrations',
    icon: Plug,
    href: '/integrations',
    implemented: true,
    requiredAnyPermission: ['view_integrations', 'import_demographics', 'import_carrier_rates', 'export_demographics', 'export_carrier_rates', 'view_transformations', 'manage_transformations'],
    children: [
      { id: 'integrations-overview', label: 'Overview', href: '/integrations', implemented: true, requiredPermission: 'view_integrations' },
      { id: 'imports', label: 'Import Files', href: '/integrations/imports', implemented: true, requiredAnyPermission: ['import_demographics', 'import_carrier_rates'] },
      { id: 'transformations', label: 'Transformations', href: '/integrations/transformations', implemented: true, requiredAnyPermission: ['view_transformations', 'manage_transformations'] },
      { id: 'exports', label: 'Exports', href: '/integrations/exports', implemented: true, requiredAnyPermission: ['export_demographics', 'export_carrier_rates'] },
      { id: 'channels', label: 'Channels', href: '/integrations/channels', implemented: false },
      { id: 'carriers', label: 'Carriers', href: '/integrations/carriers', implemented: false },
      { id: 'edi', label: 'EDI Status', href: '/integrations/edi', implemented: false },
      { id: 'webhooks', label: 'Webhooks & API', href: '/integrations/webhooks', implemented: false },
    ],
  },
  {
    id: 'administration',
    label: 'Administration',
    icon: Shield,
    href: '/admin',
    implemented: true,
    // Show if user can access ANY admin page
    requiredAnyPermission: ['view_users', 'manage_users', 'view_roles', 'manage_roles'],
    children: [
      { id: 'users', label: 'Users & Roles', href: '/admin/users', implemented: true, requiredAnyPermission: ['view_users', 'manage_users'] },
      { id: 'roles', label: 'Role Permissions', href: '/admin/roles', implemented: true, requiredAnyPermission: ['view_roles', 'manage_roles'] },
      { id: 'company', label: 'Company Settings', href: '/admin/company', implemented: false },
      { id: 'billing-rules', label: 'Billing Rules', href: '/admin/billing-rules', implemented: false },
      { id: 'notifications', label: 'Notifications', href: '/admin/notifications', implemented: false },
      { id: 'audit-log', label: 'Audit Log', href: '/admin/audit-log', implemented: false },
    ],
  },
  {
    id: 'dev-tools',
    label: 'Dev Tools',
    icon: Code,
    href: '/dev-tools',
    implemented: true,
    requiredPermission: PERMISSIONS.VIEW_DEV_TOOLS,
    children: [
      { id: 'style-guide', label: 'Style Guide', href: '/dev-tools/style-guide', implemented: true, requiredPermission: PERMISSIONS.VIEW_STYLE_GUIDE },
      { id: 'api-docs', label: 'API Docs', href: '/dev-tools/api-docs', implemented: true, requiredPermission: PERMISSIONS.VIEW_API_DOCS },
      { id: 'documentation', label: 'Documentation', href: '/dev-tools/documentation', implemented: true, requiredPermission: PERMISSIONS.VIEW_DOCUMENTATION },
    ],
  },
];

// Get main navigation (all items now - no pinned bottom)
export const mainNavigation = navigation;

// Get pinned bottom navigation (empty now - kept for compatibility)
export const bottomNavigation: NavSection[] = [];
