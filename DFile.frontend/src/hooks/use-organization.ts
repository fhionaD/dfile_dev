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

let MOCK_EMPLOYEES: Employee[] = [
    { id: "EMP-001", firstName: "John", lastName: "Doe", email: "john@example.com", contactNumber: "555-0101", department: "IT", role: "Administrator", hireDate: "2023-01-15", status: "Active" },
    { id: "EMP-002", firstName: "Jane", lastName: "Smith", email: "jane@example.com", contactNumber: "555-0102", department: "Operations", role: "Maintenance Manager", hireDate: "2023-03-20", status: "Active" }
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
             // MOCK DATA ONLY
            await new Promise(resolve => setTimeout(resolve, 300));
            return [...MOCK_EMPLOYEES];
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
             // MOCK DATA ONLY
            await new Promise(resolve => setTimeout(resolve, 300));
            const newEmp = { ...employee, id: `EMP-MOCK-${Date.now()}` };
            MOCK_EMPLOYEES.push(newEmp);
            return newEmp;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['employees'] });
            toast.success('Employee added successfully (Mock)');
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
             // MOCK DATA ONLY
            await new Promise(resolve => setTimeout(resolve, 300));
             MOCK_EMPLOYEES = MOCK_EMPLOYEES.map(e => e.id === employee.id ? employee : e);
            return employee;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['employees'] });
            toast.success('Employee updated successfully (Mock)');
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
             // MOCK DATA ONLY
            await new Promise(resolve => setTimeout(resolve, 300));
            const emp = MOCK_EMPLOYEES.find(e => e.id === employeeId);
            if (emp) {
                emp.status = emp.status === "Archived" ? "Active" : "Archived";
            }
            return emp;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['employees'] });
            const message = data?.status === 'Archived' ? 'Employee archived (Mock)' : 'Employee restored (Mock)';
            toast.success(message);
        },
        onError: (error) => {
            console.error('Failed to change employee status:', error);
            toast.error('Failed to update employee status');
        },
    });
}
