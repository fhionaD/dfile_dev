"use client";

import { useState, useMemo } from "react";
import {
    ShoppingCart, Clock, CheckCircle2, Plus, Archive, RotateCcw, Search, Filter, Calendar as CalendarIcon, XCircle, Eye, MoreHorizontal,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { TablePagination, paginateData } from "@/components/ui/table-pagination";
import { CurrencyCell } from "@/components/ui/currency-cell";
import { StatusText } from "@/components/ui/status-text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PurchaseOrder } from "@/types/asset";
import { usePurchaseOrders, useArchiveOrder, useRestoreOrder } from "@/hooks/use-procurement";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Skeleton } from "@/components/ui/skeleton";

interface ProcurementViewProps {
    onNewOrder: () => void;
    onOrderClick?: (order: PurchaseOrder) => void;
}

const statusVariant: Record<string, "info" | "success" | "warning" | "danger" | "muted"> = {
    Pending: "warning",
    Approved: "info",
    Delivered: "success",
    Cancelled: "danger",
};

export function ProcurementView({ onNewOrder, onOrderClick }: ProcurementViewProps) {
    const [showArchived, setShowArchived] = useState(false);
    const { data: orders = [], isLoading } = usePurchaseOrders(showArchived);
    const archiveMutation = useArchiveOrder();
    const restoreMutation = useRestoreOrder();

    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [dateFilter, setDateFilter] = useState("All Time");
    const [archiveTarget, setArchiveTarget] = useState<string | null>(null);
    const [pageIndex, setPageIndex] = useState(0);
    const [pageSize, setPageSize] = useState(10);

    const filteredOrders = useMemo(() => {
        return orders.filter((order) => {
            if (showArchived !== !!order.archived) return false;

            const q = searchQuery.toLowerCase();
            const matchesSearch =
                order.id.toLowerCase().includes(q) ||
                order.assetName.toLowerCase().includes(q) ||
                (order.vendor && order.vendor.toLowerCase().includes(q));
            if (!matchesSearch) return false;

            if (statusFilter !== "All" && order.status !== statusFilter) return false;

            if (dateFilter !== "All Time") {
                const dateStr = order.purchaseDate || order.createdAt;
                if (!dateStr) return false;
                const date = new Date(dateStr);
                const now = new Date();

                if (dateFilter === "This Month") {
                    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
                }
                if (dateFilter === "Last Month") {
                    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                    return date.getMonth() === lastMonth.getMonth() && date.getFullYear() === lastMonth.getFullYear();
                }
                if (dateFilter === "This Year") {
                    return date.getFullYear() === now.getFullYear();
                }
            }

            return true;
        });
    }, [orders, showArchived, searchQuery, statusFilter, dateFilter]);

    const totalOrders = orders.length;
    const pendingOrders = orders.filter((o) => o.status === "Pending").length;
    const approvedOrders = orders.filter((o) => o.status === "Approved" || o.status === "Delivered").length;
    const totalSpend = orders.reduce((sum, o) => sum + o.purchasePrice, 0);
    const activeCount = orders.filter((o) => !o.archived).length;
    const archivedCount = orders.filter((o) => o.archived).length;

    const paginatedOrders = paginateData(filteredOrders, pageIndex, pageSize);

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <Card key={i} className="p-4 h-24">
                            <Skeleton className="h-full w-full" />
                        </Card>
                    ))}
                </div>
                <Card className="p-6">
                    <Skeleton className="h-[400px] w-full" />
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <ShoppingCart className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Total Orders</p>
                            <p className="text-2xl font-bold">{totalOrders}</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                            <Clock className="h-5 w-5 text-amber-600" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Pending Approval</p>
                            <p className="text-2xl font-bold text-amber-600">{pendingOrders}</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Approved / Delivered</p>
                            <p className="text-2xl font-bold text-emerald-600">{approvedOrders}</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                            <ShoppingCart className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Total Spend</p>
                            <CurrencyCell value={totalSpend} className="text-2xl font-bold text-blue-600" />
                        </div>
                    </div>
                </Card>
            </div>

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold">{showArchived ? "Archived Orders" : "Purchase Orders"}</h2>
                    <span className="text-sm text-muted-foreground">({filteredOrders.length} of {orders.length})</span>
                </div>
                <div className="flex flex-col lg:flex-row gap-3">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search orders..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 h-10"
                        />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[180px] h-10">
                            <div className="flex items-center gap-2">
                                <Filter className="w-4 h-4 text-muted-foreground" />
                                <SelectValue placeholder="Status" />
                            </div>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="All">All Status</SelectItem>
                            <SelectItem value="Pending">Pending</SelectItem>
                            <SelectItem value="Approved">Approved</SelectItem>
                            <SelectItem value="Delivered">Delivered</SelectItem>
                            <SelectItem value="Cancelled">Cancelled</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={dateFilter} onValueChange={setDateFilter}>
                        <SelectTrigger className="w-[180px] h-10">
                            <div className="flex items-center gap-2">
                                <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                                <SelectValue placeholder="Period" />
                            </div>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="All Time">All Time</SelectItem>
                            <SelectItem value="This Month">This Month</SelectItem>
                            <SelectItem value="Last Month">Last Month</SelectItem>
                            <SelectItem value="This Year">This Year</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button onClick={onNewOrder} size="sm" className="h-10 gap-2">
                        <Plus size={16} />
                        New Order
                    </Button>
                    <Button
                        variant={showArchived ? "default" : "outline"}
                        size="sm"
                        className="h-10 gap-2"
                        onClick={() => setShowArchived(!showArchived)}
                    >
                        {showArchived ? (
                            <><RotateCcw size={16} /> Active ({activeCount})</>
                        ) : (
                            <><Archive size={16} /> Archived ({archivedCount})</>
                        )}
                    </Button>
                </div>
            </div>

            {/* Orders Table */}
            {filteredOrders.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground rounded-md border">
                    <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <p>{showArchived ? "No archived orders" : "No purchase orders match your filters"}</p>
                </div>
            ) : (
                <div className="rounded-md border overflow-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Order ID</TableHead>
                                <TableHead>Asset</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead>Vendor</TableHead>
                                <TableHead className="text-right">Price</TableHead>
                                <TableHead>Purchase Date</TableHead>
                                <TableHead>Useful Life</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Asset ID</TableHead>
                                <TableHead className="w-[80px] text-center">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedOrders.map((order) => (
                                <TableRow key={order.id} className="cursor-pointer" onClick={() => onOrderClick?.(order)}>
                                    <TableCell className="font-mono text-xs text-muted-foreground">{order.id}</TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium">{order.assetName}</span>
                                            {order.manufacturer && (
                                                <span className="text-xs text-muted-foreground">{order.manufacturer} {order.model}</span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">{order.category || "—"}</TableCell>
                                    <TableCell className="text-muted-foreground">{order.vendor || "—"}</TableCell>
                                    <TableCell className="text-right">
                                        <CurrencyCell value={order.purchasePrice} />
                                    </TableCell>
                                    <TableCell className="text-muted-foreground text-sm">{order.purchaseDate || "—"}</TableCell>
                                    <TableCell className="text-muted-foreground text-sm">{order.usefulLifeYears} yrs</TableCell>
                                    <TableCell>
                                        <StatusText variant={statusVariant[order.status] ?? "muted"}>{order.status}</StatusText>
                                    </TableCell>
                                    <TableCell className="font-mono text-xs text-muted-foreground">{order.assetId || "—"}</TableCell>
                                    <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Actions">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-40">
                                                <DropdownMenuItem onClick={() => onOrderClick?.(order)} className="gap-2 cursor-pointer">
                                                    <Eye className="h-4 w-4" /> View Details
                                                </DropdownMenuItem>
                                                {showArchived ? (
                                                    <DropdownMenuItem
                                                        onClick={() => restoreMutation.mutate(order.id)}
                                                        className="gap-2 cursor-pointer text-emerald-600 focus:text-emerald-600 focus:bg-emerald-500/10"
                                                    >
                                                        <RotateCcw className="h-4 w-4" /> Restore
                                                    </DropdownMenuItem>
                                                ) : (
                                                    <DropdownMenuItem
                                                        onClick={() => setArchiveTarget(order.id)}
                                                        className="gap-2 cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
                                                    >
                                                        <Archive className="h-4 w-4" /> Archive
                                                    </DropdownMenuItem>
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    <TablePagination
                        totalItems={filteredOrders.length}
                        pageSize={pageSize}
                        pageIndex={pageIndex}
                        onPageChange={setPageIndex}
                        onPageSizeChange={setPageSize}
                    />
                </div>
            )}

            <ConfirmDialog
                open={!!archiveTarget}
                onOpenChange={(open) => { if (!open) setArchiveTarget(null); }}
                title="Archive Order"
                description="Are you sure you want to archive this purchase order? You can restore it later."
                confirmLabel="Archive"
                confirmVariant="destructive"
                onConfirm={() => {
                    if (archiveTarget) {
                        archiveMutation.mutate(archiveTarget);
                        setArchiveTarget(null);
                    }
                }}
            />
        </div>
    );
}
