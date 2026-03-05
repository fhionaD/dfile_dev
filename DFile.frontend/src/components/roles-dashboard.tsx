"use client";

import { useState } from "react";
import { Plus, Shield, ChevronRight, Archive, RotateCcw, Search, Filter, MoreHorizontal, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusText } from "@/components/ui/status-text";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SortableTableHead } from "@/components/ui/sortable-table-head";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Employee } from "@/types/asset";

interface Role {
    id: string;
    designation: string;
    department: string;
    scope: string;
}

interface RolesDashboardProps {
    roles: Role[];
    employees: Employee[];
    showArchived: boolean;
    onToggleArchived: () => void;
    onOpenModal: () => void;
    onAddPersonnel: () => void;
    onEmployeeClick?: (employee: Employee) => void;
    onArchiveEmployee?: (id: string) => void;
    onRestoreEmployee?: (id: string) => void;
}

type SortKey = "name" | "email" | "department" | "role" | "status";
type SortDir = "asc" | "desc";

export function RolesDashboard({ roles, employees, showArchived, onToggleArchived, onOpenModal, onAddPersonnel, onEmployeeClick, onArchiveEmployee, onRestoreEmployee }: RolesDashboardProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [roleFilter, setRoleFilter] = useState("All");

    // Sort state
    const [sortKey, setSortKey] = useState<SortKey | null>(null);
    const [sortDir, setSortDir] = useState<SortDir>("asc");

    // Confirm dialog state
    const [confirmState, setConfirmState] = useState<{
        employeeId: string;
        action: "archive" | "restore";
        employeeName: string;
    } | null>(null);

    const toggleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDir(d => d === "asc" ? "desc" : "asc");
        } else {
            setSortKey(key);
            setSortDir("asc");
        }
    };

    const sorted = (key: SortKey): "asc" | "desc" | false =>
        sortKey === key ? sortDir : false;

    const filteredEmps = employees.filter(emp => {
        const query = searchQuery.toLowerCase();
        const fullName = `${emp.firstName} ${emp.middleName ? emp.middleName + " " : ""}${emp.lastName}`.toLowerCase();
        const matchesSearch =
            fullName.includes(query) ||
            emp.email.toLowerCase().includes(query) ||
            emp.role.toLowerCase().includes(query) ||
            emp.id.toLowerCase().includes(query);
        if (!matchesSearch) return false;
        if (roleFilter !== "All" && emp.role !== roleFilter) return false;
        return true;
    });

    const displayEmps = [...filteredEmps].sort((a, b) => {
        if (!sortKey) return 0;
        let av = "";
        let bv = "";
        const fullNameA = `${a.firstName} ${a.middleName ? a.middleName + " " : ""}${a.lastName}`.toLowerCase();
        const fullNameB = `${b.firstName} ${b.middleName ? b.middleName + " " : ""}${b.lastName}`.toLowerCase();
        if (sortKey === "name") { av = fullNameA; bv = fullNameB; }
        else if (sortKey === "email") { av = a.email.toLowerCase(); bv = b.email.toLowerCase(); }
        else if (sortKey === "department") { av = (a.department ?? "").toLowerCase(); bv = (b.department ?? "").toLowerCase(); }
        else if (sortKey === "role") { av = (a.role ?? "").toLowerCase(); bv = (b.role ?? "").toLowerCase(); }
        else if (sortKey === "status") { av = (a.status ?? "").toLowerCase(); bv = (b.status ?? "").toLowerCase(); }
        if (av < bv) return sortDir === "asc" ? -1 : 1;
        if (av > bv) return sortDir === "asc" ? 1 : -1;
        return 0;
    });

    const uniqueRoles = Array.from(new Set(employees.map(e => e.role).filter(role => role && role.trim() !== ""))).sort();

    const statusVariant: Record<string, "success" | "danger" | "muted"> = {
        Active: "success",
        Inactive: "danger",
        Archived: "muted",
    };

    const handleConfirm = () => {
        if (!confirmState) return;
        if (confirmState.action === "archive") {
            onArchiveEmployee?.(confirmState.employeeId);
        } else {
            onRestoreEmployee?.(confirmState.employeeId);
        }
        setConfirmState(null);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
                <div className="flex flex-1 gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0 items-center">
                    <div className="relative flex-1 max-w-sm min-w-[200px]">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search employees..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 h-9 text-sm"
                        />
                    </div>
                    <Select value={roleFilter} onValueChange={setRoleFilter}>
                        <SelectTrigger className="w-[160px] h-9 text-sm">
                            <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
                            <SelectValue placeholder="Filter Role" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="All">All Roles</SelectItem>
                            {uniqueRoles.map((role) => (
                                <SelectItem key={role} value={role}>{role}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <Button variant="outline" onClick={onAddPersonnel} size="sm" className="h-10 text-sm border-dashed border-border hover:border-primary/50 hover:bg-primary/5">
                        <Plus size={16} className="mr-2" />
                        Register Personnel
                    </Button>
                    <Button onClick={onOpenModal} size="sm" className="h-10 text-sm bg-primary text-primary-foreground shadow-sm">
                        <Shield size={16} className="mr-2" />
                        Deploy Role
                    </Button>
                    <Button variant={showArchived ? "default" : "outline"} size="sm" className="h-10 text-sm w-[160px] justify-start" onClick={onToggleArchived}>
                        {showArchived
                            ? <><RotateCcw size={16} className="mr-2" />Show Active</>
                            : <><Archive size={16} className="mr-2" />Show Archive</>}
                    </Button>
                </div>
            </div>

            {/* Personnel Table */}
            <div className="rounded-md border overflow-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                                <SortableTableHead
                                    className="h-10 px-4 py-3 text-xs"
                                    sorted={sorted("name")}
                                    onSort={() => toggleSort("name")}
                                >
                                    Name
                                </SortableTableHead>
                                <SortableTableHead
                                    className="h-10 px-4 py-3 text-xs"
                                    sorted={sorted("email")}
                                    onSort={() => toggleSort("email")}
                                >
                                    Email
                                </SortableTableHead>
                                <SortableTableHead
                                    className="h-10 px-4 py-3 text-xs"
                                    sorted={sorted("department")}
                                    onSort={() => toggleSort("department")}
                                >
                                    Department
                                </SortableTableHead>
                                <SortableTableHead
                                    className="h-10 px-4 py-3 text-xs"
                                    sorted={sorted("role")}
                                    onSort={() => toggleSort("role")}
                                >
                                    Role
                                </SortableTableHead>
                                <SortableTableHead
                                    className="h-10 px-4 py-3 text-xs"
                                    sorted={sorted("status")}
                                    onSort={() => toggleSort("status")}
                                >
                                    Status
                                </SortableTableHead>
                                <TableHead className="h-10 px-4 py-3 text-xs text-center w-[80px]">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {displayEmps.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground text-sm">
                                        {showArchived ? "No archived personnel yet" : "No personnel match your search"}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                displayEmps.map((emp) => (
                                    <TableRow key={emp.id} className="hover:bg-muted/30 transition-colors">
                                        <TableCell className="font-medium text-sm">
                                            {emp.firstName} {emp.middleName ? `${emp.middleName} ` : ""}{emp.lastName}
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {emp.email}
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {emp.department}
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {emp.role}
                                        </TableCell>
                                        <TableCell>
                                            <StatusText variant={statusVariant[emp.status] ?? "muted"}>{emp.status}</StatusText>
                                        </TableCell>
                                        <TableCell className="text-center" onClick={e => e.stopPropagation()}>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                        <span className="sr-only">Actions</span>
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-40 z-[200]">
                                                    <DropdownMenuItem
                                                        onClick={() => onEmployeeClick?.(emp)}
                                                        className="gap-2 cursor-pointer"
                                                    >
                                                        <Eye className="h-4 w-4" /> View
                                                    </DropdownMenuItem>
                                                    {showArchived ? (
                                                        <DropdownMenuItem
                                                            onClick={() => setConfirmState({
                                                                employeeId: emp.id,
                                                                action: "restore",
                                                                employeeName: `${emp.firstName} ${emp.lastName}`,
                                                            })}
                                                            className="gap-2 cursor-pointer text-emerald-600 focus:text-emerald-600 focus:bg-emerald-500/10"
                                                        >
                                                            <RotateCcw className="h-4 w-4" /> Restore
                                                        </DropdownMenuItem>
                                                    ) : (
                                                        <DropdownMenuItem
                                                            onClick={() => setConfirmState({
                                                                employeeId: emp.id,
                                                                action: "archive",
                                                                employeeName: `${emp.firstName} ${emp.lastName}`,
                                                            })}
                                                            className="gap-2 cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
                                                        >
                                                            <Archive className="h-4 w-4" /> Archive
                                                        </DropdownMenuItem>
                                                    )}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
            </div>

            {/* Roles Section */}
            <div>
                <div className="flex items-center gap-2 mb-4">
                    <Shield size={14} className="text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Deployed Roles</span>
                    <Badge variant="outline" className="text-[10px] ml-auto">{roles.length} role{roles.length !== 1 ? "s" : ""}</Badge>
                </div>
                {roles.length === 0 ? (
                    <div className="py-16 border-2 border-dashed border-border rounded-2xl text-center">
                        <span className="text-muted-foreground font-medium text-sm">No roles deployed</span>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {roles.map((role) => (
                            <Card key={role.id} className="border-border">
                                <CardContent className="p-4 flex items-center gap-4">
                                    <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center text-primary shrink-0">
                                        <Shield size={16} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-sm font-medium text-foreground">{role.designation}</h3>
                                        <p className="text-xs text-muted-foreground mt-0.5">Dept: {role.department}</p>
                                    </div>
                                    <div className="flex-1 max-w-xs bg-muted/50 p-3 rounded-lg text-xs text-muted-foreground leading-relaxed hidden md:block border border-border/50">
                                        &ldquo;{role.scope}&rdquo;
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground shrink-0">
                                        <ChevronRight size={15} />
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {/* Archive / Restore confirmation */}
            <ConfirmDialog
                open={!!confirmState}
                onOpenChange={open => { if (!open) setConfirmState(null); }}
                title={confirmState?.action === "archive" ? "Archive Personnel" : "Restore Personnel"}
                description={
                    confirmState?.action === "archive"
                        ? `Archive "${confirmState?.employeeName}"? Their access will be suspended.`
                        : `Restore "${confirmState?.employeeName}"? They will regain system access.`
                }
                confirmLabel={confirmState?.action === "archive" ? "Archive" : "Restore"}
                confirmVariant={confirmState?.action === "archive" ? "destructive" : "default"}
                onConfirm={handleConfirm}
            />
        </div>
    );
}
