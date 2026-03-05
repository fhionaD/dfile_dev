import { useState } from "react";
import { Wrench, Plus, Archive, RotateCcw, Search, Filter, Calendar as CalendarIcon, CheckCircle2, Eye, MoreHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StatusText } from "@/components/ui/status-text";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMaintenanceRecords, useUpdateMaintenanceStatus, useArchiveMaintenanceRecord, useRestoreMaintenanceRecord } from "@/hooks/use-maintenance";
import { useAssets } from "@/hooks/use-assets";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface MaintenanceOperationsProps {
    onCreateRequest: () => void;
    onRecordClick: (record: any) => void;
}

export function MaintenanceOperations({ onCreateRequest, onRecordClick }: MaintenanceOperationsProps) {
    const [showArchived, setShowArchived] = useState(false);
    const { data: records = [], isLoading: isLoadingRecords } = useMaintenanceRecords(showArchived);
    const { data: assets = [], isLoading: isLoadingAssets } = useAssets();

    // Mutations
    const updateStatusMutation = useUpdateMaintenanceStatus();
    const archiveRecordMutation = useArchiveMaintenanceRecord();
    const restoreRecordMutation = useRestoreMaintenanceRecord();
    const [archiveTarget, setArchiveTarget] = useState<string | null>(null);
    
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

    const statusVariant: Record<string, "warning" | "info" | "success" | "muted"> = {
        Pending: "warning",
        "In Progress": "info",
        Completed: "success",
    };

    const priorityVariant: Record<string, "danger" | "warning" | "success" | "muted"> = {
        High: "danger",
        Medium: "warning",
        Low: "success",
    };

    const filteredRecords = records.filter(record => {
        // if (showArchived !== !!record.archived) return false; // Handled by API
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
            <div className="mb-4">
                <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                    Asset Maintenance & Repair
                </h1>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
                <div className="flex flex-1 gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0 items-center">
                    <div className="relative flex-1 max-w-sm min-w-[200px]">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search requests..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 h-9 text-sm"
                        />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[160px] h-9 text-sm">
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
                        <SelectTrigger className="w-[160px] h-9 text-sm">
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
                        <SelectTrigger className="w-[160px] h-9 text-sm">
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
                    <Button onClick={onCreateRequest} size="sm" className="h-10 text-sm bg-primary text-primary-foreground shadow-sm px-4">
                        <Plus size={16} className="mr-2" />
                        Create Ticket
                    </Button>
                    <Button 
                        variant={showArchived ? "default" : "outline"} 
                        size="sm" 
                        className="h-10 text-sm w-[160px] justify-start"
                        onClick={() => setShowArchived(!showArchived)}
                    >
                        {showArchived ? <><RotateCcw size={16} className="mr-2" />Show Active</> : <><Archive size={16} className="mr-2" />Show Archive</>}
                    </Button>
                </div>
            </div>

            <div className="rounded-md border overflow-auto">
                <Table className="w-full table-fixed">
                    <TableHeader>
                        <TableRow>
                            <TableHead className="px-6 py-4 align-middle font-medium text-muted-foreground text-left w-[12%]">Request ID</TableHead>
                            <TableHead className="px-6 py-4 align-middle font-medium text-muted-foreground text-left w-[20%]">Asset</TableHead>
                            <TableHead className="px-6 py-4 align-middle font-medium text-muted-foreground text-left w-[28%]">Description</TableHead>
                            <TableHead className="px-6 py-4 align-middle font-medium text-muted-foreground text-center w-[10%]">Priority</TableHead>
                            <TableHead className="px-6 py-4 align-middle font-medium text-muted-foreground text-center w-[12%]">Date Reported</TableHead>
                            <TableHead className="px-6 py-4 align-middle font-medium text-muted-foreground text-center w-[10%]">Status</TableHead>
                            <TableHead className="px-6 py-4 align-middle font-medium text-muted-foreground text-center w-[8%]">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredRecords.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground text-sm">
                                    {showArchived ? "No archived maintenance records yet" : "No maintenance records match your search"}
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredRecords.map((record) => (
                                <TableRow key={record.id} className="border-b last:border-0">
                                    <TableCell className="px-6 py-4 align-middle font-mono text-sm font-medium text-foreground text-left">{record.id}</TableCell>
                                    <TableCell className="px-6 py-4 align-middle text-sm text-foreground font-medium text-left">
                                        <div className="flex flex-col items-start">
                                            <span>{getAssetName(record.assetId)}</span>
                                            <span className="text-[10px] text-muted-foreground font-mono">{record.assetId}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="px-6 py-4 align-middle text-sm text-muted-foreground truncate text-left" title={record.description}>{record.description}</TableCell>
                                    <TableCell className="px-6 py-4 align-middle text-center">
                                        <StatusText variant={priorityVariant[record.priority] ?? "muted"}>{record.priority}</StatusText>
                                    </TableCell>
                                    <TableCell className="px-6 py-4 align-middle text-sm text-muted-foreground text-center">{new Date(record.dateReported).toLocaleDateString()}</TableCell>
                                    <TableCell className="px-6 py-4 align-middle text-center">
                                        <StatusText variant={statusVariant[record.status] ?? "muted"}>{record.status}</StatusText>
                                    </TableCell>
                                    <TableCell className="px-6 py-4 align-middle text-center">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Actions">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-40">
                                                <DropdownMenuItem onClick={() => onRecordClick(record)} className="gap-2 cursor-pointer">
                                                    <Eye className="h-4 w-4" /> View
                                                </DropdownMenuItem>
                                                {record.archived ? (
                                                    <DropdownMenuItem onClick={() => restoreRecordMutation.mutateAsync(record.id)} className="gap-2 cursor-pointer">
                                                        <RotateCcw className="h-4 w-4" /> Restore
                                                    </DropdownMenuItem>
                                                ) : (
                                                    <DropdownMenuItem onClick={() => setArchiveTarget(record.id)} className="gap-2 cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10">
                                                        <Archive className="h-4 w-4" /> Archive
                                                    </DropdownMenuItem>
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <ConfirmDialog
                open={archiveTarget !== null}
                onOpenChange={(open) => { if (!open) setArchiveTarget(null); }}
                title="Archive Record"
                description="Are you sure you want to archive this maintenance record? It can be restored later from the archive view."
                confirmLabel="Archive"
                confirmVariant="destructive"
                onConfirm={async () => {
                    if (archiveTarget) {
                        await archiveRecordMutation.mutateAsync(archiveTarget);
                        setArchiveTarget(null);
                    }
                }}
                isLoading={archiveRecordMutation.isPending}
            />
        </div>
    );
}
