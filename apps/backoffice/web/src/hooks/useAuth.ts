import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  roleId: number;
  roleName: string;
  roleCode: string;
  permissions: string[];
}

export function useAuth() {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      try {
        const response = await api.get<{ user: User }>('/api/auth/me');
        return response.user;
      } catch (error: any) {
        // If 401 (not authenticated), return null instead of throwing
        // This prevents console errors after logout
        if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
          return null;
        }
        throw error;
      }
    },
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      const response = await api.post<{ user: User }>('/api/auth/login', credentials);
      return response.user;
    },
    onSuccess: (user) => {
      queryClient.setQueryData(['auth', 'me'], user);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await api.post('/api/auth/logout', {});
    },
    onSuccess: () => {
      // Set user to null first
      queryClient.setQueryData(['auth', 'me'], null);
      // Clear all other queries but don't remove the auth query data
      queryClient.removeQueries({
        predicate: (query) => query.queryKey[0] !== 'auth',
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: { email: string; password: string; name: string }) => {
      const response = await api.post<{ user: User }>('/api/auth/register', data);
      return response.user;
    },
    onSuccess: (user) => {
      queryClient.setQueryData(['auth', 'me'], user);
    },
  });

  return {
    user: data,
    isLoading,
    error,
    login: loginMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    register: registerMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,
    isLoggingOut: logoutMutation.isPending,
  };
}

