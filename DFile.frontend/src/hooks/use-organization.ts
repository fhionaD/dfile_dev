import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Role, Employee } from '@/types/asset';
import { toast } from 'sonner';
import axios from 'axios';

// Fixed roles for the organization
let MOCK_ROLES: Role[] = [
    { id: "RL-FM", designation: "Finance Manager", scope: "Financial planning, asset depreciation, and procurement approval.", status: "Active" },
    { id: "RL-MM", designation: "Maintenance Manager", scope: "Asset maintenance scheduling, repair tracking, and facility management.", status: "Active" }
];

export function useRoles() {
    return useQuery({
        queryKey: ['roles'],
        queryFn: async () => {
            // Fixed roles
            await new Promise(resolve => setTimeout(resolve, 300));
            return [...MOCK_ROLES];
        },
    });
}

export function useEmployees() {
    return useQuery({
        queryKey: ['employees'],
        queryFn: async () => {
            const { data } = await api.get<Employee[]>('/api/Employees');
            return data;
        },
    });
}

export function useAddRole() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (role: Role) => {
            // No longer allowing dynamic role creation
            return role;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['roles'] });
            toast.info('Role system is now fixed. Custom roles cannot be added.');
        },
    });
}

export function useAddEmployee() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (employee: Employee) => {
            const { data } = await api.post<{ employee: Employee, temporaryPassword: string }>('/api/Employees', employee);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['employees'] });
            toast.success('Employee added successfully');
        },
        onError: (error) => {
            console.error('Failed to add employee:', error);
            const message = axios.isAxiosError(error) && error.response?.data?.message
                ? error.response.data.message
                : 'Failed to add employee';
            toast.error(message);
        },
    });
}

export function useUpdateEmployee() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (employee: Employee) => {
            await api.put<Employee>(`/api/Employees/${employee.id}`, employee);
            return employee;
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
            // First fetch to clear status
            const { data: emp } = await api.get<Employee>(`/api/Employees/${employeeId}`);
            if (emp.status === "Archived") {
                await api.put(`/api/Employees/restore/${employeeId}`);
                emp.status = "Active";
            } else {
                await api.put(`/api/Employees/archive/${employeeId}`);
                emp.status = "Archived";
            }
            return emp;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['employees'] });
            const message = data?.status === 'Archived' ? 'Employee archived' : 'Employee restored';
            toast.success(message);
        },
        onError: (error) => {
            console.error('Failed to change employee status:', error);
            toast.error('Failed to update employee status');
        },
    });
}

export function useResetPassword() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (employeeId: string) => {
            const { data } = await api.post<{ temporaryPassword: string }>(`/api/Employees/${employeeId}/reset-password`, {});
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['employees'] });
            toast.success('Password reset successfully');
        },
        onError: (error) => {
            console.error('Failed to reset password:', error);
            toast.error('Failed to reset password');
        },
    });
}

export function useDeleteEmployee() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (employeeId: string) => {
            await api.delete(`/api/Employees/${employeeId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['employees'] });
            toast.success('Employee deleted from system');
        },
        onError: (error) => {
            console.error('Failed to delete employee:', error);
            toast.error('Failed to delete employee');
        },
    });
}
