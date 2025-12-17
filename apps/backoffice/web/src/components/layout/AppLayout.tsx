import { Outlet } from 'react-router-dom';
import { SidebarProvider, useSidebar } from './SidebarContext';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { cn } from '../../lib/utils';

function AppLayoutContent() {
  const { isCollapsed } = useSidebar();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Sidebar />
      <Header />
      <main
        className={cn(
          'min-h-screen pt-16 transition-all duration-250',
          isCollapsed ? 'lg:pl-20' : 'lg:pl-[280px]'
        )}
      >
        <div className="px-4 lg:px-6 pt-1 pb-4 lg:pt-2 lg:pb-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export function AppLayout() {
  return (
    <SidebarProvider>
      <AppLayoutContent />
    </SidebarProvider>
  );
}
