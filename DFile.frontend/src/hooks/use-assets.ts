import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
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
    filters: { q?: string; status?: string; category?: string; includeDisposed?: boolean },
) {
    return useQuery({
        queryKey: ["assets", "paged", showArchived, page, pageSize, filters.q, filters.status, filters.category, filters.includeDisposed],
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
                    includeDisposed: filters.includeDisposed === true ? true : undefined,
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

export function useAssets(showArchived: boolean = false, options?: { includeDisposed?: boolean }) {
    const includeDisposed = options?.includeDisposed === true;
    return useQuery({
        queryKey: ['assets', showArchived, includeDisposed],
        queryFn: async () => {
            const { data } = await api.get<Record<string, unknown>[]>('/api/assets', {
                params: { showArchived, includeDisposed: includeDisposed ? true : undefined },
            });
            return data.map((a) => mapAssetFromApi(a)) as Asset[];
        },
    });
}

/** Active vs archived totals for archive toggle (lightweight paged HEAD counts). */
export function useAssetArchiveCounts() {
    return useQuery({
        queryKey: ['asset-archive-counts'],
        queryFn: async () => {
            const [activeRes, archivedRes] = await Promise.all([
                api.get<{ totalCount: number }>("/api/assets", {
                    params: { showArchived: false, page: 1, pageSize: 1 },
                }),
                api.get<{ totalCount: number }>("/api/assets", {
                    params: { showArchived: true, page: 1, pageSize: 1 },
                }),
            ]);
            return {
                active: activeRes.data?.totalCount ?? 0,
                archived: archivedRes.data?.totalCount ?? 0,
            };
        },
        staleTime: 30_000,
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
            queryClient.invalidateQueries({ queryKey: ['asset-archive-counts'] });
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
            queryClient.invalidateQueries({ queryKey: ['asset-archive-counts'] });
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
            await api.put(`/api/assets/archive/${id}`, undefined, { suppressGlobalError: true });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['assets'] });
            queryClient.invalidateQueries({ queryKey: ['asset-archive-counts'] });
            toast.success('Asset archived successfully');
        },
        onError: (error: unknown) => {
            if (axios.isAxiosError(error) && error.response?.status === 400) {
                toast.error(parseApiError(error, 'Cannot archive allocated asset.'));
                return;
            }
            toast.error(parseApiError(error, 'Something went wrong. Please try again.'));
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
            queryClient.invalidateQueries({ queryKey: ['asset-archive-counts'] });
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
