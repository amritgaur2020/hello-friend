import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { RoleDashboard } from '@/components/dashboard/RoleDashboard';
import { Building2, TrendingUp } from 'lucide-react';

export default function Dashboard() {
  const { profile, role, isAdmin, user } = useAuth();

  // Fetch dynamic role details if user has a dynamic role assignment
  const { data: roleDetails } = useQuery({
    queryKey: ['user-role-details', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // First try to get from dynamic roles
      const { data: dynamicRole } = await supabase
        .from('user_roles_dynamic')
        .select('role_id, role:roles(name, display_name, department:departments(name))')
        .eq('user_id', user.id)
        .maybeSingle();

      if (dynamicRole?.role) {
        return {
          name: dynamicRole.role.name,
          displayName: dynamicRole.role.display_name,
          departmentName: dynamicRole.role.department?.name || null,
        };
      }

      // Fallback to legacy user_roles
      return {
        name: role,
        displayName: role?.replace('_', ' '),
        departmentName: null,
      };
    },
    enabled: !!user?.id,
  });

  const effectiveRole = roleDetails?.name || role || 'front_desk';
  const effectiveDepartment = roleDetails?.departmentName;
  const displayName = roleDetails?.displayName || role?.replace('_', ' ');

  return (
    <DashboardLayout 
      title={`Welcome back, ${profile?.full_name?.split(' ')[0] || 'User'}!`}
      subtitle="Here's what's happening at your hotel today."
    >
      <div className="space-y-6 animate-fade-in">
        {/* Role-specific dashboard content */}
        <RoleDashboard roleName={effectiveRole} departmentName={effectiveDepartment || undefined} />

        {/* Role Info Card */}
        <Card className="shadow-soft">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium">
                    You're logged in as{' '}
                    <span className="capitalize text-primary">{displayName}</span>
                  </p>
                  {effectiveDepartment && (
                    <Badge variant="secondary" className="gap-1">
                      <Building2 className="h-3 w-3" />
                      {effectiveDepartment}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {isAdmin 
                    ? 'You have full access to all features and settings.' 
                    : 'Your access is limited based on your role permissions.'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
