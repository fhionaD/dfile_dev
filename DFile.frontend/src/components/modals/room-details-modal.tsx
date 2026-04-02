"use client";

import { DoorOpen, Layers, Building, Edit } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Room } from "@/types/asset";
import { cn } from "@/lib/utils";

interface RoomDetailsModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    room: Room | null;
    roomCategories: { id: string; name: string; subCategory?: string }[];
    onEdit?: () => void;
}

export function RoomDetailsModal({ open, onOpenChange, room, roomCategories, onEdit }: RoomDetailsModalProps) {
    if (!room) return null;

    const category = roomCategories.find(c => c.id === room.categoryId);

    const sectionClass = "rounded-lg border border-border/40 bg-muted/20 p-3 space-y-2";
    const labelClass = "text-[11px] font-medium text-muted-foreground";
    const valueClass = "text-sm font-medium text-foreground";

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                showCloseButton
                className={cn(
                    "!gap-0 flex max-h-[min(85vh,640px)] w-full max-w-md flex-col overflow-hidden rounded-2xl border-border p-0 shadow-lg",
                    "sm:max-w-md",
                )}
            >
                <DialogHeader className="shrink-0 space-y-0 border-b border-border bg-muted/30 p-4">
                    <div className="flex items-start gap-3 pr-8">
                        <div className="shrink-0 rounded-lg border border-border/50 bg-background p-2.5 text-primary shadow-sm">
                            <DoorOpen size={20} strokeWidth={1.5} />
                        </div>
                        <div className="min-w-0 pt-0.5">
                            <DialogTitle className="text-base font-semibold leading-tight">Room Details</DialogTitle>
                            <DialogDescription className="mt-1 text-xs text-muted-foreground">
                                Room number, classification, and floor
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="max-h-[min(70vh,520px)] space-y-3 overflow-y-auto bg-background p-4">
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            <DoorOpen size={11} className="shrink-0" />
                            Room identification
                        </div>
                        <div className={sectionClass}>
                            <div>
                                <span className={cn(labelClass, "mb-0.5 block")}>Room number</span>
                                <span className={valueClass}>{room.name}</span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            <Layers size={11} className="shrink-0" />
                            Classification
                        </div>
                        <div className={cn(sectionClass, "space-y-2")}>
                            <div>
                                <span className={cn(labelClass, "mb-0.5 block")}>Category</span>
                                <span className={valueClass}>{category?.name || "Uncategorized"}</span>
                            </div>
                            <div>
                                <span className={cn(labelClass, "mb-0.5 block")}>Sub-category</span>
                                <span className={valueClass}>{room.subCategoryName || "—"}</span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            <Building size={11} className="shrink-0" />
                            Floor / level
                        </div>
                        <div className={sectionClass}>
                            <span className={valueClass}>{room.floor ?? "—"}</span>
                        </div>
                    </div>
                </div>

                <DialogFooter className="shrink-0 gap-2 border-t border-border bg-muted/30 p-4 sm:justify-end">
                    <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                        Close
                    </Button>
                    {onEdit && (
                        <Button
                            size="sm"
                            onClick={() => {
                                onOpenChange(false);
                                onEdit();
                            }}
                            className="bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
                        >
                            <Edit className="mr-2 h-3.5 w-3.5" />
                            Edit details
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
