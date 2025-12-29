import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Plus, Users, Shield, User, Edit, Eye, EyeOff, Building2, Trash2, History, UserPlus, UserMinus, UserCog, Clock, Filter, Calendar, X, AlertTriangle, Link } from 'lucide-react';
import { Profile } from '@/types/database';
import { useAuth } from '@/hooks/useAuth';
import { format, isAfter, isBefore, startOfDay, endOfDay, subDays } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { getDefaultModulesForRole, DEFAULT_ACTIONS } from '@/config/rolePermissions';

interface ActivityLog {
  id: string;
  action_type: string;
  module: string;
  description: string;
  record_id: string | null;
  record_type: string | null;
  created_at: string;
  user_id: string | null;
}

const toInternalEmail = (userId: string) => `${userId.toLowerCase().trim()}@hotel.local`;
const fromInternalEmail = (email: string) => email.replace('@hotel.local', '');

interface Department {
  id: string;
  name: string;
}

interface Role {
  id: string;
  name: string;
  display_name: string;
  department_id: string | null;
  department?: Department | null;
}

interface StaffMember {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  is_active: boolean;
  role_name: string | null;
  role_display_name: string | null;
  department_name: string | null;
  created_at: string;
}

export default function StaffManagement() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Create dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [newName, setNewName] = useState('');
  const [newUserId, setNewUserId] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRoleId, setNewRoleId] = useState<string>('');

  // Edit dialog state
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editRoleId, setEditRoleId] = useState('');
  const [editStatus, setEditStatus] = useState<boolean>(true);
  const [editPassword, setEditPassword] = useState('');
  const [editRequirePasswordChange, setEditRequirePasswordChange] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);

  // Delete dialog state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingStaff, setDeletingStaff] = useState<StaffMember | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Assign role dialog state (for orphaned users)
  const [isAssignRoleDialogOpen, setIsAssignRoleDialogOpen] = useState(false);
  const [assigningRoleStaff, setAssigningRoleStaff] = useState<StaffMember | null>(null);
  const [assignRoleId, setAssignRoleId] = useState('');
  const [isAssigningRole, setIsAssigningRole] = useState(false);

  // Activity log filter state
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);
  const [dateRangePreset, setDateRangePreset] = useState<string>('all');

  const { data: roles = [] } = useQuery({
    queryKey: ['dynamic-roles-for-staff'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('roles')
        .select('id, name, display_name, department_id, department:departments(id, name)')
        .eq('is_active', true)
        .order('display_name');
      if (error) throw error;
      return data as Role[];
    },
  });

  // Fetch staff members with their dynamic roles
  const { data: staffMembers = [], isLoading } = useQuery({
    queryKey: ['staff-members-dynamic'],
    queryFn: async () => {
      // Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch dynamic roles
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles_dynamic')
        .select('user_id, role_id, role:roles(name, display_name, department:departments(name))');

      if (rolesError) throw rolesError;

      // Also fetch legacy user_roles for backwards compatibility
      const { data: legacyRoles } = await supabase
        .from('user_roles')
        .select('user_id, role');

      // Combine data
      const combined = profiles?.map(profile => {
        const dynamicRole = userRoles?.find(r => r.user_id === profile.id);
        const legacyRole = legacyRoles?.find(r => r.user_id === profile.id);
        
        return {
          ...profile,
          role_name: dynamicRole?.role?.name || legacyRole?.role || null,
          role_display_name: dynamicRole?.role?.display_name || legacyRole?.role?.replace('_', ' ') || null,
          department_name: dynamicRole?.role?.department?.name || null,
        };
      }) || [];

      return combined as StaffMember[];
    },
  });

  // Fetch staff activity logs
  const { data: activityLogs = [], isLoading: isLoadingLogs } = useQuery({
    queryKey: ['staff-activity-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('module', 'staff')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data as ActivityLog[];
    },
  });

  // Group roles by department
  const groupedRoles = roles.reduce((acc, role) => {
    if (role.name === 'admin') return acc;
    const deptName = role.department?.name || 'General';
    if (!acc[deptName]) acc[deptName] = [];
    acc[deptName].push(role);
    return acc;
  }, {} as Record<string, Role[]>);

  // Filter activity logs based on action type and date
  const filteredActivityLogs = useMemo(() => {
    return activityLogs.filter((log) => {
      // Filter by action type
      if (actionFilter !== 'all' && log.action_type !== actionFilter) {
        return false;
      }

      // Filter by date range
      if (dateRangePreset !== 'all') {
        const logDate = new Date(log.created_at);
        const today = new Date();
        
        switch (dateRangePreset) {
          case 'today':
            if (logDate < startOfDay(today) || logDate > endOfDay(today)) return false;
            break;
          case 'week':
            if (logDate < startOfDay(subDays(today, 7))) return false;
            break;
          case 'month':
            if (logDate < startOfDay(subDays(today, 30))) return false;
            break;
          case 'custom':
            if (dateFilter && logDate < startOfDay(dateFilter)) return false;
            break;
        }
      }

      return true;
    });
  }, [activityLogs, actionFilter, dateRangePreset, dateFilter]);

  const clearFilters = () => {
    setActionFilter('all');
    setDateRangePreset('all');
    setDateFilter(undefined);
  };

  const hasActiveFilters = actionFilter !== 'all' || dateRangePreset !== 'all';

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'create':
        return <UserPlus className="h-4 w-4 text-green-500" />;
      case 'delete':
        return <UserMinus className="h-4 w-4 text-destructive" />;
      case 'update':
      case 'edit':
        return <UserCog className="h-4 w-4 text-blue-500" />;
      default:
        return <History className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getActionBadgeVariant = (actionType: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (actionType) {
      case 'create':
        return 'default';
      case 'delete':
        return 'destructive';
      case 'update':
      case 'edit':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    let createdUserId: string | null = null;

    try {
      if (newUserId.length < 3) {
        toast({
          title: 'Validation Error',
          description: 'User ID must be at least 3 characters.',
          variant: 'destructive',
        });
        return;
      }

      if (newPassword.length < 6) {
        toast({
          title: 'Validation Error',
          description: 'Password must be at least 6 characters.',
          variant: 'destructive',
        });
        return;
      }

      if (!newRoleId) {
        toast({
          title: 'Validation Error',
          description: 'Please select a role.',
          variant: 'destructive',
        });
        return;
      }

      const internalEmail = toInternalEmail(newUserId);
      
      // Check if user already exists but has no role (orphaned user)
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('email', internalEmail)
        .maybeSingle();

      if (existingProfile) {
        // Check if this user has a role
        const { data: existingRole } = await supabase
          .from('user_roles_dynamic')
          .select('id')
          .eq('user_id', existingProfile.id)
          .maybeSingle();

        if (!existingRole) {
          // This is an orphaned user - offer to assign a role
          toast({
            title: 'User Already Exists',
            description: 'This User ID exists but has no role assigned. Use the "Assign Role" action in the staff list.',
            variant: 'destructive',
          });
          queryClient.invalidateQueries({ queryKey: ['staff-members-dynamic'] });
          return;
        } else {
          toast({
            title: 'User ID Taken',
            description: 'This User ID is already in use with an active role.',
            variant: 'destructive',
          });
          return;
        }
      }
      
      const { data, error } = await supabase.auth.signUp({
        email: internalEmail,
        password: newPassword,
        options: {
          data: {
            full_name: newName,
            user_id: newUserId,
          },
        },
      });

      if (error) {
        if (error.message.includes('already registered')) {
          toast({
            title: 'User ID Taken',
            description: 'This User ID is already in use. Please choose a different one.',
            variant: 'destructive',
          });
        } else {
          throw error;
        }
        return;
      }

      if (data.user) {
        createdUserId = data.user.id;

        // Set requires_password_change to false for staff
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ 
            phone: newPhone || null,
            requires_password_change: false 
          })
          .eq('id', data.user.id);

        if (profileError) {
          console.error('Profile update error:', profileError);
          // Continue - profile update is non-critical
        }

        // Insert into dynamic roles table using RPC - CRITICAL STEP
        const { data: roleResult, error: rpcError } = await supabase
          .rpc('assign_user_role', {
            target_user_id: data.user.id,
            target_role_id: newRoleId,
          });

        const result = roleResult as { success: boolean; error?: string } | null;
        if (rpcError || !result?.success) {
          // ROLLBACK: Delete the profile we just created to avoid orphaned user
          const errorMsg = result?.error || rpcError?.message || 'Unknown error';
          console.error('Role assignment failed, rolling back user creation:', errorMsg);
          
          await supabase
            .from('profiles')
            .delete()
            .eq('id', data.user.id);
          
          throw new Error(`Failed to assign role: ${errorMsg}. User creation was rolled back.`);
        }

        // Get role details for activity log and auto-grant permissions
        const selectedRole = roles.find(r => r.id === newRoleId);
        
        // Auto-grant default module permissions for this role
        if (selectedRole) {
          const defaultModules = getDefaultModulesForRole(selectedRole.name);
          const permissionsToInsert = [];
          
          for (const module of defaultModules) {
            for (const action of DEFAULT_ACTIONS) {
              permissionsToInsert.push({
                role: selectedRole.name,
                module,
                action,
                is_allowed: true,
              });
            }
          }
          
          // Upsert permissions (insert or update if exists)
          for (const perm of permissionsToInsert) {
            await supabase
              .from('permissions')
              .upsert(perm, { 
                onConflict: 'role,module,action',
                ignoreDuplicates: false 
              });
          }
        }

        await supabase.rpc('log_activity', {
          _action_type: 'create',
          _module: 'staff',
          _description: `Created new staff account: ${newUserId} with role: ${selectedRole?.display_name}`,
          _record_id: data.user.id,
          _record_type: 'user',
        });

        toast({
          title: 'Staff Account Created!',
          description: `User ID: ${newUserId} | Role: ${selectedRole?.display_name}`,
        });

        setNewName('');
        setNewUserId('');
        setNewPassword('');
        setNewPhone('');
        setNewRoleId('');
        setIsDialogOpen(false);
        
        queryClient.invalidateQueries({ queryKey: ['staff-members-dynamic'] });
        queryClient.invalidateQueries({ queryKey: ['staff-activity-logs'] });
      }
    } catch (error: any) {
      console.error('Error creating staff:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create staff member.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle assigning role to orphaned user
  const handleAssignRole = async () => {
    if (!assigningRoleStaff || !assignRoleId) return;
    
    setIsAssigningRole(true);
    
    try {
      // Insert role assignment using RPC
      const { data: roleResult, error: rpcError } = await supabase
        .rpc('assign_user_role', {
          target_user_id: assigningRoleStaff.id,
          target_role_id: assignRoleId,
        });

      const result = roleResult as { success: boolean; error?: string } | null;
      if (rpcError || !result?.success) {
        throw new Error(result?.error || rpcError?.message || 'Failed to assign role');
      }

      // Get role details for activity log
      const selectedRole = roles.find(r => r.id === assignRoleId);
      
      // Auto-grant default module permissions for this role
      if (selectedRole) {
        const defaultModules = getDefaultModulesForRole(selectedRole.name);
        
        for (const module of defaultModules) {
          for (const action of DEFAULT_ACTIONS) {
            await supabase
              .from('permissions')
              .upsert({
                role: selectedRole.name,
                module,
                action,
                is_allowed: true,
              }, { 
                onConflict: 'role,module,action',
                ignoreDuplicates: false 
              });
          }
        }
      }

      await supabase.rpc('log_activity', {
        _action_type: 'update',
        _module: 'staff',
        _description: `Assigned role ${selectedRole?.display_name} to orphaned user: ${assigningRoleStaff.full_name}`,
        _record_id: assigningRoleStaff.id,
        _record_type: 'user',
      });

      toast({
        title: 'Role Assigned',
        description: `${assigningRoleStaff.full_name} has been assigned the ${selectedRole?.display_name} role.`,
      });

      setIsAssignRoleDialogOpen(false);
      setAssigningRoleStaff(null);
      setAssignRoleId('');
      queryClient.invalidateQueries({ queryKey: ['staff-members-dynamic'] });
      queryClient.invalidateQueries({ queryKey: ['staff-activity-logs'] });
    } catch (error: any) {
      console.error('Error assigning role:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to assign role.',
        variant: 'destructive',
      });
    } finally {
      setIsAssigningRole(false);
    }
  };

  const getRoleIcon = (roleName: string | null) => {
    switch (roleName) {
      case 'admin':
        return <Shield className="h-4 w-4" />;
      case 'manager':
        return <Users className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  // Open edit dialog
  const handleEditStaff = (staff: StaffMember) => {
    setEditingStaff(staff);
    setEditName(staff.full_name);
    setEditPhone(staff.phone || '');
    setEditStatus(staff.is_active);
    setEditPassword('');
    setEditRequirePasswordChange(false);
    
    // Find the current role ID
    const currentRole = roles.find(r => r.name === staff.role_name);
    setEditRoleId(currentRole?.id || '');
    
    setIsEditDialogOpen(true);
  };

  // Handle edit submission
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;
    
    setIsEditSubmitting(true);
    
    try {
      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: editName,
          phone: editPhone || null,
          is_active: editStatus,
        })
        .eq('id', editingStaff.id);
      
      if (profileError) throw profileError;

      // Update role if changed using RPC
      if (editRoleId) {
        const { data: roleResult, error: rpcError } = await supabase
          .rpc('assign_user_role', {
            target_user_id: editingStaff.id,
            target_role_id: editRoleId,
          });
        
        const result = roleResult as { success: boolean; error?: string } | null;
        if (rpcError || !result?.success) {
          throw new Error(result?.error || rpcError?.message || 'Failed to update role');
        }
      }

      // Update password if provided using edge function
      if (editPassword.length >= 6) {
        const { data: sessionData } = await supabase.auth.getSession();
        
        const response = await supabase.functions.invoke('change-user-password', {
          body: {
            target_user_id: editingStaff.id,
            new_password: editPassword,
            require_password_change: editRequirePasswordChange
          }
        });

        if (response.error) {
          console.error('Password update error:', response.error);
          toast({
            title: 'Password Update Failed',
            description: response.error.message || 'Failed to update password.',
            variant: 'destructive',
          });
        } else if (!response.data?.success) {
          toast({
            title: 'Password Update Failed',
            description: response.data?.message || 'Failed to update password.',
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Password Updated',
            description: editRequirePasswordChange 
              ? 'Password changed. User will be required to change it on next login.'
              : 'Password changed successfully.',
          });
        }
      }

      // Log activity
      const selectedRole = roles.find(r => r.id === editRoleId);
      await supabase.rpc('log_activity', {
        _action_type: 'update',
        _module: 'staff',
        _description: `Updated staff account: ${editingStaff.full_name} - Role: ${selectedRole?.display_name || 'unchanged'}`,
        _record_id: editingStaff.id,
        _record_type: 'user',
      });

      toast({
        title: 'Staff Updated',
        description: `${editName}'s account has been updated successfully.`,
      });

      setIsEditDialogOpen(false);
      setEditingStaff(null);
      queryClient.invalidateQueries({ queryKey: ['staff-members-dynamic'] });
      queryClient.invalidateQueries({ queryKey: ['staff-activity-logs'] });
    } catch (error: any) {
      console.error('Error updating staff:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update staff member.',
        variant: 'destructive',
      });
    } finally {
      setIsEditSubmitting(false);
    }
  };

  // Handle delete staff
  const handleDeleteStaff = async () => {
    if (!deletingStaff) return;
    
    setIsDeleting(true);
    
    try {
      // Delete from user_roles_dynamic first
      await supabase
        .from('user_roles_dynamic')
        .delete()
        .eq('user_id', deletingStaff.id);

      // Delete from profiles (this will cascade delete from auth.users if set up)
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', deletingStaff.id);
      
      if (profileError) throw profileError;

      // Log activity
      await supabase.rpc('log_activity', {
        _action_type: 'delete',
        _module: 'staff',
        _description: `Deleted staff account: ${deletingStaff.full_name} (${fromInternalEmail(deletingStaff.email)})`,
        _record_id: deletingStaff.id,
        _record_type: 'user',
      });

      toast({
        title: 'Staff Deleted',
        description: `${deletingStaff.full_name}'s account has been removed.`,
      });

      setIsDeleteDialogOpen(false);
      setDeletingStaff(null);
      queryClient.invalidateQueries({ queryKey: ['staff-members-dynamic'] });
      queryClient.invalidateQueries({ queryKey: ['staff-activity-logs'] });
    } catch (error: any) {
      console.error('Error deleting staff:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete staff member.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isAdmin) {
    return (
      <DashboardLayout title="Access Denied">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">You don't have permission to access this page.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout 
      title="Staff Management" 
      subtitle="Create and manage staff login credentials"
    >
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground">
              Total Staff: {staffMembers.length}
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add Staff Member
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create Staff Account</DialogTitle>
                <DialogDescription>
                  Create login credentials for a new staff member.
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleCreateStaff} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="new-name">Full Name</Label>
                  <Input
                    id="new-name"
                    type="text"
                    placeholder="Enter full name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-userid">User ID (Login ID)</Label>
                  <Input
                    id="new-userid"
                    type="text"
                    placeholder="e.g., frontdesk1, bartender1"
                    value={newUserId}
                    onChange={(e) => setNewUserId(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Letters, numbers, and underscores only.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-password">Password</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Create a password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-phone">Phone (Optional)</Label>
                  <Input
                    id="new-phone"
                    type="tel"
                    placeholder="Enter phone number"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-role">Role / Department</Label>
                  <Select value={newRoleId} onValueChange={setNewRoleId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(groupedRoles).map(([deptName, deptRoles]) => (
                        <SelectGroup key={deptName}>
                          <SelectLabel className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {deptName}
                          </SelectLabel>
                          {deptRoles.map((role) => (
                            <SelectItem key={role.id} value={role.id}>
                              {role.display_name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1" disabled={isSubmitting}>
                    {isSubmitting ? 'Creating...' : 'Create Account'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="shadow-soft">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : staffMembers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="font-medium text-lg mb-1">No Staff Members</h3>
                <p className="text-muted-foreground text-sm">
                  Click "Add Staff Member" to create login credentials.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>User ID</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                {staffMembers.map((staff) => {
                    const isOrphaned = !staff.role_name;
                    return (
                    <TableRow key={staff.id} className={isOrphaned ? 'bg-destructive/5' : ''}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {staff.full_name}
                          {isOrphaned && (
                            <Badge variant="destructive" className="gap-1 text-xs">
                              <AlertTriangle className="h-3 w-3" />
                              No Role
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {fromInternalEmail(staff.email)}
                      </TableCell>
                      <TableCell>{staff.phone || '-'}</TableCell>
                      <TableCell>
                        {isOrphaned ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1 text-amber-600 border-amber-300 hover:bg-amber-50"
                            onClick={() => {
                              setAssigningRoleStaff(staff);
                              setAssignRoleId('');
                              setIsAssignRoleDialogOpen(true);
                            }}
                          >
                            <Link className="h-3 w-3" />
                            Assign Role
                          </Button>
                        ) : (
                          <Badge variant="outline" className="gap-1">
                            {getRoleIcon(staff.role_name)}
                            <span className="capitalize">{staff.role_display_name}</span>
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {staff.department_name ? (
                          <Badge variant="secondary" className="gap-1">
                            <Building2 className="h-3 w-3" />
                            {staff.department_name}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={staff.is_active ? 'default' : 'secondary'}>
                          {staff.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(staff.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isOrphaned && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                              onClick={() => {
                                setAssigningRoleStaff(staff);
                                setAssignRoleId('');
                                setIsAssignRoleDialogOpen(true);
                              }}
                              title="Assign Role"
                            >
                              <Link className="h-4 w-4" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" onClick={() => handleEditStaff(staff)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => {
                              setDeletingStaff(staff);
                              setIsDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );})}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Staff Activity Log */}
        <Card className="shadow-soft">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <History className="h-5 w-5" />
                Staff Activity Log
              </CardTitle>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs">
                  <X className="h-3 w-3 mr-1" />
                  Clear Filters
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {/* Filter Controls */}
            <div className="flex flex-wrap gap-3 mb-4">
              {/* Action Type Filter */}
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={actionFilter} onValueChange={setActionFilter}>
                  <SelectTrigger className="w-[140px] h-9">
                    <SelectValue placeholder="Action type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Actions</SelectItem>
                    <SelectItem value="create">Created</SelectItem>
                    <SelectItem value="update">Updated</SelectItem>
                    <SelectItem value="delete">Deleted</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Date Range Preset Filter */}
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <Select value={dateRangePreset} onValueChange={(val) => {
                  setDateRangePreset(val);
                  if (val !== 'custom') setDateFilter(undefined);
                }}>
                  <SelectTrigger className="w-[140px] h-9">
                    <SelectValue placeholder="Date range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">Last 7 Days</SelectItem>
                    <SelectItem value="month">Last 30 Days</SelectItem>
                    <SelectItem value="custom">Custom Date</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Custom Date Picker */}
              {dateRangePreset === 'custom' && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9">
                      {dateFilter ? format(dateFilter, 'MMM d, yyyy') : 'Select date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={dateFilter}
                      onSelect={setDateFilter}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              )}

              {/* Results count */}
              <span className="text-sm text-muted-foreground ml-auto">
                {filteredActivityLogs.length} {filteredActivityLogs.length === 1 ? 'entry' : 'entries'}
              </span>
            </div>

            {isLoadingLogs ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : filteredActivityLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-center">
                <History className="h-8 w-8 text-muted-foreground/50 mb-2" />
                <p className="text-muted-foreground text-sm">
                  {activityLogs.length === 0 ? 'No activity recorded yet.' : 'No matching activity found.'}
                </p>
                {hasActiveFilters && activityLogs.length > 0 && (
                  <Button variant="link" size="sm" onClick={clearFilters} className="mt-2">
                    Clear filters
                  </Button>
                )}
              </div>
            ) : (
              <ScrollArea className="h-[300px]">
                <div className="space-y-3">
                  {filteredActivityLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-shrink-0 mt-0.5">
                        {getActionIcon(log.action_type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={getActionBadgeVariant(log.action_type)} className="capitalize text-xs">
                            {log.action_type}
                          </Badge>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(log.created_at), 'MMM d, yyyy h:mm a')}
                          </span>
                        </div>
                        <p className="text-sm text-foreground">{log.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Edit Staff Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Staff Member</DialogTitle>
              <DialogDescription>
                Update staff account details. Leave password blank to keep unchanged.
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleEditSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Full Name</Label>
                <Input
                  id="edit-name"
                  type="text"
                  placeholder="Enter full name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-userid">User ID (Login ID)</Label>
                <Input
                  id="edit-userid"
                  type="text"
                  value={editingStaff ? fromInternalEmail(editingStaff.email) : ''}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  User ID cannot be changed after creation.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-password">New Password (Optional)</Label>
                <div className="relative">
                  <Input
                    id="edit-password"
                    type={showEditPassword ? 'text' : 'password'}
                    placeholder="Leave blank to keep current"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    minLength={6}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowEditPassword(!showEditPassword)}
                  >
                    {showEditPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {editPassword && editPassword.length < 6 && (
                  <p className="text-xs text-destructive">Password must be at least 6 characters.</p>
                )}
                {editPassword && editPassword.length >= 6 && (
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="checkbox"
                      id="require-password-change"
                      checked={editRequirePasswordChange}
                      onChange={(e) => setEditRequirePasswordChange(e.target.checked)}
                      className="h-4 w-4 rounded border-input accent-primary"
                    />
                    <Label htmlFor="require-password-change" className="text-sm font-normal cursor-pointer">
                      Require user to change password on next login
                    </Label>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-phone">Phone</Label>
                <Input
                  id="edit-phone"
                  type="tel"
                  placeholder="Enter phone number"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-role">Role / Department</Label>
                <Select value={editRoleId} onValueChange={setEditRoleId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(groupedRoles).map(([deptName, deptRoles]) => (
                      <SelectGroup key={deptName}>
                        <SelectLabel className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {deptName}
                        </SelectLabel>
                        {deptRoles.map((role) => (
                          <SelectItem key={role.id} value={role.id}>
                            {role.display_name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-status">Account Status</Label>
                <Select value={editStatus ? 'active' : 'inactive'} onValueChange={(v) => setEditStatus(v === 'active')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={isEditSubmitting || (editPassword.length > 0 && editPassword.length < 6)}>
                  {isEditSubmitting ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Staff Member</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete <strong>{deletingStaff?.full_name}</strong> ({deletingStaff ? fromInternalEmail(deletingStaff.email) : ''})? 
                This action cannot be undone and will remove all access for this user.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteStaff}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Assign Role Dialog (for orphaned users) */}
        <Dialog open={isAssignRoleDialogOpen} onOpenChange={setIsAssignRoleDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Assign Role
              </DialogTitle>
              <DialogDescription>
                This user account exists but has no role assigned. 
                Select a role to restore full access.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 mt-4">
              <div className="p-3 rounded-lg bg-muted">
                <p className="text-sm font-medium">{assigningRoleStaff?.full_name}</p>
                <p className="text-xs text-muted-foreground font-mono">
                  {assigningRoleStaff ? fromInternalEmail(assigningRoleStaff.email) : ''}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="assign-role">Select Role</Label>
                <Select value={assignRoleId} onValueChange={setAssignRoleId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(groupedRoles).map(([deptName, deptRoles]) => (
                      <SelectGroup key={deptName}>
                        <SelectLabel className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {deptName}
                        </SelectLabel>
                        {deptRoles.map((role) => (
                          <SelectItem key={role.id} value={role.id}>
                            {role.display_name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-3 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="flex-1" 
                  onClick={() => {
                    setIsAssignRoleDialogOpen(false);
                    setAssigningRoleStaff(null);
                    setAssignRoleId('');
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  className="flex-1" 
                  disabled={isAssigningRole || !assignRoleId}
                  onClick={handleAssignRole}
                >
                  {isAssigningRole ? 'Assigning...' : 'Assign Role'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
