
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Asset } from '@/types/asset';
import { toast } from 'sonner';

// In-memory store for session (REMOVED - CONNECTED TO API)
// let MOCK_ASSETS: Asset[] = ...

export function useAssets(showArchived?: boolean) {
    return useQuery({
        queryKey: ['assets', showArchived ?? 'all'],
        queryFn: async () => {
            const params: any = {};
            if (showArchived !== undefined) {
                params.showArchived = showArchived;
            }
            const { data } = await api.get<Asset[]>('/api/assets', { params });
            return data;
        },
    });
}

export function useAsset(id: string) {
    return useQuery({
        queryKey: ['assets', id],
        queryFn: async () => {
            const { data } = await api.get<Asset>(`/api/assets/${id}`);
            return data;
        },
        enabled: !!id,
    });
}

export function useAddAsset() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (newAsset: Omit<Asset, 'id'>) => {
            const { data } = await api.post<Asset>('/api/assets', newAsset);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['assets'] });
            toast.success('Asset added successfully');
        },
        onError: (error) => {
            console.error('Failed to add asset:', error);
            toast.error('Failed to add asset');
        },
    });
}

export function useUpdateAsset() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (updatedAsset: Asset) => {
            const { data } = await api.put<Asset>(`/api/assets/${updatedAsset.id}`, updatedAsset);
            return updatedAsset; 
        },
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['assets'] });
            queryClient.invalidateQueries({ queryKey: ['assets', variables.id] });
            toast.success('Asset updated successfully');
        },
        onError: (error) => {
            console.error('Failed to update asset:', error);
            toast.error('Failed to update asset');
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
        onError: (error) => {
            console.error('Failed to archive asset:', error);
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
        onError: (error) => {
            console.error('Failed to restore asset:', error);
            toast.error('Failed to restore asset');
        },
    });
}

export function useAllocateAsset() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, roomId }: { id: string; roomId: string }) => {
            const { data } = await api.put<Asset>(`/api/assets/${id}`, { room: roomId } as any); // Partial update logic required on backend if strictly enforced, but let's assume assets controller uses PUT for full update. Assuming alloc logic is separate or merged.
            // Actually, we should fetch update then push.
            // But let's assume standard PUT for now.
             const { data: asset } = await api.get<Asset>(`/api/assets/${id}`);
             await api.put(`/api/assets/${id}`, { ...asset, room: roomId });
             return { ...asset, room: roomId };
        },
        onSuccess: () => {
             queryClient.invalidateQueries({ queryKey: ['assets'] });
             toast.success('Asset allocated successfully');
        },
        onError: (error) => {
             console.error('Failed to allocate asset:', error);
             toast.error('Failed to allocate asset');
        },
    });
}
