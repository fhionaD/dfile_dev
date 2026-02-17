
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { MaintenanceRecord } from '@/types/asset';
import { toast } from 'sonner';

export function useMaintenanceRecords() {
    return useQuery({
        queryKey: ['maintenance'],
        queryFn: async () => {
            const { data } = await api.get<MaintenanceRecord[]>('/api/maintenance');
            return data;
        },
    });
}

export function useAddMaintenanceRecord() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (record: Omit<MaintenanceRecord, 'id'>) => {
            const { data } = await api.post<MaintenanceRecord>('/api/maintenance', record);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['maintenance'] });
            toast.success('Maintenance request created');
        },
        onError: (error) => {
            console.error('Failed to create maintenance record:', error);
            toast.error('Failed to create maintenance request');
        },
    });
}

export function useUpdateMaintenanceRecord() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (record: MaintenanceRecord) => {
            const { data } = await api.put<MaintenanceRecord>(`/api/maintenance/${record.id}`, record);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['maintenance'] });
            toast.success('Maintenance record updated');
        },
        onError: (error) => {
            console.error('Failed to update record:', error);
            toast.error('Failed to update maintenance record');
        },
    });
}

export function useUpdateMaintenanceStatus() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, status }: { id: string; status: string }) => {
            const { data } = await api.patch<MaintenanceRecord>(`/api/maintenance/${id}/status`, JSON.stringify(status), {
                headers: { 'Content-Type': 'application/json' }
            });
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['maintenance'] });
            toast.success('Maintenance status updated');
        },
        onError: (error) => {
            console.error('Failed to update status:', error);
            toast.error('Failed to update maintenance status');
        },
    });
}

export function useArchiveMaintenanceRecord() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            await api.delete(`/api/maintenance/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['maintenance'] });
            toast.success('Maintenance record archived');
        },
        onError: (error) => {
            console.error('Failed to archive record:', error);
            toast.error('Failed to archive record');
        },
    });
}
