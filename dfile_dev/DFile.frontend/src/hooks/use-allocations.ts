import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api, { getErrorMessage } from '@/lib/api';
import { AssetAllocation } from '@/types/asset';
import { toast } from 'sonner';

export function useAllocateAsset() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ assetId, roomId, remarks }: { assetId: string; roomId: string; remarks?: string }) => {
            const { data } = await api.post<AssetAllocation>('/api/allocations', { assetId, roomId, remarks });
            return data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['assets'] });
            queryClient.invalidateQueries({ queryKey: ['allocations'] });
            queryClient.invalidateQueries({ queryKey: ['rooms'] });
            toast.success(`Asset allocated to ${data.roomCode} successfully`);
        },
        onError: (error) => {
            toast.error(getErrorMessage(error, 'Failed to allocate asset'));
        },
    });
}

export function useDeallocateAsset() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (assetId: string) => {
            await api.put(`/api/allocations/deallocate/${assetId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['assets'] });
            queryClient.invalidateQueries({ queryKey: ['allocations'] });
            queryClient.invalidateQueries({ queryKey: ['rooms'] });
            toast.success('Asset deallocated successfully');
        },
        onError: (error) => {
            toast.error(getErrorMessage(error, 'Failed to deallocate asset'));
        },
    });
}

export function useAllocationHistory(assetId: string) {
    return useQuery({
        queryKey: ['allocations', 'asset', assetId],
        queryFn: async () => {
            const { data } = await api.get<AssetAllocation[]>(`/api/allocations/asset/${assetId}`);
            return data;
        },
        enabled: !!assetId,
    });
}

export function useActiveAllocations() {
    return useQuery({
        queryKey: ['allocations', 'active'],
        queryFn: async () => {
            const { data } = await api.get<AssetAllocation[]>('/api/allocations/active');
            return data;
        },
    });
}
