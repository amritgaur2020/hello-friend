import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Hotel } from 'lucide-react';
import { LoginForm } from '@/components/auth/LoginForm';
import { AdminLoginModal } from '@/components/auth/AdminLoginModal';
import { AdminSetupForm } from '@/components/auth/AdminSetupForm';
import { ForcePasswordChangeDialog } from '@/components/auth/ForcePasswordChangeDialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const getRoleDashboardPath = (roleName: string | null, departmentName: string | null): string => {
  if (!roleName) return '/dashboard';
  
  const roleNameLower = roleName.toLowerCase();
  
  if (roleNameLower === 'admin' || roleNameLower === 'manager' || roleNameLower === 'receptionist') {
    return '/dashboard';
  }
  
  if (roleNameLower.includes('bar') || departmentName?.toLowerCase() === 'bar') {
    return '/bar/dashboard';
  }
  if (roleNameLower.includes('spa') || departmentName?.toLowerCase() === 'spa') {
    return '/spa/dashboard';
  }
  if (roleNameLower.includes('restaurant') || departmentName?.toLowerCase() === 'restaurant') {
    return '/restaurant/dashboard';
  }
  if (roleNameLower.includes('kitchen') || departmentName?.toLowerCase() === 'kitchen') {
    return '/kitchen/dashboard';
  }
  if (roleNameLower.includes('housekeeping') || departmentName?.toLowerCase() === 'housekeeping') {
    return '/housekeeping/dashboard';
  }
  
  return '/dashboard';
};

export default function Auth() {
  const navigate = useNavigate();
  const { signIn, user, loading, requiresPasswordChange, updatePassword, validateIsAdmin, isAdmin } = useAuth();
  const { toast } = useToast();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(true);
  const [adminExists, setAdminExists] = useState(false);
  const [isCurrentUserAdmin, setIsCurrentUserAdmin] = useState(false);

  // Check if admin exists on mount using security definer function
  useEffect(() => {
    const checkAdminExists = async () => {
      try {
        const { data, error } = await supabase.rpc('check_admin_exists');
        
        if (!error && data === true) {
          setAdminExists(true);
        }
      } catch (err) {
        console.error('Error checking admin:', err);
      } finally {
        setIsCheckingAdmin(false);
      }
    };

    checkAdminExists();
  }, []);

  // Check if current user is admin
  useEffect(() => {
    const checkCurrentUserAdmin = async () => {
      if (user) {
        const adminStatus = await validateIsAdmin(user.id);
        setIsCurrentUserAdmin(adminStatus);
      }
    };
    checkCurrentUserAdmin();
  }, [user, validateIsAdmin]);

  // Redirect if already logged in
  useEffect(() => {
    const redirectUser = async () => {
      // Only redirect if not requiring password change OR if requiring but not admin
      const shouldShowPasswordChange = requiresPasswordChange && isCurrentUserAdmin;
      if (user && !loading && !shouldShowPasswordChange) {
        const dashboardPath = await getUserDashboard(user.id);
        navigate(dashboardPath);
      }
    };
    
    redirectUser();
  }, [user, loading, navigate, requiresPasswordChange, isCurrentUserAdmin]);

  const getUserDashboard = async (userId: string): Promise<string> => {
    try {
      const { data: isAdminResult } = await supabase.rpc('is_admin', { _user_id: userId });
      if (isAdminResult) {
        return '/dashboard';
      }

      const { data: dynamicRole } = await supabase
        .from('user_roles_dynamic')
        .select('role:roles(name, department:departments(name))')
        .eq('user_id', userId)
        .maybeSingle();

      if (dynamicRole?.role) {
        const roleName = (dynamicRole.role as any).name;
        const departmentName = (dynamicRole.role as any).department?.name;
        return getRoleDashboardPath(roleName, departmentName);
      }

      const { data: legacyRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      if (legacyRole?.role) {
        return getRoleDashboardPath(legacyRole.role, null);
      }

      return '/dashboard';
    } catch (error) {
      console.error('Error getting user dashboard:', error);
      return '/dashboard';
    }
  };

  // F9 shortcut for admin login
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F9') {
        e.preventDefault();
        setShowAdminModal(true);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleStaffLogin = async (email: string, password: string) => {
    const { error } = await signIn(email, password);
    
    if (!error) {
      const { data } = await supabase.auth.getUser();
      
      if (data.user) {
        const isUserAdmin = await validateIsAdmin(data.user.id);
        if (isUserAdmin) {
          await supabase.auth.signOut();
          toast({
            title: 'Access Denied',
            description: 'Admins must use Admin Login (Press F9)',
            variant: 'destructive',
          });
          return { error: new Error('Admin must use Admin Login') };
        }
        
        const dashboardPath = await getUserDashboard(data.user.id);
        navigate(dashboardPath);
      }
    }
    
    return { error };
  };

  const handleAdminLogin = async (email: string, password: string) => {
    const { error } = await signIn(email, password);
    
    if (!error) {
      const { data } = await supabase.auth.getUser();
      
      if (data.user) {
        const isUserAdmin = await validateIsAdmin(data.user.id);
        if (!isUserAdmin) {
          await supabase.auth.signOut();
          return { error: new Error('Invalid Admin credentials') };
        }
        navigate('/dashboard');
      }
    }
    
    return { error };
  };

  const handleAdminSetupComplete = () => {
    setAdminExists(true);
  };

  // Loading state
  if (loading || isCheckingAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show admin setup if no admin exists
  if (!adminExists) {
    return <AdminSetupForm onComplete={handleAdminSetupComplete} />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-accent/20 p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-primary-foreground mb-4 shadow-lg shadow-primary/25">
            <Hotel className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Hotel Management</h1>
          <p className="text-muted-foreground text-sm mt-1">Front Office System</p>
        </div>

        <Card className="shadow-elevated border-0">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl">Staff Login</CardTitle>
            <CardDescription>Sign in to access the system</CardDescription>
          </CardHeader>
          
          <CardContent>
            <LoginForm 
              onSubmit={handleStaffLogin} 
              isSubmitting={isSubmitting}
              setIsSubmitting={setIsSubmitting}
            />
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Contact your administrator if you need access credentials
        </p>
      </div>

      <AdminLoginModal
        open={showAdminModal}
        onOpenChange={setShowAdminModal}
        onSubmit={handleAdminLogin}
        isSubmitting={isSubmitting}
        setIsSubmitting={setIsSubmitting}
      />

      <ForcePasswordChangeDialog
        open={requiresPasswordChange && !!user && isCurrentUserAdmin}
        onPasswordChange={updatePassword}
      />
    </div>
  );
}
