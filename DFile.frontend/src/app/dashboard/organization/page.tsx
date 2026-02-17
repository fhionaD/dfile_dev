"use client";

import { useState } from "react";
import { RolesDashboard } from "@/components/roles-dashboard";
import { CreateRoleModal } from "@/components/modals/create-role-modal";
import { AddEmployeeModal } from "@/components/modals/add-employee-modal";
import { EmployeeDetailsModal } from "@/components/modals/employee-details-modal";
import { useRoles, useEmployees, useDepartments, useAddRole, useAddEmployee, useArchiveEmployee, useUpdateEmployee } from "@/hooks/use-organization";
import { Employee } from "@/types/asset";

export default function OrganizationPage() {
    const { data: roles = [] } = useRoles();
    const { data: employees = [] } = useEmployees();
    const { data: departments = [] } = useDepartments();

    const addRoleMutation = useAddRole();
    const addEmployeeMutation = useAddEmployee();
    const updateEmployeeMutation = useUpdateEmployee();
    const archiveEmployeeMutation = useArchiveEmployee();

    const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
    const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
    const [isEmployeeDetailsOpen, setIsEmployeeDetailsOpen] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

    const handleEmployeeClick = (employee: Employee) => {
        setSelectedEmployee(employee);
        setIsEmployeeDetailsOpen(true);
    };

    const handleEditEmployee = (employee: Employee) => {
        setSelectedEmployee(employee);
        setIsEmployeeDetailsOpen(false);
        setIsEmployeeModalOpen(true);
    };

    const handleAddEmployee = async (employee: Employee) => {
        // Check if editing or adding. 
        // The AddEmployeeModal usually returns a full employee object.
        // If we are editing, we should probably use updateEmployeeMutation.
        // But existing code just called addEmployee(employee).
        // Let's check logic: usage of handleAddEmployee in AddEmployeeModal. 
        // If it's an edit, we need ID.
        // Let's assume AddEmployeeModal handles logic to populate ID if editing?
        // Or we should check if employee.id exists in current employees list?
        // Reuse selectedEmployee to check?
        // Existing code: "if (selectedEmployee) setSelectedEmployee(null);"

        if (selectedEmployee && selectedEmployee.id === employee.id) {
            await updateEmployeeMutation.mutateAsync(employee);
        } else {
            await addEmployeeMutation.mutateAsync(employee);
        }

        setIsEmployeeModalOpen(false);
        if (selectedEmployee) setSelectedEmployee(null);
    };

    return (
        <>
            <RolesDashboard
                roles={roles}
                employees={employees}
                onOpenModal={() => setIsRoleModalOpen(true)}
                onAddPersonnel={() => setIsEmployeeModalOpen(true)}
                onEmployeeClick={handleEmployeeClick}
                onArchiveEmployee={async (id) => await archiveEmployeeMutation.mutateAsync(id)}
            />

            <CreateRoleModal
                open={isRoleModalOpen}
                onOpenChange={setIsRoleModalOpen}
                onSave={async (role) => await addRoleMutation.mutateAsync(role)}
            />

            <AddEmployeeModal
                open={isEmployeeModalOpen}
                onOpenChange={(open) => {
                    setIsEmployeeModalOpen(open);
                    if (!open) setSelectedEmployee(null);
                }}
                departments={departments}
                roles={roles}
                onAddEmployee={handleAddEmployee}
                initialData={selectedEmployee}
            />

            <EmployeeDetailsModal
                open={isEmployeeDetailsOpen}
                onOpenChange={setIsEmployeeDetailsOpen}
                employee={selectedEmployee}
                onEdit={handleEditEmployee}
            />
        </>
    );
}
