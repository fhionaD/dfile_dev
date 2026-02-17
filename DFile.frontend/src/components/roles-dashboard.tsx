"use client";

import { useState } from "react";
import { Fingerprint, Plus, Shield, ChevronRight, Users, Mail, Phone, Building2, Archive, RotateCcw, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
    onOpenModal: () => void;
    onAddPersonnel: () => void;
    onEmployeeClick?: (employee: Employee) => void;
    onArchiveEmployee?: (id: string) => void;
}

export function RolesDashboard({ roles, employees, onOpenModal, onAddPersonnel, onEmployeeClick, onArchiveEmployee }: RolesDashboardProps) {
    const [showArchived, setShowArchived] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [roleFilter, setRoleFilter] = useState("All");

    const activeEmps = employees.filter(e => e.status !== "Archived");
    const archivedEmps = employees.filter(e => e.status === "Archived");
    const baseEmps = showArchived ? archivedEmps : activeEmps;

    // Filter Logic
    const displayEmps = baseEmps.filter(emp => {
        // Text Search
        const query = searchQuery.toLowerCase();
        const fullName = `${emp.firstName} ${emp.middleName ? emp.middleName + ' ' : ''}${emp.lastName}`.toLowerCase();
        const matchesSearch =
            fullName.includes(query) ||
            emp.email.toLowerCase().includes(query) ||
            emp.role.toLowerCase().includes(query) ||
            emp.id.toLowerCase().includes(query);

        if (!matchesSearch) return false;

        // Role Filter
        if (roleFilter !== "All" && emp.role !== roleFilter) return false;

        return true;
    });

    const uniqueRoles = Array.from(new Set(employees.map(e => e.role))).sort();

    const statusColor: Record<string, string> = {
        Active: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
        Inactive: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
        Archived: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
    };

    return (
        <div className="space-y-6">
            {/* Personnel Card */}
            <Card className="border-border">
                {/* Header: Title & Actions */}
                <div className="px-6 py-4 border-b border-border bg-muted/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-primary/10 rounded-lg text-primary">
                            <Users size={18} />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-foreground">Personnel Directory</h3>
                            <p className="text-xs text-muted-foreground mt-0.5">{showArchived ? `${archivedEmps.length} archived` : `${activeEmps.length} active`} employee{(showArchived ? archivedEmps.length : activeEmps.length) !== 1 ? "s" : ""}</p>
                        </div>
                    </div>
                    <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                        <Button variant={showArchived ? "default" : "outline"} size="sm" className="text-xs font-medium h-8" onClick={() => setShowArchived(!showArchived)}>
                            {showArchived ? <><RotateCcw size={14} className="mr-1.5" />Active ({activeEmps.length})</> : <><Archive size={14} className="mr-1.5" />Archived ({archivedEmps.length})</>}
                        </Button>
                        <Button variant="outline" onClick={onAddPersonnel} size="sm" className="rounded-xl h-8 text-xs border-dashed border-border hover:border-primary/50 hover:bg-primary/5">
                            <Plus size={14} className="mr-1.5" />
                            Register Personnel
                        </Button>
                        <Button onClick={onOpenModal} size="sm" className="rounded-xl h-8 text-xs bg-primary text-primary-foreground shadow-sm">
                            <Shield size={14} className="mr-1.5" />
                            Deploy Role
                        </Button>
                    </div>
                </div>

                {/* Filters */}
                <div className="p-4 border-b border-border bg-muted/20 flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search employees..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 h-9 bg-background"
                        />
                    </div>
                    <Select value={roleFilter} onValueChange={setRoleFilter}>
                        <SelectTrigger className="w-[180px] h-9 bg-background">
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

                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50 hover:bg-muted/50">
                                <TableHead className="text-xs font-medium text-muted-foreground pl-6">ID</TableHead>
                                <TableHead className="text-xs font-medium text-muted-foreground">Name</TableHead>
                                <TableHead className="text-xs font-medium text-muted-foreground">Email</TableHead>
                                <TableHead className="text-xs font-medium text-muted-foreground text-center">Contact</TableHead>
                                <TableHead className="text-xs font-medium text-muted-foreground text-center">Department</TableHead>
                                <TableHead className="text-xs font-medium text-muted-foreground text-center">Role</TableHead>
                                <TableHead className="text-xs font-medium text-muted-foreground text-center">Hire Date</TableHead>
                                <TableHead className="text-xs font-medium text-muted-foreground text-center">Status</TableHead>
                                <TableHead className="text-xs font-medium text-muted-foreground text-center w-[80px]">{showArchived ? "Restore" : "Archive"}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {displayEmps.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={9} className="h-32 text-center">
                                        <div className="flex flex-col items-center text-muted-foreground">
                                            <Users size={32} className="mb-2 opacity-30" />
                                            <p className="text-sm">No personnel match your search</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                displayEmps.map((emp) => (
                                    <TableRow key={emp.id} className="hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => onEmployeeClick?.(emp)}>
                                        <TableCell className="font-mono text-xs text-muted-foreground pl-6">{emp.id}</TableCell>
                                        <TableCell>
                                            <span className="text-sm font-medium text-foreground">
                                                {emp.firstName} {emp.middleName ? `${emp.middleName} ` : ""}{emp.lastName}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                                <Mail size={12} />
                                                {emp.email}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
                                                <Phone size={12} />
                                                {emp.contactNumber}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant="outline" className="text-[10px]">
                                                <Building2 size={10} className="mr-1" />
                                                {emp.department}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant="outline" className="text-[10px]">{emp.role}</Badge>
                                        </TableCell>
                                        <TableCell className="text-center text-sm">{emp.hireDate}</TableCell>
                                        <TableCell className="text-center">
                                            <Badge className={`text-[10px] font-medium ${statusColor[emp.status] || ""}`}>
                                                {emp.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onArchiveEmployee?.(emp.id);
                                                }}
                                                className={`p-1.5 rounded-md transition-colors ${emp.status === 'Archived' ? 'text-primary hover:bg-primary/10' : 'text-muted-foreground hover:text-destructive hover:bg-destructive/10'}`}
                                                title={emp.status === 'Archived' ? 'Restore' : 'Archive'}
                                            >
                                                {emp.status === 'Archived' ? <RotateCcw size={16} /> : <Archive size={16} />}
                                            </button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </Card>

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
                                        <h3 className="text-sm font-semibold text-foreground">{role.designation}</h3>
                                        <p className="text-[11px] text-muted-foreground mt-0.5">Dept: {role.department}</p>
                                    </div>
                                    <div className="flex-1 max-w-xs bg-muted/50 p-3 rounded-lg text-xs text-muted-foreground leading-relaxed hidden md:block border border-border/50">
                                        &ldquo;{role.scope}&rdquo;
                                    </div>
                                    <button className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-all">
                                        <ChevronRight size={16} />
                                    </button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
