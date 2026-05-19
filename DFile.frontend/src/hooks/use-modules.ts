import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export interface ModuleDefinition {
  name: string;
  description: string;
}

export interface ModulesByNamespace {
  namespace: string;
  modules: ModuleDefinition[];
}

export interface ModulesResponse {
  namespaces: string[];
  modules: ModulesByNamespace[];
  total: number;
}

export function useModules() {
  return useQuery({
    queryKey: ['modules'],
    queryFn: async () => {
      const { data } = await api.get<ModulesResponse>('/api/modules');
      return data;
    },
  });
}

export function useModulesByNamespace(namespace: string) {
  return useQuery({
    queryKey: ['modules', namespace],
    queryFn: async () => {
      const { data } = await api.get(
        `/api/modules/by-namespace/${namespace}`
      );
      return data;
    },
    enabled: !!namespace,
  });
}
