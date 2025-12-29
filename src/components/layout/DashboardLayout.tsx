import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface DashboardLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  requiredModule?: string;
  requiredAction?: string;
}

export function DashboardLayout({ 
  children, 
  title, 
  subtitle,
  requiredModule,
  requiredAction = 'view'
}: DashboardLayoutProps) {
  const { user, loading, hasPermission, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Check permission if required
  if (requiredModule && !isAdmin && !hasPermission(requiredModule, requiredAction)) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header title="Access Denied" />
          <main className="flex-1 overflow-auto p-6 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-foreground mb-2">Access Denied</h2>
              <p className="text-muted-foreground">You don't have permission to view this page.</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title={title} subtitle={subtitle} />
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-6 scroll-smooth">
          {children}
        </main>
      </div>
    </div>
  );
}