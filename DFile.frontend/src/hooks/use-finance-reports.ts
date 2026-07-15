import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { FinanceKpi, ReplacementProcurementDetail } from '@/types/finance-reports';

/**
 * Fetch Finance KPIs for Reports dashboard.
 * Returns server-calculated aggregates of estimated costs, purchase orders, and procurement spend.
 * Automatically filters by tenant; staleTime is 5 minutes since KPIs are aggregates.
 */
export function useFinanceKpi(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['finance-kpi'],
    queryFn: async () => {
      const { data } = await api.get<FinanceKpi>('/api/reports/finance-kpi');
      return data;
    },
    staleTime: 5 * 60 * 1000, // KPI aggregates are stable for 5 minutes
    enabled: options?.enabled !== false,
  });
}

/**
 * Fetch detailed breakdown of replacement procurement costs.
 * Returns each approved replacement with cost, asset info, and approval details.
 */
export function useReplacementProcurementDetails(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['replacement-procurement-details'],
    queryFn: async () => {
      const { data } = await api.get<ReplacementProcurementDetail[]>(
        '/api/reports/replacement-procurement-details'
      );
      return data;
    },
    staleTime: 5 * 60 * 1000,
    enabled: options?.enabled !== false,
  });
}
