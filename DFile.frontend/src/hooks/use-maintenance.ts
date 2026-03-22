
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { AllocatedAssetForMaintenance, MaintenanceRecord } from '@/types/asset';
import { toast } from 'sonner';

interface CreateMaintenancePayload {
    assetId: string;
    description: string;
    status?: string;
    priority?: string;
    type?: string;
    frequency?: string;
    startDate?: string;
    endDate?: string;
    cost?: number;
    attachments?: string;
    diagnosisOutcome?: string;
    inspectionNotes?: string;
    quotationNotes?: string;
}

interface UpdateMaintenancePayload extends CreateMaintenancePayload {
    dateReported?: string;
}

const MAINTENANCE_API_ENDPOINTS = [
    "/api/maintenance",
    "/api/maintenance-records",
    "/api/maintenance-manager",
] as const;

async function getMaintenanceRecordsWithFallback(showArchived: boolean) {
    let lastError: unknown;

    for (const endpoint of MAINTENANCE_API_ENDPOINTS) {
        try {
            const { data } = await api.get<MaintenanceRecord[]>(endpoint, {
                params: { showArchived },
            });
            return data;
        } catch (error: any) {
            if (error?.response?.status !== 404) {
                throw error;
            }
            lastError = error;
        }
    }

    throw lastError ?? new Error("Maintenance endpoint not found.");
}

export function useMaintenanceRecords(showArchived: boolean = false) {
    return useQuery({
        queryKey: ['maintenance', showArchived],
        queryFn: async () => getMaintenanceRecordsWithFallback(showArchived),
    });
}

function mapActiveAllocationsToMaintenance(rows: any[]): AllocatedAssetForMaintenance[] {
    return rows.map((a) => ({
        assetId: a.assetId,
        assetCode: a.assetCode,
        assetName: a.assetName,
        tagNumber: a.tagNumber,
        categoryName: undefined,
        roomId: a.roomId,
        roomCode: a.roomCode,
        roomName: a.roomName,
        allocatedAt: a.allocatedAt,
        tenantId: a.tenantId,
    })) as AllocatedAssetForMaintenance[];
}

/** Axios may return a non-array if the wrong host served HTML or an error body. */
function asArray<T>(data: unknown): T[] {
    return Array.isArray(data) ? data : [];
}

export function useAllocatedAssetsForMaintenance() {
    return useQuery({
        queryKey: ['maintenance', 'allocated-assets'],
        queryFn: async () => {
            try {
                const { data } = await api.get<unknown>('/api/maintenance/allocated-assets');
                const list = asArray<AllocatedAssetForMaintenance>(data);
                if (list.length > 0) return list;
            } catch (error: any) {
                // Fallback for older builds, routing quirks, or permission mismatches.
                const status = error?.response?.status;
                if (status === 401 || status === 403 || status === 404) {
                    const { data } = await api.get<unknown>('/api/allocations/active');
                    return mapActiveAllocationsToMaintenance(asArray(data));
                }
                throw error;
            }
            // Primary returned [] — use same tenant-scoped list as tenant allocation (parity with GetActiveAllocations).
            const { data: active } = await api.get<unknown>('/api/allocations/active');
            return mapActiveAllocationsToMaintenance(asArray(active));
        },
    });
}

export function useAddMaintenanceRecord() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload: CreateMaintenancePayload) => {
            const { data } = await api.post<MaintenanceRecord>('/api/maintenance', payload);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['maintenance'] });
            toast.success('Maintenance request submitted');
        },
        onError: () => {
            toast.error('Failed to create maintenance request');
        },
    });
}

export function useUpdateMaintenanceRecord() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, payload }: { id: string; payload: UpdateMaintenancePayload }) => {
            const { data } = await api.put<MaintenanceRecord>(`/api/maintenance/${id}`, payload);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['maintenance'] });
            toast.success('Maintenance record updated');
        },
        onError: () => {
            toast.error('Failed to update maintenance record');
        },
    });
}

export function useUpdateMaintenanceStatus() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, status }: { id: string; status: string }) => {
            // Get record from React Query cache — try both active and archived keys
            const active = queryClient.getQueryData<MaintenanceRecord[]>(['maintenance', false]);
            const archived = queryClient.getQueryData<MaintenanceRecord[]>(['maintenance', true]);
            const record = active?.find(r => r.id === id) || archived?.find(r => r.id === id);
            if (!record) throw new Error('Record not found in cache. Please refresh the page.');

            const payload: UpdateMaintenancePayload = {
                assetId: record.assetId,
                description: record.description,
                status,
                priority: record.priority,
                type: record.type,
                frequency: record.frequency,
                startDate: record.startDate,
                endDate: record.endDate,
                cost: record.cost,
                attachments: record.attachments,
                diagnosisOutcome: record.diagnosisOutcome || undefined,
                inspectionNotes: record.inspectionNotes || undefined,
                quotationNotes: record.quotationNotes || undefined,
                dateReported: record.dateReported,
            };
            await api.put(`/api/maintenance/${id}`, payload);
            return { ...record, status };
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['maintenance'] });
            toast.success('Maintenance status updated');
        },
        onError: () => {
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
        onError: () => {
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
        onError: () => {
            toast.error('Failed to restore record');
        },
    });
}

export function useUploadAttachment() {
    return useMutation({
        mutationFn: async (file: File) => {
            const formData = new FormData();
            formData.append('file', file);
            const { data } = await api.post<{ url: string; fileName: string; size: number }>(
                '/api/maintenance/upload',
                formData,
                { headers: { 'Content-Type': 'multipart/form-data' } }
            );
            return data;
        },
        onError: () => {
            toast.error('Failed to upload file');
        },
    });
}

export function useMarkBeyondRepair() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (maintenanceId: string) => {
            const { data } = await api.put<{ message: string }>(`/api/maintenance/mark-beyond-repair/${maintenanceId}`);
            return data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['maintenance'] });
            queryClient.invalidateQueries({ queryKey: ['assets'] });
            toast.success(data.message);
        },
        onError: () => {
            toast.error('Failed to mark asset as beyond repair');
        },
    });
}

export interface ConditionLogEntry {
    id: number;
    previousCondition: string;
    newCondition: string;
    notes?: string;
    changedBy?: string;
    createdAt: string;
}

export function useAssetConditionHistory(assetId: string | undefined) {
    return useQuery({
        queryKey: ['condition-history', assetId],
        queryFn: async () => {
            const { data } = await api.get<ConditionLogEntry[]>(`/api/maintenance/condition-history/${assetId}`);
            return data;
        },
        enabled: !!assetId,
    });
}
