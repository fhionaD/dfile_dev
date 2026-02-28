import api from '@/lib/api';
import { PurchaseOrder } from '@/types/asset';

export const procurementService = {
    async getPurchaseOrders(showArchived: boolean = false): Promise<PurchaseOrder[]> {
        const { data } = await api.get<PurchaseOrder[]>('/api/procurement', {
            params: { showArchived }
        });
        return data;
    },

    async getPurchaseOrder(id: string): Promise<PurchaseOrder> {
        const { data } = await api.get<PurchaseOrder>(`/api/procurement/${id}`);
        return data;
    },

    async createPurchaseOrder(order: Partial<PurchaseOrder>): Promise<PurchaseOrder> {
        const { data } = await api.post<PurchaseOrder>('/api/procurement', order);
        return data;
    },

    async updatePurchaseOrder(id: string, order: PurchaseOrder): Promise<void> {
        await api.put(`/api/procurement/${id}`, order);
    },

    async archivePurchaseOrder(id: string): Promise<void> {
        await api.put(`/api/procurement/archive/${id}`);
    },

    async restorePurchaseOrder(id: string): Promise<void> {
        await api.put(`/api/procurement/restore/${id}`);
    }
};
