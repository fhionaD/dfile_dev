import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { PlatformMetrics, RiskIndicators } from '@/types/asset';

export interface Tenant {
    id: number;
    name: string;
    businessAddress: string;
    subscriptionPlan: number;
    maxRooms: number;
    maxPersonnel: number;
    createdAt: string;
    updatedAt: string;
    status: string;
}

export function useTenants() {
    return useQuery({
        queryKey: ['tenants'],
        queryFn: async () => {
            const { data } = await api.get<Tenant[]>('/api/tenants');
            return data;
        },
    });
}

export function usePlatformMetrics() {
    return useQuery({
        queryKey: ['platform-metrics'],
        queryFn: async () => {
            const { data } = await api.get<PlatformMetrics>('/api/tenants/metrics');
            return data;
        },
    });
}

export function useRiskIndicators() {
    return useQuery({
        queryKey: ['risk-indicators'],
        queryFn: async () => {
            const { data } = await api.get<RiskIndicators>('/api/tenants/risk-indicators');
            return data;
        },
    });
}

export function useUpdateTenantStatus() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, status }: { id: number; status: string }) => {
            const { data } = await api.put(`/api/tenants/${id}/status`, { status });
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tenants'] });
            queryClient.invalidateQueries({ queryKey: ['platform-metrics'] });
            queryClient.invalidateQueries({ queryKey: ['risk-indicators'] });
        },
    });
}
