"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3, Building2, Users, Package, DoorOpen, Wrench, ShoppingCart, AlertCircle } from "lucide-react";
import { usePlatformMetrics } from "@/hooks/use-tenants";

export default function PlatformMetricsPage() {
    const { data: metrics, isLoading } = usePlatformMetrics();

    const cards = [
        { label: "Total Tenants", value: metrics?.totalTenants, icon: Building2, color: "text-blue-600", bg: "bg-blue-500/10" },
        { label: "Active Tenants", value: metrics?.activeTenants, icon: Building2, color: "text-emerald-600", bg: "bg-emerald-500/10" },
        { label: "Suspended Tenants", value: metrics?.suspendedTenants, icon: Building2, color: "text-red-600", bg: "bg-red-500/10" },
        { label: "Total Users", value: metrics?.totalUsers, icon: Users, color: "text-violet-600", bg: "bg-violet-500/10" },
        { label: "Total Assets", value: metrics?.totalAssets, icon: Package, color: "text-blue-600", bg: "bg-blue-500/10" },
        { label: "Total Rooms", value: metrics?.totalRooms, icon: DoorOpen, color: "text-teal-600", bg: "bg-teal-500/10" },
        { label: "Maintenance Records", value: metrics?.totalMaintenanceRecords, icon: Wrench, color: "text-amber-600", bg: "bg-amber-500/10" },
        { label: "Pending Orders", value: metrics?.pendingOrders, icon: ShoppingCart, color: "text-orange-600", bg: "bg-orange-500/10" },
        { label: "Open Maintenance", value: metrics?.openMaintenanceRecords, icon: AlertCircle, color: "text-red-600", bg: "bg-red-500/10" },
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <BarChart3 className="h-5 w-5 text-primary" />
                </div>
                <div>
                    <h1 className="text-xl font-semibold tracking-tight">Platform Metrics</h1>
                    <p className="text-sm text-muted-foreground">Cross-tenant aggregated statistics</p>
                </div>
            </div>

            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {cards.map((c) => (
                    <Card key={c.label}>
                        <div className="p-5 space-y-4">
                            <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-muted-foreground">{c.label}</p>
                                <div className={`h-10 w-10 rounded-xl ${c.bg} flex items-center justify-center`}>
                                    <c.icon className={`h-5 w-5 ${c.color}`} />
                                </div>
                            </div>
                            {isLoading ? (
                                <Skeleton className="h-10 w-20" />
                            ) : (
                                <p className="text-3xl font-bold tracking-tight">{c.value?.toLocaleString() ?? 0}</p>
                            )}
                        </div>
                    </Card>
                ))}
            </section>

            {/* Utilization Summary */}
            {!isLoading && metrics && (
                <Card>
                    <CardHeader>
                        <CardTitle>Platform Utilization</CardTitle>
                        <CardDescription>Key operational ratios</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-6 sm:grid-cols-3">
                            <div className="space-y-1">
                                <p className="text-sm text-muted-foreground">Assets per Tenant</p>
                                <p className="text-2xl font-bold">
                                    {metrics.activeTenants > 0 ? (metrics.totalAssets / metrics.activeTenants).toFixed(1) : "—"}
                                </p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm text-muted-foreground">Users per Tenant</p>
                                <p className="text-2xl font-bold">
                                    {metrics.activeTenants > 0 ? (metrics.totalUsers / metrics.activeTenants).toFixed(1) : "—"}
                                </p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm text-muted-foreground">Open Maintenance Rate</p>
                                <p className="text-2xl font-bold">
                                    {metrics.totalMaintenanceRecords > 0
                                        ? ((metrics.openMaintenanceRecords / metrics.totalMaintenanceRecords) * 100).toFixed(1) + "%"
                                        : "—"}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
