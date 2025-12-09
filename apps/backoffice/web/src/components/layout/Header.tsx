import { useLocation } from 'react-router-dom';
import { Menu, Bell } from 'lucide-react';
import { useSidebar } from './SidebarContext';
import { ThemeToggle } from './ThemeToggle';
import { UserMenu } from './UserMenu';
import { Button } from '../ui/button';
import { navigation } from '../../config/navigation';
import { cn } from '../../lib/utils';

interface HeaderProps {
  children?: React.ReactNode;
}

export function Header({ children }: HeaderProps) {
  const location = useLocation();
  const { isCollapsed, setIsMobileOpen } = useSidebar();

  // Get current section title based on route
  const getCurrentSection = () => {
    const path = location.pathname;

    // Find matching section
    for (const section of navigation) {
      if (section.href === '/' && path === '/') {
        return section.label;
      }
      if (section.href && section.href !== '/' && path.startsWith(section.href)) {
        // Check for matching child
        if (section.children) {
          for (const child of section.children) {
            if (path === child.href || path.startsWith(child.href + '/')) {
              return `${section.label} / ${child.label}`;
            }
          }
        }
        return section.label;
      }
    }
    return 'Dashboard';
  };

  return (
    <header
      className={cn(
        'fixed right-0 top-0 z-30 flex h-16 items-center gap-4 border-b bg-card px-4 transition-all duration-250 lg:px-6',
        isCollapsed ? 'left-20' : 'left-[280px]',
        'max-lg:left-0'
      )}
    >
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 lg:hidden"
        onClick={() => setIsMobileOpen(true)}
      >
        <Menu className="h-5 w-5" />
        <span className="sr-only">Open menu</span>
      </Button>

      {/* Breadcrumb / Title */}
      <div className="flex-1">
        <h1 className="text-lg font-semibold">{getCurrentSection()}</h1>
      </div>

      {/* Contextual command bar */}
      {children && <div className="hidden items-center gap-2 md:flex">{children}</div>}

      {/* Right side actions */}
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <Bell className="h-4 w-4" />
          <span className="sr-only">Notifications</span>
        </Button>

        {/* Theme toggle */}
        <ThemeToggle />

        {/* User menu */}
        <UserMenu />
      </div>
    </header>
  );
}
