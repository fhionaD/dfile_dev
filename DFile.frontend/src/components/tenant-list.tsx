"use client";

import { useState, useEffect } from "react";
import { MoreHorizontal, Search, Archive, Filter, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SortableTableHead } from "@/components/ui/sortable-table-head";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EditTenantModal } from "./modals/edit-tenant-modal";
import { TenantDetailsModal } from "./modals/tenant-details-modal";
import api from "@/lib/api";

interface TenantDto {
    id: number;
    name: string;
    subscriptionPlan: number;
    maxRooms: number;
    maxPersonnel: number;
    createdAt: string;
    status: string;
}

type SortKey = "name" | "subscriptionPlan" | "createdAt" | "status";
type SortDir = "asc" | "desc";

function getPlanName(plan: number) {
    switch (plan) {
        case 0: return "Starter";
        case 1: return "Basic";
        case 2: return "Pro";
        default: return "Unknown";
    }
}

export function TenantList() {
    const [tenants, setTenants] = useState<TenantDto[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [showArchived, setShowArchived] = useState(false);

    // Sort state
    const [sortKey, setSortKey] = useState<SortKey | null>(null);
    const [sortDir, setSortDir] = useState<SortDir>("asc");

    // Confirm dialog state
    const [confirmState, setConfirmState] = useState<{
        tenantId: number;
        action: "archive" | "restore";
        tenantName: string;
    } | null>(null);
    const [isConfirming, setIsConfirming] = useState(false);

    // Modals
    const [selectedTenant, setSelectedTenant] = useState<TenantDto | null>(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const fetchTenants = async () => {
        try {
            const { data } = await api.get<TenantDto[]>("/api/tenants");
            setTenants(data);
        } catch {
            toast.error("Failed to load organizations");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchTenants(); }, []);

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

    const updateTenantStatus = async (id: number, status: string) => {
        try {
            await api.put(`/api/tenants/${id}/status`, { status });
            setTenants(prev => prev.map(t => t.id === id ? { ...t, status } : t));
            toast.success(`Organization ${status === "Active" ? "restored" : "archived"} successfully`);
        } catch {
            toast.error("Failed to update organization status");
        }
    };

    const handleConfirm = async () => {
        if (!confirmState) return;
        setIsConfirming(true);
        const newStatus = confirmState.action === "archive" ? "Archived" : "Active";
        await updateTenantStatus(confirmState.tenantId, newStatus);
        setIsConfirming(false);
        setConfirmState(null);
    };

    const handleRowClick = (tenant: TenantDto) => {
        setSelectedTenant(tenant);
        setIsDetailsModalOpen(true);
    };

    const handleEditFromDetails = () => {
        setIsDetailsModalOpen(false);
        setIsEditModalOpen(true);
    };

    const handleSave = (updatedTenant: TenantDto) => {
        setTenants(prev => prev.map(t => t.id === updatedTenant.id ? updatedTenant : t));
        setIsEditModalOpen(false);
        setSelectedTenant(null);
    };

    // Filter
    const filtered = tenants.filter(t => {
        if (searchQuery && !t.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        if (statusFilter !== "All" && t.status !== statusFilter) return false;
        if (showArchived) {
            if (t.status !== "Archived" && t.status !== "Inactive") return false;
        } else {
            if (t.status === "Archived" || t.status === "Inactive") return false;
        }
        return true;
    });

    // Sort
    const displayTenants = [...filtered].sort((a, b) => {
        if (!sortKey) return 0;
        let av: string | number = "";
        let bv: string | number = "";
        if (sortKey === "name") { av = a.name.toLowerCase(); bv = b.name.toLowerCase(); }
        else if (sortKey === "subscriptionPlan") { av = getPlanName(a.subscriptionPlan).toLowerCase(); bv = getPlanName(b.subscriptionPlan).toLowerCase(); }
        else if (sortKey === "createdAt") { av = new Date(a.createdAt).getTime(); bv = new Date(b.createdAt).getTime(); }
        else if (sortKey === "status") { av = (a.status ?? "").toLowerCase(); bv = (b.status ?? "").toLowerCase(); }
        if (av < bv) return sortDir === "asc" ? -1 : 1;
        if (av > bv) return sortDir === "asc" ? 1 : -1;
        return 0;
    });

    const activeCount = tenants.filter(t => t.status !== "Inactive" && t.status !== "Archived").length;
    const archivedCount = tenants.filter(t => t.status === "Inactive" || t.status === "Archived").length;

    return (
        <div className="space-y-6">
            <div className="space-y-1">
                <h2 className="text-2xl font-bold tracking-tight">Registered Organizations</h2>
                <p className="text-muted-foreground text-sm">Manage organization access and status across the platform</p>
            </div>

            {/* Toolbar */}
            <div className="flex flex-col lg:flex-row gap-3 justify-between items-start lg:items-center">
                <div className="flex flex-1 flex-wrap gap-3 w-full lg:w-auto items-center">
                    <div className="relative flex-1 max-w-sm min-w-[220px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search organizations…"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="pl-9 h-10"
                        />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[160px] h-10">
                            <div className="flex items-center gap-2">
                                <Filter className="h-4 w-4 text-muted-foreground" />
                                <SelectValue placeholder="Status" />
                            </div>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="All">All Status</SelectItem>
                            <SelectItem value="Active">Active</SelectItem>
                            <SelectItem value="Inactive">Inactive</SelectItem>
                            <SelectItem value="Archived">Archived</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <Button
                    variant={showArchived ? "default" : "outline"}
                    className="h-10 px-4 gap-2 w-full lg:w-auto"
                    onClick={() => setShowArchived(v => !v)}
                >
                    {showArchived ? (
                        <><RotateCcw className="h-4 w-4" />Active ({activeCount})</>
                    ) : (
                        <><Archive className="h-4 w-4" />Archived ({archivedCount})</>
                    )}
                </Button>
            </div>

            {/* Table */}
            <div className="rounded-md border overflow-auto">
                <Table>
                        <TableHeader>
                            <TableRow>
                                <SortableTableHead
                                    className="w-[260px]"
                                    sorted={sorted("name")}
                                    onSort={() => toggleSort("name")}
                                >
                                    Organization
                                </SortableTableHead>
                                <SortableTableHead
                                    className="w-[160px]"
                                    sorted={sorted("subscriptionPlan")}
                                    onSort={() => toggleSort("subscriptionPlan")}
                                >
                                    Subscription
                                </SortableTableHead>
                                <TableHead className="text-right w-[15%]">Limits (Rooms / Staff)</TableHead>
                                <SortableTableHead
                                    className="text-center w-[130px]"
                                    sorted={sorted("createdAt")}
                                    onSort={() => toggleSort("createdAt")}
                                >
                                    Created
                                </SortableTableHead>
                                <SortableTableHead
                                    className="text-center w-[110px]"
                                    sorted={sorted("status")}
                                    onSort={() => toggleSort("status")}
                                >
                                    Status
                                </SortableTableHead>
                                <TableHead className="text-center w-[80px]">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                        Loading organizations…
                                    </TableCell>
                                </TableRow>
                            ) : displayTenants.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                        {showArchived ? "No archived organizations" : "No organizations match your search"}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                displayTenants.map(tenant => (
                                    <TableRow
                                        key={tenant.id}
                                        className="cursor-pointer"
                                        onClick={() => handleRowClick(tenant)}
                                    >
                                        <TableCell>
                                            <div className="space-y-0.5">
                                                <span className="font-medium">{tenant.name}</span>
                                                <span className="text-xs text-muted-foreground block">ID: {tenant.id}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {getPlanName(tenant.subscriptionPlan)}
                                        </TableCell>
                                        <TableCell className="text-right text-muted-foreground tabular-nums">
                                            {tenant.maxRooms} / {tenant.maxPersonnel}
                                        </TableCell>
                                        <TableCell className="text-center text-muted-foreground">
                                            {new Date(tenant.createdAt).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <span className={`text-sm font-medium ${
                                                tenant.status === "Active" ? "text-emerald-600" :
                                                tenant.status === "Inactive" ? "text-amber-600" :
                                                "text-muted-foreground"
                                            }`}>
                                                {tenant.status || "Active"}
                                            </span>
                                        </TableCell>

                                        {/* Meatball menu */}
                                        <TableCell className="text-center" onClick={e => e.stopPropagation()}>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                        <span className="sr-only">Actions</span>
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-40 z-[200]">
                                                    {(tenant.status === "Archived" || tenant.status === "Inactive") ? (
                                                        <DropdownMenuItem
                                                            onClick={() => setConfirmState({
                                                                tenantId: tenant.id,
                                                                action: "restore",
                                                                tenantName: tenant.name,
                                                            })}
                                                            className="gap-2 cursor-pointer"
                                                        >
                                                            <RotateCcw className="h-4 w-4 text-primary" />
                                                            Restore
                                                        </DropdownMenuItem>
                                                    ) : (
                                                        <DropdownMenuItem
                                                            onClick={() => setConfirmState({
                                                                tenantId: tenant.id,
                                                                action: "archive",
                                                                tenantName: tenant.name,
                                                            })}
                                                            className="gap-2 cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
                                                        >
                                                            <Archive className="h-4 w-4" />
                                                            Archive
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
            <div className="text-sm text-muted-foreground">
                Showing {displayTenants.length} of {filtered.length} organization{filtered.length !== 1 ? "s" : ""}
            </div>

            {/* Modals */}
            <TenantDetailsModal
                open={isDetailsModalOpen}
                onOpenChange={setIsDetailsModalOpen}
                tenant={selectedTenant}
                onEdit={handleEditFromDetails}
            />
            <EditTenantModal
                open={isEditModalOpen}
                onOpenChange={setIsEditModalOpen}
                tenant={selectedTenant}
                onSave={handleSave}
            />

            {/* Archive / Restore confirmation */}
            <ConfirmDialog
                open={!!confirmState}
                onOpenChange={open => { if (!open) setConfirmState(null); }}
                title={confirmState?.action === "archive" ? "Archive Organization" : "Restore Organization"}
                description={
                    confirmState?.action === "archive"
                        ? `Archive "${confirmState?.tenantName}"? It will be hidden from active views and its users will lose access.`
                        : `Restore "${confirmState?.tenantName}"? It will become active and its users will regain access.`
                }
                confirmLabel={confirmState?.action === "archive" ? "Archive" : "Restore"}
                confirmVariant={confirmState?.action === "archive" ? "destructive" : "default"}
                onConfirm={handleConfirm}
                isLoading={isConfirming}
            />
        </div>
    );
}
