import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { User, Mail, Shield } from 'lucide-react';

export function ProfilePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [error, setError] = useState('');

  const updateProfile = useMutation({
    mutationFn: async (data: { name: string }) => {
      return api.put('/api/auth/profile', data);
    },
    onSuccess: (_, variables) => {
      // Directly update the cache with the new name
      queryClient.setQueryData(['auth', 'me'], (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          name: variables.name
        };
      });
      setIsEditing(false);
      setError('');
    },
    onError: (err: any) => {
      setError(err.response?.data?.error || 'Failed to update profile');
    },
  });

  const handleSave = () => {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    updateProfile.mutate({ name });
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold">My Profile</h1>
        <p className="text-muted-foreground mt-1">
          View and manage your personal information
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">
              <User className="inline h-4 w-4 mr-2" />
              Name
            </Label>
            <div className="flex gap-2">
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!isEditing}
              />
              {!isEditing ? (
                <Button onClick={() => setIsEditing(true)}>Edit</Button>
              ) : (
                <>
                  <Button onClick={handleSave} disabled={updateProfile.isPending}>
                    Save
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setIsEditing(false);
                      setName(user.name);
                      setError('');
                    }}
                  >
                    Cancel
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Email (read-only for now) */}
          <div className="space-y-2">
            <Label>
              <Mail className="inline h-4 w-4 mr-2" />
              Email
            </Label>
            <Input value={user.email} disabled />
            <p className="text-xs text-muted-foreground">
              Contact administrator to change email
            </p>
          </div>

          {/* Roles */}
          <div className="space-y-2">
            <Label>
              <Shield className="inline h-4 w-4 mr-2" />
              Roles
            </Label>
            <div className="flex gap-2 flex-wrap">
              {user.roles.map(role => (
                <Badge key={role.id} variant="secondary">
                  {role.name}
                </Badge>
              ))}
            </div>
          </div>

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
              {error}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
