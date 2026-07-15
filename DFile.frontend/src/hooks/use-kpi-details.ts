import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { MaintenanceRecord } from '@/types/asset';

/**
 * Fetch all approved maintenance records (repairs and replacements)
 * Used for KPI detail view showing what assets have been serviced
 */
export function useApprovedMaintenanceRecords(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['approved-maintenance-records'],
    queryFn: async () => {
      const { data } = await api.get<MaintenanceRecord[]>(
        '/api/maintenance?filterBy=approved'
      );
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
    enabled: options?.enabled !== false,
  });
}
