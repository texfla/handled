export interface PermissionInfo {
  id: number;
  code: string;
  name: string;
  description: string;
  category: string;
  resource?: string;
  action?: string;
}

export interface GroupedPermission {
  code: string;
  action: string;
  name: string;
  description: string;
}

export interface PermissionGroup {
  resource: string;
  displayName: string;
  category: string;
  permissions: GroupedPermission[];
}

/**
 * Group permissions by resource (e.g., 'clients', 'warehouses')
 * Related permissions (view_clients, manage_clients) are grouped together
 */
export function groupPermissionsByResource(
  permissions: PermissionInfo[]
): Record<string, PermissionGroup> {
  const groups: Record<string, PermissionGroup> = {};
  
  for (const perm of permissions) {
    // Skip if no resource metadata
    if (!perm.resource || !perm.action) {
      continue;
    }
    
    const { resource, action, category } = perm;
    
    if (!groups[resource]) {
      groups[resource] = {
        resource,
        displayName: formatResourceName(resource),
        category: category || 'other',
        permissions: []
      };
    }
    
    groups[resource].permissions.push({
      code: perm.code,
      action,
      name: perm.name,
      description: perm.description
    });
  }
  
  // Sort actions: view, manage, then others
  const actionOrder = ['view', 'manage', 'import', 'export', 'run'];
  
  for (const group of Object.values(groups)) {
    group.permissions.sort((a, b) => {
      const aIndex = actionOrder.indexOf(a.action);
      const bIndex = actionOrder.indexOf(b.action);
      const aOrder = aIndex === -1 ? 999 : aIndex;
      const bOrder = bIndex === -1 ? 999 : bIndex;
      return aOrder - bOrder;
    });
  }
  
  return groups;
}

/**
 * Group permission groups by category
 * Returns permissions organized as: Category → Resource → Actions
 */
export function groupPermissionsByCategory(
  groupedPerms: Record<string, PermissionGroup>
): Record<string, PermissionGroup[]> {
  const byCategory: Record<string, PermissionGroup[]> = {};
  
  for (const group of Object.values(groupedPerms)) {
    const cat = group.category || 'other';
    if (!byCategory[cat]) {
      byCategory[cat] = [];
    }
    byCategory[cat].push(group);
  }
  
  // Sort resource groups within each category alphabetically
  for (const groups of Object.values(byCategory)) {
    groups.sort((a, b) => a.displayName.localeCompare(b.displayName));
  }
  
  return byCategory;
}

/**
 * Format resource name for display
 * 'clients' → 'Clients'
 * 'warehouse_zones' → 'Warehouse Zones'
 */
function formatResourceName(resource: string): string {
  return resource
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
