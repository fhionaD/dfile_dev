"use client";

import { useState } from "react";
import { ShoppingCart, Clock, CheckCircle2, DollarSign, Plus, Package, Archive, RotateCcw, Search, Filter, Calendar as CalendarIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PurchaseOrder } from "@/types/asset";
import { usePurchaseOrders, useArchiveOrder } from "@/hooks/use-procurement";
import { Skeleton } from "@/components/ui/skeleton";

interface ProcurementViewProps {
    onNewOrder: () => void;
    onOrderClick?: (order: PurchaseOrder) => void;
}

export function ProcurementView({ onNewOrder, onOrderClick }: ProcurementViewProps) {
    const { data: orders = [], isLoading } = usePurchaseOrders();
    const archiveOrderMutation = useArchiveOrder();

    const [showArchived, setShowArchived] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [dateFilter, setDateFilter] = useState("All Time");

    // Filter Logic
    const filteredOrders = orders.filter(order => {
        // 1. Archive Status
        if (showArchived !== !!order.archived) return false;

        // 2. Text Search
        const query = searchQuery.toLowerCase();
        const matchesSearch =
            order.id.toLowerCase().includes(query) ||
            order.assetName.toLowerCase().includes(query) ||
            (order.vendor && order.vendor.toLowerCase().includes(query));

        if (!matchesSearch) return false;

        // 3. Status Filter
        if (statusFilter !== "All" && order.status !== statusFilter) return false;

        // 4. Date Filter
        if (dateFilter !== "All Time") {
            const dateStr = order.purchaseDate || order.createdAt; // Use purchase date or created date
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

    const activeOrders = orders.filter(o => !o.archived);
    const archivedOrders = orders.filter(o => o.archived);

    // Summary stats
    const totalOrders = orders.length;
    const pendingOrders = orders.filter(o => o.status === "Pending").length;
    const approvedOrders = orders.filter(o => o.status === "Approved" || o.status === "Delivered").length;
    const totalSpend = orders.reduce((sum, o) => sum + o.purchasePrice, 0);

    const statusColor: Record<string, string> = {
        Pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
        Approved: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
        Delivered: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
        Cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    };

    const summaryCards = [
        { label: "Total Orders", value: totalOrders.toString(), icon: ShoppingCart, color: "bg-primary" },
        { label: "Pending Approval", value: pendingOrders.toString(), icon: Clock, color: "bg-amber-500" },
        { label: "Approved / Delivered", value: approvedOrders.toString(), icon: CheckCircle2, color: "bg-emerald-500" },
        { label: "Total Spend", value: `$${totalSpend.toLocaleString()}`, icon: DollarSign, color: "bg-blue-500" },
    ];

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="bg-card rounded-xl border border-border p-4 shadow-sm h-24">
                            <Skeleton className="h-full w-full" />
                        </div>
                    ))}
                </div>
                <div className="rounded-xl border border-border p-6 space-y-4">
                    <Skeleton className="h-8 w-full mb-4" />
                    <div className="space-y-2">
                        {[...Array(5)].map((_, i) => (
                            <Skeleton key={i} className="h-12 w-full" />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {summaryCards.map((stat) => (
                    <Card key={stat.label} className="border-border">
                        <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-lg font-semibold text-foreground tracking-tight">{stat.value}</p>
                                    <p className="text-[11px] font-medium text-muted-foreground mt-0.5">{stat.label}</p>
                                </div>
                                <div className={`${stat.color} p-1.5 rounded-md`}>
                                    <stat.icon size={14} className="text-white" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Orders Table */}
            <Card className="border-border">
                <div className="p-6 border-b border-border bg-muted/40">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                <ShoppingCart size={18} />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-foreground">Purchase Orders</h3>
                                <p className="text-xs text-muted-foreground mt-0.5">{showArchived ? "Archived purchase orders" : "Track asset procurement from request to delivery"}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant={showArchived ? "default" : "outline"} size="sm" className="text-xs font-medium h-8" onClick={() => setShowArchived(!showArchived)}>
                                {showArchived ? <><RotateCcw size={14} className="mr-1.5" />Active ({activeOrders.length})</> : <><Archive size={14} className="mr-1.5" />Archived ({archivedOrders.length})</>}
                            </Button>
                            <Button onClick={onNewOrder} size="sm" className="rounded-xl h-8 text-xs bg-primary text-primary-foreground shadow-lg hover:bg-primary/90">
                                <Plus size={14} className="mr-2" />
                                New Procurement
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Search and Filters Toolbar */}
                <div className="p-4 border-b border-border bg-muted/20 flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search orders..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 h-9 bg-background"
                        />
                    </div>
                    <div className="flex gap-2">
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-[180px] h-9 bg-background">
                                <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="All">All Status</SelectItem>
                                <SelectItem value="Pending">Pending</SelectItem>
                                <SelectItem value="Approved">Approved</SelectItem>
                                <SelectItem value="Ordered">Ordered</SelectItem>
                                <SelectItem value="Delivered">Delivered</SelectItem>
                                <SelectItem value="Cancelled">Cancelled</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={dateFilter} onValueChange={setDateFilter}>
                            <SelectTrigger className="w-[180px] h-9 bg-background">
                                <CalendarIcon className="w-4 h-4 mr-2 text-muted-foreground" />
                                <SelectValue placeholder="Period" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="All Time">All Time</SelectItem>
                                <SelectItem value="This Month">This Month</SelectItem>
                                <SelectItem value="Last Month">Last Month</SelectItem>
                                <SelectItem value="This Year">This Year</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/30">
                                <TableHead className="text-xs font-medium text-muted-foreground">Order ID</TableHead>
                                <TableHead className="text-xs font-medium text-muted-foreground">Asset</TableHead>
                                <TableHead className="text-xs font-medium text-muted-foreground text-center">Category</TableHead>
                                <TableHead className="text-xs font-medium text-muted-foreground">Vendor</TableHead>
                                <TableHead className="text-xs font-medium text-muted-foreground text-right">Price</TableHead>
                                <TableHead className="text-xs font-medium text-muted-foreground text-center">Purchase Date</TableHead>
                                <TableHead className="text-xs font-medium text-muted-foreground text-center">Useful Life</TableHead>
                                <TableHead className="text-xs font-medium text-muted-foreground text-center">Status</TableHead>
                                <TableHead className="text-xs font-medium text-muted-foreground text-center">Asset ID</TableHead>
                                <TableHead className="text-xs font-medium text-muted-foreground text-center w-[80px]">{showArchived ? "Restore" : "Archive"}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredOrders.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={10} className="h-32 text-center">
                                        <div className="flex flex-col items-center text-muted-foreground">
                                            <Package size={32} className="mb-2 opacity-30" />
                                            <p className="text-sm">No purchase orders found</p>
                                            <p className="text-xs mt-1">Try adjusting your filters</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredOrders.map((order) => (
                                    <TableRow key={order.id} className="hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => onOrderClick?.(order)}>
                                        <TableCell className="font-mono text-xs text-muted-foreground">{order.id}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium text-foreground">{order.assetName}</span>
                                                {order.manufacturer && (
                                                    <span className="text-[10px] text-muted-foreground">{order.manufacturer} {order.model}</span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant="outline" className="text-[10px]">{order.category}</Badge>
                                        </TableCell>
                                        <TableCell className="text-sm">{order.vendor || "—"}</TableCell>
                                        <TableCell className="text-right text-sm font-medium">${order.purchasePrice.toLocaleString()}</TableCell>
                                        <TableCell className="text-center text-sm">{order.purchaseDate}</TableCell>
                                        <TableCell className="text-center text-sm">{order.usefulLifeYears} yrs</TableCell>
                                        <TableCell className="text-center">
                                            <Badge className={`text-[10px] font-medium ${statusColor[order.status] || ""}`}>
                                                {order.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-center font-mono text-xs text-muted-foreground">
                                            {order.assetId || "—"}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    archiveOrderMutation.mutate(order.id);
                                                }}
                                                className={`p-1.5 rounded-md transition-colors ${order.archived ? 'text-primary hover:bg-primary/10' : 'text-muted-foreground hover:text-destructive hover:bg-destructive/10'}`}
                                                title={order.archived ? 'Restore' : 'Archive'}
                                            >
                                                {order.archived ? <RotateCcw size={16} /> : <Archive size={16} />}
                                            </button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </Card>
        </div>
    );
}
