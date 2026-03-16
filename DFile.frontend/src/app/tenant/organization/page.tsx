"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { Building2, ShieldCheck, Users, Plus, Search, Archive, RotateCcw, Layers, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    const { data: roles = [], isLoading: rolesLoading } = useRoles(roleShowArchived);
    const { data: roleCountOpposite = [] } = useRoles(!roleShowArchived);
    const roleArchivedCount = roleShowArchived ? roles.length : roleCountOpposite.length;
    const roleActiveCount = roleShowArchived ? roleCountOpposite.length : roles.length;
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
    const [unifiedForm, setUnifiedForm] = useState({ designation: "", departmentId: "", newDeptName: "", description: "" });

    // ── Role edit state ──
    const [isRoleFormOpen, setIsRoleFormOpen] = useState(false);
    const [editingRole, setEditingRole] = useState<{ id: string; designation: string; departmentId?: string; description: string } | null>(null);
    const [roleForm, setRoleForm] = useState({ designation: "", departmentId: "", description: "" });
    const [isEditCreatingNewDept, setIsEditCreatingNewDept] = useState(false);
    const [editNewDeptName, setEditNewDeptName] = useState("");

    // ── Personnel state ──
    const [empShowArchived, setEmpShowArchived] = useState(false);
    const { data: employees = [], isLoading: empLoading } = useEmployees(empShowArchived);
    const { data: empCountOpposite = [] } = useEmployees(!empShowArchived);
    const empArchivedCount = empShowArchived ? employees.length : empCountOpposite.length;
    const empActiveCount = empShowArchived ? empCountOpposite.length : employees.length;
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
            r.designation?.toLowerCase().includes(q) || r.departmentName?.toLowerCase().includes(q) || r.description?.toLowerCase().includes(q)
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
        setUnifiedForm({ designation: "", departmentId: "", newDeptName: "", description: "" });
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
                const newDept = await addDeptMutation.mutateAsync({ name: deptName, description: "" });
                departmentId = newDept.id;
            }
        }

        if (!departmentId) return;
        await addRoleMutation.mutateAsync({ designation: unifiedForm.designation, departmentId, description: unifiedForm.description });
        setIsUnifiedFormOpen(false);
    };

    // ── Role edit handlers ──
    const openRoleEdit = (role: { id: string; designation: string; departmentId?: string; description: string }) => {
        setEditingRole(role);
        setRoleForm({ designation: role.designation, departmentId: role.departmentId || "", description: role.description });
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
                const newDept = await addDeptMutation.mutateAsync({ name: deptName, description: "" });
                departmentId = newDept.id;
            }
        }

        await updateRoleMutation.mutateAsync({ id: editingRole.id, payload: { designation: roleForm.designation, departmentId, description: roleForm.description } });
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
                <TabsContent value="roles" className="space-y-4 mt-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <h2 className="text-lg font-semibold">{roleShowArchived ? "Archived Roles" : "Roles"}</h2>
                            <span className="text-sm text-muted-foreground">({filteredRoles.length})</span>
                        </div>
                        <div className="flex gap-2">
                            <div className="relative flex-1 sm:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input placeholder="Search roles..." value={roleSearch} onChange={(e) => setRoleSearch(e.target.value)} className="pl-10 h-10" />
                            </div>
                            <Button onClick={openUnifiedCreate} className="gap-2 h-10">
                                <Plus className="h-4 w-4" /> Define Role
                            </Button>
                            <Button variant={roleShowArchived ? "default" : "outline"} className="h-10" onClick={() => setRoleShowArchived(!roleShowArchived)}>
                                {roleShowArchived ? (
                                    <><RotateCcw className="h-4 w-4 mr-2" />Active ({roleActiveCount})</>
                                ) : (
                                    <><Archive className="h-4 w-4 mr-2" />Archived ({roleArchivedCount})</>
                                )}
                            </Button>
                        </div>
                    </div>

                    {rolesLoading ? (
                        <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
                    ) : filteredRoles.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground rounded-md border min-h-[520px] flex flex-col items-center justify-center">
                            <ShieldCheck className="h-12 w-12 mx-auto mb-4 opacity-20" />
                            <p>{roleShowArchived ? "No archived roles" : "No roles found"}</p>
                            {!roleShowArchived && <p className="text-xs mt-1">Define a role to get started</p>}
                        </div>
                    ) : (
                        <div className="rounded-md border overflow-auto min-h-[520px]">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Designation</TableHead>
                                        <TableHead>Department</TableHead>
                                        <TableHead>Description</TableHead>
                                        <TableHead className="w-[80px] text-center">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paginateData(filteredRoles, rolePageIndex, rolePageSize).map(r => (
                                        <TableRow key={r.id}>
                                            <TableCell className="font-medium">
                                                <button type="button" className="text-primary hover:underline text-left" onClick={() => openRoleEdit(r)}>{r.designation}</button>
                                            </TableCell>
                                            <TableCell>{r.departmentName}</TableCell>
                                            <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{r.description}</TableCell>
                                            <TableCell className="text-center">
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
                            <TablePagination
                                totalItems={filteredRoles.length}
                                pageSize={rolePageSize}
                                pageIndex={rolePageIndex}
                                onPageChange={setRolePageIndex}
                                onPageSizeChange={setRolePageSize}
                            />
                        </div>
                    )}
                </TabsContent>

                {/* ════════════  PERSONNEL TAB  ════════════ */}
                <TabsContent value="personnel" className="space-y-4 mt-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <h2 className="text-lg font-semibold">{empShowArchived ? "Archived Personnel" : "Personnel"}</h2>
                            <span className="text-sm text-muted-foreground">({filteredEmps.length})</span>
                        </div>
                        <div className="flex gap-2">
                            <div className="relative flex-1 sm:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input placeholder="Search personnel..." value={empSearch} onChange={(e) => setEmpSearch(e.target.value)} className="pl-10 h-10" />
                            </div>
                            <Button onClick={() => { setSelectedEmployee(null); setIsAddEmpOpen(true); }} className="gap-2 h-10">
                                <Plus className="h-4 w-4" /> Add Personnel
                            </Button>
                            <Button variant={empShowArchived ? "default" : "outline"} className="h-10" onClick={() => setEmpShowArchived(!empShowArchived)}>
                                {empShowArchived ? (
                                    <><RotateCcw className="h-4 w-4 mr-2" />Active ({empActiveCount})</>
                                ) : (
                                    <><Archive className="h-4 w-4 mr-2" />Archived ({empArchivedCount})</>
                                )}
                            </Button>
                        </div>
                    </div>

                    {empLoading ? (
                        <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
                    ) : filteredEmps.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground rounded-md border min-h-[520px] flex flex-col items-center justify-center">
                            <Users className="h-12 w-12 mx-auto mb-4 opacity-20" />
                            <p>{empShowArchived ? "No archived personnel" : "No personnel found"}</p>
                            {!empShowArchived && <p className="text-xs mt-1">Define roles first, then register personnel</p>}
                        </div>
                    ) : (
                        <div className="rounded-md border overflow-auto min-h-[520px]">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Department</TableHead>
                                        <TableHead>Role</TableHead>
                                        <TableHead className="w-[80px] text-center">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paginateData(filteredEmps, empPageIndex, empPageSize).map(emp => (
                                        <TableRow key={emp.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleEmployeeClick(emp)}>
                                            <TableCell className="font-medium">{emp.firstName} {emp.lastName}</TableCell>
                                            <TableCell className="text-sm text-muted-foreground">{emp.email}</TableCell>
                                            <TableCell>{emp.department}</TableCell>
                                            <TableCell>{emp.role}</TableCell>
                                            <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
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
                            <TablePagination
                                totalItems={filteredEmps.length}
                                pageSize={empPageSize}
                                pageIndex={empPageIndex}
                                onPageChange={setEmpPageIndex}
                                onPageSizeChange={setEmpPageSize}
                            />
                        </div>
                    )}
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
