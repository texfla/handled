import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useSidebar } from './SidebarContext';
import { SidebarItem } from './SidebarItem';
import { ScrollArea } from '../ui/scroll-area';
import { TooltipProvider } from '../ui/tooltip';
import { mainNavigation, bottomNavigation } from '../../config/navigation';

export function Sidebar() {
  const { isCollapsed, toggleCollapse, isMobileOpen, setIsMobileOpen } = useSidebar();

  return (
    <TooltipProvider delayDuration={0}>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-50 flex h-screen flex-col bg-slate-900 transition-all duration-250 ease-in-out',
          isCollapsed ? 'w-20' : 'w-[280px]',
          // Mobile: hidden by default, shown as overlay when isMobileOpen
          'max-lg:hidden',
          isMobileOpen && 'max-lg:flex max-lg:w-[280px]'
        )}
      >
        {/* Header */}
        <div
          className={cn(
            'flex h-16 items-center border-b border-slate-800 px-4',
            isCollapsed ? 'justify-center' : 'justify-between'
          )}
        >
          <Link to="/" className="flex items-center gap-3">
            <img src="/handled_icon.png" alt="Handled" className="h-8 w-8" />
            {!isCollapsed && (
              <span className="text-xl font-semibold text-white">Handled</span>
            )}
          </Link>

          {/* Mobile close button */}
          <button
            onClick={() => setIsMobileOpen(false)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Desktop collapse button */}
          {!isCollapsed && (
            <button
              onClick={toggleCollapse}
              className="hidden rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white lg:block"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Collapsed expand button */}
        {isCollapsed && (
          <button
            onClick={toggleCollapse}
            className="mx-auto mt-2 hidden rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white lg:block"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        )}

        {/* Navigation */}
        <ScrollArea className="flex-1 px-3 py-4">
          <nav className="space-y-1">
            {mainNavigation.map((section) => (
              <SidebarItem key={section.id} section={section} />
            ))}
          </nav>
        </ScrollArea>

        {/* Bottom section */}
        <div className="mt-auto border-t border-slate-800 px-3 py-4">
          {bottomNavigation.map((section) => (
            <SidebarItem key={section.id} section={section} />
          ))}
        </div>
      </aside>
    </TooltipProvider>
  );
}
