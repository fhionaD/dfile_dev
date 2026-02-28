"use client";

import { useState } from "react";
import { RolesDashboard } from "@/components/roles-dashboard";
import { AddEmployeeModal } from "@/components/modals/add-employee-modal";
import { EmployeeDetailsModal } from "@/components/modals/employee-details-modal";
import { PasswordDisplayModal } from "@/components/modals/password-display-modal";
import { useRoles, useEmployees, useAddEmployee, useArchiveEmployee, useUpdateEmployee, useResetPassword } from "@/hooks/use-organization";
import { useAuth } from "@/contexts/auth-context";
import { Employee, Role } from "@/types/asset";

export default function OrganizationPage() {
    const { user } = useAuth();
    const { data: roles = [] } = useRoles();
    const { data: employees = [] } = useEmployees();

    const addEmployeeMutation = useAddEmployee();
    const updateEmployeeMutation = useUpdateEmployee();
    const archiveEmployeeMutation = useArchiveEmployee();
    const resetPasswordMutation = useResetPassword();

    const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
    const [isEmployeeDetailsOpen, setIsEmployeeDetailsOpen] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [tempPassword, setTempPassword] = useState("");

    const handleEmployeeClick = (employee: Employee) => {
        setSelectedEmployee(employee);
        setIsEmployeeDetailsOpen(true);
    };

    const handleEditEmployee = (employee: Employee) => {
        setSelectedEmployee(employee);
        setIsEmployeeDetailsOpen(false);
        setIsEmployeeModalOpen(true);
    };

    const handleResetPassword = async (employee: Employee) => {
        const result = await resetPasswordMutation.mutateAsync(employee.id);
        if (result && result.temporaryPassword) {
            setTempPassword(result.temporaryPassword);
            setIsEmployeeDetailsOpen(false);
            setIsPasswordModalOpen(true);
        }
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
            const result = await addEmployeeMutation.mutateAsync(employee);
            if (result && result.temporaryPassword) {
                setTempPassword(result.temporaryPassword);
                setIsPasswordModalOpen(true);
            }
        }

        setIsEmployeeModalOpen(false);
        if (selectedEmployee) setSelectedEmployee(null);
    };

    return (
        <>
            <RolesDashboard
                roles={roles}
                employees={employees}
                onAddPersonnel={() => setIsEmployeeModalOpen(true)}
                onEmployeeClick={handleEmployeeClick}
                onArchiveEmployee={async (id) => await archiveEmployeeMutation.mutateAsync(id)}
            />

            <AddEmployeeModal
                open={isEmployeeModalOpen}
                onOpenChange={(open) => {
                    setIsEmployeeModalOpen(open);
                    if (!open) setSelectedEmployee(null);
                }}
                roles={roles}
                onAddEmployee={handleAddEmployee}
                initialData={selectedEmployee}
            />

            <EmployeeDetailsModal
                open={isEmployeeDetailsOpen}
                onOpenChange={setIsEmployeeDetailsOpen}
                employee={selectedEmployee}
                onEdit={handleEditEmployee}
                onResetPassword={handleResetPassword}
            />

            <PasswordDisplayModal
                open={isPasswordModalOpen}
                onOpenChange={setIsPasswordModalOpen}
                password={tempPassword}
                onClose={() => setIsPasswordModalOpen(false)}
            />
        </>
    );
}
