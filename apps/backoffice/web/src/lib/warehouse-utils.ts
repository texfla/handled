export interface CapacityUtilization {
  total: number;
  used: number;
  available: number;
  utilizationPercent: number;
}

export function calculateCapacityUtilization(
  warehouse: {
    capacity: { usable_pallets?: number };
    warehouseAllocations?: Array<{ spaceAllocated?: { pallets?: number } }>;
  }
): CapacityUtilization {
  const totalCapacity = warehouse.capacity?.usable_pallets || 0;
  const usedCapacity = warehouse.warehouseAllocations?.reduce((sum, allocation) => 
    sum + (allocation.spaceAllocated?.pallets || 0), 
    0
  ) || 0;
  
  return {
    total: totalCapacity,
    used: usedCapacity,
    available: totalCapacity - usedCapacity,
    utilizationPercent: totalCapacity > 0 
      ? Math.round((usedCapacity / totalCapacity) * 100)
      : 0
  };
}

export function formatAddress(address: {
  street1?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
}): string {
  const parts = [];
  if (address.street1) parts.push(address.street1);
  if (address.city && address.state) {
    parts.push(`${address.city}, ${address.state} ${address.zip || ''}`);
  }
  return parts.join(', ');
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    active: 'default',
    commissioning: 'secondary',
    offline: 'destructive',
    decommissioned: 'outline'
  };
  return colors[status] || 'secondary';
}

export const WAREHOUSE_CAPABILITIES = [
  { value: 'standard_storage', label: 'Standard Storage', icon: '📦' },
  { value: 'cold_storage', label: 'Cold Storage', icon: '❄️' },
  { value: 'frozen_storage', label: 'Frozen Storage', icon: '🧊' },
  { value: 'hazmat', label: 'Hazmat Certified', icon: '⚠️' },
  { value: 'kitting', label: 'Kitting & Assembly', icon: '🔧' },
  { value: 'cross_dock', label: 'Cross-Docking', icon: '🚚' },
  { value: 'returns_processing', label: 'Returns Processing', icon: '↩️' },
  { value: 'value_added_services', label: 'Value-Added Services', icon: '✨' },
];

export const TIMEZONE_OPTIONS = [
  { value: 'America/New_York', label: 'Eastern (ET)' },
  { value: 'America/Chicago', label: 'Central (CT)' },
  { value: 'America/Denver', label: 'Mountain (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific (PT)' },
  { value: 'America/Phoenix', label: 'Arizona (MT - no DST)' },
  { value: 'America/Anchorage', label: 'Alaska (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii (HT)' },
];

