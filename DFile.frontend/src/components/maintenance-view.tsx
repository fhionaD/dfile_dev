import { useState } from "react";
import { Wrench, Plus, AlertTriangle, CheckCircle2, Clock, Archive, RotateCcw, Search, Filter, Calendar as CalendarIcon, TrendingDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
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
                return "text-amber-700 border-amber-500/20";
            case "In Progress":
                return "text-blue-700 border-blue-500/20";
            case "Completed":
                return "text-emerald-700 border-emerald-500/20";
            default:
                return "text-muted-foreground border-border";
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card className="rounded-xl border-border shadow-sm">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Open Requests</p>
                            <h3 className="text-2xl font-bold text-red-600 mt-1">{openRequests}</h3>
                        </div>
                        <div className="h-10 w-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-600">
                            <AlertTriangle size={20} />
                        </div>
                    </CardContent>
                </Card>
                
                <Card className="rounded-xl border-border shadow-sm">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Overdue</p>
                            <h3 className="text-2xl font-bold text-orange-600 mt-1">{overdueRequests}</h3>
                        </div>
                        <div className="h-10 w-10 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-600">
                             <Clock size={20} />
                        </div>
                    </CardContent>
                </Card>

                <Card className="rounded-xl border-border shadow-sm">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">In Repair</p>
                            <h3 className="text-2xl font-bold text-blue-600 mt-1">{inRepair}</h3>
                        </div>
                        <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600">
                             <Wrench size={20} />
                        </div>
                    </CardContent>
                </Card>

                <Card className="rounded-xl border-border shadow-sm">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Attention Needed</p>
                            <h3 className="text-2xl font-bold text-yellow-600 mt-1">{immediateAttention}</h3>
                        </div>
                        <div className="h-10 w-10 rounded-full bg-yellow-500/10 flex items-center justify-center text-yellow-600">
                             <AlertTriangle size={20} />
                        </div>
                    </CardContent>
                </Card>

                <Card className="rounded-xl border-border shadow-sm">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Scheduled (Week)</p>
                            <h3 className="text-2xl font-bold text-emerald-600 mt-1">{scheduledThisWeek}</h3>
                        </div>
                        <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                             <CalendarIcon size={20} />
                        </div>
                    </CardContent>
                </Card>

                <Card className="rounded-xl border-border shadow-sm">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Avg MTTR</p>
                            <h3 className="text-2xl font-bold text-indigo-600 mt-1">{mttrDays} <span className="text-sm font-medium text-muted-foreground">days</span></h3>
                        </div>
                        <div className="h-10 w-10 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-600">
                             <TrendingDown size={20} />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Action Toolbar */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-background p-1 rounded-lg">
                <div className="flex flex-1 gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0 items-center">
                    <div className="relative flex-1 max-w-sm min-w-[200px]">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search requests or assets..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 h-10 bg-background text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        />
                    </div>
                    
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[180px] bg-background h-10 text-sm">
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
                        <SelectTrigger className="w-[180px] bg-background h-10 text-sm">
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
                        <SelectTrigger className="w-[180px] bg-background h-10 text-sm">
                                <CalendarIcon className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
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

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <Button 
                        variant={showArchived ? "default" : "outline"} 
                        size="sm" 
                        className="text-sm h-10" 
                        onClick={() => setShowArchived(!showArchived)}
                    >
                        {showArchived ? <><RotateCcw size={16} className="mr-2" />Active View</> : <><Archive size={16} className="mr-2" />Archived</>}
                    </Button>
                    <Button 
                        onClick={() => setIsCreateModalOpen(true)} 
                        size="sm" 
                        className="text-sm h-10 bg-primary text-primary-foreground shadow-sm"
                    >
                        <Plus size={16} className="mr-2" />
                        Create Request
                    </Button>
                </div>
            </div>

            {/* Main Content Card */}
            <Card className="border-border shadow-sm rounded-xl overflow-hidden">
                <CardContent className="p-0">
                    <div className="overflow-x-auto">

                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-muted/50 bg-muted/50 border-b border-border">
                                        <TableHead className="w-[100px] h-10 px-4 text-center align-middle font-medium text-muted-foreground">ID</TableHead>
                                        <TableHead className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">Asset / Description</TableHead>
                                        <TableHead className="text-center w-[100px] h-10 px-4 align-middle font-medium text-muted-foreground">Status</TableHead>
                                        <TableHead className="text-center w-[100px] h-10 px-4 align-middle font-medium text-muted-foreground">Priority</TableHead>
                                        <TableHead className="text-center w-[120px] h-10 px-4 align-middle font-medium text-muted-foreground">Date</TableHead>
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
                                                <TableCell className="p-4 align-middle font-mono text-[11px] text-muted-foreground text-center font-medium group-hover:text-primary transition-colors">
                                                    {record.id}
                                                </TableCell>
                                                <TableCell className="p-4 align-middle">
                                                    <div className="space-y-0.5">
                                                        <span className="text-sm font-medium text-foreground block line-clamp-1">{getAssetName(record.assetId)}</span>
                                                        <span className="text-xs text-muted-foreground block line-clamp-1">{record.description}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="p-4 align-middle text-center">
                                                     <Badge variant="outline" className={`text-[10px] px-2 py-0.5 h-5 font-medium border rounded-none bg-transparent ${getStatusColor(record.status)}`}>
                                                        {record.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="p-4 align-middle text-center">
                                                    <div className={`inline-flex items-center justify-center w-6 h-6 rounded-md text-[11px] font-medium border ${
                                                        record.priority === 'High' ? 'bg-red-500/10 text-red-700 border-red-500/20' :
                                                        record.priority === 'Medium' ? 'bg-orange-500/10 text-orange-700 border-orange-500/20' :
                                                        'bg-emerald-500/10 text-emerald-700 border-emerald-500/20'
                                                    }`}>
                                                       {record.priority!.charAt(0)}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="p-4 align-middle text-center text-xs text-muted-foreground tabular-nums">
                                                    {new Date(record.dateReported).toLocaleDateString()}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                </CardContent>
            </Card>
        </div>
    );
}
// End of MaintenanceView component
