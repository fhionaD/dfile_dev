"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Package, Calendar, PhilippinePeso, Tag, MapPin, Warehouse, Wrench, Building2, User, FileText, History, ArrowRight } from "lucide-react";
import { Asset } from "@/types/asset";
import { useAssetConditionHistory } from "@/hooks/use-maintenance";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusText } from "@/components/ui/status-text";


interface AssetDetailsModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    asset: Asset | null;
    onEdit?: (asset: Asset) => void;
}

export function AssetDetailsModal({ open, onOpenChange, asset, onEdit }: AssetDetailsModalProps) {
    const { data: conditionHistory = [], isLoading: historyLoading } = useAssetConditionHistory(asset?.id);
    const formatCurrency = (val: number | undefined) =>
        val != null ? new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(val) : "—";

    const formatDate = (dateStr: string | undefined | null) => {
        if (!dateStr) return "—";
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return "—";
        return d.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "2-digit" });
    };

    if (!asset) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl rounded-2xl border-border p-0 overflow-hidden flex flex-col max-h-[85vh]">
                <DialogHeader className="p-6 bg-muted/40 border-b border-border shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12  bg-primary/10 flex items-center justify-center text-primary rounded-lg border border-primary/20">
                                <Package size={24} />
                            </div>
                            <div>
                                <DialogTitle className="text-lg font-semibold text-foreground tracking-tight">{asset.desc}</DialogTitle>
                                <div className="flex items-center gap-2 mt-1.5">
                                    <Badge variant="secondary" className="font-mono text-[10px] uppercase tracking-wider">{asset.assetCode || asset.id}</Badge>
                                    <Badge variant="outline" className="text-[10px] uppercase tracking-wider">{asset.categoryName}</Badge>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border uppercase tracking-wider ${asset.status === "Available" ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30" :
                                        asset.status === "In Use" ? "bg-blue-500/10 text-blue-700 border-blue-500/20 dark:text-blue-400 dark:border-blue-500/30" :
                                            asset.status === "Maintenance" ? "bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400 dark:border-amber-500/30" :
                                                "bg-red-500/10 text-red-700 border-red-500/20 dark:text-red-400 dark:border-red-500/30"
                                        }`}>
                                        {asset.status}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <DialogDescription className="sr-only">Detailed information about the selected asset.</DialogDescription>
                </DialogHeader>

                <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 overflow-y-auto">
                    {/* Left Column: Image & Quick Stats */}
                    <div className="space-y-6">
                        <div className="aspect-square bg-muted  flex items-center justify-center overflow-hidden border border-border">
                            {asset.image ? (
                                <img src={asset.image} alt={asset.desc} className="w-full h-full object-cover" />
                            ) : (
                                <Package size={48} className="text-muted-foreground/30" />
                            )}
                        </div>

                        <div className="bg-muted/30 p-4 space-y-3 border border-border/50">
                            <div className="space-y-0.5">
                                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                                    <PhilippinePeso size={12} /> Value
                                </p>
                                <p className="font-semibold text-sm break-all">{formatCurrency(asset.value)}</p>
                            </div>
                            <Separator />
                            <div className="space-y-0.5">
                                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                                    <MapPin size={12} /> Room
                                </p>
                                <p className="font-medium text-sm break-words">{asset.room || "—"}</p>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Detailed Info */}
                    <div className="md:col-span-2 space-y-6">
                        <div>
                            <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                                <Building2 size={16} className="text-primary" /> Manufacturer Details
                            </h4>
                            <div className="grid grid-cols-2 gap-4 text-sm bg-muted/10 p-4  border border-border/50">
                                <div>
                                    <p className="text-xs text-muted-foreground">Manufacturer</p>
                                    <p className="font-medium">{asset.manufacturer || "—"}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Model</p>
                                    <p className="font-medium">{asset.model || "—"}</p>
                                </div>
                                <div className="col-span-2">
                                    <p className="text-xs text-muted-foreground">Serial Number</p>
                                    <p className="font-mono text-xs">{asset.serialNumber || "—"}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Vendor</p>
                                    <p className="font-medium">{asset.vendor || "—"}</p>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                                <Calendar size={16} className="text-primary" /> Lifecycle Dates
                            </h4>
                            <div className="grid grid-cols-2 gap-4 text-sm bg-muted/10 p-4  border border-border/50">
                                <div>
                                    <p className="text-xs text-muted-foreground">Purchased</p>
                                    <p className="font-medium">{formatDate(asset.purchaseDate)}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Warranty Expiry</p>
                                    <p className="font-medium">{formatDate(asset.warrantyExpiry)}</p>
                                </div>
                            </div>
                        </div>

                        {asset.notes && (
                            <div>
                                <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                                    <FileText size={16} className="text-primary" /> Notes
                                </h4>
                                <p className="text-sm text-muted-foreground bg-muted/10 p-3 rounded-lg border border-border/50">
                                    {asset.notes}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Condition History Timeline */}
                    <div className="md:col-span-2">
                        <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                            <History size={16} className="text-primary" /> Condition History
                        </h4>
                        {historyLoading ? (
                            <div className="space-y-2">
                                <Skeleton className="h-10 w-full" />
                                <Skeleton className="h-10 w-full" />
                            </div>
                        ) : conditionHistory.length === 0 ? (
                            <p className="text-xs text-muted-foreground bg-muted/10 p-3 rounded-lg border border-border/50">No condition changes recorded yet.</p>
                        ) : (
                            <div className="space-y-0 relative">
                                <div className="absolute left-[11px] top-3 bottom-3 w-px bg-border" />
                                {conditionHistory.map((log, i) => {
                                    const conditionColor: Record<string, string> = {
                                        Good: "bg-emerald-500",
                                        Fair: "bg-blue-500",
                                        Poor: "bg-amber-500",
                                        Critical: "bg-red-500",
                                        Unknown: "bg-gray-400",
                                    };
                                    const conditionVariant: Record<string, "success" | "info" | "warning" | "danger" | "muted"> = {
                                        Good: "success",
                                        Fair: "info",
                                        Poor: "warning",
                                        Critical: "danger",
                                        Unknown: "muted",
                                    };
                                    return (
                                        <div key={log.id} className="flex items-start gap-3 py-2.5 relative">
                                            <div className={`h-[22px] w-[22px] rounded-full ${conditionColor[log.newCondition] ?? "bg-gray-400"} border-2 border-background shrink-0 z-10`} />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1.5 text-xs">
                                                    <StatusText variant={conditionVariant[log.previousCondition] ?? "muted"}>{log.previousCondition}</StatusText>
                                                    <ArrowRight size={10} className="text-muted-foreground" />
                                                    <StatusText variant={conditionVariant[log.newCondition] ?? "muted"}>{log.newCondition}</StatusText>
                                                </div>
                                                {log.notes && <p className="text-xs text-muted-foreground mt-0.5 truncate">{log.notes}</p>}
                                                <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                                                    {new Date(log.createdAt).toLocaleString()} {log.changedBy ? `· ${log.changedBy}` : ""}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter className="p-6 bg-muted/40 border-t border-border shrink-0 flex justify-end gap-3">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Close
                    </Button>
                    {onEdit && (
                        <Button
                            onClick={() => onEdit(asset)}
                            className="bg-primary text-primary-foreground shadow-lg hover:bg-primary/90"
                        >
                            <Wrench size={14} className="mr-2" /> Edit Detail
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
