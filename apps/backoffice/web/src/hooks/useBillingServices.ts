import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { BillingCategory } from '../components/billing/types';

export function useBillingServices() {
  return useQuery({
    queryKey: ['billing-services'],
    queryFn: async () => {
      const response = await api.get('/api/billing-services');
      return response as BillingCategory[];
    },
  });
}
