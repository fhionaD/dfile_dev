import api from '@/lib/api';
import { Asset } from '@/types/asset';

export const assetService = {
    async getAssets(showArchived?: boolean): Promise<Asset[]> {
        const params: any = {};
        if (showArchived !== undefined) {
            params.showArchived = showArchived;
        }
        const { data } = await api.get<Asset[]>('/api/assets', { params });
        return data;
    },

    async getAsset(id: string): Promise<Asset> {
        const { data } = await api.get<Asset>(`/api/assets/${id}`);
        return data;
    },

    async createAsset(asset: Omit<Asset, 'id'>): Promise<Asset> {
        const { data } = await api.post<Asset>('/api/assets', asset);
        return data;
    },

    async updateAsset(id: string, asset: Asset): Promise<void> {
        await api.put(`/api/assets/${id}`, asset);
    },

    async archiveAsset(id: string): Promise<void> {
        await api.put(`/api/assets/archive/${id}`);
    },

    async restoreAsset(id: string): Promise<void> {
        await api.put(`/api/assets/restore/${id}`);
    },

    async deleteAsset(id: string): Promise<void> {
        await api.delete(`/api/assets/${id}`);
    }
};
