import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { api } from '../lib/api';

export interface User {
  id: string;
  email: string;
  name: string;
  // CHANGED: Single role becomes array
  roles: Array<{
    id: number;
    code: string;
    name: string;
  }>;
  permissions: string[];
  isAdmin: boolean;
}

export function useAuth() {
  const queryClient = useQueryClient();
  const location = useLocation();

  // Don't fetch user on login page - prevents unnecessary 401 error
  const isLoginPage = location.pathname === '/login';

  const { data, isLoading, error } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      try {
        const response = await api.get<User>('/api/auth/me');
        return response;
      } catch (error: any) {
        // If 401 (not authenticated), return null instead of throwing
        // This prevents console errors after logout
        if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
          return null;
        }
        throw error;
      }
    },
    enabled: !isLoginPage, // Skip query on login page
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    refetchOnMount: false, // Don't refetch on component mount if data exists
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

