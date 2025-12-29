import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Shield, Save, RefreshCw, Building2, RotateCcw } from 'lucide-react';
import { getDefaultModulesForRole, DEFAULT_ACTIONS, ALL_MODULES } from '@/config/rolePermissions';

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

interface Permission {
  id: string;
  role: string;
  module: string;
  action: string;
  is_allowed: boolean;
}

const MODULES = ALL_MODULES;

const ACTIONS = [
  { key: 'view', label: 'View' },
  { key: 'create', label: 'Create' },
  { key: 'edit', label: 'Edit' },
  { key: 'delete', label: 'Delete' },
];

export default function Permissions() {
  const queryClient = useQueryClient();
  const [selectedRoleName, setSelectedRoleName] = useState<string>('');
  const [localPermissions, setLocalPermissions] = useState<Record<string, boolean>>({});
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch roles dynamically from the roles table
  const { data: roles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ['dynamic-roles-for-permissions'],
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

  // Set default selected role when roles are loaded
  useEffect(() => {
    if (roles.length > 0 && !selectedRoleName) {
      // Skip admin role, select first non-admin role
      const nonAdminRole = roles.find(r => r.name !== 'admin');
      if (nonAdminRole) {
        setSelectedRoleName(nonAdminRole.name);
      }
    }
  }, [roles, selectedRoleName]);

  const { data: permissions = [], isLoading: permissionsLoading } = useQuery({
    queryKey: ['permissions', selectedRoleName],
    queryFn: async () => {
      if (!selectedRoleName) return [];
      // Cast to any to support dynamic role names beyond the enum
      const { data, error } = await supabase
        .from('permissions')
        .select('*')
        .eq('role', selectedRoleName as any);
      if (error) throw error;
      return data as Permission[];
    },
    enabled: !!selectedRoleName,
  });

  useEffect(() => {
    const permMap: Record<string, boolean> = {};
    permissions.forEach((p) => {
      permMap[`${p.module}-${p.action}`] = p.is_allowed;
    });
    setLocalPermissions(permMap);
    setHasChanges(false);
  }, [permissions]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const updates: { role: string; module: string; action: string; is_allowed: boolean }[] = [];

      for (const module of MODULES) {
        for (const action of ACTIONS) {
          const key = `${module.key}-${action.key}`;
          const isAllowed = localPermissions[key] ?? false;
          updates.push({
            role: selectedRoleName,
            module: module.key,
            action: action.key,
            is_allowed: isAllowed,
          });
        }
      }

      for (const update of updates) {
        const existing = permissions.find(
          (p) => p.module === update.module && p.action === update.action
        );

        if (existing) {
          const { error } = await supabase
            .from('permissions')
            .update({ is_allowed: update.is_allowed })
            .eq('id', existing.id);
          if (error) throw error;
        } else {
          // For new roles, we insert with role name
          // Cast to any to handle dynamic roles beyond the enum
          const insertData = {
            role: update.role,
            module: update.module,
            action: update.action,
            is_allowed: update.is_allowed,
          };
          const { error } = await supabase.from('permissions').insert(insertData as any);
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
      toast.success('Permissions saved successfully');
      setHasChanges(false);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleToggle = (module: string, action: string) => {
    const key = `${module}-${action}`;
    setLocalPermissions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
    setHasChanges(true);
  };

  const isPermissionAllowed = (module: string, action: string) => {
    const key = `${module}-${action}`;
    return localPermissions[key] ?? false;
  };

  const handleGrantAll = () => {
    const newPerms: Record<string, boolean> = {};
    for (const module of MODULES) {
      for (const action of ACTIONS) {
        newPerms[`${module.key}-${action.key}`] = true;
      }
    }
    setLocalPermissions(newPerms);
    setHasChanges(true);
  };

  const handleRevokeAll = () => {
    const newPerms: Record<string, boolean> = {};
    for (const module of MODULES) {
      for (const action of ACTIONS) {
        newPerms[`${module.key}-${action.key}`] = false;
      }
    }
    setLocalPermissions(newPerms);
    setHasChanges(true);
  };

  const handleResetToDefaults = () => {
    if (!selectedRoleName) return;
    
    const defaultModules = getDefaultModulesForRole(selectedRoleName);
    const newPerms: Record<string, boolean> = {};
    
    for (const module of MODULES) {
      for (const action of ACTIONS) {
        // Check if this module is in the default modules for this role
        const shouldAllow = defaultModules.includes('*') || defaultModules.includes(module.key);
        newPerms[`${module.key}-${action.key}`] = shouldAllow;
      }
    }
    
    setLocalPermissions(newPerms);
    setHasChanges(true);
    toast.info(`Permissions reset to defaults for ${selectedRole?.display_name}`);
  };

  // Group roles by department
  const groupedRoles = roles.reduce((acc, role) => {
    if (role.name === 'admin') return acc; // Skip admin
    const deptName = role.department?.name || 'General';
    if (!acc[deptName]) acc[deptName] = [];
    acc[deptName].push(role);
    return acc;
  }, {} as Record<string, Role[]>);

  const selectedRole = roles.find(r => r.name === selectedRoleName);
  const isLoading = rolesLoading || permissionsLoading;

  return (
    <DashboardLayout title="Permissions" subtitle="Configure role permissions">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Permissions</h1>
            <p className="text-muted-foreground">
              Grant or revoke module permissions for each role
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleResetToDefaults}
              disabled={saveMutation.isPending || !selectedRoleName}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset to Defaults
            </Button>
            <Button
              variant="outline"
              onClick={handleGrantAll}
              disabled={saveMutation.isPending || !selectedRoleName}
            >
              Grant All
            </Button>
            <Button
              variant="outline"
              onClick={handleRevokeAll}
              disabled={saveMutation.isPending || !selectedRoleName}
            >
              Revoke All
            </Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={!hasChanges || saveMutation.isPending}
            >
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Role Permissions
                </CardTitle>
                <CardDescription>
                  Configure what each role can access and modify
                </CardDescription>
              </div>
              <Select
                value={selectedRoleName}
                onValueChange={(val) => setSelectedRoleName(val)}
              >
                <SelectTrigger className="w-[250px]">
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
                        <SelectItem key={role.id} value={role.name}>
                          {role.display_name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : !selectedRoleName ? (
              <div className="text-center py-8 text-muted-foreground">
                Select a role to configure permissions
              </div>
            ) : (
              <>
                <div className="mb-4 flex items-center gap-2">
                  <Badge variant="outline" className="text-sm">
                    Editing: {selectedRole?.display_name}
                  </Badge>
                  {selectedRole?.department && (
                    <Badge variant="secondary" className="text-sm gap-1">
                      <Building2 className="h-3 w-3" />
                      {selectedRole.department.name}
                    </Badge>
                  )}
                  {hasChanges && (
                    <Badge variant="destructive" className="text-sm">
                      Unsaved changes
                    </Badge>
                  )}
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">Module</TableHead>
                      {ACTIONS.map((action) => (
                        <TableHead key={action.key} className="text-center">
                          {action.label}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {MODULES.map((module) => (
                      <TableRow key={module.key}>
                        <TableCell className="font-medium">{module.label}</TableCell>
                        {ACTIONS.map((action) => (
                          <TableCell key={action.key} className="text-center">
                            <Switch
                              checked={isPermissionAllowed(module.key, action.key)}
                              onCheckedChange={() =>
                                handleToggle(module.key, action.key)
                              }
                            />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Note</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>
                <strong>Admin</strong> role has full access to all modules and is not shown here.
              </li>
              <li>
                Roles are grouped by their assigned <strong>department</strong>.
              </li>
              <li>
                <strong>View</strong> permission is required to access a module.
              </li>
              <li>
                <strong>Create</strong>, <strong>Edit</strong>, and{' '}
                <strong>Delete</strong> permissions control data modification.
              </li>
              <li>Changes take effect immediately after saving.</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
