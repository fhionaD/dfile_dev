
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { MaintenanceRecord } from '@/types/asset';
import { toast } from 'sonner';

// In-memory store for session
let MOCK_MAINTENANCE: MaintenanceRecord[] = [
    {
        id: "M-2024-001",
        assetId: "A-101",
        description: "HVAC System not cooling properly",
        status: "In Progress",
        priority: "High",
        type: "Corrective",
        dateReported: new Date().toISOString(),
    },
    {
        id: "M-2024-002",
        assetId: "A-102",
        description: "Monthly Generator Inspection",
        status: "Scheduled",
        priority: "Medium",
        type: "Preventive",
        frequency: "Monthly",
        dateReported: new Date(Date.now() - 86400000 * 2).toISOString(),
        startDate: new Date(Date.now() + 86400000 * 5).toISOString(),
    },
    {
        id: "M-2024-003",
        assetId: "A-105",
        description: "Projector bulb replacement",
        status: "Pending",
        priority: "Low",
        type: "Corrective",
        dateReported: new Date(Date.now() - 86400000).toISOString(),
    }
];

export function useMaintenanceRecords() {
    return useQuery({
        queryKey: ['maintenance'],
        queryFn: async () => {
             // MOCK DATA ONLY
            await new Promise(resolve => setTimeout(resolve, 300));
            return [...MOCK_MAINTENANCE];
        },
    });
}

export function useAddMaintenanceRecord() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (record: Omit<MaintenanceRecord, 'id'>) => {
             // MOCK DATA ONLY
            await new Promise(resolve => setTimeout(resolve, 300));
            const newRecord = { ...record, id: `M-MOCK-${Date.now()}`, dateReported: new Date().toISOString() } as MaintenanceRecord;
            MOCK_MAINTENANCE.push(newRecord);
            return newRecord;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['maintenance'] });
            toast.success('Maintenance request created (Mock)');
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
             // MOCK DATA ONLY
            await new Promise(resolve => setTimeout(resolve, 300));
            MOCK_MAINTENANCE = MOCK_MAINTENANCE.map(r => r.id === record.id ? record : r);
            return record;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['maintenance'] });
            toast.success('Maintenance record updated (Mock)');
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
             // MOCK DATA ONLY
            await new Promise(resolve => setTimeout(resolve, 300));
            const record = MOCK_MAINTENANCE.find(r => r.id === id);
            if (record) {
                record.status = status;
            }
            return record;
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
