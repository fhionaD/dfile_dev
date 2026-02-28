
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Asset } from '@/types/asset';
import { toast } from 'sonner';
import { assetService } from '@/services/asset.service';

// In-memory store for session (REMOVED - CONNECTED TO API)
// let MOCK_ASSETS: Asset[] = ...

export function useAssets(showArchived?: boolean) {
    return useQuery({
        queryKey: ['assets', showArchived ?? 'all'],
        queryFn: () => assetService.getAssets(showArchived),
    });
}

export function useAsset(id: string) {
    return useQuery({
        queryKey: ['assets', id],
        queryFn: () => assetService.getAsset(id),
        enabled: !!id,
    });
}

export function useAddAsset() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (newAsset: Omit<Asset, 'id'>) => assetService.createAsset(newAsset),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['assets'] });
            toast.success('Asset added successfully');
        },
        onError: (error: any) => {
            console.error('Failed to add asset:', error);
            toast.error(error.response?.data?.Message || 'Failed to add asset');
        },
    });
}

export function useUpdateAsset() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (updatedAsset: Asset) => {
            await assetService.updateAsset(updatedAsset.id, updatedAsset);
            return updatedAsset;
        },
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['assets'] });
            queryClient.invalidateQueries({ queryKey: ['assets', variables.id] });
            toast.success('Asset updated successfully');
        },
        onError: (error: any) => {
            console.error('Failed to update asset:', error);
            toast.error(error.response?.data?.Message || 'Failed to update asset');
        },
    });
}

export function useArchiveAsset() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => assetService.archiveAsset(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['assets'] });
            toast.success('Asset archived successfully');
        },
        onError: (error: any) => {
            console.error('Failed to archive asset:', error);
            toast.error(error.response?.data?.Message || 'Failed to archive asset');
        },
    });
}

export function useRestoreAsset() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => assetService.restoreAsset(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['assets'] });
            toast.success('Asset restored successfully');
        },
        onError: (error: any) => {
            console.error('Failed to restore asset:', error);
            toast.error(error.response?.data?.Message || 'Failed to restore asset');
        },
    });
}

export function useAllocateAsset() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, roomId }: { id: string; roomId: string }) => {
            const asset = await assetService.getAsset(id);
            const updatedAsset = { ...asset, room: roomId };
            await assetService.updateAsset(id, updatedAsset);
            return updatedAsset;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['assets'] });
            toast.success('Asset allocated successfully');
        },
        onError: (error: any) => {
            console.error('Failed to allocate asset:', error);
            toast.error(error.response?.data?.Message || 'Failed to allocate asset');
        },
    });
}
