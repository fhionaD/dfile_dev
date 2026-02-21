"use client";

import { useState, useEffect } from "react";
import { DoorOpen, Building2, Layers, Users, Archive, RotateCcw } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { Room } from "@/types/asset";

interface RoomCategory {
    id: string;
    name: string;
    subCategory?: string; // Added subCategory
    maxOccupancy?: number;
    status?: "Active" | "Archived";
    archived?: boolean;
}

interface RoomModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    roomCategories: RoomCategory[];
    onSave: (room: Room) => void;
    initialData?: Room | null;
    defaultEditing?: boolean; // Added prop
}

export function RoomModal({ open, onOpenChange, roomCategories, onSave, initialData, defaultEditing = false }: RoomModalProps) {
    const [formData, setFormData] = useState<Partial<Room>>({ unitId: "", name: "", categoryId: "", floor: "", maxOccupancy: 0, status: "Available" });
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        if (open) {
            if (initialData) {
                setFormData({ ...initialData });
                setIsEditing(defaultEditing); // Use prop
            } else {
                setFormData({ unitId: "", name: "", categoryId: "", floor: "", maxOccupancy: 0, status: "Available" });
                setIsEditing(true); 
            }
        }
    }, [open, initialData, defaultEditing]);

    const handleCategoryChange = (value: string) => {
        const category = roomCategories.find((c) => c.id === value);
        setFormData({ ...formData, categoryId: value, maxOccupancy: category?.maxOccupancy || 0 });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const roomToSave: Room = {
            id: initialData?.id || `rm_${Date.now()}`,
            unitId: formData.unitId || `U-${Date.now().toString().slice(-4)}`, // Auto-generate if not provided
            name: formData.name || "",     // Room Name
            categoryId: formData.categoryId || "",
            // Find category and attach subCategory name if needed, though strictly Room object only needs ID.
            // But if we want to store plain text for display... Room interface has categoryName/subCategoryName optional.
            // Let's keep it simple for now, standardizing on retrieving from joined data or just storing IDs.
            floor: formData.floor || "",
            maxOccupancy: 0, // Default to 0 as requested to remove input
            status: (formData.status as "Available" | "Occupied" | "Maintenance" | "Deactivated") || "Available"
        };
        
        onSave(roomToSave);
        if (!initialData) {
            onOpenChange(false);
        } else {
            setIsEditing(false); // Switch back to view mode after save
        }
    };

    const handleCancel = () => {
        // If we opened in edit mode by default, cancel should close the modal
        if (defaultEditing) {
             onOpenChange(false);
             return;
        }

        if (initialData && isEditing) {
            setIsEditing(false); // Revert to view mode
            setFormData({ ...initialData }); // Reset changes
        } else {
            onOpenChange(false); // Close modal
        }
    };

    const getCategoryName = (id?: string) => roomCategories.find(c => c.id === id)?.name || id || "—";

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-xl rounded-2xl border-border p-0 overflow-hidden flex flex-col">
                <DialogHeader className="p-6 bg-muted/40 border-b border-border shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary/10  text-primary"><DoorOpen size={20} /></div>
                        <div>
                            <DialogTitle className="text-lg font-semibold text-foreground">
                                {isEditing ? (initialData ? "Edit Room Details" : "Create Room Unit") : "Room Details"}
                            </DialogTitle>
                            <DialogDescription className="text-muted-foreground text-xs mt-1">
                                {isEditing ? "Update room information and status" : "View room information and status"}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <form id="room-form" onSubmit={handleSubmit} className="p-6 space-y-6 flex-1 overflow-y-auto">
                    <div className="space-y-2">
                        <Label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                            <Building2 size={12} /> Room Number <span className="text-destructive">*</span>
                        </Label>
                            {isEditing ? (
                            <Input required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Room 12" className="h-10 bg-background text-sm" />
                        ) : (
                            <div className="text-sm font-medium p-2 bg-muted/20 rounded-md border border-transparent">{formData.name || "—"}</div>
                        )}
                    </div>
                    
                    <div className="space-y-2">
                        <Label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                            <Layers size={12} /> Category / Classification <span className="text-destructive">*</span>
                        </Label>
                            {isEditing ? (
                            <Select value={formData.categoryId} onValueChange={handleCategoryChange}>
                                <SelectTrigger className="w-full h-10 bg-background px-3 text-sm truncate [&>span]:truncate">
                                    <SelectValue placeholder="Select Category..." />
                                </SelectTrigger>
                                <SelectContent className="max-h-[200px]">
                                    {roomCategories.filter(cat => !cat.archived || cat.id === formData.categoryId).map((cat) => (
                                        <SelectItem key={cat.id} value={cat.id} className="cursor-pointer">
                                            <span className="font-medium text-foreground">{cat.name}</span>
                                            {cat.subCategory && <span className="text-muted-foreground ml-1 font-normal">— {cat.subCategory}</span>}
                                            {cat.archived && <span className="ml-2 text-xs text-destructive">(Archived)</span>}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        ) : (
                            <div className="text-sm font-medium p-2 bg-muted/20 rounded-md border border-transparent">
                                {(() => {
                                    const cat = roomCategories.find(c => c.id === formData.categoryId);
                                    return cat ? `${cat.name} ${cat.subCategory ? `— ${cat.subCategory}` : ''}` : formData.categoryId || "—";
                                })()}
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                            <Building2 size={12} /> Floor / Level <span className="text-destructive">*</span>
                        </Label>
                        {isEditing ? (
                            <Input 
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                required 
                                value={formData.floor} 
                                onChange={(e) => {
                                    // Only allow digits
                                    const value = e.target.value.replace(/[^0-9]/g, '');
                                    setFormData({ ...formData, floor: value });
                                }}
                                placeholder="e.g. 2" 
                                className="h-10 bg-background text-sm" 
                            />
                        ) : (
                            <div className="text-sm font-medium p-2 bg-muted/20 rounded-md border border-transparent">{formData.floor || "—"}</div>
                        )}
                    </div>

                    {/* Status, Max Occupancy, and Unit ID removed from inputs as per request */}
                    {!isEditing && (
                         <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
                            <div className="space-y-1">
                                <Label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Status</Label>
                                <div className={`text-sm font-medium inline-block px-2 py-0.5 rounded ${
                                    formData.status === "Available" ? "bg-emerald-500/10 text-emerald-700" :
                                    formData.status === "Maintenance" ? "bg-amber-500/10 text-amber-700" :
                                    formData.status === "Deactivated" ? "bg-red-500/10 text-red-700" :
                                    "bg-muted text-muted-foreground"
                                }`}>
                                    {formData.status || "Unknown"}
                                </div>
                            </div>
                             <div className="space-y-1">
                                <Label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">ID</Label>
                                <div className="text-sm font-mono text-foreground">{formData.unitId || "—"}</div>
                            </div>
                        </div>
                    )}
                </form>

                <DialogFooter className="p-6 bg-muted/40 border-t border-border shrink-0 flex justify-between items-center w-full sm:justify-between">
                    <div></div>
                    <div className="flex gap-3">
                        {isEditing ? (
                            <>
                                <Button type="button" variant="outline" onClick={handleCancel} className="h-10 text-sm">
                                    Cancel
                                </Button>
                                <Button type="submit" form="room-form" className="h-10 text-sm px-4 bg-primary text-primary-foreground shadow-lg hover:bg-primary/90">
                                    {initialData ? "Save Changes" : "Initialize Unit"}
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-10 text-sm">
                                    Close
                                </Button>
                                <Button type="button" onClick={() => setIsEditing(true)} className="h-10 text-sm px-4 bg-primary text-primary-foreground shadow-lg hover:bg-primary/90">
                                    Edit Details
                                </Button>
                            </>
                        )}
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
