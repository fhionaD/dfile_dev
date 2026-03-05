"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusText } from "@/components/ui/status-text";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ShieldAlert, Ban, CheckCircle2, Building2, AlertTriangle, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { useTenants, useUpdateTenantStatus, Tenant } from "@/hooks/use-tenants";

export default function EmergencyControlsPage() {
    const { data: tenants = [], isLoading } = useTenants();
    const statusMutation = useUpdateTenantStatus();

    const [confirmAction, setConfirmAction] = useState<{ tenant: Tenant; newStatus: string } | null>(null);

    const activeTenants = tenants.filter(t => t.status === "Active");
    const suspendedTenants = tenants.filter(t => t.status === "Suspended");

    const handleStatusChange = async () => {
        if (!confirmAction) return;
        await statusMutation.mutateAsync({ id: confirmAction.tenant.id, status: confirmAction.newStatus });
        toast.success(`Tenant "${confirmAction.tenant.name}" ${confirmAction.newStatus === "Suspended" ? "suspended" : "reactivated"}`);
        setConfirmAction(null);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
                    <ShieldAlert className="h-5 w-5 text-red-600" />
                </div>
                <div>
                    <h1 className="text-xl font-semibold tracking-tight">Emergency Controls</h1>
                    <p className="text-sm text-muted-foreground">Governance actions for platform-level incidents</p>
                </div>
            </div>

            {/* Status Summary */}
            <section className="grid gap-4 sm:grid-cols-3">
                <Card>
                    <div className="p-5 space-y-3">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">Active Tenants</p>
                            <Building2 className="h-4 w-4 text-emerald-600" />
                        </div>
                        {isLoading ? <Skeleton className="h-8 w-16" /> : <p className="text-2xl font-bold text-emerald-600">{activeTenants.length}</p>}
                    </div>
                </Card>
                <Card>
                    <div className="p-5 space-y-3">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">Suspended Tenants</p>
                            <Ban className="h-4 w-4 text-red-600" />
                        </div>
                        {isLoading ? <Skeleton className="h-8 w-16" /> : <p className="text-2xl font-bold text-red-600">{suspendedTenants.length}</p>}
                    </div>
                </Card>
                <Card>
                    <div className="p-5 space-y-3">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">Total Tenants</p>
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                        </div>
                        {isLoading ? <Skeleton className="h-8 w-16" /> : <p className="text-2xl font-bold">{tenants.length}</p>}
                    </div>
                </Card>
            </section>

            {/* Tenant Controls Table */}
            <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                <h2 className="text-lg font-semibold">Tenant Status Controls</h2>
                <span className="text-sm text-muted-foreground">— Suspend or reactivate tenant access</span>
            </div>

            {isLoading ? (
                <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
            ) : tenants.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground rounded-md border">
                    <Building2 className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <p>No tenants registered</p>
                </div>
            ) : (
                <div className="rounded-md border overflow-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Tenant</TableHead>
                                <TableHead>Created</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="w-[80px] text-center">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {tenants.map((t) => (
                                <TableRow key={t.id}>
                                    <TableCell className="font-medium">{t.name}</TableCell>
                                    <TableCell className="text-sm text-muted-foreground">{new Date(t.createdAt).toLocaleDateString()}</TableCell>
                                    <TableCell>
                                        <StatusText variant={t.status === "Active" ? "success" : t.status === "Suspended" ? "danger" : "muted"}>
                                            {t.status}
                                        </StatusText>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Actions">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-44">
                                                {t.status === "Active" ? (
                                                    <DropdownMenuItem
                                                        onClick={() => setConfirmAction({ tenant: t, newStatus: "Suspended" })}
                                                        className="gap-2 cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
                                                    >
                                                        <Ban className="h-4 w-4" /> Suspend
                                                    </DropdownMenuItem>
                                                ) : t.status === "Suspended" ? (
                                                    <DropdownMenuItem
                                                        onClick={() => setConfirmAction({ tenant: t, newStatus: "Active" })}
                                                        className="gap-2 cursor-pointer"
                                                    >
                                                        <CheckCircle2 className="h-4 w-4" /> Reactivate
                                                    </DropdownMenuItem>
                                                ) : null}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}

            {/* Confirmation Dialog */}
            <Dialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {confirmAction?.newStatus === "Suspended" ? "Suspend Tenant" : "Reactivate Tenant"}
                        </DialogTitle>
                        <DialogDescription>
                            {confirmAction?.newStatus === "Suspended"
                                ? `This will immediately block all users of "${confirmAction?.tenant.name}" from accessing the platform. Are you sure?`
                                : `This will restore access for all users of "${confirmAction?.tenant.name}". Continue?`}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setConfirmAction(null)}>Cancel</Button>
                        <Button
                            variant={confirmAction?.newStatus === "Suspended" ? "destructive" : "default"}
                            onClick={handleStatusChange}
                            disabled={statusMutation.isPending}
                        >
                            {confirmAction?.newStatus === "Suspended" ? "Confirm Suspend" : "Confirm Reactivate"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
