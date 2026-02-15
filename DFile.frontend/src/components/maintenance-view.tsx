import { useState } from "react";
import { Wrench, Plus, AlertTriangle, CheckCircle2, Clock, Archive, RotateCcw, ShoppingCart, Search, Filter, Calendar as CalendarIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MaintenanceRecord, Asset } from "@/types/asset";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface MaintenanceViewProps {
    records: MaintenanceRecord[];
    assets: Asset[];
    onCreateRequest: () => void;
    onRecordClick?: (record: MaintenanceRecord) => void;
    onArchiveRecord?: (id: string) => void;
    onEditRecord?: (record: MaintenanceRecord) => void;
    onScheduleMaintenance?: (assetId: string) => void;
    onUpdateStatus?: (id: string, status: MaintenanceRecord['status']) => void;
    onRequestReplacement?: (assetId: string) => void;
}

export function MaintenanceView({ records, assets, onCreateRequest, onRecordClick, onArchiveRecord, onEditRecord, onScheduleMaintenance, onUpdateStatus, onRequestReplacement }: MaintenanceViewProps) {
    const [showArchived, setShowArchived] = useState(false);

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

    // Filter Logic for Requests
    const filteredRecords = records.filter(record => {
        // 1. Archive Status
        if (showArchived !== !!record.archived) return false;

        // 2. Text Search
        const query = searchQuery.toLowerCase();
        const assetName = getAssetName(record.assetId).toLowerCase();
        const matchesSearch =
            record.id.toLowerCase().includes(query) ||
            record.description.toLowerCase().includes(query) ||
            record.assetId.toLowerCase().includes(query) ||
            assetName.includes(query);

        if (!matchesSearch) return false;

        // 3. Status Filter
        if (statusFilter !== "All" && record.status !== statusFilter) return false;

        // 4. Priority Filter
        if (priorityFilter !== "All" && record.priority !== priorityFilter) return false;

        // 5. Date Filter (Date Reported)
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

    const activeRecords = records.filter(r => !r.archived);
    const archivedRecords = records.filter(r => r.archived);

    // Filter out archived assets for the schedule view AND apply asset search
    const filteredAssets = assets.filter(a => {
        if (a.status === 'Archived') return false;
        if (!assetSearchQuery) return true;
        const query = assetSearchQuery.toLowerCase();
        return a.desc.toLowerCase().includes(query) || a.id.toLowerCase().includes(query);
    });

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

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "Pending":
                return <Clock size={12} className="mr-1.5" />;
            case "In Progress":
                return <Wrench size={12} className="mr-1.5" />;
            case "Completed":
                return <CheckCircle2 size={12} className="mr-1.5" />;
            default:
                return null;
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

    // KPI Calculations (Keep consistent with total active records for dashboard accuracy)
    const fixedAssetsCount = assets.filter(a => (a.status === 'Available' || a.status === 'In Use') && !records.some(r => r.assetId === a.id && !r.archived && r.status !== 'Completed')).length;
    const damagedAssetsCount = assets.filter(a => records.some(r => r.assetId === a.id && !r.archived && r.status === 'Pending' && r.type === 'Corrective')).length;
    const inRepairAssetsCount = assets.filter(a => a.status === 'Maintenance' || records.some(r => r.assetId === a.id && !r.archived && r.status === 'In Progress')).length;
    const retiredAssetsCount = assets.filter(a => a.status === 'Disposed' || a.status === 'Archived').length;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-card rounded-xl border border-border p-4 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">Fixed / Operational</p>
                        <h3 className="text-2xl font-bold text-emerald-600 mt-1">{fixedAssetsCount}</h3>
                    </div>
                    <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                        <CheckCircle2 size={20} />
                    </div>
                </div>
                <div className="bg-card rounded-xl border border-border p-4 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">Damaged / Needs Action</p>
                        <h3 className="text-2xl font-bold text-amber-600 mt-1">{damagedAssetsCount}</h3>
                    </div>
                    <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600">
                        <AlertTriangle size={20} />
                    </div>
                </div>
                <div className="bg-card rounded-xl border border-border p-4 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">In Repair</p>
                        <h3 className="text-2xl font-bold text-blue-600 mt-1">{inRepairAssetsCount}</h3>
                    </div>
                    <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600">
                        <Wrench size={20} />
                    </div>
                </div>
                <div className="bg-card rounded-xl border border-border p-4 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">Retired / Disposed</p>
                        <h3 className="text-2xl font-bold text-muted-foreground mt-1">{retiredAssetsCount}</h3>
                    </div>
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                        <Archive size={20} />
                    </div>
                </div>
            </div>

            <div className="rounded-xl border border-border overflow-hidden bg-card">
                {/* Header */}
                <div className="p-6 border-b border-border bg-muted/40">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                <Wrench size={18} />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-foreground">Maintenance Hub</h3>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Manage repairs and asset schedules
                                </p>
                            </div>
                        </div>
                        <Button onClick={onCreateRequest} size="sm" className="rounded-xl h-8 text-xs bg-primary text-primary-foreground shadow-sm">
                            <Plus size={14} className="mr-2" />
                            New Request
                        </Button>
                    </div>
                </div>

                <div className="p-6">
                    <div className="space-y-6">
                        {/* Section: Asset Maintenance Schedules */}
                        <div>
                            <div className="flex items-center justify-between mb-3 px-1">
                                <h4 className="text-sm font-semibold flex items-center gap-2">
                                    <Clock size={16} /> Asset List & Schedules
                                </h4>
                            </div>

                            {/* Mini Toolbar for Asset List */}
                            <div className="mb-3 p-3 bg-muted/20 border border-border rounded-lg flex gap-3">
                                <div className="relative flex-1 max-w-sm">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search assets..."
                                        value={assetSearchQuery}
                                        onChange={(e) => setAssetSearchQuery(e.target.value)}
                                        className="pl-9 h-9 bg-background"
                                    />
                                </div>
                            </div>

                            <div className="rounded-lg border border-border overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                                            <TableHead className="text-center text-xs font-medium text-muted-foreground">Asset</TableHead>
                                            <TableHead className="text-center text-xs font-medium text-muted-foreground">Warranty Expiry</TableHead>
                                            <TableHead className="text-center text-xs font-medium text-muted-foreground">Next Maintenance</TableHead>
                                            <TableHead className="text-center text-xs font-medium text-muted-foreground">EOL Estimate</TableHead>
                                            <TableHead className="text-center text-xs font-medium text-muted-foreground">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredAssets.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground text-xs">
                                                    No assets found.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredAssets.slice(0, 5).map(asset => (
                                                <TableRow key={asset.id} className="hover:bg-muted/30 transition-colors">
                                                    <TableCell className="font-medium text-sm text-center">
                                                        {asset.desc}
                                                        <span className="block text-xs text-muted-foreground font-mono">{asset.id}</span>
                                                    </TableCell>
                                                    <TableCell className="text-sm text-center">{asset.warrantyExpiry || "—"}</TableCell>
                                                    <TableCell className="text-sm text-center">
                                                        {asset.nextMaintenance ? (
                                                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800">
                                                                <Clock size={10} /> {asset.nextMaintenance}
                                                            </span>
                                                        ) : "—"}
                                                    </TableCell>
                                                    <TableCell className="text-sm text-muted-foreground text-center">{asset.notes || "—"}</TableCell>
                                                    <TableCell className="text-center">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-7 text-xs text-primary hover:text-primary hover:bg-primary/10"
                                                            onClick={() => onScheduleMaintenance?.(asset.id)}
                                                        >
                                                            <Plus size={12} className="mr-1" /> Schedule
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                        {filteredAssets.length > 5 && (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center text-xs text-muted-foreground p-2 bg-muted/20">
                                                    ...and {filteredAssets.length - 5} more assets
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>

                        {/* Section: Active Requests */}
                        <div className="pt-4 border-t border-border">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                                <h4 className="text-sm font-semibold flex items-center gap-2">
                                    <Wrench size={16} /> Service Requests
                                </h4>
                                <Button variant={showArchived ? "default" : "outline"} size="sm" className="text-xs font-medium h-8" onClick={() => setShowArchived(!showArchived)}>
                                    {showArchived ? <><RotateCcw size={14} className="mr-1.5" />Active ({activeRecords.length})</> : <><Archive size={14} className="mr-1.5" />Archived ({archivedRecords.length})</>}
                                </Button>
                            </div>

                            {/* Filters Toolbar */}
                            <div className="mb-4 p-3 bg-muted/20 border border-border rounded-lg flex flex-col sm:flex-row gap-3">
                                <div className="relative flex-1 max-w-sm">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search requests..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-9 h-9 bg-background"
                                    />
                                </div>
                                <div className="flex gap-2 flex-wrap">
                                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                                        <SelectTrigger className="w-[180px] h-9 bg-background">
                                            <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
                                            <SelectValue placeholder="Status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="All">All Status</SelectItem>
                                            <SelectItem value="Pending">Pending</SelectItem>
                                            <SelectItem value="In Progress">In Progress</SelectItem>
                                            <SelectItem value="Completed">Completed</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                                        <SelectTrigger className="w-[180px] h-9 bg-background">
                                            <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
                                            <SelectValue placeholder="Priority" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="All">All Priority</SelectItem>
                                            <SelectItem value="High">High</SelectItem>
                                            <SelectItem value="Medium">Medium</SelectItem>
                                            <SelectItem value="Low">Low</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Select value={dateFilter} onValueChange={setDateFilter}>
                                        <SelectTrigger className="w-[180px] h-9 bg-background">
                                            <CalendarIcon className="w-4 h-4 mr-2 text-muted-foreground" />
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
                            </div>

                            <div className="rounded-lg border border-border overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                                            <TableHead className="w-[150px] text-center">Request ID</TableHead>
                                            <TableHead className="w-[250px] text-center">Asset</TableHead>
                                            <TableHead className="min-w-[300px]">Description</TableHead>
                                            <TableHead className="w-[150px] text-center">Priority</TableHead>
                                            <TableHead className="w-[180px] text-center">Date</TableHead>
                                            <TableHead className="w-[160px] text-center">Status</TableHead>
                                            <TableHead className="w-[80px] text-center">{showArchived ? "Restore" : "Archive"}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredRecords.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground text-sm">
                                                    No maintenance records match your filters.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredRecords.map((record) => (
                                                <TableRow key={record.id} className="border-border cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => onRecordClick?.(record)}>
                                                    <TableCell className="font-mono text-sm font-medium text-foreground text-center">{record.id}</TableCell>
                                                    <TableCell className="text-sm text-foreground font-medium text-center">
                                                        <div className="flex flex-col items-center">
                                                            <span>{getAssetName(record.assetId)}</span>
                                                            <span className="text-[10px] text-muted-foreground font-mono">{record.assetId}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-sm text-muted-foreground max-w-[400px] truncate" title={record.description}>{record.description}</TableCell>
                                                    <TableCell className={`text-sm text-center ${getPriorityColor(record.priority)}`}>{record.priority}</TableCell>
                                                    <TableCell className="text-sm text-muted-foreground text-center">{record.dateReported}</TableCell>
                                                    <TableCell className="text-center">
                                                        <Badge variant="outline" className={getStatusColor(record.status)}>
                                                            {getStatusIcon(record.status)} {record.status}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <div className="flex items-center justify-center gap-1">

                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    onArchiveRecord?.(record.id);
                                                                }}
                                                                className={`p-1.5 rounded-md transition-colors ${record.archived ? 'text-primary hover:bg-primary/10' : 'text-muted-foreground hover:text-destructive hover:bg-destructive/10'}`}
                                                                title={record.archived ? 'Restore' : 'Archive'}
                                                            >
                                                                {record.archived ? <RotateCcw size={16} /> : <Archive size={16} />}
                                                            </button>

                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div >
    );
}
