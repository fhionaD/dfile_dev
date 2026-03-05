"use client";

import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { StatusText } from "@/components/ui/status-text";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CalendarClock, Search, Clock, CheckCircle2, Calendar } from "lucide-react";
import { useMaintenanceRecords } from "@/hooks/use-maintenance";

export default function SchedulesPage() {
    const { data: records = [], isLoading } = useMaintenanceRecords();
    const [searchQuery, setSearchQuery] = useState("");
    const [frequencyFilter, setFrequencyFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");

    const scheduledRecords = useMemo(() => {
        return records.filter(r => !r.archived && (r.frequency && r.frequency !== "One-time" || r.status === "Scheduled"));
    }, [records]);

    const filtered = useMemo(() => {
        return scheduledRecords.filter(r => {
            if (frequencyFilter !== "all" && r.frequency !== frequencyFilter) return false;
            if (statusFilter !== "all" && r.status !== statusFilter) return false;
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                return r.description.toLowerCase().includes(q) || r.assetId.toLowerCase().includes(q);
            }
            return true;
        });
    }, [scheduledRecords, searchQuery, frequencyFilter, statusFilter]);

    const scheduledCount = filtered.filter(r => r.status === "Scheduled").length;
    const pendingCount = filtered.filter(r => r.status === "Pending").length;
    const completedCount = filtered.filter(r => r.status === "Completed").length;

    const priorityVariant: Record<string, "danger" | "warning" | "info" | "muted"> = {
        High: "danger",
        Medium: "warning",
        Low: "info",
    };

    const statusVariant: Record<string, "info" | "success" | "warning" | "muted"> = {
        Scheduled: "info",
        Pending: "warning",
        "In Progress": "warning",
        Completed: "success",
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <CalendarClock className="h-5 w-5 text-primary" />
                </div>
                <div>
                    <h1 className="text-xl font-semibold tracking-tight">Maintenance Schedules</h1>
                    <p className="text-sm text-muted-foreground">Recurring and scheduled maintenance plans</p>
                </div>
            </div>

            {/* Summary */}
            <section className="grid gap-4 sm:grid-cols-3">
                <Card>
                    <div className="p-5 space-y-3">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">Scheduled</p>
                            <Calendar className="h-4 w-4 text-blue-600" />
                        </div>
                        {isLoading ? <Skeleton className="h-8 w-16" /> : <p className="text-2xl font-bold text-blue-600">{scheduledCount}</p>}
                    </div>
                </Card>
                <Card>
                    <div className="p-5 space-y-3">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">Pending</p>
                            <Clock className="h-4 w-4 text-amber-600" />
                        </div>
                        {isLoading ? <Skeleton className="h-8 w-16" /> : <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>}
                    </div>
                </Card>
                <Card>
                    <div className="p-5 space-y-3">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">Completed</p>
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        </div>
                        {isLoading ? <Skeleton className="h-8 w-16" /> : <p className="text-2xl font-bold text-emerald-600">{completedCount}</p>}
                    </div>
                </Card>
            </section>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search schedules..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
                </div>
                <Select value={frequencyFilter} onValueChange={setFrequencyFilter}>
                    <SelectTrigger className="w-[160px]"><SelectValue placeholder="Frequency" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Frequencies</SelectItem>
                        <SelectItem value="Daily">Daily</SelectItem>
                        <SelectItem value="Weekly">Weekly</SelectItem>
                        <SelectItem value="Monthly">Monthly</SelectItem>
                        <SelectItem value="Yearly">Yearly</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="Scheduled">Scheduled</SelectItem>
                        <SelectItem value="Pending">Pending</SelectItem>
                        <SelectItem value="In Progress">In Progress</SelectItem>
                        <SelectItem value="Completed">Completed</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Schedule Table */}
            <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold">Schedules</h2>
                <span className="text-sm text-muted-foreground">({filtered.length} records)</span>
            </div>

            {isLoading ? (
                <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground rounded-md border">
                    <CalendarClock className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <p>No scheduled maintenance found</p>
                </div>
            ) : (
                <div className="rounded-md border overflow-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Asset ID</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Frequency</TableHead>
                                <TableHead>Priority</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Start Date</TableHead>
                                <TableHead>End Date</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.map(r => (
                                <TableRow key={r.id}>
                                    <TableCell className="font-mono text-sm">{r.assetId}</TableCell>
                                    <TableCell className="font-medium max-w-[200px] truncate">{r.description}</TableCell>
                                    <TableCell><StatusText variant="muted">{r.type}</StatusText></TableCell>
                                    <TableCell>
                                        <StatusText variant="info">{r.frequency ?? "One-time"}</StatusText>
                                    </TableCell>
                                    <TableCell>
                                        <StatusText variant={priorityVariant[r.priority] ?? "muted"}>{r.priority}</StatusText>
                                    </TableCell>
                                    <TableCell>
                                        <StatusText variant={statusVariant[r.status] ?? "muted"}>{r.status}</StatusText>
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {r.startDate ? new Date(r.startDate).toLocaleDateString() : "—"}
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {r.endDate ? new Date(r.endDate).toLocaleDateString() : "—"}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}
        </div>
    );
}
