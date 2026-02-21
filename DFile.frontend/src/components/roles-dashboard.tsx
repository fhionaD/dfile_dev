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

    const uniqueRoles = Array.from(new Set(employees.map(e => e.role).filter(role => role && role.trim() !== ""))).sort();

    const statusColor: Record<string, string> = {
        Active: "text-emerald-800 dark:text-emerald-400",
        Inactive: "text-red-800 dark:text-red-400",
        Archived: "text-gray-800 dark:text-gray-400",
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-background p-1 rounded-lg">
                <div className="flex flex-1 gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0 items-center">
                    <div className="relative flex-1 max-w-sm min-w-[200px]">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search employees..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 h-10 bg-background text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        />
                    </div>
                    <Select value={roleFilter} onValueChange={setRoleFilter}>
                        <SelectTrigger className="w-[180px] h-10 bg-background text-sm">
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
                    <Button variant={showArchived ? "default" : "outline"} size="sm" className="h-10 text-sm w-[160px] justify-start" onClick={() => setShowArchived(!showArchived)}>
                        {showArchived ? <><RotateCcw size={16} className="mr-2" />Show Active ({activeEmps.length})</> : <><Archive size={16} className="mr-2" />Show Archive ({archivedEmps.length})</>}
                    </Button>
                </div>
            </div>

            {/* Personnel Card */}
            <Card className="border-border shadow-sm  overflow-hidden">
                <div className="overflow-x-auto">
                    <Table className="min-w-[1200px] table-fixed border-separate border-spacing-0">
                        <TableHeader>
                            <TableRow className="bg-muted/50 hover:bg-muted/50 border-b border-border">
                                <TableHead className="h-10 px-4 py-3 text-left align-middle font-medium text-muted-foreground text-xs w-[100px]">ID</TableHead>
                                <TableHead className="h-10 px-4 py-3 text-left align-middle font-medium text-muted-foreground text-xs w-[200px]">Name</TableHead>
                                <TableHead className="h-10 px-4 py-3 text-left align-middle font-medium text-muted-foreground text-xs w-[250px]">Email</TableHead>
                                <TableHead className="h-10 px-4 py-3 text-left align-middle font-medium text-muted-foreground text-xs w-[140px]">Contact</TableHead>
                                <TableHead className="h-10 px-4 py-3 text-left align-middle font-medium text-muted-foreground text-xs w-[140px]">Department</TableHead>
                                <TableHead className="h-10 px-4 py-3 text-left align-middle font-medium text-muted-foreground text-xs w-[140px]">Role</TableHead>
                                <TableHead className="h-10 px-4 py-3 text-left align-middle font-medium text-muted-foreground text-xs w-[120px]">Hire Date</TableHead>
                                <TableHead className="h-10 px-4 py-3 text-left align-middle font-medium text-muted-foreground text-xs w-[100px]">Status</TableHead>
                                <TableHead className="h-10 px-4 py-3 text-center align-middle font-medium text-muted-foreground text-xs w-[80px]">{showArchived ? "Restore" : "Archive"}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {displayEmps.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={9} className="h-24 text-center text-muted-foreground text-sm">
                                        {showArchived ? "No archived personnel yet" : "No personnel match your search"}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                displayEmps.map((emp) => (
                                    <TableRow key={emp.id} className="hover:bg-muted/30 transition-colors cursor-pointer border-b border-border last:border-0" onClick={() => onEmployeeClick?.(emp)}>
                                        <TableCell className="p-0 align-middle border-b border-border">
                                            <div className="px-4 py-3 w-[100px] truncate font-mono text-xs text-muted-foreground" title={emp.id}>
                                                {emp.id}
                                            </div>
                                        </TableCell>
                                        <TableCell className="p-0 align-middle border-b border-border">
                                            <div className="px-4 py-3 w-[200px] truncate text-sm font-normal text-foreground" title={`${emp.firstName} ${emp.middleName ? emp.middleName + ' ' : ''}${emp.lastName}`}>
                                                {emp.firstName} {emp.middleName ? `${emp.middleName} ` : ""}{emp.lastName}
                                            </div>
                                        </TableCell>
                                        <TableCell className="p-0 align-middle border-b border-border">
                                            <div className="px-4 py-3 w-[250px] truncate text-sm text-muted-foreground" title={emp.email}>
                                                {emp.email}
                                            </div>
                                        </TableCell>
                                        <TableCell className="p-0 align-middle border-b border-border">
                                            <div className="px-4 py-3 w-[140px] truncate text-sm text-muted-foreground" title={emp.contactNumber}>
                                                {emp.contactNumber}
                                            </div>
                                        </TableCell>
                                        <TableCell className="p-0 align-middle border-b border-border">
                                            <div className="px-4 py-3 w-[140px] truncate text-sm text-muted-foreground font-normal" title={emp.department}>
                                                {emp.department}
                                            </div>
                                        </TableCell>
                                        <TableCell className="p-0 align-middle border-b border-border">
                                            <div className="px-4 py-3 w-[140px] truncate text-sm text-muted-foreground font-normal" title={emp.role}>
                                                {emp.role}
                                            </div>
                                        </TableCell>
                                        <TableCell className="p-0 align-middle border-b border-border">
                                            <div className="px-4 py-3 w-[120px] truncate text-sm text-muted-foreground" title={emp.hireDate}>
                                                {emp.hireDate}
                                            </div>
                                        </TableCell>
                                        <TableCell className="p-0 align-middle border-b border-border">
                                            <div className="px-4 py-3 w-[100px]">
                                                <span className={`text-sm font-normal inline-block ${statusColor[emp.status] || ""}`}>
                                                    {emp.status}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="p-0 align-middle text-center border-b border-border">
                                            <div className="px-4 py-3 w-[80px] flex justify-center">
                                                <Button
                                                    variant="ghost" 
                                                    size="icon"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onArchiveEmployee?.(emp.id);
                                                    }}
                                                    className={`h-8 w-8 hover:bg-transparent ${emp.status === 'Archived' ? 'text-primary hover:text-primary/80' : 'text-muted-foreground hover:text-destructive'}`}
                                                    title={emp.status === 'Archived' ? 'Restore' : 'Archive'}
                                                >
                                                    {emp.status === 'Archived' ? <RotateCcw className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                                                </Button>
                                            </div>
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
                                        <h3 className="text-sm font-medium text-foreground">{role.designation}</h3>
                                        <p className="text-xs text-muted-foreground mt-0.5">Dept: {role.department}</p>
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
