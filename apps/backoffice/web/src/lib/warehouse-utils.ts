export interface CapacityUtilization {
  total: number;
  used: number;
  available: number;
  utilizationPercent: number;
}

export interface CapacityMetrics {
  pallets: CapacityUtilization | null;
  sqft: CapacityUtilization | null;
}

export function calculateCapacityUtilization(
  warehouse: {
    capacity: { usable_pallets?: number; usable_sqft?: number };
    warehouseAllocations?: Array<{ 
      spaceAllocated?: { pallets?: number; sqft?: number };
      space_allocated?: { pallets?: number; sqft?: number }; // Handle snake_case from API
    }>;
  }
): CapacityMetrics {
  const totalPallets = warehouse.capacity?.usable_pallets || 0;
  const totalSqft = warehouse.capacity?.usable_sqft || 0;
  
  // Calculate used capacity - handle both camelCase and snake_case
  const usedPallets = warehouse.warehouseAllocations?.reduce((sum, allocation) => {
    const spaceData = allocation.spaceAllocated || allocation.space_allocated;
    return sum + (spaceData?.pallets || 0);
  }, 0) || 0;
  
  const usedSqft = warehouse.warehouseAllocations?.reduce((sum, allocation) => {
    const spaceData = allocation.spaceAllocated || allocation.space_allocated;
    return sum + (spaceData?.sqft || 0);
  }, 0) || 0;
  
  return {
    pallets: totalPallets > 0 ? {
      total: totalPallets,
      used: usedPallets,
      available: totalPallets - usedPallets,
      utilizationPercent: Math.round((usedPallets / totalPallets) * 100)
    } : null,
    sqft: totalSqft > 0 ? {
      total: totalSqft,
      used: usedSqft,
      available: totalSqft - usedSqft,
      utilizationPercent: Math.round((usedSqft / totalSqft) * 100)
    } : null
  };
}

// Format large numbers for display (e.g., 50000 -> "50K")
export function formatCapacityNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return num.toString();
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

