"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { Building2, ShieldCheck, Users, Plus, Archive, RotateCcw, Layers, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    ArchiveViewToggleButton,
    DataTablePrimaryButton,
    DataTableSearch,
    DataTableToolbar,
} from "@/components/data-table/data-table-toolbar";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { TablePagination, paginateData } from "@/components/ui/table-pagination";
import { Employee } from "@/types/asset";
import {
    useRoles, useDepartments, useEmployees,
    useAddRole, useUpdateRole, useArchiveRole, useRestoreRole,
    useAddDepartment, useUpdateDepartment,
    useAddEmployee, useUpdateEmployee, useArchiveEmployee, useRestoreEmployee,
} from "@/hooks/use-organization";

const AddEmployeeModal = dynamic(() => import("@/components/modals/add-employee-modal").then(m => ({ default: m.AddEmployeeModal })));
const EmployeeDetailsModal = dynamic(() => import("@/components/modals/employee-details-modal").then(m => ({ default: m.EmployeeDetailsModal })));

export default function OrganizationPage() {
    const [activeTab, setActiveTab] = useState("roles");

    // ── Roles state ──
    const [roleShowArchived, setRoleShowArchived] = useState(false);
    const { data: rolesActive = [], isLoading: loadingRolesActive } = useRoles(false);
    const { data: rolesArchived = [], isLoading: loadingRolesArchived } = useRoles(true);
    const roles = roleShowArchived ? rolesArchived : rolesActive;
    const rolesLoading = loadingRolesActive || loadingRolesArchived;
    const { data: allDepartments = [] } = useDepartments(false);
    const addRoleMutation = useAddRole();
    const updateRoleMutation = useUpdateRole();
    const archiveRoleMutation = useArchiveRole();
    const restoreRoleMutation = useRestoreRole();
    const addDeptMutation = useAddDepartment();
    const updateDeptMutation = useUpdateDepartment();
    const [roleSearch, setRoleSearch] = useState("");
    const [roleArchiveTarget, setRoleArchiveTarget] = useState<string | null>(null);
    const [rolePageIndex, setRolePageIndex] = useState(0);
    const [rolePageSize, setRolePageSize] = useState(10);

    // ── Unified "Define Personnel Role" state (create) ──
    const [isUnifiedFormOpen, setIsUnifiedFormOpen] = useState(false);
    const [isCreatingNewDept, setIsCreatingNewDept] = useState(false);
    const [unifiedForm, setUnifiedForm] = useState({ designation: "", departmentId: "", newDeptName: "", description: "", head: "" });

    // ── Role edit state ──
    const [isRoleFormOpen, setIsRoleFormOpen] = useState(false);
    const [editingRole, setEditingRole] = useState<{ id: string; designation: string; department?: string; scope: string } | null>(null);
    const [roleForm, setRoleForm] = useState({ designation: "", departmentId: "", description: "", head: "" });
    const [isEditCreatingNewDept, setIsEditCreatingNewDept] = useState(false);
    const [editNewDeptName, setEditNewDeptName] = useState("");

    // ── Personnel state ──
    const [empShowArchived, setEmpShowArchived] = useState(false);
    const { data: employeesActive = [], isLoading: loadingEmpActive } = useEmployees(false);
    const { data: employeesArchived = [], isLoading: loadingEmpArchived } = useEmployees(true);
    const employees = empShowArchived ? employeesArchived : employeesActive;
    const empLoading = loadingEmpActive || loadingEmpArchived;
    const addEmpMutation = useAddEmployee();
    const updateEmpMutation = useUpdateEmployee();
    const archiveEmpMutation = useArchiveEmployee();
    const restoreEmpMutation = useRestoreEmployee();
    const [empSearch, setEmpSearch] = useState("");
    const [empArchiveTarget, setEmpArchiveTarget] = useState<string | null>(null);
    const [isAddEmpOpen, setIsAddEmpOpen] = useState(false);
    const [isEmpDetailsOpen, setIsEmpDetailsOpen] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [empPageIndex, setEmpPageIndex] = useState(0);
    const [empPageSize, setEmpPageSize] = useState(10);

    // ── Roles filtered list ──
    const filteredRoles = useMemo(() => {
        if (!roleSearch) return roles;
        const q = roleSearch.toLowerCase();
        return roles.filter(r =>
            r.designation?.toLowerCase().includes(q) || r.department?.toLowerCase().includes(q) || r.scope?.toLowerCase().includes(q)
        );
    }, [roles, roleSearch]);

    // ── Personnel filtered list ──
    const filteredEmps = useMemo(() => {
        if (!empSearch) return employees;
        const q = empSearch.toLowerCase();
        return employees.filter(e =>
            e.firstName.toLowerCase().includes(q) ||
            e.lastName.toLowerCase().includes(q) ||
            e.email.toLowerCase().includes(q) ||
            e.department.toLowerCase().includes(q) ||
            e.role.toLowerCase().includes(q)
        );
    }, [employees, empSearch]);

    // ── Unified "Define Personnel Role" handler ──
    const openUnifiedCreate = () => {
        setIsCreatingNewDept(allDepartments.length === 0);
        setUnifiedForm({ designation: "", departmentId: "", newDeptName: "", description: "", head: "" });
        setIsUnifiedFormOpen(true);
    };
    const handleUnifiedSave = async () => {
        if (!unifiedForm.designation.trim()) return;

        let departmentId = unifiedForm.departmentId;

        if (isCreatingNewDept) {
            const deptName = unifiedForm.newDeptName.trim();
            if (!deptName) return;
            const existing = allDepartments.find(d => d.name.toLowerCase() === deptName.toLowerCase());
            if (existing) {
                departmentId = existing.id;
            } else {
                const newDept = await addDeptMutation.mutateAsync({ name: deptName, description: "", head: "" });
                departmentId = newDept.id;
            }
        }

        if (!departmentId) return;
        await addRoleMutation.mutateAsync({ designation: unifiedForm.designation, department: departmentId, scope: unifiedForm.description });
        setIsUnifiedFormOpen(false);
    };

    // ── Role edit handlers ──
    const openRoleEdit = (role: { id: string; designation: string; department?: string; scope: string }) => {
        setEditingRole(role);
        setRoleForm({ designation: role.designation, departmentId: role.department || "", description: role.scope, head: "" });
        setIsEditCreatingNewDept(false);
        setEditNewDeptName("");
        setIsRoleFormOpen(true);
    };
    const handleRoleSave = async () => {
        if (!roleForm.designation.trim() || !editingRole) return;

        let departmentId = roleForm.departmentId;

        if (isEditCreatingNewDept) {
            const deptName = editNewDeptName.trim();
            if (!deptName) return;
            const existing = allDepartments.find(d => d.name.toLowerCase() === deptName.toLowerCase());
            if (existing) {
                departmentId = existing.id;
            } else {
                const newDept = await addDeptMutation.mutateAsync({ name: deptName, description: "", head: "" });
                departmentId = newDept.id;
            }
        }

        await updateRoleMutation.mutateAsync({ id: editingRole.id, payload: { designation: roleForm.designation, department: departmentId, scope: roleForm.description } });
        setIsRoleFormOpen(false);
    };

    // ── Personnel handlers ──
    const handleEmployeeClick = (emp: Employee) => {
        setSelectedEmployee(emp);
        setIsEmpDetailsOpen(true);
    };
    const handleEmpEdit = (emp: Employee) => {
        setSelectedEmployee(emp);
        setIsEmpDetailsOpen(false);
        setIsAddEmpOpen(true);
    };
    const handleEmpSave = async (emp: Employee) => {
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
            await updateEmpMutation.mutateAsync({ id: emp.id, payload: { ...payload, status: emp.status } });
        } else {
            await addEmpMutation.mutateAsync(payload);
        }
        setIsAddEmpOpen(false);
        setSelectedEmployee(null);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                    <h1 className="text-xl font-semibold tracking-tight">Organization Structure</h1>
                    <p className="text-sm text-muted-foreground">Manage roles and personnel in one place</p>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2 max-w-md">
                    <TabsTrigger value="roles" className="gap-2">
                        <ShieldCheck className="h-4 w-4" /> Roles
                    </TabsTrigger>
                    <TabsTrigger value="personnel" className="gap-2">
                        <Users className="h-4 w-4" /> Personnel
                    </TabsTrigger>
                </TabsList>

                {/* ════════════  ROLES TAB  ════════════ */}
                <TabsContent value="roles" className="mt-4 space-y-4">
                    <div className="overflow-hidden rounded-md border">
                        <DataTableToolbar
                            left={
                                <DataTableSearch
                                    value={roleSearch}
                                    onChange={setRoleSearch}
                                    placeholder="Search roles..."
                                    ariaLabel="Search roles"
                                />
                            }
                            right={
                                <>
                                    <DataTablePrimaryButton onClick={openUnifiedCreate}>
                                        <Plus className="mr-2 h-4 w-4" />
                                        Define Role
                                    </DataTablePrimaryButton>
                                    <ArchiveViewToggleButton
                                        showArchived={roleShowArchived}
                                        onToggle={() => setRoleShowArchived(!roleShowArchived)}
                                        activeCount={rolesActive.length}
                                        archivedCount={rolesArchived.length}
                                    />
                                </>
                            }
                        />

                        {rolesLoading ? (
                            <div className="space-y-3 p-6">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
                        ) : filteredRoles.length === 0 ? (
                            <div className="flex min-h-[520px] flex-col items-center justify-center py-12 text-center text-muted-foreground">
                                <ShieldCheck className="mx-auto mb-4 h-12 w-12 opacity-20" />
                                <p>{roleShowArchived ? "No archived roles" : "No roles found"}</p>
                                {!roleShowArchived && <p className="mt-1 text-xs">Define a role to get started</p>}
                            </div>
                        ) : (
                            <>
                                <div className="overflow-x-auto">
                                    <Table className="w-full table-fixed">
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-[22%]">Designation</TableHead>
                                                <TableHead className="w-[22%]">Department</TableHead>
                                                <TableHead className="w-[40%]">Description</TableHead>
                                                <TableHead className="w-[120px] text-center">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {paginateData(filteredRoles, rolePageIndex, rolePageSize).map(r => (
                                                <TableRow key={r.id}>
                                                    <TableCell className="max-w-0 font-medium">
                                                        <button type="button" className="block w-full truncate text-left text-primary hover:underline" onClick={() => openRoleEdit(r)}>{r.designation}</button>
                                                    </TableCell>
                                                    <TableCell className="max-w-0">
                                                        <span className="block truncate">{r.department}</span>
                                                    </TableCell>
                                                    <TableCell className="max-w-0 text-sm text-muted-foreground">
                                                        <span className="block truncate">{r.scope}</span>
                                                    </TableCell>
                                                    <TableCell className="w-[120px] text-center">
                                                {roleShowArchived ? (
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600 hover:bg-emerald-500/10" title="Restore" onClick={() => restoreRoleMutation.mutateAsync(r.id)}>
                                                        <RotateCcw className="h-4 w-4" />
                                                    </Button>
                                                ) : (
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" title="Archive" onClick={() => setRoleArchiveTarget(r.id)}>
                                                        <Archive className="h-4 w-4" />
                                                    </Button>
                                                )}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                                <TablePagination
                                    totalItems={filteredRoles.length}
                                    pageSize={rolePageSize}
                                    pageIndex={rolePageIndex}
                                    onPageChange={setRolePageIndex}
                                    onPageSizeChange={setRolePageSize}
                                />
                            </>
                        )}
                    </div>
                </TabsContent>

                {/* ════════════  PERSONNEL TAB  ════════════ */}
                <TabsContent value="personnel" className="mt-4 space-y-4">
                    <div className="overflow-hidden rounded-md border">
                        <DataTableToolbar
                            left={
                                <DataTableSearch
                                    value={empSearch}
                                    onChange={setEmpSearch}
                                    placeholder="Search personnel..."
                                    ariaLabel="Search personnel"
                                />
                            }
                            right={
                                <>
                                    <DataTablePrimaryButton onClick={() => { setSelectedEmployee(null); setIsAddEmpOpen(true); }}>
                                        <Plus className="mr-2 h-4 w-4" />
                                        Add Personnel
                                    </DataTablePrimaryButton>
                                    <ArchiveViewToggleButton
                                        showArchived={empShowArchived}
                                        onToggle={() => setEmpShowArchived(!empShowArchived)}
                                        activeCount={employeesActive.length}
                                        archivedCount={employeesArchived.length}
                                    />
                                </>
                            }
                        />

                        {empLoading ? (
                            <div className="space-y-3 p-6">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
                        ) : filteredEmps.length === 0 ? (
                            <div className="flex min-h-[520px] flex-col items-center justify-center py-12 text-center text-muted-foreground">
                                <Users className="mx-auto mb-4 h-12 w-12 opacity-20" />
                                <p>{empShowArchived ? "No archived personnel" : "No personnel found"}</p>
                                {!empShowArchived && <p className="mt-1 text-xs">Define roles first, then register personnel</p>}
                            </div>
                        ) : (
                            <>
                                <div className="overflow-x-auto">
                                    <Table className="w-full table-fixed">
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-[20%]">Name</TableHead>
                                                <TableHead className="w-[26%]">Email</TableHead>
                                                <TableHead className="w-[18%]">Department</TableHead>
                                                <TableHead className="w-[18%]">Role</TableHead>
                                                <TableHead className="w-[120px] text-center">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {paginateData(filteredEmps, empPageIndex, empPageSize).map(emp => (
                                                <TableRow key={emp.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleEmployeeClick(emp)}>
                                                    <TableCell className="max-w-0 font-medium">
                                                        <span className="block truncate">{emp.firstName} {emp.lastName}</span>
                                                    </TableCell>
                                                    <TableCell className="max-w-0 text-sm text-muted-foreground">
                                                        <span className="block truncate">{emp.email}</span>
                                                    </TableCell>
                                                    <TableCell className="max-w-0">
                                                        <span className="block truncate">{emp.department}</span>
                                                    </TableCell>
                                                    <TableCell className="max-w-0">
                                                        <span className="block truncate">{emp.role}</span>
                                                    </TableCell>
                                                    <TableCell className="w-[120px] text-center" onClick={(e) => e.stopPropagation()}>
                                                {empShowArchived ? (
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600 hover:bg-emerald-500/10" title="Restore" onClick={() => restoreEmpMutation.mutateAsync(emp.id)}>
                                                        <RotateCcw className="h-4 w-4" />
                                                    </Button>
                                                ) : (
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" title="Archive" onClick={() => setEmpArchiveTarget(emp.id)}>
                                                        <Archive className="h-4 w-4" />
                                                    </Button>
                                                )}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                                <TablePagination
                                    totalItems={filteredEmps.length}
                                    pageSize={empPageSize}
                                    pageIndex={empPageIndex}
                                    onPageChange={setEmpPageIndex}
                                    onPageSizeChange={setEmpPageSize}
                                />
                            </>
                        )}
                    </div>
                </TabsContent>
            </Tabs>

            {/* ════════════  ROLE EDIT DIALOG  ════════════ */}
            <Dialog open={isRoleFormOpen} onOpenChange={setIsRoleFormOpen}>
                <DialogContent className="sm:max-w-[520px]">
                    <DialogHeader>
                        <DialogTitle>Edit Role</DialogTitle>
                        <DialogDescription>Update the role details below.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Designation <span className="text-destructive">*</span></Label>
                            <Input value={roleForm.designation} onChange={(e) => setRoleForm(f => ({ ...f, designation: e.target.value }))} placeholder="e.g. Senior Fleet Technician" />
                        </div>
                        <div className="space-y-2">
                            <Label>Department <span className="text-destructive">*</span></Label>
                            {isEditCreatingNewDept ? (
                                <div className="space-y-2">
                                    <Input value={editNewDeptName} onChange={(e) => setEditNewDeptName(e.target.value)} placeholder="New department name" />
                                                    {allDepartments.length > 0 && (
                                        <button type="button" className="text-xs text-primary hover:underline" onClick={() => setIsEditCreatingNewDept(false)}>
                                            Select existing department
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <Select value={roleForm.departmentId} onValueChange={(val) => {
                                    if (val === "__new__") {
                                        setIsEditCreatingNewDept(true);
                                    } else {
                                        setRoleForm(f => ({ ...f, departmentId: val }));
                                    }
                                }}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select department" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {allDepartments.map(d => (
                                            <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                                        ))}
                                        <SelectItem value="__new__">+ Create New Department</SelectItem>
                                    </SelectContent>
                                </Select>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label>Scope of Responsibility</Label>
                            <Input value={roleForm.description} onChange={(e) => setRoleForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe primary duties" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsRoleFormOpen(false)}>Cancel</Button>
                        <Button onClick={handleRoleSave} disabled={updateRoleMutation.isPending || addDeptMutation.isPending}>
                            Update
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ════════════  UNIFIED "DEFINE PERSONNEL ROLE" DIALOG  ════════════ */}
            <Dialog open={isUnifiedFormOpen} onOpenChange={setIsUnifiedFormOpen}>
                <DialogContent className="sm:max-w-[520px]">
                    <DialogHeader>
                        <div className="flex items-center gap-3">
                            <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                                <ShieldCheck className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <DialogTitle className="text-lg">Define Personnel Role</DialogTitle>
                                <DialogDescription>Permission Hierarchy Configuration</DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>
                    <div className="space-y-4 pt-2">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="flex items-center gap-1.5">
                                    <Building2 className="h-3.5 w-3.5" /> Role Designation <span className="text-destructive">*</span>
                                </Label>
                                <Input value={unifiedForm.designation} onChange={(e) => setUnifiedForm(f => ({ ...f, designation: e.target.value }))} placeholder="e.g. Senior Fleet Technician" />
                            </div>
                            <div className="space-y-2">
                                <Label className="flex items-center gap-1.5">
                                    <Layers className="h-3.5 w-3.5" /> Department <span className="text-destructive">*</span>
                                </Label>
                                {isCreatingNewDept ? (
                                    <div className="space-y-1.5">
                                        <Input value={unifiedForm.newDeptName} onChange={(e) => setUnifiedForm(f => ({ ...f, newDeptName: e.target.value }))} placeholder="e.g. Logistics & Supply" />
                                        {allDepartments.length > 0 && (
                                            <button type="button" className="text-xs text-primary hover:underline" onClick={() => setIsCreatingNewDept(false)}>
                                                Select existing department
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <Select value={unifiedForm.departmentId} onValueChange={(val) => {
                                        if (val === "__new__") {
                                            setIsCreatingNewDept(true);
                                        } else {
                                            setUnifiedForm(f => ({ ...f, departmentId: val }));
                                        }
                                    }}>
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Select department" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {allDepartments.map(d => (
                                                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                                            ))}
                                            <SelectItem value="__new__">+ Create New Department</SelectItem>
                                        </SelectContent>
                                    </Select>
                                )}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="flex items-center gap-1.5">
                                <ClipboardList className="h-3.5 w-3.5" /> Scope of Responsibility
                            </Label>
                            <Textarea value={unifiedForm.description} onChange={(e) => setUnifiedForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe the primary duties..." rows={3} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsUnifiedFormOpen(false)}>Cancel</Button>
                        <Button onClick={handleUnifiedSave} disabled={addRoleMutation.isPending || addDeptMutation.isPending}>
                            Deploy Role
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ════════════  PERSONNEL MODALS  ════════════ */}
            <AddEmployeeModal
                open={isAddEmpOpen}
                onOpenChange={(open) => { setIsAddEmpOpen(open); if (!open) setSelectedEmployee(null); }}
                departments={allDepartments}
                roles={roles}
                onAddEmployee={handleEmpSave}
                initialData={selectedEmployee}
            />
            <EmployeeDetailsModal
                open={isEmpDetailsOpen}
                onOpenChange={setIsEmpDetailsOpen}
                employee={selectedEmployee}
                onEdit={handleEmpEdit}
            />

            {/* ════════════  CONFIRM DIALOGS  ════════════ */}
            <ConfirmDialog
                open={roleArchiveTarget !== null}
                onOpenChange={(open) => { if (!open) setRoleArchiveTarget(null); }}
                title="Archive Role"
                description="Are you sure you want to archive this role? It can be restored later."
                confirmLabel="Archive"
                confirmVariant="destructive"
                onConfirm={async () => { if (roleArchiveTarget) { await archiveRoleMutation.mutateAsync(roleArchiveTarget); setRoleArchiveTarget(null); } }}
                isLoading={archiveRoleMutation.isPending}
            />
            <ConfirmDialog
                open={empArchiveTarget !== null}
                onOpenChange={(open) => { if (!open) setEmpArchiveTarget(null); }}
                title="Archive Personnel"
                description="Are you sure you want to archive this person? They can be restored later."
                confirmLabel="Archive"
                confirmVariant="destructive"
                onConfirm={async () => { if (empArchiveTarget) { await archiveEmpMutation.mutateAsync(empArchiveTarget); setEmpArchiveTarget(null); } }}
                isLoading={archiveEmpMutation.isPending}
            />
        </div>
    );
}
