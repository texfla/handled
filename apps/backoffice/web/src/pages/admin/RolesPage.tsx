import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Label } from '../../components/ui/label';
import { Input } from '../../components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../../components/ui/alert-dialog';
import { IconPicker } from '../../components/ui/icon-picker';
import { 
  Users, 
  Loader2, 
  Eye, 
  Plus,
  Settings as SettingsIcon,
  Trash2
} from 'lucide-react';
import { api } from '../../lib/api';
import { usePermissions, PERMISSIONS } from '../../hooks/usePermissions';
import { cn } from '../../lib/utils';
import { getIconByValue } from '../../lib/role-icons';
import { getErrorTitle } from '../../types/errors';
import { groupPermissionsByResource, groupPermissionsByCategory, type PermissionInfo } from '../../lib/permission-utils';

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
  icon: string;
  isSystem: boolean;
  userCount: number;
  permissions: string[];
}

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
  const mouseDownPos = useRef<{ x: number; y: number } | null>(null);
  const isSelectingRef = useRef(false);
  
  // Create role state
  const [isCreating, setIsCreating] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDescription, setNewRoleDescription] = useState('');
  const [newRoleIcon, setNewRoleIcon] = useState('shield');
  const [newRolePermissions, setNewRolePermissions] = useState<string[]>([]);
  
  // Edit metadata state
  const [editingMetadataRole, setEditingMetadataRole] = useState<Role | null>(null);
  const [editedDescription, setEditedDescription] = useState('');
  const [editedIcon, setEditedIcon] = useState('');
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);

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

  // Query for users with role (for delete confirmation)
  const { data: roleUsersData } = useQuery({
    queryKey: ['role-users', editingMetadataRole?.id],
    queryFn: () => api.get<{ users: Array<{ id: string; name: string; email: string }>; count: number }>(
      `/api/roles/${editingMetadataRole?.id}/users`
    ),
    enabled: !!editingMetadataRole && canEdit,
  });

  // Mutations
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
    onError: (error: unknown) => {
      setError(getErrorTitle(error, 'Failed to update permissions'));
    },
  });

  const createRoleMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      description?: string;
      icon?: string;
      permissions: string[];
    }) => api.post('/api/roles', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setIsCreating(false);
      setNewRoleName('');
      setNewRoleDescription('');
      setNewRoleIcon('shield');
      setNewRolePermissions([]);
      setError('');
    },
    onError: (error: unknown) => {
      setError(getErrorTitle(error, 'Failed to create role'));
    },
  });

  const updateMetadataMutation = useMutation({
    mutationFn: async ({ roleId, description, icon }: {
      roleId: number;
      description?: string;
      icon: string;
    }) => api.put(`/api/roles/${roleId}/metadata`, { description, icon }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setEditingMetadataRole(null);
    },
    onError: (error: unknown) => {
      setError(getErrorTitle(error, 'Failed to update role'));
    },
  });

  const deleteRoleMutation = useMutation({
    mutationFn: async (roleId: number) => api.delete(`/api/roles/${roleId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setEditingMetadataRole(null);
      setDeleteConfirmed(false);
    },
    onError: (error: unknown) => {
      setError(getErrorTitle(error, 'Failed to delete role'));
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

  const openMetadataDialog = (role: Role) => {
    setEditingRole(null); // Close permissions dialog if open
    setEditingMetadataRole(role);
    setEditedDescription(role.description || '');
    setEditedIcon(role.icon || 'shield');
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

  const handleCreateRole = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newRoleName.trim()) {
      setError('Role name is required');
      return;
    }
    
    if (newRolePermissions.length === 0) {
      setError('At least one permission is required');
      return;
    }
    
    createRoleMutation.mutate({
      name: newRoleName,
      description: newRoleDescription || undefined,
      icon: newRoleIcon,
      permissions: newRolePermissions
    });
  };

  const handleSaveMetadata = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMetadataRole) return;
    
    updateMetadataMutation.mutate({
      roleId: editingMetadataRole.id,
      description: editedDescription || undefined,
      icon: editedIcon
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

  const toggleNewRolePermission = (permCode: string) => {
    setNewRolePermissions(prev =>
      prev.includes(permCode) ? prev.filter(p => p !== permCode) : [...prev, permCode]
    );
  };

  const generateCode = (name: string) => {
    if (!name) return '';
    return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  };

  const roles = rolesData?.roles || [];
  const permissionsByCategory = permissionsData?.grouped || {};
  const roleUsers = roleUsersData?.users || [];

  if (rolesLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const handleCloseEditDialog = () => {
    setEditingRole(null);
    setSelectedPermissions([]);
    setError('');
  };

  const handleCloseCreateDialog = () => {
    setIsCreating(false);
    setNewRoleName('');
    setNewRoleDescription('');
    setNewRoleIcon('shield');
    setNewRolePermissions([]);
    setError('');
  };

  const handleCloseMetadataDialog = () => {
    setEditingMetadataRole(null);
    setDeleteConfirmed(false);
    setError('');
  };

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
        
        <div className="flex items-center gap-2">
          {/* Read-Only Indicator */}
          {canView && !canEdit && (
            <Badge variant="outline" className="gap-1">
              <Eye className="h-3 w-3" />
              View Only
            </Badge>
          )}
          
          {/* Create Role Button */}
          {canEdit && (
            <Button onClick={() => setIsCreating(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Role
            </Button>
          )}
        </div>
      </div>

      {/* Role Cards Grid */}
      {roles.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No roles found.</p>
            {canEdit && (
              <Button onClick={() => setIsCreating(true)} className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Role
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {roles.map((role) => {
            const RoleIcon = getIconByValue(role.icon);
            return (
              <Card 
                key={role.id} 
                className={cn(
                  "relative cursor-pointer hover:bg-muted/30 transition-colors flex flex-col",
                  !canEdit && "opacity-90"
                )}
                onMouseDown={(e) => {
                  mouseDownPos.current = { x: e.clientX, y: e.clientY };
                  isSelectingRef.current = false;
                }}
                onMouseMove={(e) => {
                  if (mouseDownPos.current && e.buttons === 1) {
                    const dx = Math.abs(e.clientX - mouseDownPos.current.x);
                    const dy = Math.abs(e.clientY - mouseDownPos.current.y);
                    if (dx > 5 || dy > 5) {
                      isSelectingRef.current = true;
                    }
                  }
                }}
                onMouseUp={() => {
                  mouseDownPos.current = null;
                }}
                onMouseLeave={() => {
                  mouseDownPos.current = null;
                  isSelectingRef.current = false;
                }}
                onClick={() => {
                  if (!isSelectingRef.current && !window.getSelection()?.toString()) {
                    openEditDialog(role);
                  }
                  mouseDownPos.current = null;
                  isSelectingRef.current = false;
                }}
              >
                <CardHeader className="pb-2 px-4 pt-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <RoleIcon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      <CardTitle className={cn(
                        "text-base",
                        canEdit && "text-primary hover:underline"
                      )}>
                        {role.name}
                      </CardTitle>
                    </div>
                    {role.isSystem && (
                      <Badge variant="outline" className="text-xs">
                        System
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="text-xs mt-1">
                    {role.description || 'No description'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-4 pb-4 flex-1 flex flex-col">
                  {/* User count */}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <Users className="h-4 w-4" />
                    <span>{role.userCount} {role.userCount === 1 ? 'user' : 'users'}</span>
                  </div>
                  
                  {/* Spacer to push bottom section down */}
                  <div className="flex-1"></div>
                  
                  {/* Actions - anchored to bottom */}
                  <div className="flex items-center gap-2 pt-2 border-t mt-2">
                    <div className="text-sm text-muted-foreground flex-1">
                      {role.permissions.length === 0 ? (
                        'No permissions'
                      ) : (
                        `${role.permissions.length} ${role.permissions.length === 1 ? 'permission' : 'permissions'}`
                      )}
                    </div>
                    
                    {/* Settings gear button */}
                    {canEdit && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          openMetadataDialog(role);
                        }}
                      >
                        <SettingsIcon className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit/View Permissions Dialog */}
      <Dialog open={!!editingRole} onOpenChange={(open) => !open && handleCloseEditDialog()}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSavePermissions}>
            <DialogHeader>
              <DialogTitle>
                {editingRole?.name} Permissions
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

            <div className="py-4">
              {(() => {
                // Get flat list of all permissions
                const allPermissions = Object.values(permissionsByCategory).flat() as PermissionInfo[];
                
                // Group by resource
                const grouped = groupPermissionsByResource(allPermissions);
                
                // Then group by category
                const byCategory = groupPermissionsByCategory(grouped);
                
                // Define action columns
                const actionColumns = ['view', 'manage', 'import', 'export'];
                
                return Object.entries(byCategory).map(([category, resourceGroups]) => (
                  <div key={category} className="space-y-3 mb-6">
                    {/* Category Header */}
                    <h3 className="font-semibold text-base capitalize">
                      {category} Permissions
                    </h3>
                    
                    {/* Permission Matrix Table */}
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="px-4 py-3 text-left text-sm font-medium w-[200px]">
                              Resource
                            </th>
                            {actionColumns.map(action => (
                              <th key={action} className="px-4 py-3 text-center text-sm font-medium w-[100px]">
                                {action.charAt(0).toUpperCase() + action.slice(1)}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {resourceGroups.map((group, idx) => (
                            <tr key={group.resource} className={cn(
                              "border-t",
                              idx % 2 === 0 ? "bg-background" : "bg-muted/20"
                            )}>
                              <td className="px-4 py-3 text-sm font-medium">
                                {group.displayName}
                              </td>
                              {actionColumns.map(action => {
                                const perm = group.permissions.find(p => p.action === action);
                                return (
                                  <td key={action} className="px-4 py-3 text-center">
                                    {perm ? (
                                      <div className="flex items-center justify-center">
                                        <input
                                          type="checkbox"
                                          id={perm.code}
                                          checked={selectedPermissions.includes(perm.code)}
                                          onChange={() => togglePermission(perm.code)}
                                          disabled={!canEdit || editingRole?.isSystem}
                                          className={cn(
                                            "h-4 w-4 rounded border-gray-300",
                                            (!canEdit || editingRole?.isSystem) && "cursor-not-allowed opacity-60"
                                          )}
                                          title={perm.description}
                                        />
                                      </div>
                                    ) : (
                                      <span className="text-muted-foreground text-xs">—</span>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ));
              })()}
            </div>

            <DialogFooter>
              {canEdit && !editingRole?.isSystem ? (
                // Edit mode - show Cancel and Save
                <>
                  <Button type="button" variant="outline" onClick={handleCloseEditDialog}>
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
                <Button type="button" onClick={handleCloseEditDialog}>
                  Close
                </Button>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Role Dialog */}
      <Dialog open={isCreating} onOpenChange={(open) => !open && handleCloseCreateDialog()}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <form onSubmit={handleCreateRole}>
            <DialogHeader>
              <DialogTitle>Create New Role</DialogTitle>
              <DialogDescription>
                Define a new role with permissions. Role name and code are permanent.
              </DialogDescription>
            </DialogHeader>

            {error && (
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md mt-4">
                {error}
              </div>
            )}

            <div className="py-4 space-y-4">
              {/* Name - Permanent */}
              <div className="space-y-2">
                <Label htmlFor="create-name" className="font-semibold">
                  Role Name <span className="text-destructive">*</span>
                  <span className="text-xs text-muted-foreground font-normal ml-2">
                    (cannot be changed later)
                  </span>
                </Label>
                <Input
                  id="create-name"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  placeholder="e.g., Returns Processor"
                />
                {newRoleName && (
                  <div className="text-xs bg-muted p-2 rounded space-y-1">
                    <p className="text-muted-foreground">
                      Role code: <code className="font-mono">{generateCode(newRoleName)}</code>
                    </p>
                    <p className="text-amber-600">
                      ⚠️ Choose carefully - name and code are permanent
                    </p>
                  </div>
                )}
              </div>

              {/* Description - Editable later */}
              <div className="space-y-2">
                <Label htmlFor="create-description">
                  Description
                  <span className="text-xs text-muted-foreground ml-2">(can change later)</span>
                </Label>
                <Input
                  id="create-description"
                  value={newRoleDescription}
                  onChange={(e) => setNewRoleDescription(e.target.value)}
                  placeholder="Brief description"
                />
              </div>

              {/* Icon - Editable later */}
              <div className="space-y-2">
                <Label>
                  Icon
                  <span className="text-xs text-muted-foreground ml-2">(can change later)</span>
                </Label>
                <IconPicker value={newRoleIcon} onChange={setNewRoleIcon} />
              </div>

              {/* Permissions */}
              <div className="space-y-2">
                <Label>Permissions <span className="text-destructive">*</span></Label>
                <div className="border rounded-md p-3 max-h-60 overflow-y-auto space-y-4">
                  {Object.entries(permissionsByCategory).map(([category, permissions]) => (
                    <div key={category} className="space-y-2">
                      <h4 className="font-medium text-xs uppercase text-muted-foreground">
                        {category}
                      </h4>
                      <div className="space-y-1.5">
                        {permissions.map((permission) => (
                          <div key={permission.code} className="flex items-start gap-2">
                            <input
                              type="checkbox"
                              id={`new-${permission.code}`}
                              checked={newRolePermissions.includes(permission.code)}
                              onChange={() => toggleNewRolePermission(permission.code)}
                              className="mt-1 h-4 w-4 rounded border-gray-300"
                            />
                            <div className="flex-1">
                              <Label htmlFor={`new-${permission.code}`} className="text-sm font-medium cursor-pointer">
                                {permission.name}
                              </Label>
                              <p className="text-xs text-muted-foreground">{permission.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                {newRolePermissions.length === 0 && (
                  <p className="text-xs text-destructive">At least one permission required</p>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseCreateDialog}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createRoleMutation.isPending || !newRoleName || newRolePermissions.length === 0}
              >
                {createRoleMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Role
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Metadata Dialog */}
      <Dialog open={!!editingMetadataRole} onOpenChange={(open) => !open && handleCloseMetadataDialog()}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleSaveMetadata}>
            <DialogHeader>
              <DialogTitle>Edit {editingMetadataRole?.name}</DialogTitle>
              <DialogDescription>
                Update role description and icon. Name and code are permanent.
              </DialogDescription>
            </DialogHeader>

            {error && (
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md mt-4">
                {error}
              </div>
            )}

            <div className="py-4 space-y-4">
              {/* Name - Read only */}
              <div>
                <p className="text-sm">
                  <span className="font-medium">Role Name:</span> {editingMetadataRole?.name}
                </p>
              </div>

              {/* Code - Read only */}
              <div>
                <p className="text-sm">
                  <span className="font-medium">Role Code:</span> <span className="font-mono">{editingMetadataRole?.code}</span>
                </p>
              </div>

              {/* Icon - Editable */}
              <div className="space-y-2">
                <Label className="font-medium block">Icon</Label>
                <IconPicker
                  value={editedIcon}
                  onChange={setEditedIcon}
                  disabled={editingMetadataRole?.isSystem}
                />
              </div>

              {/* Description - Editable */}
              <div className="space-y-2">
                <Label htmlFor="edit-description" className="font-medium block">Description</Label>
                <Input
                  id="edit-description"
                  value={editedDescription}
                  onChange={(e) => setEditedDescription(e.target.value)}
                  disabled={editingMetadataRole?.isSystem}
                  placeholder="Brief description"
                />
              </div>
            </div>

            <DialogFooter className={cn(
              "flex items-center",
              canEdit && !editingMetadataRole?.isSystem ? "!justify-between" : "justify-end"
            )}>
              {/* Delete button on left - only render if should be visible */}
              {canEdit && !editingMetadataRole?.isSystem && (
                  <AlertDialog onOpenChange={() => setDeleteConfirmed(false)}>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm" type="button">
                        <Trash2 className="h-3 w-3 mr-2" />
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete {editingMetadataRole?.name}?</AlertDialogTitle>
                        <AlertDialogDescription className="space-y-3">
                          {roleUsers.length > 0 ? (
                            <>
                              <p className="text-destructive font-medium">
                                Assigned to {roleUsers.length} user{roleUsers.length !== 1 ? 's' : ''}:
                              </p>
                              <ul className="space-y-1 max-h-40 overflow-y-auto border rounded p-2 bg-muted/50">
                                {roleUsers.map(user => (
                                  <li key={user.id} className="text-sm">
                                    • {user.name} <span className="text-muted-foreground">({user.email})</span>
                                  </li>
                                ))}
                              </ul>
                              <p className="text-sm">Remove role from all users first.</p>
                            </>
                          ) : (
                            <>
                              <p>This role is not assigned to any users.</p>
                              <p className="text-sm text-muted-foreground">
                                Deleting is permanent and cannot be undone.
                              </p>
                              <div className="flex items-start gap-2 border rounded p-3 bg-muted/50">
                                <input
                                  type="checkbox"
                                  id="confirm-delete"
                                  checked={deleteConfirmed}
                                  onChange={(e) => setDeleteConfirmed(e.target.checked)}
                                  className="mt-1 h-4 w-4 rounded"
                                />
                                <Label htmlFor="confirm-delete" className="text-sm cursor-pointer">
                                  I understand this role will be permanently deleted
                                </Label>
                              </div>
                            </>
                          )}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setDeleteConfirmed(false)}>
                          Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                          disabled={roleUsers.length > 0 || !deleteConfirmed}
                          onClick={() => editingMetadataRole && deleteRoleMutation.mutate(editingMetadataRole.id)}
                          className="bg-destructive hover:bg-destructive/90"
                        >
                          {deleteRoleMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                          Delete Role
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
              )}
              
              {/* Save/Cancel on right */}
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={handleCloseMetadataDialog}>
                  Cancel
                </Button>
                {canEdit && !editingMetadataRole?.isSystem && (
                  <Button type="submit" disabled={updateMetadataMutation.isPending}>
                    {updateMetadataMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Save
                  </Button>
                )}
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
