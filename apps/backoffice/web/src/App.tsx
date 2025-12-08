import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { Layout } from './components/Layout';
import { DataLayout } from './components/DataLayout';
import { AdminLayout } from './components/AdminLayout';
import { LoginPage } from './pages/LoginPage';
import { HomePage } from './pages/HomePage';
import { DataOverviewPage } from './pages/DataOverviewPage';
import { ImportFilesPage } from './pages/ImportFilesPage';
import { TransformationsPage } from './pages/TransformationsPage';
import { ExportsPage } from './pages/ExportsPage';
import { UsersPage } from './pages/UsersPage';

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
            <Layout>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/data" element={<DataLayout />}>
                  <Route index element={<DataOverviewPage />} />
                  <Route path="imports" element={<ImportFilesPage />} />
                  <Route path="transformations" element={<TransformationsPage />} />
                  <Route path="exports" element={<ExportsPage />} />
                </Route>
                <Route path="/admin" element={<AdminLayout />}>
                  <Route index element={<Navigate to="/admin/users" replace />} />
                  <Route path="users" element={<UsersPage />} />
                </Route>
              </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
