import { Link, useLocation } from 'react-router-dom';
import { Home, Database, LogOut, User, Shield } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Button } from './ui/button';

const navigation = [
  { name: 'Home', href: '/', icon: Home },
  { name: 'Data', href: '/data', icon: Database },
  { name: 'Admin', href: '/admin', icon: Shield, adminOnly: true },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { user, logout } = useAuth();

  // Check if current path starts with the nav item's href (for nested routes)
  const isActive = (href: string) => {
    if (href === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="flex h-16 items-center px-6">
          <div className="flex items-center gap-2">
            <img src="/handled_logo.png" alt="Handled" className="h-8 w-8" />
            <span className="text-xl font-semibold">Handled</span>
          </div>

          <nav className="ml-8 flex gap-1">
            {navigation
              .filter((item) => !item.adminOnly || user?.role === 'admin')
              .map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      active
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

          <div className="ml-auto flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              {user?.name}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => logout()}
              className="text-muted-foreground"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="p-6">{children}</main>
    </div>
  );
}
