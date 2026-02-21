import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Role, Employee, Department } from '@/types/asset'; // Ensure types are exported from here or correct path
import { toast } from 'sonner';

// In-memory store for session
let MOCK_ROLES: Role[] = [
    { id: "RL-01", designation: "Administrator", department: "IT", scope: "System Wide", status: "Active" },
    { id: "RL-02", designation: "Maintenance Manager", department: "Operations", scope: "Maintenance Module", status: "Active" },
    { id: "RL-03", designation: "Procurement Officer", department: "Finance", scope: "Procurement Module", status: "Active" }
];

let MOCK_DEPARTMENTS: Department[] = [
    { id: "D-01", name: "IT", description: "Information Technology", head: "John Doe", itemCount: 15, status: "Active" },
    { id: "D-02", name: "Operations", description: "Facility Operations", head: "Jane Smith", itemCount: 42, status: "Active" },
    { id: "D-03", name: "Finance", description: "Financial Planning", head: "Bob Finance", itemCount: 8, status: "Active" }
];

export function useRoles() {
    return useQuery({
        queryKey: ['roles'],
        queryFn: async () => {
             // MOCK DATA ONLY
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

export function useDepartments() {
    return useQuery({
        queryKey: ['departments'],
        queryFn: async () => {
             // MOCK DATA ONLY
            await new Promise(resolve => setTimeout(resolve, 300));
            return [...MOCK_DEPARTMENTS];
        },
    });
}

export function useAddRole() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (role: Role) => {
             // MOCK DATA ONLY
            await new Promise(resolve => setTimeout(resolve, 300));
            const newRole = { ...role, id: `RL-MOCK-${Date.now()}` };
            MOCK_ROLES.push(newRole);
            return newRole;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['roles'] });
            toast.success('Role added successfully (Mock)');
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
            const { data } = await api.post<Employee>('/api/Employees', employee);
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
