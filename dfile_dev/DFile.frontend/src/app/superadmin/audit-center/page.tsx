"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusText } from "@/components/ui/status-text";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldCheck, Search, Activity, FileText, Users } from "lucide-react";
import { useAuditLogs, useAuditSummary } from "@/hooks/use-audit-logs";

export default function AuditCenterPage() {
    const [page, setPage] = useState(1);
    const [entityType, setEntityType] = useState<string>("");
    const [action, setAction] = useState<string>("");
    const [searchQuery, setSearchQuery] = useState("");

    const { data: logsResponse, isLoading } = useAuditLogs({
        page,
        pageSize: 25,
        entityType: entityType || undefined,
        action: action || undefined,
    });
    const { data: summary, isLoading: summaryLoading } = useAuditSummary();

    const logs = logsResponse?.data ?? [];
    const totalPages = logsResponse?.totalPages ?? 1;

    const filteredLogs = searchQuery
        ? logs.filter(l =>
            l.entityType.toLowerCase().includes(searchQuery.toLowerCase()) ||
            l.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
            l.userName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            l.entityId?.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : logs;

    const actionColors: Record<string, "info" | "success" | "warning" | "danger" | "muted"> = {
        Create: "success",
        Update: "info",
        Delete: "danger",
        Archive: "warning",
        Login: "muted",
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <ShieldCheck className="h-5 w-5 text-primary" />
                </div>
                <div>
                    <h1 className="text-xl font-semibold tracking-tight">Audit Center</h1>
                    <p className="text-sm text-muted-foreground">Platform-wide audit trail and compliance monitoring</p>
                </div>
            </div>

            {/* Summary Cards */}
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Card>
                    <div className="p-5 space-y-3">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">Total Logs</p>
                            <FileText className="h-4 w-4 text-muted-foreground" />
                        </div>
                        {summaryLoading ? <Skeleton className="h-8 w-16" /> : <p className="text-2xl font-bold">{summary?.totalLogs ?? 0}</p>}
                    </div>
                </Card>
                <Card>
                    <div className="p-5 space-y-3">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">Today</p>
                            <Activity className="h-4 w-4 text-muted-foreground" />
                        </div>
                        {summaryLoading ? <Skeleton className="h-8 w-16" /> : <p className="text-2xl font-bold">{summary?.todayLogs ?? 0}</p>}
                    </div>
                </Card>
                <Card>
                    <div className="p-5 space-y-3">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">This Week</p>
                            <Activity className="h-4 w-4 text-muted-foreground" />
                        </div>
                        {summaryLoading ? <Skeleton className="h-8 w-16" /> : <p className="text-2xl font-bold">{summary?.weekLogs ?? 0}</p>}
                    </div>
                </Card>
                <Card>
                    <div className="p-5 space-y-3">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">Unique Entities</p>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </div>
                        {summaryLoading ? <Skeleton className="h-8 w-16" /> : <p className="text-2xl font-bold">{Object.keys(summary?.byEntity ?? {}).length}</p>}
                    </div>
                </Card>
            </section>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search logs..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <Select value={action} onValueChange={(v) => { setAction(v === "all" ? "" : v); setPage(1); }}>
                    <SelectTrigger className="w-[160px]"><SelectValue placeholder="Action" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Actions</SelectItem>
                        <SelectItem value="Create">Create</SelectItem>
                        <SelectItem value="Update">Update</SelectItem>
                        <SelectItem value="Delete">Delete</SelectItem>
                        <SelectItem value="Archive">Archive</SelectItem>
                        <SelectItem value="Login">Login</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={entityType} onValueChange={(v) => { setEntityType(v === "all" ? "" : v); setPage(1); }}>
                    <SelectTrigger className="w-[160px]"><SelectValue placeholder="Entity" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Entities</SelectItem>
                        <SelectItem value="Asset">Asset</SelectItem>
                        <SelectItem value="Room">Room</SelectItem>
                        <SelectItem value="Tenant">Tenant</SelectItem>
                        <SelectItem value="User">User</SelectItem>
                        <SelectItem value="MaintenanceRecord">Maintenance</SelectItem>
                        <SelectItem value="PurchaseOrder">Purchase Order</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Audit Table */}
            <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold">Audit Trail</h2>
                <span className="text-sm text-muted-foreground">({logsResponse?.totalCount ?? 0} records)</span>
            </div>

            {isLoading ? (
                <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : filteredLogs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground rounded-md border">
                    <ShieldCheck className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <p>No audit logs found</p>
                </div>
            ) : (
                <>
                    <div className="rounded-md border overflow-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Timestamp</TableHead>
                                    <TableHead>Action</TableHead>
                                    <TableHead>Entity</TableHead>
                                    <TableHead>Entity ID</TableHead>
                                    <TableHead>User</TableHead>
                                    <TableHead>IP Address</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredLogs.map((log) => (
                                    <TableRow key={log.id}>
                                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                                            {new Date(log.createdAt).toLocaleString()}
                                        </TableCell>
                                        <TableCell>
                                            <StatusText variant={actionColors[log.action] ?? "muted"}>{log.action}</StatusText>
                                        </TableCell>
                                        <TableCell className="font-medium">{log.entityType}</TableCell>
                                        <TableCell className="text-sm text-muted-foreground font-mono">{log.entityId ?? "—"}</TableCell>
                                        <TableCell>{log.userName ?? "System"}</TableCell>
                                        <TableCell className="text-sm text-muted-foreground font-mono">{log.ipAddress ?? "—"}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page <= 1}
                                >
                                    Previous
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page >= totalPages}
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
