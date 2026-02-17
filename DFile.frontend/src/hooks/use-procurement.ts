
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PurchaseOrder, Asset } from '@/types/asset';
import { toast } from 'sonner';
import { useAddAsset } from './use-assets';

// Mock Data
const MOCK_ORDERS: PurchaseOrder[] = [
    { id: "PO-001", assetName: "Samsung 55\" Smart TV", category: "Electronics", vendor: "TechSupply Co.", manufacturer: "Samsung", model: "QN90C", serialNumber: "SN-TV55001", purchasePrice: 1200, purchaseDate: "2024-01-15", usefulLifeYears: 5, status: "Delivered", requestedBy: "Alex Thompson", createdAt: "2024-01-10", assetId: "AST-001" },
    { id: "PO-002", assetName: "Conference Table", category: "Furniture", vendor: "OfficePlus", manufacturer: "Steelcase", model: "CT-2400", serialNumber: "SN-TBL002", purchasePrice: 3200, purchaseDate: "2024-02-01", usefulLifeYears: 10, status: "Delivered", requestedBy: "Alex Thompson", createdAt: "2024-01-25", assetId: "AST-010" },
    { id: "PO-003", assetName: "Industrial Drill", category: "Maintenance", vendor: "ToolMaster", manufacturer: "DeWalt", model: "DW-500", serialNumber: "SN-DRL003", purchasePrice: 300, purchaseDate: "2024-03-01", usefulLifeYears: 3, status: "Approved", requestedBy: "Alex Thompson", createdAt: "2024-02-28" },
];

export function usePurchaseOrders() {
    return useQuery({
        queryKey: ['purchaseOrders'],
        queryFn: async () => {
            // Simulate API delay
            await new Promise(resolve => setTimeout(resolve, 500));
            return MOCK_ORDERS;
        },
    });
}

export function useCreateOrder() {
    const queryClient = useQueryClient();
    const addAssetMutation = useAddAsset();

    return useMutation({
        mutationFn: async ({ order, asset }: { order: PurchaseOrder; asset: Asset }) => {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 500));

            // If we were real, we'd probably create the order first, then the asset, or simpler
            // For now, we mimic the DataContext behavior: create order + create asset
            return order;
        },
        onSuccess: async (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
            // Also trigger asset creation
            // Note: In a real app, the backend might handle this transactionally
            await addAssetMutation.mutateAsync(variables.asset);

            toast.success('Procurement order initiated');
        },
    });
}

export function useArchiveOrder() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 500));
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
            toast.success('Order archived');
        },
    });
}
