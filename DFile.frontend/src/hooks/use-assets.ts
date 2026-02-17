
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Asset } from '@/types/asset';
import { toast } from 'sonner';

// In-memory store for session
let MOCK_ASSETS: Asset[] = [
    { id: "A-101", desc: "Main Office HVAC Unit", cat: "Facility", status: "Active", room: "R-101", value: 15000 },
    { id: "A-102", desc: "Emergency Generator", cat: "Equipment", status: "Active", room: "Basement", value: 25000 },
    { id: "A-103", desc: "Dell Latitude 5420", cat: "IT", status: "Active", room: "IT Dept", value: 1200 },
    { id: "A-104", desc: "Conference Table", cat: "Furniture", status: "Active", room: "Conf Room A", value: 800 },
    { id: "A-105", desc: "Epson Projector 4K", cat: "IT", status: "Maintenance", room: "Conf Room B", value: 1200 },
];

export function useAssets() {
    return useQuery({
        queryKey: ['assets'],
        queryFn: async () => {
             // MOCK DATA ONLY
            await new Promise(resolve => setTimeout(resolve, 300));
            return [...MOCK_ASSETS];
        },
    });
}

export function useAsset(id: string) {
    return useQuery({
        queryKey: ['assets', id],
        queryFn: async () => {
             // MOCK DATA ONLY
            await new Promise(resolve => setTimeout(resolve, 300));
            return MOCK_ASSETS.find(a => a.id === id) || null as Asset | null;
        },
        enabled: !!id,
    });
}

export function useAddAsset() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (newAsset: Omit<Asset, 'id'>) => {
             // MOCK DATA ONLY
            await new Promise(resolve => setTimeout(resolve, 300));
            const asset = { ...newAsset, id: `A-MOCK-${Date.now()}` } as Asset;
            MOCK_ASSETS.push(asset);
            return asset;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['assets'] });
            toast.success('Asset added successfully (Mock)');
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
             // MOCK DATA ONLY
            await new Promise(resolve => setTimeout(resolve, 300));
            MOCK_ASSETS = MOCK_ASSETS.map(a => a.id === updatedAsset.id ? updatedAsset : a);
            return updatedAsset;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['assets'] });
            queryClient.invalidateQueries({ queryKey: ['assets', data.id] });
            toast.success('Asset updated successfully (Mock)');
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
             // MOCK DATA ONLY
            await new Promise(resolve => setTimeout(resolve, 300));
            // Simulate archive by filtering out or updating status
            MOCK_ASSETS = MOCK_ASSETS.filter(a => a.id !== id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['assets'] });
            toast.success('Asset archived successfully (Mock)');
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
