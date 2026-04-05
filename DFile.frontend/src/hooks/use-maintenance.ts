
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
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

/** Primary route; fallbacks only for legacy deployments that still 404 the first path. */
const MAINTENANCE_RECORDS_ENDPOINTS = [
    "/api/maintenance",
    "/api/maintenance-records",
    "/api/maintenance-manager",
] as const;

async function getMaintenanceRecordsWithFallback(showArchived: boolean) {
    let lastError: unknown;

    for (const endpoint of MAINTENANCE_RECORDS_ENDPOINTS) {
        try {
            const { data } = await api.get<MaintenanceRecord[]>(endpoint, {
                params: { showArchived },
            });
            return data;
        } catch (error: unknown) {
            const status = (error as AxiosError).response?.status;
            if (status !== 404) {
                throw error;
            }
            lastError = error;
        }
    }

    throw lastError ?? new Error("Maintenance endpoint not found.");
}

export function useMaintenanceRecords(
    showArchived: boolean = false,
    options?: { enabled?: boolean },
) {
    return useQuery({
        queryKey: ['maintenance', showArchived],
        queryFn: async () => getMaintenanceRecordsWithFallback(showArchived),
        // List payloads are large; avoid refetch on every remount within the same session window.
        staleTime: 2 * 60 * 1000,
        enabled: options?.enabled !== false,
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
            } catch (error: unknown) {
                // Fallback for older builds, routing quirks, or permission mismatches.
                const status = (error as AxiosError).response?.status;
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

function maintenanceErrorMessage(error: unknown, fallback: string): string {
    const ax = error as AxiosError<{ message?: string; errors?: Record<string, string[]> }>;
    const data = ax.response?.data;
    if (data?.message) return data.message;
    if (data?.errors && typeof data.errors === "object") {
        const first = Object.values(data.errors).flat()[0];
        if (first) return first;
    }
    return fallback;
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
        onError: (error: unknown) => {
            toast.error(maintenanceErrorMessage(error, 'Failed to create maintenance request'));
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
        onError: (error: unknown) => {
            toast.error(maintenanceErrorMessage(error, 'Failed to update maintenance record'));
        },
    });
}

export interface InspectionWorkflowPayload {
    outcome: "Repairable" | "Not Repairable" | "No Fix Needed";
    detailNotes?: string;
    estimatedRepairCost?: number;
    attachments?: string;
    linkedPurchaseOrderId?: string;
}

export function useSubmitInspectionWorkflow() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, payload }: { id: string; payload: InspectionWorkflowPayload }) => {
            const { data } = await api.post<MaintenanceRecord>(`/api/maintenance/${id}/inspection-workflow`, payload);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['maintenance'] });
            queryClient.invalidateQueries({ queryKey: ['finance-maintenance-requests'] });
            toast.success('Inspection submitted');
        },
        onError: (error: unknown) => {
            toast.error(maintenanceErrorMessage(error, 'Failed to submit inspection'));
        },
    });
}

export function useFinanceMaintenanceRequests() {
    return useQuery({
        queryKey: ['finance-maintenance-requests'],
        queryFn: async () => {
            const { data } = await api.get<MaintenanceRecord[]>('/api/finance/maintenance-requests');
            return data;
        },
        staleTime: 60 * 1000,
    });
}

export function useFinanceApproveRepair() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            await api.patch(`/api/finance/maintenance-requests/${id}/approve-repair`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['finance-maintenance-requests'] });
            queryClient.invalidateQueries({ queryKey: ['maintenance'] });
            queryClient.invalidateQueries({ queryKey: ['assets'] });
            toast.success('Repair approved');
        },
        onError: (error: unknown) => {
            toast.error(maintenanceErrorMessage(error, 'Failed to approve repair'));
        },
    });
}

export function useFinanceRejectMaintenance() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
            await api.patch(`/api/finance/maintenance-requests/${id}/reject`, { reason });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['finance-maintenance-requests'] });
            queryClient.invalidateQueries({ queryKey: ['maintenance'] });
            toast.success('Request rejected');
        },
        onError: (error: unknown) => {
            toast.error(maintenanceErrorMessage(error, 'Failed to reject request'));
        },
    });
}

export function useFinanceApproveReplacement() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            await api.patch(`/api/finance/maintenance-requests/${id}/approve-replacement`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['finance-maintenance-requests'] });
            queryClient.invalidateQueries({ queryKey: ['maintenance'] });
            queryClient.invalidateQueries({ queryKey: ['assets'] });
            toast.success('Replacement approved; original asset disposed');
        },
        onError: (error: unknown) => {
            toast.error(maintenanceErrorMessage(error, 'Failed to approve replacement'));
        },
    });
}

export interface CompleteReplacementPayload {
    assetName: string;
    categoryId: string;
    serialNumber?: string;
    cost: number;
    dateOfAcquisition?: string;
    documentation?: string;
}

export function useFinanceCompleteReplacement() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, payload }: { id: string; payload: CompleteReplacementPayload }) => {
            const { data } = await api.post<{ assetId: string; assetCode: string }>(
                `/api/finance/maintenance-requests/${id}/complete-replacement`,
                {
                    assetName: payload.assetName,
                    categoryId: payload.categoryId,
                    serialNumber: payload.serialNumber,
                    cost: payload.cost,
                    dateOfAcquisition: payload.dateOfAcquisition,
                    documentation: payload.documentation,
                },
            );
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['finance-maintenance-requests'] });
            queryClient.invalidateQueries({ queryKey: ['maintenance'] });
            queryClient.invalidateQueries({ queryKey: ['assets'] });
            toast.success('Replacement asset registered');
        },
        onError: (error: unknown) => {
            toast.error(maintenanceErrorMessage(error, 'Failed to complete replacement'));
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
                {
                    headers: { 'Content-Type': 'multipart/form-data' },
                    timeout: 300_000,
                }
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
