
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Asset, CreateAssetPayload, UpdateAssetPayload, UpdateAssetFinancialPayload } from '@/types/asset';
import { toast } from 'sonner';
import { AxiosError } from 'axios';

export function useAssets(showArchived: boolean = false) {
    return useQuery({
        queryKey: ['assets', showArchived],
        queryFn: async () => {
            const { data } = await api.get<any[]>('/api/assets', {
                params: { showArchived }
            });
            return data.map(a => ({
                ...a,
                desc: a.assetName || a.desc || "—",
                value: typeof a.purchasePrice === 'number' ? a.purchasePrice : (a.value || 0),
                room: a.roomName ? `${a.roomCode} (${a.roomName})` : (a.room || "—")
            })) as Asset[];
        },
    });
}

export function useAsset(id: string) {
    return useQuery({
        queryKey: ['assets', id],
        queryFn: async () => {
            const { data } = await api.get<any>(`/api/assets/${id}`);
            return {
                ...data,
                desc: data.assetName || data.desc || "—",
                value: typeof data.purchasePrice === 'number' ? data.purchasePrice : (data.value || 0),
                room: data.roomName ? `${data.roomCode} (${data.roomName})` : (data.room || "—")
            } as Asset;
        },
        enabled: !!id,
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
            const axiosErr = error as AxiosError<{ message?: string }>;
            const msg = axiosErr.response?.data?.message || 'Failed to add asset';
            toast.error(msg);
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
            queryClient.invalidateQueries({ queryKey: ['assets', variables.id] });
            toast.success('Asset updated successfully');
        },
        onError: (error: Error) => {
            const axiosErr = error as AxiosError<{ message?: string }>;
            const msg = axiosErr.response?.data?.message || 'Failed to update asset';
            toast.error(msg);
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
            queryClient.invalidateQueries({ queryKey: ['assets', variables.id] });
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
        const { data } = await api.get<any[]>('/api/assets/available');
        return data.map(a => ({
            ...a,
            desc: a.assetName || a.desc || "—",
            value: typeof a.purchasePrice === 'number' ? a.purchasePrice : (a.value || 0),
            room: a.roomName ? `${a.roomCode} (${a.roomName})` : (a.room || "—")
        })) as Asset[];
    }
});
