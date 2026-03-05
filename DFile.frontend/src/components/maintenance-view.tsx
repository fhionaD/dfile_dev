import { useState } from "react";
import { Wrench, Plus, AlertTriangle, CheckCircle2, Clock, Archive, RotateCcw, Search, Filter, Calendar as CalendarIcon, TrendingDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StatusText } from "@/components/ui/status-text";
import { Card } from "@/components/ui/card";
import { MaintenanceRecord, Asset } from "@/types/asset";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMaintenanceRecords, useUpdateMaintenanceStatus, useArchiveMaintenanceRecord, useAddMaintenanceRecord } from "@/hooks/use-maintenance";
import { useAssets } from "@/hooks/use-assets";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCardSkeleton } from "@/components/ui/stat-card";
import { CreateMaintenanceModal } from "@/components/modals/create-maintenance-modal";

interface MaintenanceViewProps {
    // No longer needs data props
    onScheduleMaintenance?: (assetId: string) => void;
    onRequestReplacement?: (assetId: string) => void;
}

export function MaintenanceView({ onScheduleMaintenance, onRequestReplacement }: MaintenanceViewProps) {
    const { data: records = [], isLoading: isLoadingRecords } = useMaintenanceRecords();
    const { data: assets = [], isLoading: isLoadingAssets } = useAssets();

    // Mutations
    const updateStatusMutation = useUpdateMaintenanceStatus();
    const archiveRecordMutation = useArchiveMaintenanceRecord();

    const [showArchived, setShowArchived] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // Request Filters
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [priorityFilter, setPriorityFilter] = useState("All");
    const [dateFilter, setDateFilter] = useState("All Time");

    // Asset Schedule Filter
    const [assetSearchQuery, setAssetSearchQuery] = useState("");

    // Helper functions
    const getAssetName = (id: string) => {
        const asset = assets.find(a => a.id === id);
        return asset ? asset.desc : id;
    };



    // Loading State
    if (isLoadingRecords || isLoadingAssets) {
        return (
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <StatCardSkeleton key={i} />
                    ))}
                </div>
                <div className=" border border-border overflow-hidden bg-card p-6 space-y-4">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-10 w-full" />
                    <div className="space-y-2">
                        {[...Array(5)].map((_, i) => (
                            <Skeleton key={i} className="h-12 w-full" />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    const filteredRecords = records.filter(record => {
        if (showArchived !== !!record.archived) return false;
        const query = searchQuery.toLowerCase();
        const assetName = getAssetName(record.assetId).toLowerCase();
        const matchesSearch =
            record.id.toLowerCase().includes(query) ||
            record.description.toLowerCase().includes(query) ||
            record.assetId.toLowerCase().includes(query) ||
            assetName.includes(query);

        if (!matchesSearch) return false;
        if (statusFilter !== "All" && record.status !== statusFilter) return false;
        if (priorityFilter !== "All" && record.priority !== priorityFilter) return false;
        if (dateFilter !== "All Time") {
            const date = new Date(record.dateReported);
            const now = new Date();
            if (dateFilter === "This Month") {
                if (date.getMonth() !== now.getMonth() || date.getFullYear() !== now.getFullYear()) return false;
            }
            if (dateFilter === "Last Month") {
                const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                if (date.getMonth() !== lastMonth.getMonth() || date.getFullYear() !== lastMonth.getFullYear()) return false;
            }
            if (dateFilter === "This Year") {
                if (date.getFullYear() !== now.getFullYear()) return false;
            }
        }
        return true;
    });

    // KPI Calculations
    const openRequests = records.filter(r => !r.archived && (r.status === "Pending" || r.status === "In Progress")).length;
    
    const overdueRequests = records.filter(r => {
        if (r.archived || r.status === "Completed") return false;
        const targetDate = r.startDate ? new Date(r.startDate) : new Date(r.dateReported);
        return targetDate < new Date();
    }).length;

    const inRepair = records.filter(r => !r.archived && r.status === "In Progress").length;
    
    const immediateAttention = records.filter(r => !r.archived && r.status !== "Completed" && r.priority === "High").length;

    const scheduledThisWeek = records.filter(r => {
        if (r.archived || r.status !== "Scheduled" || !r.startDate) return false;
        const start = new Date(r.startDate);
        const curr = new Date(); 
        const first = curr.getDate() - curr.getDay(); 
        const last = first + 6; 

        // Create new date objects to avoid mutation side effects
        const firstday = new Date(curr.setDate(first));
        const lastday = new Date(new Date().setDate(last));
        
        return start >= firstday && start <= lastday;
    }).length;

    // MTTR Calculation (Average Resolution Time in Days)
    const completedRepairs = records.filter(r => r.status === "Completed" && r.endDate && r.startDate);
    const totalRepairTime = completedRepairs.reduce((acc, r) => {
        const start = new Date(r.startDate!);
        const end = new Date(r.endDate!);
        return acc + (end.getTime() - start.getTime());
    }, 0);
    const mttrDays = completedRepairs.length > 0
        ? Math.round((totalRepairTime / completedRepairs.length) / (1000 * 60 * 60 * 24))
        : 0;

    const activeRecords = records.filter(r => !r.archived);

    const statusVariant: Record<string, "warning" | "info" | "success" | "muted"> = {
        Pending: "warning",
        "In Progress": "info",
        Completed: "success",
    };


    return (
        <div className="space-y-8">
            {/* KPI Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                <Card>
                    <div className="p-6 flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-muted-foreground">Open Requests</p>
                            <p className="text-3xl font-bold tracking-tight text-red-600">{openRequests}</p>
                        </div>
                        <div className="h-12 w-12 rounded-xl bg-red-500/10 flex items-center justify-center">
                            <AlertTriangle className="h-5 w-5 text-red-600" />
                        </div>
                    </div>
                </Card>
                
                <Card>
                    <div className="p-6 flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-muted-foreground">Overdue</p>
                            <p className="text-3xl font-bold tracking-tight text-orange-600">{overdueRequests}</p>
                        </div>
                        <div className="h-12 w-12 rounded-xl bg-orange-500/10 flex items-center justify-center">
                             <Clock className="h-5 w-5 text-orange-600" />
                        </div>
                    </div>
                </Card>

                <Card>
                    <div className="p-6 flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-muted-foreground">In Repair</p>
                            <p className="text-3xl font-bold tracking-tight text-blue-600">{inRepair}</p>
                        </div>
                        <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                             <Wrench className="h-5 w-5 text-blue-600" />
                        </div>
                    </div>
                </Card>

                <Card>
                    <div className="p-6 flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-muted-foreground">Attention Needed</p>
                            <p className="text-3xl font-bold tracking-tight text-yellow-600">{immediateAttention}</p>
                        </div>
                        <div className="h-12 w-12 rounded-xl bg-yellow-500/10 flex items-center justify-center">
                             <AlertTriangle className="h-5 w-5 text-yellow-600" />
                        </div>
                    </div>
                </Card>

                <Card>
                    <div className="p-6 flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-muted-foreground">Scheduled (Week)</p>
                            <p className="text-3xl font-bold tracking-tight text-emerald-600">{scheduledThisWeek}</p>
                        </div>
                        <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                             <CalendarIcon className="h-5 w-5 text-emerald-600" />
                        </div>
                    </div>
                </Card>

                <Card>
                    <div className="p-6 flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-muted-foreground">Avg MTTR</p>
                            <p className="text-3xl font-bold tracking-tight text-indigo-600">{mttrDays} <span className="text-sm font-normal text-muted-foreground">days</span></p>
                        </div>
                        <div className="h-12 w-12 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                             <TrendingDown className="h-5 w-5 text-indigo-600" />
                        </div>
                    </div>
                </Card>
            </div>

            {/* Action Toolbar */}
            <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
                <div className="flex flex-1 flex-wrap gap-3 w-full lg:w-auto items-center">
                    <div className="relative flex-1 max-w-sm min-w-[220px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search requests or assets..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 h-10"
                        />
                    </div>
                    
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[160px] h-10">
                            <div className="flex items-center gap-2">
                                <Filter className="w-4 h-4 text-muted-foreground" />
                                <SelectValue placeholder="Status" />
                            </div>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="All">All Status</SelectItem>
                            <SelectItem value="Pending">Pending</SelectItem>
                            <SelectItem value="In Progress">In Progress</SelectItem>
                            <SelectItem value="Scheduled">Scheduled</SelectItem>
                            <SelectItem value="Completed">Completed</SelectItem>
                        </SelectContent>
                    </Select>

                        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                        <SelectTrigger className="w-[160px] h-10">
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-muted-foreground" />
                                <SelectValue placeholder="Priority" />
                            </div>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="All">All Priority</SelectItem>
                            <SelectItem value="Low">Low</SelectItem>
                            <SelectItem value="Medium">Medium</SelectItem>
                            <SelectItem value="High">High</SelectItem>
                        </SelectContent>
                    </Select>

                        <Select value={dateFilter} onValueChange={setDateFilter}>
                        <SelectTrigger className="w-[160px] h-10">
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
                </div>

                <div className="flex items-center gap-3 w-full lg:w-auto justify-end">
                    <Button 
                        onClick={() => setIsCreateModalOpen(true)} 
                        className="h-10 px-4 gap-2"
                    >
                        <Plus className="h-4 w-4" />
                        Create Request
                    </Button>
                    <Button 
                        variant={showArchived ? "default" : "outline"} 
                        className="h-10 px-4 gap-2" 
                        onClick={() => setShowArchived(!showArchived)}
                    >
                        {showArchived ? <><RotateCcw className="h-4 w-4" />Active View</> : <><Archive className="h-4 w-4" />Archived</>}
                    </Button>
                </div>
            </div>

            {/* Main Content */}
            <div className="rounded-md border overflow-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[100px]">ID</TableHead>
                            <TableHead>Asset / Description</TableHead>
                            <TableHead className="text-center w-[100px]">Status</TableHead>
                            <TableHead className="text-center w-[100px]">Priority</TableHead>
                            <TableHead className="text-center w-[120px]">Date</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredRecords.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-48 text-center text-muted-foreground">
                                    <div className="flex flex-col items-center justify-center h-full gap-3">
                                        <Wrench className="h-8 w-8 opacity-20" />
                                        <p className="text-sm">No maintenance requests found</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredRecords.map((record) => (
                                <TableRow key={record.id}>
                                    <TableCell className="font-mono text-xs text-muted-foreground">
                                        {record.id}
                                    </TableCell>
                                    <TableCell>
                                        <div className="space-y-0.5">
                                            <span className="text-sm font-medium block line-clamp-1">{getAssetName(record.assetId)}</span>
                                            <span className="text-xs text-muted-foreground block line-clamp-1">{record.description}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <StatusText variant={statusVariant[record.status] ?? "muted"}>{record.status}</StatusText>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <div className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-semibold ${
                                            record.priority === 'High' ? 'bg-red-500/10 text-red-700' :
                                            record.priority === 'Medium' ? 'bg-orange-500/10 text-orange-700' :
                                            'bg-emerald-500/10 text-emerald-700'
                                        }`}>
                                           {record.priority!.charAt(0)}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center text-sm text-muted-foreground tabular-nums">
                                        {new Date(record.dateReported).toLocaleDateString()}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
// End of MaintenanceView component
