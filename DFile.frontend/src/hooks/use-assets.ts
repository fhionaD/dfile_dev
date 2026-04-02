
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { parseApiError } from '@/lib/api-errors';
import { mapAssetFromApi } from '@/lib/normalize-asset-from-api';
import { Asset, CreateAssetPayload, UpdateAssetPayload, UpdateAssetFinancialPayload } from '@/types/asset';
import { toast } from 'sonner';

export { mapAssetFromApi } from '@/lib/normalize-asset-from-api';

export interface AssetsPagedResult {
    totalCount: number;
    totalPages: number;
    page: number;
    pageSize: number;
    data: Asset[];
}

/** Server-side pagination + filters (search/status/category). */
export function useAssetsPaged(
    showArchived: boolean,
    page: number,
    pageSize: number,
    filters: { q?: string; status?: string; category?: string },
) {
    return useQuery({
        queryKey: ["assets", "paged", showArchived, page, pageSize, filters.q, filters.status, filters.category],
        queryFn: async () => {
            const { data } = await api.get<{
                totalCount: number;
                totalPages: number;
                page: number;
                pageSize: number;
                data: Record<string, unknown>[];
            }>("/api/assets", {
                params: {
                    showArchived,
                    page,
                    pageSize,
                    q: filters.q?.trim() || undefined,
                    status: filters.status && filters.status !== "All" ? filters.status : undefined,
                    category: filters.category && filters.category !== "All" ? filters.category : undefined,
                },
            });
            return {
                totalCount: data.totalCount,
                totalPages: data.totalPages,
                page: data.page,
                pageSize: data.pageSize,
                data: (data.data ?? []).map((row) => mapAssetFromApi(row)),
            } as AssetsPagedResult;
        },
    });
}

export function useAssets(showArchived: boolean = false) {
    return useQuery({
        queryKey: ['assets', showArchived],
        queryFn: async () => {
            const { data } = await api.get<Record<string, unknown>[]>('/api/assets', {
                params: { showArchived }
            });
            return data.map((a) => mapAssetFromApi(a)) as Asset[];
        },
    });
}

export function useAsset(
    id: string,
    options?: { enabled?: boolean; refetchOnMount?: boolean | "always" },
) {
    const enabled = (options?.enabled ?? true) && !!id;
    return useQuery({
        queryKey: ["assets", "detail", id],
        queryFn: async () => {
            const { data } = await api.get<Record<string, unknown>>(`/api/assets/${id}`);
            return mapAssetFromApi(data);
        },
        enabled,
        refetchOnMount: options?.refetchOnMount ?? "always",
        staleTime: 0,
    });
}

export function useAddAsset() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload: CreateAssetPayload) => {
            const { data } = await api.post<Asset>('/api/assets', payload);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['assets'] });
            toast.success('Asset added successfully');
        },
        onError: (error: Error) => {
            toast.error(parseApiError(error, 'Failed to add asset'));
        },
    });
}

export function useUpdateAsset() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, payload }: { id: string; payload: UpdateAssetPayload }) => {
            const { data } = await api.put<Asset>(`/api/assets/${id}`, payload);
            return data;
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['assets'] });
            queryClient.invalidateQueries({ queryKey: ['assets', 'detail', variables.id] });
            toast.success('Asset updated successfully');
        },
        onError: (error: Error) => {
            toast.error(parseApiError(error, 'Failed to update asset'));
        },
    });
}

export function useArchiveAsset() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            await api.put(`/api/assets/archive/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['assets'] });
            toast.success('Asset archived successfully');
        },
        onError: () => {
            toast.error('Failed to archive asset');
        },
    });
}

export function useRestoreAsset() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            await api.put(`/api/assets/restore/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['assets'] });
            toast.success('Asset restored successfully');
        },
        onError: () => {
            toast.error('Failed to restore asset');
        },
    });
}

export function useAllocateAsset() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, room }: { id: string; room: string }) => {
            const { data } = await api.put<Asset>(`/api/assets/allocate/${id}`, { room });
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['assets'] });
            toast.success('Asset allocated successfully');
        },
        onError: () => {
            toast.error('Failed to allocate asset');
        },
    });
}

export function useUpdateAssetFinancial() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, payload }: { id: string; payload: UpdateAssetFinancialPayload }) => {
            await api.put(`/api/assets/${id}/financial`, payload);
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['assets'] });
            queryClient.invalidateQueries({ queryKey: ['assets', 'detail', variables.id] });
            toast.success('Financial data updated successfully');
        },
        onError: () => {
            toast.error('Failed to update financial data');
        },
    });
}
export const useAvailableAssets = () => useQuery({
    queryKey: ['assets', 'available'],
    queryFn: async () => {
        const { data } = await api.get<Record<string, unknown>[]>('/api/assets/available-for-allocation');
        return data.map((a) => mapAssetFromApi(a)) as Asset[];
    }
});
