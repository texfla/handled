import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Label } from '../components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { Shield, Users, Settings, Loader2 } from 'lucide-react';
import { api } from '../lib/api';

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

export function RolesPage() {
  const queryClient = useQueryClient();
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [error, setError] = useState<string>('');

  const { data: rolesData, isLoading: rolesLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: () => api.get<{ roles: Role[] }>('/api/roles'),
  });

  const { data: permissionsData } = useQuery({
    queryKey: ['permissions'],
    queryFn: () => api.get<{ permissions: Permission[]; grouped: Record<string, Permission[]> }>('/api/roles/permissions'),
  });

  const updatePermissionsMutation = useMutation({
    mutationFn: async ({ roleId, permissions }: { roleId: number; permissions: string[] }) => {
      return api.put(`/api/roles/${roleId}/permissions`, { permissions });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setEditingRole(null);
      setSelectedPermissions([]);
      setError('');
    },
    onError: (error: Error) => {
      console.error('Failed to update role permissions:', error.message);
      setError(error.message || 'Failed to update permissions');
    },
  });

  const openEditDialog = (role: Role) => {
    setEditingRole(role);
    setSelectedPermissions(role.permissions);
    setError('');
  };

  const handleSavePermissions = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRole) return;
    updatePermissionsMutation.mutate({
      roleId: editingRole.id,
      permissions: selectedPermissions,
    });
  };

  const togglePermission = (permissionCode: string) => {
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
      <div>
        <h1 className="text-3xl font-bold">Roles & Permissions</h1>
        <p className="text-muted-foreground mt-1">
          Configure access permissions for each role
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {roles.map((role) => (
          <Card key={role.id} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <Shield className="h-8 w-8 text-muted-foreground" />
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
                <span>{role.permissions.length} permissions</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => openEditDialog(role)}
              >
                <Settings className="h-3 w-3 mr-2" />
                Configure
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Permissions Dialog */}
      <Dialog open={!!editingRole} onOpenChange={(open) => !open && setEditingRole(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <form onSubmit={handleSavePermissions}>
            <DialogHeader>
              <DialogTitle>Configure Permissions: {editingRole?.name}</DialogTitle>
              <DialogDescription>
                Select which permissions this role should have
              </DialogDescription>
            </DialogHeader>

            {error && (
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
                {error}
              </div>
            )}

            <div className="py-4 space-y-6">
              {Object.entries(permissionsByCategory).map(([category, permissions]) => (
                <div key={category} className="space-y-3">
                  <h4 className="font-medium text-sm capitalize">{category} Permissions</h4>
                  <div className="space-y-2 pl-2">
                    {permissions.map((permission) => (
                      <div key={permission.code} className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          id={permission.code}
                          checked={selectedPermissions.includes(permission.code)}
                          onChange={() => togglePermission(permission.code)}
                          className="mt-1 h-4 w-4 rounded border-gray-300"
                        />
                        <div className="flex-1">
                          <Label
                            htmlFor={permission.code}
                            className="text-sm font-medium cursor-pointer"
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
              <Button type="button" variant="outline" onClick={() => setEditingRole(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updatePermissionsMutation.isPending}>
                {updatePermissionsMutation.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

