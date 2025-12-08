import { Link, useLocation, Outlet } from 'react-router-dom';
import { Users, Shield } from 'lucide-react';

const sidebarNavigation = [
  { name: 'Users', href: '/admin/users', icon: Users },
  { name: 'Roles', href: '/admin/roles', icon: Shield },
];

export function AdminLayout() {
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
                className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
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
      <main className="flex-1 min-w-0">
        <Outlet />
      </main>
    </div>
  );
}

