"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TablePagination } from "@/components/ui/table-pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { ClipboardList } from "lucide-react";
import { useAuditLogs } from "@/hooks/use-audit-logs";
import { useAuth } from "@/contexts/auth-context";

const ROLE_OPTIONS = ["Admin", "Finance", "Maintenance"] as const;

const MODULE_OPTIONS = [
    "Asset Management",
    "Allocation",
    "Finance",
    "Maintenance",
    "Procurement",
    "Locations",
    "Configuration",
    "Organization",
    "Personnel",
] as const;

const ACTION_OPTIONS = [
    "Create",
    "Update",
    "Delete",
    "Archive",
    "Restore",
    "Allocate",
    "Deallocate",
    "Approve",
] as const;

function endOfDayIso(dateStr: string): string {
    if (!dateStr) return "";
    const d = new Date(`${dateStr}T23:59:59.999`);
    return d.toISOString();
}

function startOfDayIso(dateStr: string): string {
    if (!dateStr) return "";
    const d = new Date(`${dateStr}T00:00:00.000`);
    return d.toISOString();
}

export default function TenantAuditLogsPage() {
    const { user } = useAuth();
    const isAdmin = user?.role === "Admin";

    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [roleFilter, setRoleFilter] = useState<string>("");
    const [moduleFilter, setModuleFilter] = useState<string>("");
    const [actionFilter, setActionFilter] = useState<string>("");
    const [dateFrom, setDateFrom] = useState<string>("");
    const [dateTo, setDateTo] = useState<string>("");

    const dateFromIso = useMemo(() => (dateFrom ? startOfDayIso(dateFrom) : undefined), [dateFrom]);
    const dateToIso = useMemo(() => (dateTo ? endOfDayIso(dateTo) : undefined), [dateTo]);

    const { data: logsResponse, isLoading, isError, error } = useAuditLogs({
        page,
        pageSize,
        userRole: roleFilter || undefined,
        module: moduleFilter || undefined,
        action: actionFilter || undefined,
        dateFrom: dateFromIso,
        dateTo: dateToIso,
        enabled: isAdmin,
    });

    const logs = logsResponse?.data ?? [];
    const currentPage = logsResponse?.page ?? page;

    if (!isAdmin) {
        return (
            <div className="rounded-lg border border-border p-8 text-center text-muted-foreground">
                <p className="font-medium text-foreground">Access restricted</p>
                <p className="text-sm mt-2">Only tenant administrators can view audit logs.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <ClipboardList className="h-5 w-5 text-primary" />
                </div>
                <div>
                    <h1 className="text-xl font-semibold tracking-tight">Audit Logs</h1>
                    <p className="text-sm text-muted-foreground">
                        Activity trail for your organization (tenant-scoped).
                    </p>
                </div>
            </div>

            <Card className="p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
                    <div className="space-y-1.5 min-w-[140px]">
                        <label className="text-xs font-medium text-muted-foreground">From</label>
                        <Input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                            className="h-10"
                        />
                    </div>
                    <div className="space-y-1.5 min-w-[140px]">
                        <label className="text-xs font-medium text-muted-foreground">To</label>
                        <Input
                            type="date"
                            value={dateTo}
                            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                            className="h-10"
                        />
                    </div>
                    <div className="space-y-1.5 min-w-[160px]">
                        <label className="text-xs font-medium text-muted-foreground">Role</label>
                        <Select value={roleFilter || "all"} onValueChange={(v) => { setRoleFilter(v === "all" ? "" : v); setPage(1); }}>
                            <SelectTrigger className="h-10"><SelectValue placeholder="All roles" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All roles</SelectItem>
                                {ROLE_OPTIONS.map((r) => (
                                    <SelectItem key={r} value={r}>{r}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1.5 min-w-[180px]">
                        <label className="text-xs font-medium text-muted-foreground">Module</label>
                        <Select value={moduleFilter || "all"} onValueChange={(v) => { setModuleFilter(v === "all" ? "" : v); setPage(1); }}>
                            <SelectTrigger className="h-10"><SelectValue placeholder="All modules" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All modules</SelectItem>
                                {MODULE_OPTIONS.map((m) => (
                                    <SelectItem key={m} value={m}>{m}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1.5 min-w-[160px]">
                        <label className="text-xs font-medium text-muted-foreground">Action</label>
                        <Select value={actionFilter || "all"} onValueChange={(v) => { setActionFilter(v === "all" ? "" : v); setPage(1); }}>
                            <SelectTrigger className="h-10"><SelectValue placeholder="All actions" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All actions</SelectItem>
                                {ACTION_OPTIONS.map((a) => (
                                    <SelectItem key={a} value={a}>{a}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </Card>

            <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold">Records</h2>
                <span className="text-sm text-muted-foreground">({logsResponse?.totalCount ?? 0} total)</span>
            </div>

            {isError && (
                <p className="text-sm text-destructive">
                    {(error as Error)?.message ?? "Failed to load audit logs."}
                </p>
            )}

            {isLoading ? (
                <div className="space-y-3">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : logs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground rounded-md border">
                    <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <p>No audit records match your filters.</p>
                </div>
            ) : (
                <div className="rounded-md border overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="whitespace-nowrap">Timestamp</TableHead>
                                <TableHead>User</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Module</TableHead>
                                <TableHead>Action</TableHead>
                                <TableHead className="min-w-[220px]">Description</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {logs.map((log) => (
                                <TableRow key={log.id}>
                                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap align-top">
                                        {new Date(log.createdAt).toLocaleString()}
                                    </TableCell>
                                    <TableCell className="align-top text-sm">{log.userName ?? "—"}</TableCell>
                                    <TableCell className="align-top text-sm text-muted-foreground">{log.userRole ?? "—"}</TableCell>
                                    <TableCell className="align-top text-sm">{log.module ?? "—"}</TableCell>
                                    <TableCell className="align-top text-sm font-medium">{log.action}</TableCell>
                                    <TableCell className="align-top text-sm text-muted-foreground">
                                        {log.description?.trim()
                                            || [log.action, log.entityType, log.entityId].filter(Boolean).join(" · ")}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    <TablePagination
                        totalItems={logsResponse?.totalCount ?? 0}
                        pageSize={logsResponse?.pageSize ?? pageSize}
                        pageIndex={currentPage - 1}
                        onPageChange={(idx) => setPage(idx + 1)}
                        onPageSizeChange={setPageSize}
                        pageSizeOptions={[10, 25, 50, 100]}
                    />
                </div>
            )}
        </div>
    );
}
