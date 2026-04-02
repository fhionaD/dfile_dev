import { keepPreviousData, useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { AuditLog, AuditSummary } from '@/types/asset';

export interface AuditLogQueryParams {
    page?: number;
    pageSize?: number;
    entityType?: string;
    action?: string;
    module?: string;
    userRole?: string;
    dateFrom?: string;
    dateTo?: string;
    /** When false, query is disabled (e.g. non-admin should not call). */
    enabled?: boolean;
}

export interface AuditLogResponse {
    data: AuditLog[];
    totalCount: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

function appendParam(sp: URLSearchParams, key: string, value: string | undefined) {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
        sp.set(key, String(value).trim());
    }
}

export function useAuditLogs(params: AuditLogQueryParams = {}) {
    const {
        page = 1,
        pageSize = 25,
        entityType,
        action,
        module,
        userRole,
        dateFrom,
        dateTo,
        enabled = true,
    } = params;

    return useQuery({
        queryKey: ['audit-logs', page, pageSize, entityType, action, module, userRole, dateFrom, dateTo],
        queryFn: async () => {
            const searchParams = new URLSearchParams();
            searchParams.set('page', String(page));
            searchParams.set('pageSize', String(pageSize));
            appendParam(searchParams, 'entityType', entityType);
            appendParam(searchParams, 'action', action);
            appendParam(searchParams, 'module', module);
            appendParam(searchParams, 'userRole', userRole);
            appendParam(searchParams, 'dateFrom', dateFrom);
            appendParam(searchParams, 'dateTo', dateTo);

            const { data } = await api.get<AuditLogResponse>(`/api/auditlogs?${searchParams}`);
            return data;
        },
        placeholderData: keepPreviousData,
        enabled,
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
