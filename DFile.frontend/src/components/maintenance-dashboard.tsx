import { Wrench, AlertTriangle, Clock, Calendar as CalendarIcon, TrendingDown, CheckCircle2, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MaintenanceRecord, Asset } from "@/types/asset";
import { useMaintenanceRecords } from "@/hooks/use-maintenance";
import { useAssets } from "@/hooks/use-assets";
import { Skeleton } from "@/components/ui/skeleton";

interface MaintenanceDashboardProps {
    onScheduleMaintenance?: (assetId: string) => void;
}

export function MaintenanceDashboard({ onScheduleMaintenance }: MaintenanceDashboardProps) {
    const { data: records = [], isLoading: isLoadingRecords } = useMaintenanceRecords();
    const { data: assets = [], isLoading: isLoadingAssets } = useAssets();

    if (isLoadingRecords || isLoadingAssets) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-32 rounded-xl" />
                ))}
            </div>
        );
    }

    // KPI Calculations
    const activeRecords = records.filter(r => !r.archived);
    const openRequests = activeRecords.filter(r => r.status === "Pending" || r.status === "In Progress").length;
    
    const overdueRequests = activeRecords.filter(r => {
        if (r.status === "Completed") return false;
        const targetDate = r.startDate ? new Date(r.startDate) : new Date(r.dateReported);
        return targetDate < new Date();
    }).length;

    const inRepair = activeRecords.filter(r => r.status === "In Progress").length;
    
    const immediateAttention = activeRecords.filter(r => r.status !== "Completed" && r.priority === "High").length;

    // Schedule This Week
    const scheduledThisWeek = activeRecords.filter(r => {
        if (r.status !== "Scheduled" || !r.startDate) return false;
        const start = new Date(r.startDate);
        const curr = new Date(); 
        const first = curr.getDate() - curr.getDay(); 
        const last = first + 6; 
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

    // Upcoming Schedule List (Next 5 items)
    const upcomingSchedules = activeRecords
        .filter(r => r.status === "Scheduled" && r.startDate && new Date(r.startDate) >= new Date())
        .sort((a, b) => new Date(a.startDate!).getTime() - new Date(b.startDate!).getTime())
        .slice(0, 5);

    const getAssetName = (id: string) => {
        const asset = assets.find(a => a.id === id);
        return asset ? asset.desc : id;
    };

    return (
        <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                <Card className="border-l-4 border-l-red-500 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-full text-red-600">
                            <AlertTriangle size={20} />
                        </div>
                        <div>
                            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Open Requests</p>
                            <h3 className="text-2xl font-bold">{openRequests}</h3>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-orange-500 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-full text-orange-600">
                            <Clock size={20} />
                        </div>
                        <div>
                            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Overdue</p>
                            <h3 className="text-2xl font-bold">{overdueRequests}</h3>
                        </div>
                    </CardContent>
                </Card>

                 <Card className="border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-full text-blue-600">
                            <Wrench size={20} />
                        </div>
                        <div>
                            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">In Repair</p>
                            <h3 className="text-2xl font-bold">{inRepair}</h3>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-yellow-500 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded-full text-yellow-600">
                            <AlertTriangle size={20} />
                        </div>
                        <div>
                            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Attention Needed</p>
                            <h3 className="text-2xl font-bold">{immediateAttention}</h3>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-emerald-500 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-2 bg-emerald-100 dark:bg-emerald-900/20 rounded-full text-emerald-600">
                            <CalendarIcon size={20} />
                        </div>
                        <div>
                            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Scheduled (Week)</p>
                            <h3 className="text-2xl font-bold">{scheduledThisWeek}</h3>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-indigo-500 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/20 rounded-full text-indigo-600">
                            <TrendingDown size={20} />
                        </div>
                        <div>
                            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Avg MTTR</p>
                            <div className="flex items-baseline gap-1">
                                <h3 className="text-2xl font-bold">{mttrDays}</h3>
                                <span className="text-xs text-muted-foreground">days</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Secondary Dashboard Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Upcoming Schedule List */}
                <Card className="col-span-1 lg:col-span-2 shadow-sm border-border">
                    <CardHeader className="pb-3 border-b border-border bg-muted/20">
                        <CardTitle className="text-sm font-medium flex items-center">
                            <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                            Upcoming Scheduled Maintenance
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {upcomingSchedules.length === 0 ? (
                            <div className="p-8 text-center text-muted-foreground text-sm">
                                No upcoming scheduled maintenance.
                            </div>
                        ) : (
                            <div className="divide-y divide-border">
                                {upcomingSchedules.map(record => (
                                    <div key={record.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-blue-100 dark:bg-blue-900/20 p-2 rounded-lg text-blue-600">
                                                <CalendarIcon size={16} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-foreground">{getAssetName(record.assetId)}</p>
                                                <p className="text-xs text-muted-foreground flex items-center mt-0.5">
                                                    <span className="font-mono mr-2">{record.id}</span>
                                                    {new Date(record.startDate!).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                        <Badge variant="outline" className="text-[10px] font-normal">
                                            {record.type}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                 {/* Quick Stats / Distribution */}
                 <Card className="shadow-sm border-border">
                    <CardHeader className="pb-3 border-b border-border bg-muted/20">
                        <CardTitle className="text-sm font-medium flex items-center">
                            <TrendingDown className="mr-2 h-4 w-4 text-primary" />
                            Workload Distribution
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground flex items-center"><div className="w-2 h-2 rounded-full bg-red-500 mr-2"></div>Corrective</span>
                                <span className="font-medium">{activeRecords.filter(r => r.type === "Corrective").length}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground flex items-center"><div className="w-2 h-2 rounded-full bg-blue-500 mr-2"></div>Preventive</span>
                                <span className="font-medium">{activeRecords.filter(r => r.type === "Preventive").length}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground flex items-center"><div className="w-2 h-2 rounded-full bg-emerald-500 mr-2"></div>Inspection</span>
                                <span className="font-medium">{activeRecords.filter(r => r.type === "Inspection").length}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground flex items-center"><div className="w-2 h-2 rounded-full bg-purple-500 mr-2"></div>Upgrade</span>
                                <span className="font-medium">{activeRecords.filter(r => r.type === "Upgrade").length}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
