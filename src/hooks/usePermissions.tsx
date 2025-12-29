import { useAuth } from '@/hooks/useAuth';

export type PermissionAction = 'view' | 'create' | 'edit' | 'delete';

export function usePermissions(module: string) {
  const { hasPermission, isAdmin, loading, role } = useAuth();

  // Admin has all permissions
  if (isAdmin) {
    return {
      canView: true,
      canCreate: true,
      canEdit: true,
      canDelete: true,
      hasAnyPermission: true,
      loading,
      isAdmin: true,
      role,
    };
  }

  const canView = hasPermission(module, 'view');
  const canCreate = hasPermission(module, 'create');
  const canEdit = hasPermission(module, 'edit');
  const canDelete = hasPermission(module, 'delete');
  const hasAnyPermission = canView || canCreate || canEdit || canDelete;

  return {
    canView,
    canCreate,
    canEdit,
    canDelete,
    hasAnyPermission,
    loading,
    isAdmin: false,
    role,
  };
}

export function useModuleAccess(module: string) {
  const permissions = usePermissions(module);
  
  return {
    ...permissions,
    // Helper to check if user can access the module at all
    hasAccess: permissions.canView || permissions.isAdmin,
    // Helper to check specific actions
    checkPermission: (action: PermissionAction) => {
      if (permissions.isAdmin) return true;
      switch (action) {
        case 'view': return permissions.canView;
        case 'create': return permissions.canCreate;
        case 'edit': return permissions.canEdit;
        case 'delete': return permissions.canDelete;
        default: return false;
      }
    },
  };
}
