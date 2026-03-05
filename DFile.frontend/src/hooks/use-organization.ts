import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Role, Employee, Department } from '@/types/asset';
import { toast } from 'sonner';

interface CreateRolePayload {
    designation: string;
    department: string;
    scope: string;
}

interface CreateDepartmentPayload {
    name: string;
    description: string;
    head: string;
}

interface CreateEmployeePayload {
    firstName: string;
    middleName?: string;
    lastName: string;
    email: string;
    contactNumber: string;
    department: string;
    role: string;
    hireDate: string;
}

interface UpdateEmployeePayload extends CreateEmployeePayload {
    status: string;
}

export function useRoles(showArchived: boolean = false) {
    return useQuery({
        queryKey: ['roles', showArchived],
        queryFn: async () => {
            const { data } = await api.get<Role[]>('/api/Roles', {
                params: { showArchived }
            });
            return data;
        },
    });
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

export function useDepartments(showArchived: boolean = false) {
    return useQuery({
        queryKey: ['departments', showArchived],
        queryFn: async () => {
            const { data } = await api.get<Department[]>('/api/Departments', {
                params: { showArchived }
            });
            return data;
        },
    });
}

export function useAddRole() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload: CreateRolePayload) => {
            const { data } = await api.post<Role>('/api/Roles', payload);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['roles'] });
            toast.success('Role added successfully');
        },
        onError: () => {
            toast.error('Failed to add role');
        },
    });
}

export function useUpdateRole() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, payload }: { id: string; payload: CreateRolePayload }) => {
            const { data } = await api.put<Role>(`/api/Roles/${id}`, payload);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['roles'] });
            toast.success('Role updated successfully');
        },
        onError: () => {
            toast.error('Failed to update role');
        },
    });
}

export function useArchiveRole() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            await api.put(`/api/Roles/archive/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['roles'] });
            toast.success('Role archived');
        },
        onError: () => {
            toast.error('Failed to archive role');
        },
    });
}

export function useRestoreRole() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            await api.put(`/api/Roles/restore/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['roles'] });
            toast.success('Role restored');
        },
        onError: () => {
            toast.error('Failed to restore role');
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
            toast.success('Employee added successfully');
        },
        onError: () => {
            toast.error('Failed to add employee');
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
        onError: () => {
            toast.error('Failed to update employee');
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

export function useAddDepartment() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload: CreateDepartmentPayload) => {
            const { data } = await api.post<Department>('/api/Departments', payload);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['departments'] });
            toast.success('Department added successfully');
        },
        onError: () => {
            toast.error('Failed to add department');
        },
    });
}

export function useUpdateDepartment() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, payload }: { id: string; payload: CreateDepartmentPayload }) => {
            const { data } = await api.put<Department>(`/api/Departments/${id}`, payload);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['departments'] });
            toast.success('Department updated successfully');
        },
        onError: () => {
            toast.error('Failed to update department');
        },
    });
}

export function useArchiveDepartment() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            await api.put(`/api/Departments/archive/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['departments'] });
            toast.success('Department archived');
        },
        onError: () => {
            toast.error('Failed to archive department');
        },
    });
}

export function useRestoreDepartment() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            await api.put(`/api/Departments/restore/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['departments'] });
            toast.success('Department restored');
        },
        onError: () => {
            toast.error('Failed to restore department');
        },
    });
}
