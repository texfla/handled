import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../../components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../../components/ui/alert-dialog';
import { api } from '../../lib/api';
import { usePermissions, PERMISSIONS } from '../../hooks/usePermissions';
import { Plus, Trash2, KeyRound, Ban, CheckCircle, Loader2 } from 'lucide-react';

interface Role {
  id: number;
  code: string;
  name: string;
}

interface User {
  id: string;
  email: string;
  name: string;
  roles: Role[];  // CHANGED: Array of roles
  disabled: boolean;
  createdAt: string;
  updatedAt?: string;
}

export function UsersPage() {
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();
  const canManageUsers = hasPermission(PERMISSIONS.MANAGE_USERS);
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null);
  const [userFilter, setUserFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Form states
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    roleIds: [] as number[],  // CHANGED: Array of role IDs
  });
  const [newPassword, setNewPassword] = useState('');

  const { data: rolesData } = useQuery({
    queryKey: ['roles'],
    queryFn: () => api.get<{ roles: Role[] }>('/api/roles'),
    staleTime: 0, // Always fetch fresh data on admin pages
    gcTime: 0, // Don't cache results (was cacheTime in v4)
    refetchOnMount: true, // Refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when tab regains focus
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => api.get<{ users: User[] }>('/api/admin/users'),
    staleTime: 0, // Always fetch fresh data on admin pages
    gcTime: 0, // Don't cache results (was cacheTime in v4)
    refetchOnMount: true, // Refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when tab regains focus
  });

  // Initialize roleIds with default admin role when roles data loads
  useEffect(() => {
    if (rolesData?.roles && formData.roleIds.length === 0) {
      const defaultRole = rolesData.roles.find(r => r.code === 'admin') || rolesData.roles[0];
      if (defaultRole) {
        setFormData(prev => ({ ...prev, roleIds: [defaultRole.id] }));
      }
    }
  }, [rolesData, formData.roleIds]);

  const createMutation = useMutation({
    mutationFn: (data: { email: string; password: string; name: string; roleIds: number[] }) =>
      api.post('/api/admin/users', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['roles'] }); // Refresh role user counts
      setIsCreateDialogOpen(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: string; email?: string; name?: string; roleIds?: number[] }) =>
      api.put(`/api/admin/users/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['roles'] }); // Refresh role user counts
      setEditingUser(null);
      resetForm();
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: ({ id, newPassword }: { id: string; newPassword: string }) =>
      api.post(`/api/admin/users/${id}/reset-password`, { newPassword }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setResetPasswordUser(null);
      setNewPassword('');
    },
  });

  const toggleDisableMutation = useMutation({
    mutationFn: ({ id, disabled }: { id: string; disabled: boolean }) =>
      api.post(`/api/admin/users/${id}/${disabled ? 'disable' : 'enable'}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['roles'] }); // Refresh role user counts
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/admin/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['roles'] }); // Refresh role user counts
    },
  });

  const resetForm = () => {
    const defaultRole = rolesData?.roles.find(r => r.code === 'admin') || rolesData?.roles[0];
    setFormData({ email: '', password: '', name: '', roleIds: defaultRole ? [defaultRole.id] : [] });
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    updateMutation.mutate({
      id: editingUser.id,
      email: formData.email,
      name: formData.name,
      roleIds: formData.roleIds,
    });
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPasswordUser) return;
    resetPasswordMutation.mutate({
      id: resetPasswordUser.id,
      newPassword,
    });
  };

  const openEditDialog = (user: User) => {
    setFormData({
      email: user.email,
      password: '',
      name: user.name,
      roleIds: user.roles.map(r => r.id),
    });
    setEditingUser(user);
  };

  const allUsers = data?.users || [];
  const roles = rolesData?.roles || [];
  
  // Filter users based on selection
  const users = allUsers.filter(user => {
    if (userFilter === 'active') return !user.disabled;
    if (userFilter === 'inactive') return user.disabled;
    return true; // 'all'
  });
  
  // Calculate counts
  const allCount = allUsers.length;
  const activeCount = allUsers.filter(u => !u.disabled).length;
  const inactiveCount = allUsers.filter(u => u.disabled).length;

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-destructive">Failed to load users. Make sure you have admin access.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Users</h1>
          <p className="text-muted-foreground mt-1">Manage user accounts and access</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle>Create New User</DialogTitle>
                <DialogDescription>Add a new user to the system.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    minLength={8}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Roles</Label>
                  <div className="space-y-2 border rounded-md p-3 max-h-48 overflow-y-auto">
                    {roles.map(role => (
                      <label key={role.id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.roleIds.includes(role.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({ ...formData, roleIds: [...formData.roleIds, role.id] });
                            } else {
                              setFormData({ ...formData, roleIds: formData.roleIds.filter(id => id !== role.id) });
                            }
                          }}
                          className="h-4 w-4"
                        />
                        <span className="text-sm">{role.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending || formData.roleIds.length === 0}>
                  {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Create User
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="userFilter"
                value="all"
                checked={userFilter === 'all'}
                onChange={(e) => setUserFilter(e.target.value as 'all' | 'active' | 'inactive')}
                className="h-4 w-4"
              />
              <span className="text-sm font-medium">All {allCount} Users</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="userFilter"
                value="active"
                checked={userFilter === 'active'}
                onChange={(e) => setUserFilter(e.target.value as 'all' | 'active' | 'inactive')}
                className="h-4 w-4"
              />
              <span className="text-sm font-medium">Active Only ({activeCount})</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="userFilter"
                value="inactive"
                checked={userFilter === 'inactive'}
                onChange={(e) => setUserFilter(e.target.value as 'all' | 'active' | 'inactive')}
                className="h-4 w-4"
              />
              <span className="text-sm font-medium">Inactive Only ({inactiveCount})</span>
            </label>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : users.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No users found</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow
                    key={user.id}
                    className={`border-b hover:bg-muted/30 cursor-pointer transition-colors ${user.disabled ? 'bg-muted/50 opacity-75' : ''}`}
                    onClick={() => openEditDialog(user)}
                  >
                    <TableCell className="font-medium whitespace-nowrap">
                      {canManageUsers ? (
                        <div className="text-primary hover:underline">{user.name}</div>
                      ) : (
                        <div>{user.name}</div>
                      )}
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.roles.map(role => (
                          <Badge 
                            key={role.id}
                            variant={role.code === 'admin' ? 'default' : 'secondary'}
                          >
                            {role.name}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {user.disabled ? (
                        <Badge variant="destructive">Disabled</Badge>
                      ) : (
                        <Badge className="bg-green-600 hover:bg-green-700">Active</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            setResetPasswordUser(user);
                          }}
                          title="Reset password"
                        >
                          <KeyRound className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleDisableMutation.mutate({ id: user.id, disabled: !user.disabled });
                          }}
                          title={user.disabled ? 'Enable user' : 'Disable user'}
                        >
                          {user.disabled ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <Ban className="h-4 w-4 text-orange-600" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent>
          <form onSubmit={handleUpdate}>
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>Update user information.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-name">Name</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label>Roles</Label>
                <div className="space-y-2 border rounded-md p-3 max-h-48 overflow-y-auto">
                  {roles.map(role => (
                    <label key={role.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.roleIds.includes(role.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({ ...formData, roleIds: [...formData.roleIds, role.id] });
                          } else {
                            setFormData({ ...formData, roleIds: formData.roleIds.filter(id => id !== role.id) });
                          }
                        }}
                        className="h-4 w-4"
                      />
                      <span className="text-sm">{role.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter className="flex items-center !justify-between">
              {/* Delete button on left */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" type="button">
                    <Trash2 className="h-3 w-3 mr-2" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete User</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete {editingUser?.name}? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => {
                        if (editingUser) {
                          deleteMutation.mutate(editingUser.id);
                          setEditingUser(null);
                        }
                      }}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              
              {/* Save/Cancel on right */}
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setEditingUser(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateMutation.isPending || formData.roleIds.length === 0}>
                  {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Save Changes
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={!!resetPasswordUser} onOpenChange={(open) => !open && setResetPasswordUser(null)}>
        <DialogContent>
          <form onSubmit={handleResetPassword}>
            <DialogHeader>
              <DialogTitle>Reset Password</DialogTitle>
              <DialogDescription>
                Set a new password for {resetPasswordUser?.name}. They will be logged out of all sessions.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="Minimum 8 characters"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setResetPasswordUser(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={resetPasswordMutation.isPending}>
                {resetPasswordMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Reset Password
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}
