import { useState } from "react";
import { Wrench, Plus, Archive, RotateCcw, Search, Filter, Calendar as CalendarIcon, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMaintenanceRecords, useUpdateMaintenanceStatus, useArchiveMaintenanceRecord } from "@/hooks/use-maintenance";
import { useAssets } from "@/hooks/use-assets";

interface MaintenanceOperationsProps {
    onCreateRequest: () => void;
    onRecordClick: (record: any) => void;
}

export function MaintenanceOperations({ onCreateRequest, onRecordClick }: MaintenanceOperationsProps) {
    const { data: records = [], isLoading: isLoadingRecords } = useMaintenanceRecords();
    const { data: assets = [], isLoading: isLoadingAssets } = useAssets();

    // Mutations
    const updateStatusMutation = useUpdateMaintenanceStatus();
    const archiveRecordMutation = useArchiveMaintenanceRecord();

    const [showArchived, setShowArchived] = useState(false);
    
    // Request Filters
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [priorityFilter, setPriorityFilter] = useState("All");
    const [dateFilter, setDateFilter] = useState("All Time");

    // Helper functions
    const getAssetName = (id: string) => {
        const asset = assets.find(a => a.id === id);
        return asset ? asset.desc : id;
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "Pending":
                return "bg-amber-500/10 text-amber-700 border-amber-500/20";
            case "In Progress":
                return "bg-blue-500/10 text-blue-700 border-blue-500/20";
            case "Completed":
                return "bg-emerald-500/10 text-emerald-700 border-emerald-500/20";
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

    const activeRecordsCount = records.filter(r => !r.archived).length;
    const archivedRecordsCount = records.filter(r => r.archived).length;

    return (
        <div className="space-y-6">
             <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                        <div className="p-2 bg-primary/10 rounded-lg text-primary">
                            <Wrench size={24} />
                        </div>
                        Asset Maintenance & Repair
                    </h2>
                    <p className="text-muted-foreground">Operational Control & Workflow Management</p>
                </div>
                <div className="flex gap-2">
                      <Button variant={showArchived ? "default" : "outline"} size="sm" onClick={() => setShowArchived(!showArchived)}>
                        {showArchived ? <><RotateCcw size={14} className="mr-1.5" />Active ({activeRecordsCount})</> : <><Archive size={14} className="mr-1.5" />Archived ({archivedRecordsCount})</>}
                    </Button>
                    <Button onClick={onCreateRequest} className="bg-primary text-primary-foreground shadow-sm">
                        <Plus size={16} className="mr-1.5" />
                        Create Ticket
                    </Button>
                </div>
            </div>

            <Card className="border-border">
                <div className="p-4 border-b border-border bg-muted/20 flex flex-col sm:flex-row gap-3">
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

                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50 hover:bg-muted/50">
                                <TableHead className="w-[150px] text-center">Request ID</TableHead>
                                <TableHead className="w-[250px] text-center">Asset</TableHead>
                                <TableHead className="min-w-[300px]">Description</TableHead>
                                <TableHead className="w-[150px] text-center">Priority</TableHead>
                                <TableHead className="w-[180px] text-center">Date Reported</TableHead>
                                <TableHead className="w-[160px] text-center">Status</TableHead>
                                <TableHead className="w-[80px] text-center">Action</TableHead>
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
                                    <TableRow 
                                        key={record.id} 
                                        className="border-border cursor-pointer hover:bg-muted/30 transition-colors"
                                        onClick={() => onRecordClick(record)}
                                    >
                                        <TableCell className="font-mono text-sm font-medium text-foreground text-center">{record.id}</TableCell>
                                        <TableCell className="text-sm text-foreground font-medium text-center">
                                            <div className="flex flex-col items-center">
                                                <span>{getAssetName(record.assetId)}</span>
                                                <span className="text-[10px] text-muted-foreground font-mono">{record.assetId}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground max-w-[400px] truncate" title={record.description}>{record.description}</TableCell>
                                        <TableCell className={`text-sm text-center ${getPriorityColor(record.priority)}`}>{record.priority}</TableCell>
                                        <TableCell className="text-sm text-muted-foreground text-center">{new Date(record.dateReported).toLocaleDateString()}</TableCell>
                                        <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                                            <Select
                                                value={record.status}
                                                onValueChange={(val) => updateStatusMutation.mutateAsync({ id: record.id, status: val })}
                                            >
                                                <SelectTrigger className={`h-8 border-none ${getStatusColor(record.status)}`}>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Pending">Pending</SelectItem>
                                                    <SelectItem value="In Progress">In Progress</SelectItem>
                                                    <SelectItem value="Completed">Completed</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </TableCell>
                                        <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex items-center justify-center gap-1">
                                                <button
                                                    onClick={() => archiveRecordMutation.mutateAsync(record.id)}
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
            </Card>
        </div>
    );
}
