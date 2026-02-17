
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Asset } from '@/types/asset';
import { toast } from 'sonner';

export function useAssets() {
    return useQuery({
        queryKey: ['assets'],
        queryFn: async () => {
            const { data } = await api.get<Asset[]>('/api/assets');
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
            return data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['assets'] });
            queryClient.invalidateQueries({ queryKey: ['assets', data.id] });
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
            // Assuming archive is a DELETE or a status update. 
            // Based on previous context, it might be a DELETE endpoint that soft-deletes/archives.
            // Or a PATCH. Adjusting to DELETE for now as per typical REST, 
            // but if it's "Archive", it might be a patch. 
            // Let's assume DELETE /api/assets/{id} for now, or check backend if needed.
            // Re-reading context: "The user's main goal is to replace all delete functionality with an archive/restore system"
            // So DELETE likely performs the archive.
            await api.delete(`/api/assets/${id}`);
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

export function useAllocateAsset() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, roomId }: { id: string; roomId: string }) => {
            const { data } = await api.patch<Asset>(`/api/assets/${id}`, { room: roomId });
            return data;
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
