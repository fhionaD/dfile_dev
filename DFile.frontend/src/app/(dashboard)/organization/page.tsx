"use client";

import { useState } from "react";
import { RolesDashboard } from "@/components/roles-dashboard";
import { CreateRoleModal } from "@/components/modals/create-role-modal";
import { AddEmployeeModal } from "@/components/modals/add-employee-modal";
import { EmployeeDetailsModal } from "@/components/modals/employee-details-modal";
import { useData } from "@/contexts/data-context";
import { Employee } from "@/types/asset";

export default function OrganizationPage() {
    const {
        roles,
        employees,
        departments,
        addRole,
        addEmployee,
        archiveEmployee
    } = useData();

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

    const handleAddEmployee = (employee: Employee) => {
        addEmployee(employee);
        setIsEmployeeModalOpen(false);
        // If editing, clear selection ? or keep it? AppShell implementation cleared it
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
                onArchiveEmployee={archiveEmployee}
            />

            <CreateRoleModal
                open={isRoleModalOpen}
                onOpenChange={setIsRoleModalOpen}
                onSave={addRole}
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
