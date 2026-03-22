
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PurchaseOrder } from '@/types/asset';
import { toast } from 'sonner';
import api from '@/lib/api';
import { AxiosError } from 'axios';

interface CreatePurchaseOrderPayload {
    assetName: string;
    category?: string;
    vendor?: string;
    manufacturer?: string;
    model?: string;
    serialNumber?: string;
    purchasePrice: number;
    purchaseDate?: string;
    usefulLifeYears?: number;
    requestedBy?: string;
}

interface UpdatePurchaseOrderPayload extends CreatePurchaseOrderPayload {
    status?: string;
    assetId?: string;
}

export function usePurchaseOrders(showArchived: boolean = false) {
    return useQuery({
        queryKey: ['purchaseOrders', showArchived],
        queryFn: async () => {
            const { data } = await api.get<PurchaseOrder[]>('/api/PurchaseOrders', {
                params: { showArchived }
            });
            return data;
        },
    });
}

export function useCreateOrder() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload: CreatePurchaseOrderPayload) => {
            const { data } = await api.post<PurchaseOrder>('/api/PurchaseOrders', payload);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
            toast.success('Procurement order initiated');
        },
        onError: (error: Error) => {
            const axiosErr = error as AxiosError<{ message?: string }>;
            const msg = axiosErr.response?.data?.message || 'Failed to create procurement order';
            toast.error(msg);
        },
    });
}

export function useUpdateOrder() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, payload }: { id: string; payload: UpdatePurchaseOrderPayload }) => {
            const { data } = await api.put<PurchaseOrder>(`/api/PurchaseOrders/${id}`, payload);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
            toast.success('Order updated');
        },
        onError: (error: Error) => {
            const axiosErr = error as AxiosError<{ message?: string }>;
            const msg = axiosErr.response?.data?.message || 'Failed to update order';
            toast.error(msg);
        },
    });
}

export function useArchiveOrder() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            await api.put(`/api/PurchaseOrders/archive/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
            toast.success('Order archived');
        },
        onError: () => {
            toast.error('Failed to archive order');
        },
    });
}

export function useRestoreOrder() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            await api.put(`/api/PurchaseOrders/restore/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
            toast.success('Order restored');
        },
        onError: () => {
            toast.error('Failed to restore order');
        },
    });
}
