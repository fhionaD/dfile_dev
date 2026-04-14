
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import api from '@/lib/api';
import {
    AllocatedAssetForMaintenance,
    FinanceMaintenanceQueueRow,
    FinanceMaintenanceSubmissionDetail,
    MaintenanceRecord,
    MaintenanceScheduleSummary,
} from '@/types/asset';
import { toast } from 'sonner';

interface CreateMaintenancePayload {
    assetId: string;
    /** Must match active allocation when provided; server requires an active allocation. */
    roomId?: string;
    description: string;
    status?: string;
    priority?: string;
    type?: string;
    frequency?: string;
    startDate?: string;
    endDate?: string;
    /** Client-generated id for recurring batches; resubmitting the same id yields 409 after first success. */
    scheduleSeriesId?: string;
    cost?: number;
    attachments?: string;
    diagnosisOutcome?: string;
    inspectionNotes?: string;
    quotationNotes?: string;
}

export interface CreateMaintenanceBatchResponse {
    items: MaintenanceRecord[];
    count: number;
}

export interface UpdateMaintenancePayload extends CreateMaintenancePayload {
    dateReported?: string;
}

/** Primary route; fallbacks only for legacy deployments that still 404 the first path. */
const MAINTENANCE_RECORDS_ENDPOINTS = [
    "/api/maintenance",
    "/api/maintenance-records",
    "/api/maintenance-manager",
] as const;

const MAINTENANCE_RECORD_GUID =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function getScheduleSummaryWithFallback(recordId: string): Promise<MaintenanceScheduleSummary> {
    let lastError: unknown;
    for (const base of MAINTENANCE_RECORDS_ENDPOINTS) {
        try {
            const { data } = await api.get<MaintenanceScheduleSummary>(`${base}/${recordId}/schedule-summary`);
            return data;
        } catch (error: unknown) {
            const status = (error as AxiosError).response?.status;
            if (status !== 404) throw error;
            lastError = error;
        }
    }
    throw lastError ?? new Error('Schedule summary not found.');
}

/** Schedule-only fields from API; falls back to list data when modal opens with non-GUID ids. */
export function useMaintenanceScheduleSummary(recordId: string | undefined, open: boolean) {
    return useQuery({
        queryKey: ['maintenance', 'schedule-summary', recordId],
        queryFn: () => getScheduleSummaryWithFallback(recordId!),
        enabled: open && !!recordId && MAINTENANCE_RECORD_GUID.test(recordId),
        staleTime: 60 * 1000,
    });
}

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

interface RawActiveAllocationRow {
    assetId?: string;
    assetCode?: string;
    assetName?: string;
    roomId?: string;
    roomCode?: string;
    roomName?: string;
    allocatedAt?: string;
    tenantId?: number;
}

function mapActiveAllocationsToMaintenance(rows: RawActiveAllocationRow[]): AllocatedAssetForMaintenance[] {
    return rows.map((a) => ({
        assetId: a.assetId ?? '',
        assetCode: a.assetCode,
        assetName: a.assetName,
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
                    return mapActiveAllocationsToMaintenance(asArray<RawActiveAllocationRow>(data));
                }
                throw error;
            }
            // Primary returned [] — use same tenant-scoped list as tenant allocation (parity with GetActiveAllocations).
            const { data: active } = await api.get<unknown>('/api/allocations/active');
            return mapActiveAllocationsToMaintenance(asArray<RawActiveAllocationRow>(active));
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
            const { data } = await api.post<MaintenanceRecord | CreateMaintenanceBatchResponse>('/api/maintenance', payload, { suppressGlobalError: true });
            if (data && typeof data === 'object' && 'items' in data && Array.isArray((data as CreateMaintenanceBatchResponse).items)) {
                return data as CreateMaintenanceBatchResponse;
            }
            return { items: [data as MaintenanceRecord], count: 1 };
        },
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: ['maintenance'] });
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            const n = result.count ?? result.items?.length ?? 1;
            toast.success(n > 1 ? `Created ${n} schedule entries` : 'Maintenance request submitted');
        },
        onError: (error: unknown) => {
            const ax = error as AxiosError<{ message?: string }>;
            const isConflict = ax.response?.status === 409;
            // Show 409 conflict errors as toast (duplicate schedule dates)
            if (isConflict) {
                const message = ax.response?.data?.message || 'Maintenance is already scheduled for this date.';
                toast.error(message);
            } else {
                toast.error(maintenanceErrorMessage(error, 'Failed to create maintenance request'));
            }
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
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
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
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            toast.success('Inspection submitted');
        },
        onError: (error: unknown) => {
            toast.error(maintenanceErrorMessage(error, 'Failed to submit inspection'));
        },
    });
}

export type RepairHistoryRow = {
    id: number;
    maintenanceRecordId: string | null;
    requestId: string | null;
    assetId: string;
    assetName?: string | null;
    assetCode?: string | null;
    notes?: string | null;
    previousCondition: string;
    newCondition: string;
    changedBy?: string | null;
    createdAt: string;
};

export function useRepairHistory(assetId?: string) {
    return useQuery({
        queryKey: ['maintenance-repair-history', assetId ?? 'all'],
        queryFn: async () => {
            const { data } = await api.get<RepairHistoryRow[]>('/api/maintenance/repair-history', {
                params: assetId ? { assetId } : undefined,
            });
            return data ?? [];
        },
    });
}

export function useCompleteRepair() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, repairDescription }: { id: string; repairDescription: string }) => {
            await api.post(`/api/maintenance/${id}/complete-repair`, { repairDescription });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['maintenance'] });
            queryClient.invalidateQueries({ queryKey: ['maintenance-repair-history'] });
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            toast.success('Repair completed');
        },
        onError: (error: unknown) => {
            toast.error(maintenanceErrorMessage(error, 'Failed to complete repair'));
        },
    });
}

export function useFinanceMaintenanceRequests() {
    return useQuery({
        queryKey: ['finance-maintenance-requests'],
        queryFn: async () => {
            const { data } = await api.get<FinanceMaintenanceQueueRow[]>('/api/finance/maintenance-requests');
            return data;
        },
        staleTime: 60 * 1000,
    });
}

export function useFinanceMaintenanceSubmissionDetail(recordId: string | undefined, enabled: boolean) {
    return useQuery({
        queryKey: ['finance-maintenance-submission', recordId],
        queryFn: async () => {
            const { data } = await api.get<FinanceMaintenanceSubmissionDetail>(
                `/api/finance/maintenance-requests/${recordId}/submission-detail`,
            );
            return data;
        },
        enabled: Boolean(enabled && recordId),
        staleTime: 30 * 1000,
    });
}

export function useFinanceRepairsAwaitingParts() {
    return useQuery({
        queryKey: ['finance-maintenance-awaiting-parts'],
        queryFn: async () => {
            const { data } = await api.get<FinanceMaintenanceQueueRow[]>('/api/finance/maintenance-requests/awaiting-parts');
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
            queryClient.invalidateQueries({ queryKey: ['finance-maintenance-awaiting-parts'] });
            queryClient.invalidateQueries({ queryKey: ['finance-maintenance-submission'] });
            queryClient.invalidateQueries({ queryKey: ['maintenance'] });
            queryClient.invalidateQueries({ queryKey: ['assets'] });
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
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
            queryClient.invalidateQueries({ queryKey: ['finance-maintenance-awaiting-parts'] });
            queryClient.invalidateQueries({ queryKey: ['finance-maintenance-submission'] });
            queryClient.invalidateQueries({ queryKey: ['maintenance'] });
            toast.success('Request rejected');
        },
        onError: (error: unknown) => {
            toast.error(maintenanceErrorMessage(error, 'Failed to reject request'));
        },
    });
}

export function useFinanceMarkPartsReady() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            await api.patch(`/api/finance/maintenance-requests/${id}/mark-parts-ready`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['finance-maintenance-awaiting-parts'] });
            queryClient.invalidateQueries({ queryKey: ['finance-maintenance-requests'] });
            queryClient.invalidateQueries({ queryKey: ['finance-maintenance-submission'] });
            queryClient.invalidateQueries({ queryKey: ['maintenance'] });
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            toast.success('Maintenance team notified — parts are ready');
        },
        onError: (error: unknown) => {
            toast.error(maintenanceErrorMessage(error, 'Failed to mark parts ready'));
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
            queryClient.invalidateQueries({ queryKey: ['finance-maintenance-submission'] });
            queryClient.invalidateQueries({ queryKey: ['maintenance'] });
            queryClient.invalidateQueries({ queryKey: ['assets'] });
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            toast.success('Replacement approved; register the new asset when ready. Original is marked for replacement.');
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
            queryClient.invalidateQueries({ queryKey: ['finance-maintenance-submission'] });
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
                roomId: record.roomId,
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
        onError: (error: unknown) => {
            toast.error(maintenanceErrorMessage(error, 'Failed to archive record'));
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
