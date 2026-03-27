import { keepPreviousData, useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { AuditLog, AuditSummary } from '@/types/asset';

interface AuditLogParams {
    page?: number;
    pageSize?: number;
    entityType?: string;
    action?: string;
}

export interface AuditLogResponse {
    data: AuditLog[];
    totalCount: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

export function useAuditLogs(params: AuditLogParams = {}) {
    const { page = 1, pageSize = 25, entityType, action } = params;

    return useQuery({
        queryKey: ['audit-logs', page, pageSize, entityType, action],
        queryFn: async () => {
            const searchParams = new URLSearchParams();
            searchParams.set('page', String(page));
            searchParams.set('pageSize', String(pageSize));
            if (entityType) searchParams.set('entityType', entityType);
            if (action) searchParams.set('action', action);

            const { data } = await api.get<AuditLogResponse>(`/api/auditlogs?${searchParams}`);
            return data;
        },
        placeholderData: keepPreviousData,
    });
}

export function useAuditSummary(options?: { enabled?: boolean }) {
    const enabled = options?.enabled ?? true;
    return useQuery({
        queryKey: ['audit-summary'],
        queryFn: async () => {
            const { data } = await api.get<AuditSummary>('/api/auditlogs/summary');
            return data;
        },
        enabled,
    });
}
