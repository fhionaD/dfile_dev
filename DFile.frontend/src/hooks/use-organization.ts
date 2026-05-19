import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Employee } from '@/types/asset';
import { toast } from 'sonner';

interface CreateEmployeePayload {
    firstName: string;
    middleName?: string;
    lastName: string;
    email: string;
    contactNumber: string;
    address?: string;
    role: string;
    hireDate: string;
}

interface UpdateEmployeePayload extends CreateEmployeePayload {
    status: string;
}

export function useEmployees(showArchived: boolean = false) {
    return useQuery({
        queryKey: ['employees', showArchived],
        queryFn: async () => {
            const { data } = await api.get<Employee[]>('/api/Employees', {
                params: { showArchived }
            });
            return data;
        },
    });
}

export function useAddEmployee() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload: CreateEmployeePayload) => {
            const { data } = await api.post<Employee>('/api/Employees', payload);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['employees'] });
            toast.success('Activation email has been sent');
        },
        onError: (error: unknown) => {
            const data = (error as { response?: { data?: { message?: string; title?: string; errors?: Record<string, string[]> } } })?.response?.data;
            if (data?.message) {
                toast.error(data.message);
            } else if (data?.errors) {
                const first = Object.values(data.errors).flat()[0];
                toast.error(first ?? data.title ?? 'Failed to add employee');
            } else {
                toast.error(data?.title ?? 'Failed to add employee');
            }
        },
    });
}

export function useUpdateEmployee() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, payload }: { id: string; payload: UpdateEmployeePayload }) => {
            const { data } = await api.put<Employee>(`/api/Employees/${id}`, payload);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['employees'] });
            toast.success('Employee updated successfully');
        },
        onError: (error: unknown) => {
            const data = (error as { response?: { data?: { message?: string; title?: string; errors?: Record<string, string[]> } } })?.response?.data;
            if (data?.message) {
                toast.error(data.message);
            } else if (data?.errors) {
                const first = Object.values(data.errors).flat()[0];
                toast.error(first ?? data.title ?? 'Failed to update employee');
            } else {
                toast.error(data?.title ?? 'Failed to update employee');
            }
        },
    });
}

export function useArchiveEmployee() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            await api.put(`/api/Employees/archive/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['employees'] });
            toast.success('Employee archived');
        },
        onError: () => {
            toast.error('Failed to archive employee');
        },
    });
}

export function useRestoreEmployee() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            await api.put(`/api/Employees/restore/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['employees'] });
            toast.success('Employee restored');
        },
        onError: () => {
            toast.error('Failed to restore employee');
        },
    });
}
