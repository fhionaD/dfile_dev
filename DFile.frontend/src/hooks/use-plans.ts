import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export interface Plan {
  id: number;
  name: string;
  description?: string;
  monthlyCost: number;
  yearlyCost: number;
  maxRooms: number;
  maxPersonnel: number;
  canCreateFinanceManager: boolean;
  canCreateMaintenanceManager: boolean;
  assetTracking: boolean;
  depreciation: boolean;
  maintenanceModule: boolean;
  reportsModule: boolean;
  procurementModule: boolean;
  isActive: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePlanInput {
  name: string;
  description?: string;
  monthlyCost: number;
  yearlyCost: number;
  maxRooms: number;
  maxPersonnel: number;
  canCreateFinanceManager: boolean;
  canCreateMaintenanceManager: boolean;
  assetTracking: boolean;
  depreciation: boolean;
  maintenanceModule: boolean;
  reportsModule: boolean;
  procurementModule: boolean;
}

export interface UpdatePlanInput extends CreatePlanInput {
  id: number;
  isActive: boolean;
}

export function usePlans(showArchived = false) {
  return useQuery({
    queryKey: ['plans', showArchived],
    queryFn: async () => {
      const endpoint = showArchived ? '/api/plans/all' : '/api/plans';
      const { data } = await api.get<Plan[]>(endpoint);
      return data;
    },
  });
}

export function usePlan(id: number) {
  return useQuery({
    queryKey: ['plan', id],
    queryFn: async () => {
      const { data } = await api.get<Plan>(`/api/plans/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreatePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreatePlanInput) => {
      const { data } = await api.post<Plan>('/api/plans', input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
    },
  });
}

export function useUpdatePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdatePlanInput) => {
      const { data } = await api.put<Plan>(`/api/plans/${input.id}`, input);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      queryClient.invalidateQueries({ queryKey: ['plan', data.id] });
    },
  });
}

export function useArchivePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.put<Plan>(`/api/plans/${id}/archive`, {});
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
    },
  });
}

export function useActivatePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.put<Plan>(`/api/plans/${id}/activate`, {});
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
    },
  });
}
