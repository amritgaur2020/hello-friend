import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { AppRole, Profile, Permission } from '@/types/database';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: AppRole | null;
  permissions: Permission[];
  loading: boolean;
  requiresPasswordChange: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  hasPermission: (module: string, action: string) => boolean;
  isAdmin: boolean;
  validateIsAdmin: (userId: string) => Promise<boolean>;
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [requiresPasswordChange, setRequiresPasswordChange] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(() => {
            fetchUserData(session.user.id);
          }, 0);
        } else {
          setProfile(null);
          setRole(null);
          setPermissions([]);
          setRequiresPasswordChange(false);
          setLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserData(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserData = async (userId: string) => {
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      
      if (profileData) {
        setProfile(profileData as Profile);
        setRequiresPasswordChange(profileData.requires_password_change ?? false);
      }

      // First try legacy user_roles table
      const { data: legacyRoleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();
      
      let userRole: string | null = null;

      if (legacyRoleData) {
        userRole = legacyRoleData.role;
      } else {
        // Try dynamic user_roles_dynamic table
        const { data: dynamicRoleData } = await supabase
          .from('user_roles_dynamic')
          .select('role_id, roles(name)')
          .eq('user_id', userId)
          .maybeSingle();
        
        if (dynamicRoleData?.roles && typeof dynamicRoleData.roles === 'object' && 'name' in dynamicRoleData.roles) {
          userRole = (dynamicRoleData.roles as { name: string }).name;
        }
      }

      if (userRole) {
        setRole(userRole as AppRole);
        
        const { data: permissionsData } = await supabase
          .from('permissions')
          .select('*')
          .eq('role', userRole);
        
        if (permissionsData) {
          setPermissions(permissionsData as Permission[]);
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const validateIsAdmin = async (userId: string): Promise<boolean> => {
    const { data } = await supabase.rpc('is_admin', { _user_id: userId });
    return data === true;
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRole(null);
    setPermissions([]);
    setRequiresPasswordChange(false);
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    
    if (!error && user) {
      // Update profile to mark password as changed
      await supabase
        .from('profiles')
        .update({ requires_password_change: false })
        .eq('id', user.id);
      
      setRequiresPasswordChange(false);
    }
    
    return { error };
  };

  const hasPermission = (module: string, action: string): boolean => {
    if (role === 'admin') return true;
    
    return permissions.some(
      p => p.module === module && p.action === action && p.is_allowed
    );
  };

  const isAdmin = role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        role,
        permissions,
        loading,
        requiresPasswordChange,
        signIn,
        signOut,
        hasPermission,
        isAdmin,
        validateIsAdmin,
        updatePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
