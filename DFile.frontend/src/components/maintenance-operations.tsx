import { useState } from "react";
import { Wrench, Plus, Archive, RotateCcw, Search, Filter, Calendar as CalendarIcon, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
                return "text-amber-700";
            case "In Progress":
                return "text-blue-700";
            case "Completed":
                return "text-emerald-700";
            default:
                return "text-muted-foreground";
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
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Asset Maintenance & Repair</h2>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-background p-1 rounded-lg">
                <div className="flex flex-1 gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0 items-center">
                    <div className="relative flex-1 max-w-sm min-w-[200px]">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search requests..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 h-10 bg-background text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[180px] h-10 bg-background text-sm">
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
                        <SelectTrigger className="w-[180px] h-10 bg-background text-sm">
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
                        <SelectTrigger className="w-[180px] h-10 bg-background text-sm">
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

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <Button 
                        variant={showArchived ? "default" : "outline"} 
                        size="sm" 
                        className="h-10 text-sm"
                        onClick={() => setShowArchived(!showArchived)}
                    >
                        {showArchived ? <><RotateCcw size={16} className="mr-2" />Active ({activeRecordsCount})</> : <><Archive size={16} className="mr-2" />Archived ({archivedRecordsCount})</>}
                    </Button>
                    <Button onClick={onCreateRequest} size="sm" className="h-10 text-sm bg-primary text-primary-foreground shadow-sm">
                        <Plus size={16} className="mr-2" />
                        Create Ticket
                    </Button>
                </div>
            </div>

            <Card className="border-border shadow-sm rounded-xl overflow-hidden">
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50 hover:bg-muted/50">
                                <TableHead className="h-10 px-4 align-middle font-medium text-muted-foreground text-left">Request ID</TableHead>
                                <TableHead className="h-10 px-4 align-middle font-medium text-muted-foreground text-left">Asset</TableHead>
                                <TableHead className="h-10 px-4 align-middle font-medium text-muted-foreground text-left">Description</TableHead>
                                <TableHead className="h-10 px-4 align-middle font-medium text-muted-foreground text-left">Priority</TableHead>
                                <TableHead className="h-10 px-4 align-middle font-medium text-muted-foreground text-left">Date Reported</TableHead>
                                <TableHead className="h-10 px-4 align-middle font-medium text-muted-foreground text-left">Status</TableHead>
                                <TableHead className="h-10 px-4 align-middle font-medium text-muted-foreground text-center">Action</TableHead>
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
                                        <TableCell className="p-4 align-middle font-mono text-sm font-medium text-foreground text-left">{record.id}</TableCell>
                                        <TableCell className="p-4 align-middle text-sm text-foreground font-medium text-left">
                                            <div className="flex flex-col items-start">
                                                <span>{getAssetName(record.assetId)}</span>
                                                <span className="text-[10px] text-muted-foreground font-mono">{record.assetId}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="p-4 align-middle text-sm text-muted-foreground max-w-[400px] truncate text-left" title={record.description}>{record.description}</TableCell>
                                        <TableCell className={`p-4 align-middle text-sm text-left ${getPriorityColor(record.priority)}`}>{record.priority}</TableCell>
                                        <TableCell className="p-4 align-middle text-sm text-muted-foreground text-left">{new Date(record.dateReported).toLocaleDateString()}</TableCell>
                                        <TableCell className="p-4 align-middle text-left">
                                            <Badge variant="outline" className={`text-sm border-none rounded-none bg-transparent ${getStatusColor(record.status)}`}>
                                                {record.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="p-4 align-middle text-center" onClick={(e) => e.stopPropagation()}>
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
                </CardContent>
            </Card>
        </div>
    );
}
