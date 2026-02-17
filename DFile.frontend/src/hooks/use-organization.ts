import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Role, Employee, Department } from '@/types/asset'; // Ensure types are exported from here or correct path
import { toast } from 'sonner';

export function useRoles() {
    return useQuery({
        queryKey: ['roles'],
        queryFn: async () => {
            const { data } = await api.get<Role[]>('/api/roles');
            return data;
        },
    });
}

export function useEmployees() {
    return useQuery({
        queryKey: ['employees'],
        queryFn: async () => {
            const { data } = await api.get<Employee[]>('/api/employees');
            return data;
        },
    });
}

export function useDepartments() {
    return useQuery({
        queryKey: ['departments'],
        queryFn: async () => {
            const { data } = await api.get<Department[]>('/api/departments');
            return data;
        },
    });
}

export function useAddRole() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (role: Role) => {
            const { data } = await api.post<Role>('/api/roles', role);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['roles'] });
            toast.success('Role added successfully');
        },
        onError: (error) => {
            console.error('Failed to add role:', error);
            toast.error('Failed to add role');
        },
    });
}

export function useAddEmployee() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (employee: Employee) => {
            const { data } = await api.post<Employee>('/api/employees', employee);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['employees'] });
            toast.success('Employee added successfully');
        },
        onError: (error) => {
            console.error('Failed to add employee:', error);
            toast.error('Failed to add employee');
        },
    });
}

export function useUpdateEmployee() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (employee: Employee) => {
            const { data } = await api.put<Employee>(`/api/employees/${employee.id}`, employee);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['employees'] });
            toast.success('Employee updated successfully');
        },
        onError: (error) => {
            console.error('Failed to update employee:', error);
            toast.error('Failed to update employee');
        },
    });
}

export function useArchiveEmployee() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (employeeId: string) => {
            await api.delete(`/api/employees/${employeeId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['employees'] });
            toast.success('Employee archived');
        },
        onError: (error) => {
            console.error('Failed to archive employee:', error);
            toast.error('Failed to archive employee');
        },
    });
}
