import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';

// Integrations
import { IntegrationsOverviewPage } from './pages/integrations/OverviewPage';
import { ImportsPage } from './pages/integrations/ImportsPage';
import { TransformationsPage } from './pages/integrations/TransformationsPage';
import { ExportsPage } from './pages/integrations/ExportsPage';

// Profile
import { ProfilePage } from './pages/profile/ProfilePage';
import { AccountSettingsPage } from './pages/profile/AccountSettingsPage';
import { ActivityLogPage } from './pages/profile/ActivityLogPage';

// Admin
import { UsersPage } from './pages/admin/UsersPage';
import { RolesPage } from './pages/admin/RolesPage';

// Placeholders
import { ComingSoonPage } from './pages/placeholders/ComingSoonPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        {/* Dashboard */}
        <Route index element={<DashboardPage />} />

        {/* Clients - Coming Soon */}
        <Route path="clients/*" element={<ComingSoonPage />} />

        {/* Inventory - Coming Soon */}
        <Route path="inventory/*" element={<ComingSoonPage />} />

        {/* Receiving - Coming Soon */}
        <Route path="receiving/*" element={<ComingSoonPage />} />

        {/* Orders - Coming Soon */}
        <Route path="orders/*" element={<ComingSoonPage />} />

        {/* Shipping - Coming Soon */}
        <Route path="shipping/*" element={<ComingSoonPage />} />

        {/* Returns - Coming Soon */}
        <Route path="returns/*" element={<ComingSoonPage />} />

        {/* Billing - Coming Soon */}
        <Route path="billing/*" element={<ComingSoonPage />} />

        {/* Operations - Coming Soon */}
        <Route path="operations/*" element={<ComingSoonPage />} />

        {/* Reports - Coming Soon */}
        <Route path="reports/*" element={<ComingSoonPage />} />

        {/* Integrations - Implemented */}
        <Route path="integrations">
          <Route index element={<IntegrationsOverviewPage />} />
          <Route path="imports" element={<ImportsPage />} />
          <Route path="transformations" element={<TransformationsPage />} />
          <Route path="exports" element={<ExportsPage />} />
          <Route path="channels" element={<ComingSoonPage />} />
          <Route path="carriers" element={<ComingSoonPage />} />
          <Route path="edi" element={<ComingSoonPage />} />
          <Route path="webhooks" element={<ComingSoonPage />} />
        </Route>

        {/* Personal Profile - Accessible to all users */}
        <Route path="profile">
          <Route index element={<ProfilePage />} />
          <Route path="account" element={<AccountSettingsPage />} />
          <Route path="activity" element={<ActivityLogPage />} />
        </Route>

        {/* Administration - Admin only */}
        <Route path="admin">
          <Route index element={<Navigate to="/admin/users" replace />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="roles" element={<RolesPage />} />
          <Route path="company" element={<ComingSoonPage />} />
          <Route path="warehouse" element={<ComingSoonPage />} />
          <Route path="billing-rules" element={<ComingSoonPage />} />
          <Route path="notifications" element={<ComingSoonPage />} />
          <Route path="audit-log" element={<ComingSoonPage />} />
        </Route>

        {/* Redirect old settings URLs to admin */}
        <Route path="settings/*" element={<Navigate to="/admin" replace />} />

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
