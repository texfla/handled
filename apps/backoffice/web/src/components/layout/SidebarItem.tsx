import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useSidebar } from './SidebarContext';
import { usePermissions } from '../../hooks/usePermissions';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import type { NavItem, NavSection } from '../../config/navigation';

interface SidebarItemProps {
  section: NavSection;
}

export function SidebarItem({ section }: SidebarItemProps) {
  const location = useLocation();
  const { isCollapsed, setIsMobileOpen, openSectionId, setOpenSectionId } = useSidebar();
  const { hasPermission, hasAnyPermission } = usePermissions();
  
  // Check if section is active (current route is in this section)
  const isActive = section.href === '/' 
    ? location.pathname === '/'
    : location.pathname.startsWith(section.href || '');
  
  // Accordion behavior: only one section open at a time
  const isOpen = openSectionId === section.id;
  
  // Auto-expand when route changes to match this section
  useEffect(() => {
    if (isActive && section.children && section.children.length > 0) {
      setOpenSectionId(section.id);
    }
  }, [isActive, section.id, section.children, setOpenSectionId]);

  // Check if user can see this section
  const canViewSection = (() => {
    if (section.requiredPermission) {
      return hasPermission(section.requiredPermission);
    }
    if (section.requiredAnyPermission) {
      return hasAnyPermission(...section.requiredAnyPermission);
    }
    // Legacy: Check old permission property
    if (section.permission && !hasPermission(section.permission)) {
      return false;
    }
    return true; // No permission required
  })();

  if (!canViewSection) {
    return null; // Hide section completely
  }

  // Filter children based on permissions
  const visibleChildren = section.children?.filter(child => {
    if (child.requiredPermission) {
      return hasPermission(child.requiredPermission);
    }
    if (child.requiredAnyPermission) {
      return hasAnyPermission(...child.requiredAnyPermission);
    }
    return true;
  });

  // Hide section if it has children but none are visible
  if (section.children && (!visibleChildren || visibleChildren.length === 0)) {
    return null;
  }

  const Icon = section.icon;
  const hasChildren = visibleChildren && visibleChildren.length > 0;
  const isImplemented = section.implemented !== false;
  
  // Toggle handler for accordion behavior
  const handleToggle = (open: boolean) => {
    setOpenSectionId(open ? section.id : null);
  };

  const handleClick = () => {
    // Close any open sections when clicking a simple nav item (no children)
    if (!hasChildren) {
      setOpenSectionId(null);
    }
    setIsMobileOpen(false);
  };

  // Simple item without children
  if (!hasChildren) {
    const itemContent = (
      <Link
        to={isImplemented ? (section.href || '/') : '#'}
        onClick={isImplemented ? handleClick : (e) => e.preventDefault()}
        className={cn(
          'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-250',
          isActive
            ? 'bg-slate-800 text-white border-l-2 border-primary'
            : 'text-slate-400 hover:bg-slate-800/50 hover:text-white',
          !isImplemented && 'opacity-50 cursor-not-allowed',
          isCollapsed && 'justify-center px-2'
        )}
      >
        <Icon className={cn('h-5 w-5 shrink-0', isActive && 'text-primary')} />
        {!isCollapsed && <span>{section.label}</span>}
      </Link>
    );

    if (isCollapsed) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>{itemContent}</TooltipTrigger>
          <TooltipContent side="right" className="flex items-center gap-2">
            {section.label}
            {!isImplemented && <span className="text-xs text-muted-foreground">(Coming Soon)</span>}
          </TooltipContent>
        </Tooltip>
      );
    }

    return itemContent;
  }

  // Collapsible item with children
  if (isCollapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <Link
            to={isImplemented ? (section.href || visibleChildren?.[0]?.href || '/') : '#'}
            onClick={isImplemented ? handleClick : (e) => e.preventDefault()}
            className={cn(
              'flex items-center justify-center rounded-lg px-2 py-2.5 text-sm font-medium transition-all duration-250',
              isActive
                ? 'bg-slate-800 text-white border-l-2 border-primary'
                : 'text-slate-400 hover:bg-slate-800/50 hover:text-white',
              !isImplemented && 'opacity-50 cursor-not-allowed'
            )}
          >
            <Icon className={cn('h-5 w-5 shrink-0', isActive && 'text-primary')} />
          </Link>
        </TooltipTrigger>
        <TooltipContent side="right" className="p-0">
          <div className="py-1">
            <div className="px-3 py-1.5 text-sm font-medium">{section.label}</div>
            {visibleChildren?.map((child) => (
              <Link
                key={child.id}
                to={child.implemented !== false ? child.href : '#'}
                onClick={child.implemented !== false ? handleClick : (e) => e.preventDefault()}
                className={cn(
                  'block px-3 py-1.5 text-sm transition-colors',
                  location.pathname === child.href
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                  child.implemented === false && 'opacity-50 cursor-not-allowed'
                )}
              >
                {child.label}
                {child.implemented === false && ' (Soon)'}
              </Link>
            ))}
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={handleToggle}>
      <CollapsibleTrigger asChild>
        <button
          className={cn(
            'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-250',
            // Active route gets primary border
            isActive && 'border-l-2 border-primary',
            // Expanded or active gets darker background
            (isOpen || isActive)
              ? 'bg-slate-800 text-white'
              : 'text-slate-400 hover:bg-slate-800/50 hover:text-white',
            !isImplemented && 'opacity-50'
          )}
        >
          <Icon className={cn('h-5 w-5 shrink-0', isActive && 'text-primary')} />
          <span className="flex-1 text-left">{section.label}</span>
          <ChevronRight
            className={cn(
              'h-4 w-4 shrink-0 transition-transform duration-250',
              isOpen && 'rotate-90'
            )}
          />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
        <div className="ml-4 mt-1 space-y-1 border-l border-slate-700 pl-4">
          {visibleChildren?.map((child) => (
            <SidebarChildItem key={child.id} item={child} onNavigate={handleClick} />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

interface SidebarChildItemProps {
  item: NavItem;
  onNavigate: () => void;
}

function SidebarChildItem({ item, onNavigate }: SidebarChildItemProps) {
  const location = useLocation();
  
  // Exact matching: only highlight if we're exactly on this route
  // This prevents '/integrations' from being active when on '/integrations/imports'
  const isActive = location.pathname === item.href;
  
  const isImplemented = item.implemented !== false;

  return (
    <Link
      to={isImplemented ? item.href : '#'}
      onClick={isImplemented ? onNavigate : (e) => e.preventDefault()}
      className={cn(
        'block rounded-md px-3 py-2 text-sm transition-colors',
        isActive
          ? 'bg-slate-800 text-white font-medium'
          : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200',
        !isImplemented && 'opacity-50 cursor-not-allowed'
      )}
    >
      {item.label}
      {!isImplemented && <span className="ml-1 text-xs">(Soon)</span>}
    </Link>
  );
}

