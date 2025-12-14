import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Label } from '../../components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../components/ui/tooltip';
import { 
  Shield, 
  Users, 
  Settings, 
  Loader2, 
  Eye, 
  ShieldCheck,
  TrendingUp,
  Package,
  Headphones,
  Calculator,
  Briefcase,
  Crown,
  DollarSign,
  MessageSquare,
  Target,
  UserCog,
  PackageCheck,
  LucideIcon
} from 'lucide-react';
import { api } from '../../lib/api';
import { usePermissions, PERMISSIONS } from '../../hooks/usePermissions';
import { cn } from '../../lib/utils';

interface Permission {
  id: number;
  code: string;
  name: string;
  description: string;
  category: string;
}

interface Role {
  id: number;
  code: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  userCount: number;
  permissions: string[];
}

// Map role codes to icons
const getRoleIcon = (roleCode: string): LucideIcon => {
  const iconMap: Record<string, LucideIcon> = {
    admin: ShieldCheck,
    superuser: Crown,
    system_admin: UserCog,
    billing_manager: DollarSign,
    finance: Calculator,
    sales_manager: Target,
    sales: TrendingUp,
    salesperson: TrendingUp,
    client_service: MessageSquare,
    customer_service: Headphones,
    warehouse_lead: PackageCheck,
    warehouse_picker: Package,
  };
  return iconMap[roleCode] || Shield;
};

export function RolesPage() {
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();
  
  // Check permissions
  const canView = hasPermission(PERMISSIONS.VIEW_ROLES);
  const canEdit = hasPermission(PERMISSIONS.MANAGE_ROLES);
  
  // State
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [error, setError] = useState<string>('');

  // Queries
  const { data: rolesData, isLoading: rolesLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: () => api.get<{ roles: Role[] }>('/api/roles'),
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  const { data: permissionsData } = useQuery({
    queryKey: ['permissions'],
    queryFn: () => api.get<{ permissions: Permission[]; grouped: Record<string, Permission[]> }>('/api/roles/permissions'),
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Mutation
  const updatePermissionsMutation = useMutation({
    mutationFn: async ({ roleId, permissions }: { roleId: number; permissions: string[] }) => {
      return api.put(`/api/roles/${roleId}/permissions`, { permissions });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      setEditingRole(null);
      setSelectedPermissions([]);
      setError('');
    },
    onError: (error: Error) => {
      console.error('Failed to update role permissions:', error.message);
      setError(error.message || 'Failed to update permissions');
    },
  });

  // Redirect if no access
  if (!canView && !canEdit) {
    return <Navigate to="/" replace />;
  }

  const openEditDialog = (role: Role) => {
    setEditingRole(role);
    setSelectedPermissions(role.permissions);
    setError('');
  };

  const handleSavePermissions = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRole || !canEdit) return;
    
    if (editingRole.isSystem) {
      setError('Cannot modify system role');
      return;
    }
    
    updatePermissionsMutation.mutate({
      roleId: editingRole.id,
      permissions: selectedPermissions,
    });
  };

  const togglePermission = (permissionCode: string) => {
    // Prevent changes in read-only mode or for system roles
    if (!canEdit || editingRole?.isSystem) return;
    
    setSelectedPermissions(prev =>
      prev.includes(permissionCode)
        ? prev.filter(p => p !== permissionCode)
        : [...prev, permissionCode]
    );
  };

  const roles = rolesData?.roles || [];
  const permissionsByCategory = permissionsData?.grouped || {};

  if (rolesLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Roles & Permissions</h1>
          <p className="text-muted-foreground mt-1">
            {canEdit 
              ? 'Configure access permissions for each role'
              : 'View role structure and permission assignments'
            }
          </p>
        </div>
        
        {/* Read-Only Indicator */}
        {canView && !canEdit && (
          <Badge variant="outline" className="gap-1">
            <Eye className="h-3 w-3" />
            View Only
          </Badge>
        )}
      </div>

      {/* Role Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {roles.map((role) => {
          const RoleIcon = getRoleIcon(role.code);
          return (
            <Card 
              key={role.id} 
              className={cn(
                "relative",
                !canEdit && "opacity-90"
              )}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <RoleIcon className="h-8 w-8 text-muted-foreground" />
                  {role.isSystem && (
                    <Badge variant="outline" className="text-xs">
                      System
                    </Badge>
                  )}
                </div>
                <CardTitle className="mt-2">{role.name}</CardTitle>
              <CardDescription className="text-xs">
                {role.description || 'No description'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>{role.userCount} {role.userCount === 1 ? 'user' : 'users'}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Settings className="h-4 w-4" />
                {role.permissions.length === 0 ? (
                  <span className="text-xs italic">No permissions</span>
                ) : (
                  <span>{role.permissions.length} permissions</span>
                )}
              </div>
              
              {/* Button with tooltip for read-only mode */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="w-full">
                      <Button
                        variant={canEdit ? "outline" : "secondary"}
                        size="sm"
                        className="w-full"
                        onClick={() => openEditDialog(role)}
                      >
                        {canEdit ? (
                          <>
                            <Settings className="h-3 w-3 mr-2" />
                            Configure
                          </>
                        ) : (
                          <>
                            <Eye className="h-3 w-3 mr-2" />
                            View Details
                          </>
                        )}
                      </Button>
                    </span>
                  </TooltipTrigger>
                  
                  {/* Show helpful tooltip in read-only mode */}
                  {canView && !canEdit && (
                    <TooltipContent>
                      <p className="font-medium">Read-Only Access</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Requires 'Manage Roles' permission to edit
                      </p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            </CardContent>
          </Card>
        );
        })}
      </div>

      {/* Edit/View Permissions Dialog */}
      <Dialog open={!!editingRole} onOpenChange={(open) => !open && setEditingRole(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <form onSubmit={handleSavePermissions}>
            <DialogHeader>
              <DialogTitle>
                {canEdit ? 'Configure' : 'View'} Permissions: {editingRole?.name}
              </DialogTitle>
              <DialogDescription>
                {canEdit 
                  ? 'Select which permissions this role should have'
                  : 'View the permissions assigned to this role'
                }
              </DialogDescription>
              {editingRole?.isSystem && (
                <Badge variant="outline" className="w-fit mt-2">
                  System Role - Cannot be modified
                </Badge>
              )}
            </DialogHeader>

            {error && (
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
                {error}
              </div>
            )}

            <div className="py-4 space-y-6">
              {Object.entries(permissionsByCategory).map(([category, permissions]) => (
                <div key={category} className="space-y-3">
                  <h4 className="font-medium text-sm capitalize border-b pb-1">
                    {category} Permissions
                  </h4>
                  <div className="space-y-2 pl-2">
                    {permissions.map((permission) => (
                      <div key={permission.code} className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          id={permission.code}
                          checked={selectedPermissions.includes(permission.code)}
                          onChange={() => togglePermission(permission.code)}
                          disabled={!canEdit || editingRole?.isSystem}
                          className={cn(
                            "mt-1 h-4 w-4 rounded border-gray-300",
                            (!canEdit || editingRole?.isSystem) && "cursor-not-allowed opacity-60"
                          )}
                        />
                        <div className="flex-1">
                          <Label
                            htmlFor={permission.code}
                            className={cn(
                              "text-sm font-medium",
                              canEdit && !editingRole?.isSystem ? "cursor-pointer" : "cursor-default",
                              (!canEdit || editingRole?.isSystem) && "text-muted-foreground"
                            )}
                          >
                            {permission.name}
                          </Label>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {permission.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <DialogFooter>
              {canEdit && !editingRole?.isSystem ? (
                // Edit mode - show Cancel and Save
                <>
                  <Button type="button" variant="outline" onClick={() => setEditingRole(null)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={updatePermissionsMutation.isPending}>
                    {updatePermissionsMutation.isPending && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    Save Changes
                  </Button>
                </>
              ) : (
                // View mode or system role - just show Close
                <Button type="button" onClick={() => setEditingRole(null)}>
                  Close
                </Button>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
