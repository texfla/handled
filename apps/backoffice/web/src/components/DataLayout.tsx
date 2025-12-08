import { Link, useLocation, Outlet } from 'react-router-dom';
import { LayoutDashboard, Upload, Layers, Download } from 'lucide-react';

const sidebarNavigation = [
  { name: 'Overview', href: '/data', icon: LayoutDashboard },
  { name: 'Import Files', href: '/data/imports', icon: Upload },
  { name: 'Transformations', href: '/data/transformations', icon: Layers },
  { name: 'Exports', href: '/data/exports', icon: Download },
];

export function DataLayout() {
  const location = useLocation();

  return (
    <div className="flex gap-6">
      {/* Left Sidebar */}
      <aside className="w-56 shrink-0">
        <nav className="space-y-1">
          {sidebarNavigation.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        <Outlet />
      </div>
    </div>
  );
}

