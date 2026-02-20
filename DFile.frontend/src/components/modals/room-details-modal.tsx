"use client";

import { DoorOpen, Layers, Building, Users, Activity, Edit, Hash, MapPin, Tag } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Room } from "@/types/asset";

interface RoomDetailsModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    room: Room | null;
    roomCategories: { id: string; name: string; subCategory?: string }[];
    onEdit: () => void;
}

export function RoomDetailsModal({ open, onOpenChange, room, roomCategories, onEdit }: RoomDetailsModalProps) {
    if (!room) return null;

    const category = roomCategories.find(c => c.id === room.categoryId);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Available': return 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400';
            case 'Occupied': return 'text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400';
            case 'Maintenance': return 'text-red-600 bg-red-50 dark:bg-red-950/30 dark:text-red-400';
            default: return 'text-gray-600 bg-gray-50 dark:bg-gray-800 dark:text-gray-400';
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md rounded-2xl border-border p-0 overflow-hidden flex flex-col gap-0 shadow-lg">
                <DialogHeader className="p-6 bg-muted/30 border-b border-border shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-background border border-border/50 rounded-xl text-primary shadow-sm">
                            <DoorOpen size={24} strokeWidth={1.5} />
                        </div>
                        <div>
                            <DialogTitle className="text-lg font-semibold text-foreground">Room Details</DialogTitle>
                            <DialogDescription className="text-muted-foreground text-xs mt-1">
                                View room information and status
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="p-6 space-y-6 flex-1 overflow-y-auto bg-background">
                    {/* Primary Info */}
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                            <DoorOpen size={12} />
                            Room Identification
                        </div>
                        <div className="p-4 bg-muted/20 rounded-xl border border-border/40 space-y-4">
                             <div>
                                <span className="text-xs text-muted-foreground block mb-1">Room Number</span>
                                <span className="text-sm font-semibold text-foreground">{room.name}</span>
                            </div>
                        </div>
                    </div>

                    {/* Classification */}
                     <div className="space-y-1">
                        <div className="flex items-center gap-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                            <Layers size={12} />
                            Category / Classification
                        </div>
                        <div className="p-4 bg-muted/20 rounded-xl border border-border/40">
                             <span className="text-sm font-medium text-foreground">
                                {category?.name || "Uncategorized"} 
                                {category?.subCategory && <span className="mx-2 text-muted-foreground">—</span>}
                                {category?.subCategory}
                             </span>
                        </div>
                    </div>

                    {/* Location & Status Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                             <div className="flex items-center gap-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                <Building size={12} />
                                Floor / Level
                            </div>
                            <div className="p-3 bg-muted/20 rounded-xl border border-border/40 h-16 flex items-center px-4">
                                <span className="text-sm font-semibold">{room.floor}</span>
                            </div>
                        </div>
                         {/* Optional Occupancy */}
                         {/* <div className="space-y-1">
                             <div className="flex items-center gap-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                <Users size={12} />
                                Max Occupancy
                            </div>
                            <div className="p-3 bg-muted/20 rounded-xl border border-border/40 h-16 flex items-center px-4">
                                <span className="text-sm font-semibold">{category?.maxOccupancy || room.maxOccupancy || "-"}</span>
                            </div>
                        </div> */}
                    </div>

                    {/* Metadata Footer */}
                    <div className="pt-2 flex items-center justify-between">
                        <div className="space-y-1">
                             <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">Status</span>
                             <Badge variant="secondary" className={`mt-1 font-medium border-0 px-2.5 py-0.5 ${getStatusColor(room.status)}`}>
                                {room.status}
                             </Badge>
                        </div>
                        <div className="text-right space-y-1">
                             <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">ID</span>
                             <span className="text-xs font-mono text-muted-foreground">{room.unitId || room.id}</span>
                        </div>
                    </div>
                </div>

                <DialogFooter className="gap-3 p-6 bg-muted/30 border-t border-border shrink-0 sm:justify-between">
                    <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl h-11 px-6">
                        Close
                    </Button>
                    <Button 
                        onClick={() => {
                            onOpenChange(false);
                            onEdit();
                        }} 
                        className="rounded-xl h-11 px-6 bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
                    >
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Details
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

