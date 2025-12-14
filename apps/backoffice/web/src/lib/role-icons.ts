import {
  Shield, ShieldCheck, Crown, UserCog, Users,
  Package, PackageCheck, Warehouse, Truck,
  DollarSign, Calculator, Briefcase,
  TrendingUp, Target, MessageSquare, Headphones,
  ClipboardList, FileText, BarChart3,
  Settings, Wrench,
  type LucideIcon,
} from 'lucide-react';

export interface RoleIconOption {
  value: string;
  label: string;
  Icon: LucideIcon;
  category: 'Security' | 'Operations' | 'Business' | 'Service' | 'General';
}

export const ROLE_ICONS: RoleIconOption[] = [
  // Security & Admin
  { value: 'shield', label: 'Shield', Icon: Shield, category: 'Security' },
  { value: 'shield-check', label: 'Shield Check', Icon: ShieldCheck, category: 'Security' },
  { value: 'crown', label: 'Crown', Icon: Crown, category: 'Security' },
  { value: 'user-cog', label: 'User Settings', Icon: UserCog, category: 'Security' },
  { value: 'users', label: 'Users', Icon: Users, category: 'Security' },
  
  // Operations
  { value: 'package', label: 'Package', Icon: Package, category: 'Operations' },
  { value: 'package-check', label: 'Package Check', Icon: PackageCheck, category: 'Operations' },
  { value: 'warehouse', label: 'Warehouse', Icon: Warehouse, category: 'Operations' },
  { value: 'truck', label: 'Truck', Icon: Truck, category: 'Operations' },
  { value: 'clipboard-list', label: 'Clipboard', Icon: ClipboardList, category: 'Operations' },
  
  // Business & Finance
  { value: 'dollar-sign', label: 'Dollar', Icon: DollarSign, category: 'Business' },
  { value: 'calculator', label: 'Calculator', Icon: Calculator, category: 'Business' },
  { value: 'briefcase', label: 'Briefcase', Icon: Briefcase, category: 'Business' },
  { value: 'trending-up', label: 'Trending Up', Icon: TrendingUp, category: 'Business' },
  { value: 'target', label: 'Target', Icon: Target, category: 'Business' },
  { value: 'bar-chart-3', label: 'Bar Chart', Icon: BarChart3, category: 'Business' },
  
  // Customer Service
  { value: 'message-square', label: 'Message', Icon: MessageSquare, category: 'Service' },
  { value: 'headphones', label: 'Headphones', Icon: Headphones, category: 'Service' },
  
  // General
  { value: 'file-text', label: 'File', Icon: FileText, category: 'General' },
  { value: 'settings', label: 'Settings', Icon: Settings, category: 'General' },
  { value: 'wrench', label: 'Wrench', Icon: Wrench, category: 'General' },
];

export function getIconByValue(value: string): LucideIcon {
  return ROLE_ICONS.find(icon => icon.value === value)?.Icon || Shield;
}

export function getIconsByCategory() {
  const grouped: Record<string, RoleIconOption[]> = {};
  for (const icon of ROLE_ICONS) {
    if (!grouped[icon.category]) grouped[icon.category] = [];
    grouped[icon.category].push(icon);
  }
  return grouped;
}
