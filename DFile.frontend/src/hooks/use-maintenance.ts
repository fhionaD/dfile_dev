
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { MaintenanceRecord } from '@/types/asset';
import { toast } from 'sonner';

// In-memory store for session (REMOVED - CONNECTED TO API)
// let MOCK_MAINTENANCE: MaintenanceRecord[] = ...

export function useMaintenanceRecords(showArchived: boolean = false) {
    return useQuery({
        queryKey: ['maintenance', showArchived],
        queryFn: async () => {
            const { data } = await api.get<MaintenanceRecord[]>('/api/maintenance', {
                params: { showArchived }
            });
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
            toast.success('Maintenance request submitted');
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
            await api.put(`/api/maintenance/${record.id}`, record);
            return record;
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
        mutationFn: async ({ id, status }: { id: string; status: any }) => {
             const { data: record } = await api.get<MaintenanceRecord>(`/api/maintenance/${id}`);
             const updatedRecord = { ...record, status };
             await api.put(`/api/maintenance/${id}`, updatedRecord);
             return updatedRecord;
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
            await api.put(`/api/maintenance/archive/${id}`);
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

export function useRestoreMaintenanceRecord() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            await api.put(`/api/maintenance/restore/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['maintenance'] });
            toast.success('Maintenance record restored');
        },
        onError: (error) => {
            console.error('Failed to restore record:', error);
            toast.error('Failed to restore record');
        },
    });
}
