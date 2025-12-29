import { ReactNode } from 'react';
import { useModuleAccess, PermissionAction } from '@/hooks/usePermissions';
import { AccessDenied } from './AccessDenied';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Skeleton } from '@/components/ui/skeleton';

interface PermissionGateProps {
  module: string;
  action?: PermissionAction;
  children: ReactNode;
  fallback?: ReactNode;
  showAccessDenied?: boolean;
  title?: string;
  subtitle?: string;
}

/**
 * PermissionGate component that controls access based on user permissions.
 * 
 * Usage:
 * - For page-level access: <PermissionGate module="bar" action="view" showAccessDenied>...</PermissionGate>
 * - For action buttons: <PermissionGate module="bar" action="create"><Button>Create</Button></PermissionGate>
 * - With custom fallback: <PermissionGate module="bar" action="edit" fallback={<DisabledButton />}>...</PermissionGate>
 */
export function PermissionGate({ 
  module, 
  action = 'view', 
  children, 
  fallback = null,
  showAccessDenied = false,
  title,
  subtitle
}: PermissionGateProps) {
  const { loading, checkPermission, hasAccess } = useModuleAccess(module);

  // Show loading skeleton while checking permissions
  if (loading) {
    if (showAccessDenied && title) {
      return (
        <DashboardLayout title={title} subtitle={subtitle}>
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </DashboardLayout>
      );
    }
    return null;
  }

  // Check specific action permission
  const hasPermission = checkPermission(action);

  if (!hasPermission) {
    // For page-level gates, show AccessDenied in DashboardLayout
    if (showAccessDenied && title) {
      return (
        <DashboardLayout title={title} subtitle={subtitle}>
          <AccessDenied 
            title="Permission Denied" 
            message={`You don't have ${action} permission for this module. Please contact your administrator.`}
          />
        </DashboardLayout>
      );
    }
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * ActionButton wrapper that only renders if user has the required permission
 */
interface PermittedActionProps {
  module: string;
  action: PermissionAction;
  children: ReactNode;
  fallback?: ReactNode;
}

export function PermittedAction({ module, action, children, fallback = null }: PermittedActionProps) {
  const { loading, checkPermission } = useModuleAccess(module);

  if (loading) return null;
  if (!checkPermission(action)) return <>{fallback}</>;
  
  return <>{children}</>;
}
