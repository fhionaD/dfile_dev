"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { StatusText } from "@/components/ui/status-text";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Users, Plus, Search, Archive, RotateCcw, MoreHorizontal, Eye, Pencil, Shield } from "lucide-react";
import { useEmployees, useRoles, useDepartments, useAddEmployee, useUpdateEmployee, useArchiveEmployee, useRestoreEmployee } from "@/hooks/use-organization";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Employee } from "@/types/asset";

const AddEmployeeModal = dynamic(() => import("@/components/modals/add-employee-modal").then(m => ({ default: m.AddEmployeeModal })));
const EmployeeDetailsModal = dynamic(() => import("@/components/modals/employee-details-modal").then(m => ({ default: m.EmployeeDetailsModal })));
const ChangeRoleModal = dynamic(() => import("@/components/modals/change-role-modal").then(m => ({ default: m.ChangeRoleModal })));

export default function UsersPage() {
    const [showArchived, setShowArchived] = useState(false);
    const { data: employees = [], isLoading } = useEmployees(showArchived);
    const { data: roles = [] } = useRoles();
    const { data: departments = [] } = useDepartments();

    const addMutation = useAddEmployee();
    const updateMutation = useUpdateEmployee();
    const archiveMutation = useArchiveEmployee();
    const restoreMutation = useRestoreEmployee();

    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [archiveTarget, setArchiveTarget] = useState<string | null>(null);
    const [roleChangeTarget, setRoleChangeTarget] = useState<Employee | null>(null);

    const filtered = employees.filter(e => {
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            return (
                e.firstName.toLowerCase().includes(q) ||
                e.lastName.toLowerCase().includes(q) ||
                e.email.toLowerCase().includes(q) ||
                e.department.toLowerCase().includes(q) ||
                e.role.toLowerCase().includes(q)
            );
        }
        return true;
    });

    const handleEmployeeClick = (emp: Employee) => {
        setSelectedEmployee(emp);
        setIsDetailsOpen(true);
    };

    const handleEdit = (emp: Employee) => {
        setSelectedEmployee(emp);
        setIsDetailsOpen(false);
        setIsAddOpen(true);
    };

    const handleSave = async (emp: Employee) => {
        const payload = {
            firstName: emp.firstName,
            middleName: emp.middleName,
            lastName: emp.lastName,
            email: emp.email,
            contactNumber: emp.contactNumber,
            department: emp.department,
            role: emp.role,
            hireDate: emp.hireDate,
        };
        if (selectedEmployee && selectedEmployee.id === emp.id) {
            await updateMutation.mutateAsync({ id: emp.id, payload: { ...payload, status: emp.status } });
        } else {
            await addMutation.mutateAsync(payload);
        }
        setIsAddOpen(false);
        setSelectedEmployee(null);
    };

    const statusVariant: Record<string, "success" | "muted" | "danger"> = {
        Active: "success",
        Inactive: "muted",
        Archived: "danger",
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Users className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                    <h1 className="text-xl font-semibold tracking-tight">Users</h1>
                    <p className="text-sm text-muted-foreground">Manage personnel in your organization</p>
                </div>
                <Button onClick={() => { setSelectedEmployee(null); setIsAddOpen(true); }} className="gap-2">
                    <Plus className="h-4 w-4" /> Add User
                </Button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold">{showArchived ? "Archived Users" : "Active Users"}</h2>
                    <span className="text-sm text-muted-foreground">({filtered.length})</span>
                </div>
                <div className="flex gap-2">
                    <div className="relative flex-1 sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Search users..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
                    </div>
                    <Button variant="outline" size="icon" onClick={() => setShowArchived(!showArchived)} aria-label={showArchived ? "Show active" : "Show archived"}>
                        {showArchived ? <RotateCcw className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                    </Button>
                </div>
            </div>

            {isLoading ? (
                <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground rounded-md border">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <p>{showArchived ? "No archived users" : "No users found"}</p>
                </div>
            ) : (
                <div className="rounded-md border overflow-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Department</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="w-[80px] text-center">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.map(emp => (
                                <TableRow key={emp.id}>
                                    <TableCell className="font-medium">{emp.firstName} {emp.lastName}</TableCell>
                                    <TableCell className="text-sm text-muted-foreground">{emp.email}</TableCell>
                                    <TableCell>{emp.department}</TableCell>
                                    <TableCell>{emp.role}</TableCell>
                                    <TableCell><StatusText variant={statusVariant[emp.status] ?? "muted"}>{emp.status}</StatusText></TableCell>
                                    <TableCell className="text-center">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Actions">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-40">
                                                <DropdownMenuItem onClick={() => handleEmployeeClick(emp)} className="gap-2 cursor-pointer">
                                                    <Eye className="h-4 w-4" /> View
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleEdit(emp)} className="gap-2 cursor-pointer">
                                                    <Pencil className="h-4 w-4" /> Edit
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => setRoleChangeTarget(emp)} className="gap-2 cursor-pointer">
                                                    <Shield className="h-4 w-4" /> Change Role
                                                </DropdownMenuItem>
                                                {emp.status !== "Archived" ? (
                                                    <DropdownMenuItem onClick={() => setArchiveTarget(emp.id)} className="gap-2 cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10">
                                                        <Archive className="h-4 w-4" /> Archive
                                                    </DropdownMenuItem>
                                                ) : (
                                                    <DropdownMenuItem onClick={() => restoreMutation.mutateAsync(emp.id)} className="gap-2 cursor-pointer">
                                                        <RotateCcw className="h-4 w-4" /> Restore
                                                    </DropdownMenuItem>
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}

            <AddEmployeeModal
                open={isAddOpen}
                onOpenChange={(open) => { setIsAddOpen(open); if (!open) setSelectedEmployee(null); }}
                departments={departments}
                roles={roles}
                onAddEmployee={handleSave}
                initialData={selectedEmployee}
            />

            <EmployeeDetailsModal
                open={isDetailsOpen}
                onOpenChange={setIsDetailsOpen}
                employee={selectedEmployee}
                onEdit={handleEdit}
            />

            <ChangeRoleModal
                open={roleChangeTarget !== null}
                onOpenChange={(open) => { if (!open) setRoleChangeTarget(null); }}
                employee={roleChangeTarget}
                roles={roles}
                onSave={async (employeeId, newRole) => {
                    const emp = employees.find(e => e.id === employeeId);
                    if (!emp) return;
                    await updateMutation.mutateAsync({
                        id: employeeId,
                        payload: {
                            firstName: emp.firstName,
                            middleName: emp.middleName,
                            lastName: emp.lastName,
                            email: emp.email,
                            contactNumber: emp.contactNumber,
                            department: emp.department,
                            role: newRole,
                            hireDate: emp.hireDate,
                            status: emp.status,
                        },
                    });
                    setRoleChangeTarget(null);
                }}
                isPending={updateMutation.isPending}
            />

            <ConfirmDialog
                open={archiveTarget !== null}
                onOpenChange={(open) => { if (!open) setArchiveTarget(null); }}
                title="Archive User"
                description="Are you sure you want to archive this user? They can be restored later from the archive view."
                confirmLabel="Archive"
                confirmVariant="destructive"
                onConfirm={async () => {
                    if (archiveTarget) {
                        await archiveMutation.mutateAsync(archiveTarget);
                        setArchiveTarget(null);
                    }
                }}
                isLoading={archiveMutation.isPending}
            />
        </div>
    );
}
