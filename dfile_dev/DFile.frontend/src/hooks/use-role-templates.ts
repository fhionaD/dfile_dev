import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { RoleTemplate, RolePermissionEntry } from '@/types/asset';

export function useRoleTemplates() {
    return useQuery({
        queryKey: ['role-templates'],
        queryFn: async () => {
            const { data } = await api.get<RoleTemplate[]>('/api/roletemplates');
            return data;
        },
    });
}

export function useRoleTemplate(id: number) {
    return useQuery({
        queryKey: ['role-templates', id],
        queryFn: async () => {
            const { data } = await api.get<RoleTemplate>(`/api/roletemplates/${id}`);
            return data;
        },
        enabled: id > 0,
    });
}

interface CreateRoleTemplatePayload {
    name: string;
    description?: string;
    permissions: Omit<RolePermissionEntry, 'id'>[];
}

export function useCreateRoleTemplate() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (payload: CreateRoleTemplatePayload) => {
            const { data } = await api.post('/api/roletemplates', payload);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['role-templates'] });
        },
    });
}

export function useUpdateRoleTemplate() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, payload }: { id: number; payload: CreateRoleTemplatePayload }) => {
            const { data } = await api.put(`/api/roletemplates/${id}`, payload);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['role-templates'] });
        },
    });
}

export function useDeleteRoleTemplate() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: number) => {
            await api.delete(`/api/roletemplates/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['role-templates'] });
        },
    });
}
