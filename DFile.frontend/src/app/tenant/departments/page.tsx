"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { StatusText } from "@/components/ui/status-text";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Building2, Plus, Search, Pencil, Archive, RotateCcw, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Department } from "@/types/asset";
import { useDepartments, useAddDepartment, useUpdateDepartment, useArchiveDepartment, useRestoreDepartment } from "@/hooks/use-organization";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export default function DepartmentsPage() {
    const [showArchived, setShowArchived] = useState(false);
    const { data: departments = [], isLoading } = useDepartments(showArchived);
    const addMutation = useAddDepartment();
    const updateMutation = useUpdateDepartment();
    const archiveMutation = useArchiveDepartment();
    const restoreMutation = useRestoreDepartment();

    const [searchQuery, setSearchQuery] = useState("");
    const [archiveTarget, setArchiveTarget] = useState<string | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingDept, setEditingDept] = useState<Department | null>(null);
    const [form, setForm] = useState({ name: "", description: "", head: "" });

    const filtered = useMemo(() => {
        return departments.filter(d => {
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                return d.name.toLowerCase().includes(q) || d.head.toLowerCase().includes(q) || d.description.toLowerCase().includes(q);
            }
            return true;
        });
    }, [departments, searchQuery]);

    const openCreate = () => {
        setEditingDept(null);
        setForm({ name: "", description: "", head: "" });
        setIsFormOpen(true);
    };

    const openEdit = (dept: Department) => {
        setEditingDept(dept);
        setForm({ name: dept.name, description: dept.description, head: dept.head });
        setIsFormOpen(true);
    };

    const handleSave = async () => {
        if (!form.name.trim()) { toast.error("Department name is required"); return; }
        if (editingDept) {
            await updateMutation.mutateAsync({ id: editingDept.id, payload: form });
            toast.success("Department updated");
        } else {
            await addMutation.mutateAsync(form);
            toast.success("Department created");
        }
        setIsFormOpen(false);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                    <h1 className="text-xl font-semibold tracking-tight">Departments</h1>
                    <p className="text-sm text-muted-foreground">Manage organizational departments</p>
                </div>
                <Button onClick={openCreate} className="gap-2">
                    <Plus className="h-4 w-4" /> Add Department
                </Button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold">{showArchived ? "Archived Departments" : "Departments"}</h2>
                    <span className="text-sm text-muted-foreground">({filtered.length})</span>
                </div>
                <div className="flex gap-2">
                    <div className="relative flex-1 sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
                    </div>
                    <Button variant="outline" size="icon" onClick={() => setShowArchived(!showArchived)} aria-label={showArchived ? "Show active" : "Show archived"}>
                        {showArchived ? <RotateCcw className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                    </Button>
                </div>
            </div>

            {isLoading ? (
                <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground rounded-md border">
                    <Building2 className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <p>{showArchived ? "No archived departments" : "No departments found"}</p>
                </div>
            ) : (
                <div className="rounded-md border overflow-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>Head</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="w-[80px] text-center">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.map(d => (
                                <TableRow key={d.id}>
                                    <TableCell className="font-medium">{d.name}</TableCell>
                                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{d.description}</TableCell>
                                    <TableCell>{d.head}</TableCell>
                                    <TableCell><StatusText variant={d.status === "Active" ? "success" : "muted"}>{d.status}</StatusText></TableCell>
                                    <TableCell className="text-center">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Actions">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-40">
                                                <DropdownMenuItem onClick={() => openEdit(d)} className="gap-2 cursor-pointer">
                                                    <Pencil className="h-4 w-4" /> Edit
                                                </DropdownMenuItem>
                                                {d.status === "Active" ? (
                                                    <DropdownMenuItem onClick={() => setArchiveTarget(d.id)} className="gap-2 cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10">
                                                        <Archive className="h-4 w-4" /> Archive
                                                    </DropdownMenuItem>
                                                ) : (
                                                    <DropdownMenuItem onClick={() => restoreMutation.mutateAsync(d.id)} className="gap-2 cursor-pointer">
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

            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingDept ? "Edit Department" : "Create Department"}</DialogTitle>
                        <DialogDescription>{editingDept ? "Update the department details below." : "Fill in the details to create a new department."}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Name</Label>
                            <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Engineering" />
                        </div>
                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Input value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Department description" />
                        </div>
                        <div className="space-y-2">
                            <Label>Department Head</Label>
                            <Input value={form.head} onChange={(e) => setForm(f => ({ ...f, head: e.target.value }))} placeholder="Head of department" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsFormOpen(false)}>Cancel</Button>
                        <Button onClick={handleSave} disabled={addMutation.isPending || updateMutation.isPending}>
                            {editingDept ? "Update" : "Create"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                open={archiveTarget !== null}
                onOpenChange={(open) => { if (!open) setArchiveTarget(null); }}
                title="Archive Department"
                description="Are you sure you want to archive this department? It can be restored later from the archive view."
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
