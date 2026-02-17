import { useState } from "react";
import { Wrench, Plus, AlertTriangle, CheckCircle2, Clock, Archive, RotateCcw, Search, Filter, Calendar as CalendarIcon, TrendingDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { MaintenanceRecord, Asset } from "@/types/asset";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMaintenanceRecords, useUpdateMaintenanceStatus, useArchiveMaintenanceRecord, useAddMaintenanceRecord } from "@/hooks/use-maintenance";
import { useAssets } from "@/hooks/use-assets";
import { Skeleton } from "@/components/ui/skeleton";
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
                        <div key={i} className="bg-card rounded-xl border border-border p-4 shadow-sm flex items-center justify-between">
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-8 w-12" />
                            </div>
                            <Skeleton className="h-10 w-10 rounded-full" />
                        </div>
                    ))}
                </div>
                <div className="rounded-xl border border-border overflow-hidden bg-card p-6 space-y-4">
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

    const getStatusColor = (status: string) => {
        switch (status) {
            case "Pending":
                return "bg-amber-500/10 text-amber-700 border-amber-500/20 hover:bg-amber-500/20";
            case "In Progress":
                return "bg-blue-500/10 text-blue-700 border-blue-500/20 hover:bg-blue-500/20";
            case "Completed":
                return "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 hover:bg-emerald-500/20";
            default:
                return "bg-muted text-muted-foreground border-border";
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case "High": return "text-red-600 font-bold";
            case "Medium": return "text-amber-600 font-medium";
            case "Low": return "text-emerald-600";
            default: return "text-muted-foreground";
        }
    };


    return (
        <div className="space-y-6">
            {/* KPI Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                <Card className="p-4 border-l-4 border-l-red-500 shadow-sm transition-all hover:shadow-md">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-full text-red-600">
                            <AlertTriangle size={20} />
                        </div>
                        <div>
                            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Open Requests</p>
                            <h3 className="text-2xl font-bold text-foreground">{openRequests}</h3>
                        </div>
                    </div>
                </Card>

                <Card className="p-4 border-l-4 border-l-orange-500 shadow-sm transition-all hover:shadow-md">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-full text-orange-600">
                            <Clock size={20} />
                        </div>
                        <div>
                            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Overdue</p>
                            <h3 className="text-2xl font-bold text-foreground">{overdueRequests}</h3>
                        </div>
                    </div>
                </Card>

                 <Card className="p-4 border-l-4 border-l-blue-500 shadow-sm transition-all hover:shadow-md">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-full text-blue-600">
                            <Wrench size={20} />
                        </div>
                        <div>
                            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">In Repair</p>
                            <h3 className="text-2xl font-bold text-foreground">{inRepair}</h3>
                        </div>
                    </div>
                </Card>

                <Card className="p-4 border-l-4 border-l-yellow-500 shadow-sm transition-all hover:shadow-md">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded-full text-yellow-600">
                            <AlertTriangle size={20} />
                        </div>
                        <div>
                            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Needs Attention</p>
                            <h3 className="text-2xl font-bold text-foreground">{immediateAttention}</h3>
                        </div>
                    </div>
                </Card>

                <Card className="p-4 border-l-4 border-l-emerald-500 shadow-sm transition-all hover:shadow-md">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-100 dark:bg-emerald-900/20 rounded-full text-emerald-600">
                            <CalendarIcon size={20} />
                        </div>
                        <div>
                            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Scheduled (Week)</p>
                            <h3 className="text-2xl font-bold text-foreground">{scheduledThisWeek}</h3>
                        </div>
                    </div>
                </Card>

                <Card className="p-4 border-l-4 border-l-indigo-500 shadow-sm transition-all hover:shadow-md">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/20 rounded-full text-indigo-600">
                            <TrendingDown size={20} />
                        </div>
                        <div>
                            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Avg MTTR</p>
                            <div className="flex items-baseline gap-1">
                                <h3 className="text-2xl font-bold text-foreground">{mttrDays}</h3>
                                <span className="text-xs text-muted-foreground font-medium">days</span>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Filter Controls Row */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-card p-4 rounded-xl border border-border shadow-sm">
                <div className="flex flex-1 w-full sm:w-auto gap-3">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search requests or assets..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 bg-background"
                        />
                    </div>
                    
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[140px] bg-background">
                             <Filter className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                            <SelectValue placeholder="Status" />
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
                        <SelectTrigger className="w-[140px] bg-background">
                            <AlertTriangle className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                            <SelectValue placeholder="Priority" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="All">All Priority</SelectItem>
                            <SelectItem value="Low">Low</SelectItem>
                            <SelectItem value="Medium">Medium</SelectItem>
                            <SelectItem value="High">High</SelectItem>
                        </SelectContent>
                    </Select>
                     <Select value={dateFilter} onValueChange={setDateFilter}>
                        <SelectTrigger className="w-[140px] bg-background">
                             <CalendarIcon className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                            <SelectValue placeholder="Date" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="All Time">All Time</SelectItem>
                            <SelectItem value="This Month">This Month</SelectItem>
                            <SelectItem value="Last Month">Last Month</SelectItem>
                            <SelectItem value="This Year">This Year</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                
                 <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Button variant={showArchived ? "default" : "outline"} size="sm" onClick={() => setShowArchived(!showArchived)}>
                         {showArchived ? <><RotateCcw size={14} className="mr-1.5" />Active</> : <><Archive size={14} className="mr-1.5" />Archives</>}
                    </Button>
                    <Button onClick={() => setIsCreateModalOpen(true)} size="sm" className="bg-primary text-primary-foreground shadow-sm">
                        <Plus size={16} className="mr-1.5" />
                        Create Request
                    </Button>
                </div>
            </div>

            {/* Request List */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                 {/* Left: Request List */}
                <div className="lg:col-span-2 space-y-4">
                     <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden flex flex-col h-[600px]">
                        <div className="p-4 border-b border-border bg-muted/30 flex justify-between items-center">
                            <h3 className="font-semibold text-sm flex items-center">
                                <Wrench size={16} className="mr-2 text-primary" />
                                {showArchived ? 'Archived Requests' : 'Active Requests'}
                                <Badge variant="secondary" className="ml-2 text-[10px] h-5">{filteredRecords.length}</Badge>
                            </h3>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto">
                             <Table>
                                <TableHeader className="sticky top-0 bg-card z-10 shadow-sm">
                                    <TableRow className="border-b border-border hover:bg-transparent">
                                        <TableHead className="w-[100px] text-xs font-semibold pl-6">ID</TableHead>
                                        <TableHead className="text-xs font-semibold">Asset / Description</TableHead>
                                        <TableHead className="text-center w-[100px] text-xs font-semibold">Status</TableHead>
                                        <TableHead className="text-center w-[100px] text-xs font-semibold">Priority</TableHead>
                                        <TableHead className="text-right w-[120px] text-xs font-semibold pr-6">Date</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredRecords.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-48 text-center text-muted-foreground">
                                                <div className="flex flex-col items-center justify-center h-full">
                                                    <Wrench size={32} className="mb-3 opacity-20" />
                                                    <p className="text-sm">No maintenance requests found</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredRecords.map((record) => (
                                            <TableRow 
                                                key={record.id} 
                                                className="cursor-pointer hover:bg-muted/40 transition-colors group border-b border-border/40 last:border-0"
                                                onClick={() => {
                                                    // TODO: Open details modal
                                                    // This needs callback prop
                                                }}
                                            >
                                                <TableCell className="font-mono text-[11px] text-muted-foreground pl-6 font-medium group-hover:text-primary transition-colors">
                                                    {record.id}
                                                </TableCell>
                                                <TableCell className="py-3">
                                                    <div className="space-y-0.5">
                                                        <span className="text-sm font-medium text-foreground block line-clamp-1">{getAssetName(record.assetId)}</span>
                                                        <span className="text-xs text-muted-foreground block line-clamp-1">{record.description}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                     <Badge className={`text-[10px] px-2 py-0.5 h-5 font-medium border ${getStatusColor(record.status)}`}>
                                                        {record.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium border ${
                                                        record.priority === 'High' ? 'bg-red-500/10 text-red-700 border-red-500/20' :
                                                        record.priority === 'Medium' ? 'bg-orange-500/10 text-orange-700 border-orange-500/20' :
                                                        'bg-emerald-500/10 text-emerald-700 border-emerald-500/20'
                                                    }`}>
                                                       {record.priority!.charAt(0)}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right text-xs text-muted-foreground pr-6 tabular-nums">
                                                    {new Date(record.dateReported).toLocaleDateString()}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </div>

                {/* Right: Asset Schedule / Calendar-like view */}
                <div className="space-y-4">
                     <div className="bg-card rounded-xl border border-border shadow-sm h-[600px] flex flex-col overflow-hidden">
                        <div className="p-4 border-b border-border bg-muted/30">
                            <h3 className="font-semibold text-sm flex items-center">
                                <CalendarIcon size={16} className="mr-2 text-primary" />
                                Maintenance Calender
                            </h3>
                        </div>
                         <div className="p-4 flex-1 flex flex-col justify-center items-center text-center text-muted-foreground space-y-3">
                             <CalendarIcon size={48} className="opacity-10" />
                            <p className="text-sm max-w-[200px]">Select a scheduled request to view details</p>
                            <Button variant="outline" size="sm" className="mt-2" disabled>View Full Calendar</Button>
                        </div>
                    </div>
                </div>
            </div>
            
            <CreateMaintenanceModal 
                open={isCreateModalOpen} 
                onOpenChange={setIsCreateModalOpen}
            />
        </div>
    );
}
// End of MaintenanceView component
