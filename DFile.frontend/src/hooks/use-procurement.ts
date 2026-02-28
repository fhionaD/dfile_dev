import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Asset, PurchaseOrder } from '@/types/asset';
import { toast } from 'sonner';
import { useAddAsset } from './use-assets';
import { procurementService } from '@/services/procurement.service';

export function usePurchaseOrders(showArchived: boolean = false) {
    return useQuery({
        queryKey: ['purchaseOrders', showArchived],
        queryFn: () => procurementService.getPurchaseOrders(showArchived),
    });
}

export function useCreateOrder() {
    const queryClient = useQueryClient();
    const addAssetMutation = useAddAsset();

    return useMutation({
        mutationFn: async ({ order, asset }: { order: PurchaseOrder; asset: Asset }) => {
            // 1. Create the Purchase Order via service
            const newOrder = await procurementService.createPurchaseOrder(order);

            // 2. Also trigger asset creation (Registration)
            await addAssetMutation.mutateAsync(asset);

            return newOrder;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
            toast.success('Procurement order initiated and asset registered');
        },
        onError: (error: any) => {
            console.error('Failed to create order:', error);
            const message = error.response?.data?.Message || error.message || 'Failed to initiate procurement order';
            toast.error(message);
        }
    });
}

export function useArchiveOrder() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => procurementService.archivePurchaseOrder(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
            toast.success('Order archived');
        },
        onError: (error: any) => {
            console.error('Failed to archive order:', error);
            toast.error(error.response?.data?.Message || 'Failed to archive order');
        }
    });
}

export function useRestoreOrder() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => procurementService.restorePurchaseOrder(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
            toast.success('Order restored');
        },
        onError: (error: any) => {
            console.error('Failed to restore order:', error);
            toast.error(error.response?.data?.Message || 'Failed to restore order');
        }
    });
}
