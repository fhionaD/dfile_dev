"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tag, Calendar, Package, Edit, User } from "lucide-react";
import { format } from "date-fns";
import { Category } from "@/types/asset";

const handlingLabels: Record<number, string> = { 0: "Fixed", 1: "Consumable", 2: "Movable" };
const handlingColors: Record<number, string> = {
    0: "text-blue-700 dark:text-blue-400",
    1: "text-amber-700 dark:text-amber-400",
    2: "text-emerald-700 dark:text-emerald-400",
};

function formatDate(dateString: string | undefined | null): string {
    if (!dateString) return "—";
    try {
        return format(new Date(dateString), "MMM d, yyyy");
    } catch {
        return dateString;
    }
}

interface CategoryDetailsModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    category: Category | null;
    onEdit?: (category: Category) => void;
}

export function CategoryDetailsModal({ open, onOpenChange, category, onEdit }: CategoryDetailsModalProps) {
    if (!category) return null;

    const statusColor = category.status !== 'Archived'
        ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30"
        : "bg-gray-500/10 text-gray-600 border-gray-500/20 dark:text-gray-400 dark:border-gray-500/30";

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg rounded-2xl border-border p-0 overflow-hidden flex flex-col max-h-[85vh]">
                <DialogHeader className="p-6 bg-muted/40 border-b border-border shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 bg-primary/10 flex items-center justify-center text-primary rounded-lg border border-primary/20">
                            <Tag size={24} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <DialogTitle className="text-lg font-semibold text-foreground tracking-tight truncate">
                                {category.categoryName}
                            </DialogTitle>
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border uppercase tracking-wider ${handlingColors[category.handlingType] ?? handlingColors[0]}`}>
                                    {handlingLabels[category.handlingType] ?? "Unknown"}
                                </span>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border uppercase tracking-wider ${statusColor}`}>
                                    {category.status}
                                </span>
                            </div>
                        </div>
                    </div>
                    <DialogDescription className="sr-only">Detailed information about the selected category.</DialogDescription>
                </DialogHeader>

                <div className="p-6 space-y-6 flex-1 overflow-y-auto">
                    {/* Description */}
                    {category.description && (
                        <div>
                            <h4 className="text-sm font-semibold text-foreground mb-2">Description</h4>
                            <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg border border-border/50">
                                {category.description}
                            </p>
                        </div>
                    )}

                    {/* Category Details */}
                    <div>
                        <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                            <Tag size={16} className="text-primary" /> Category Details
                        </h4>
                        <div className="grid grid-cols-2 gap-4 text-sm bg-muted/10 p-4 rounded-lg border border-border/50">
                            <div>
                                <p className="text-xs text-muted-foreground">Category Name</p>
                                <p className="font-medium">{category.categoryName}</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Handling Type</p>
                                <p className="font-medium">{handlingLabels[category.handlingType] ?? "Unknown"}</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Status</p>
                                <p className="font-medium">{category.status}</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Default Salvage Value</p>
                                <p className="font-medium">{category.salvagePercentage ?? 10}%</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Package size={12} /> Total Assets
                                </p>
                                <p className="font-medium">{category.items}</p>
                            </div>
                        </div>
                    </div>

                    {/* Timestamps */}
                    <div>
                        <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                            <Calendar size={16} className="text-primary" /> Activity
                        </h4>
                        <div className="grid grid-cols-2 gap-4 text-sm bg-muted/10 p-4 rounded-lg border border-border/50">
                            <div>
                                <p className="text-xs text-muted-foreground">Created</p>
                                <p className="font-medium">{String("")}</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Last Updated</p>
                                <p className="font-medium">{String("")}</p>
                            </div>
                            {false && (
                                <div>
                                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                                        <User size={12} /> Created By
                                    </p>
                                    <p className="font-medium">{(category as any).createdByName}</p>
                                </div>
                            )}
                            {false && (
                                <div>
                                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                                        <User size={12} /> Updated By
                                    </p>
                                    <p className="font-medium">{(category as any).updatedByName}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <DialogFooter className="p-6 bg-muted/40 border-t border-border shrink-0 flex justify-end gap-3">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Close
                    </Button>
                    {onEdit && category.status !== "Archived" && (
                        <Button
                            onClick={() => onEdit(category)}
                            className="bg-primary text-primary-foreground shadow-lg hover:bg-primary/90"
                        >
                            <Edit size={14} className="mr-2" /> Edit Details
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
