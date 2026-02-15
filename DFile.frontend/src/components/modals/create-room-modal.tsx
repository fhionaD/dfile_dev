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
    maxOccupancy?: number;
}

interface RoomModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    roomCategories: RoomCategory[];
    onSave: (room: Room) => void;
    initialData?: Room | null;
}

export function RoomModal({ open, onOpenChange, roomCategories, onSave, initialData }: RoomModalProps) {
    const [formData, setFormData] = useState<Partial<Room>>({ unitId: "", categoryId: "", floor: "", maxOccupancy: 0, status: "Available" });
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        if (open) {
            if (initialData) {
                setFormData({ ...initialData });
                setIsEditing(false); // Default to View mode for existing rooms
            } else {
                setFormData({ unitId: "", categoryId: "", floor: "", maxOccupancy: 0, status: "Available" });
                setIsEditing(true); // Default to Edit mode for new rooms
            }
        }
    }, [open, initialData]);

    const handleCategoryChange = (value: string) => {
        const category = roomCategories.find((c) => c.id === value);
        setFormData({ ...formData, categoryId: value, maxOccupancy: category?.maxOccupancy || 0 });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const roomToSave: Room = {
            id: initialData?.id || `rm_${Date.now()}`,
            unitId: formData.unitId || "",
            categoryId: formData.categoryId || "",
            floor: formData.floor || "",
            maxOccupancy: Number(formData.maxOccupancy),
            status: (formData.status as "Available" | "Occupied" | "Maintenance") || "Available"
        };

        onSave(roomToSave);
        if (!initialData) {
            onOpenChange(false);
        } else {
            setIsEditing(false); // Switch back to view mode after save
        }
    };

    const handleCancel = () => {
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
                        <div className="p-3 bg-primary/10 rounded-xl text-primary"><DoorOpen size={20} /></div>
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                                <DoorOpen size={12} /> Unit Identification
                            </Label>
                            {isEditing ? (
                                <Input required value={formData.unitId} onChange={(e) => setFormData({ ...formData, unitId: e.target.value })} placeholder="e.g. R-101" className="border-input bg-background" />
                            ) : (
                                <div className="text-sm font-medium p-2 bg-muted/20 rounded-md border border-transparent">{formData.unitId || "—"}</div>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                                <Layers size={12} /> Unit Classification
                            </Label>
                            {isEditing ? (
                                <Select value={formData.categoryId} onValueChange={handleCategoryChange}>
                                    <SelectTrigger className="border-input bg-background"><SelectValue placeholder="Select Category..." /></SelectTrigger>
                                    <SelectContent>
                                        {roomCategories.map((cat) => (
                                            <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            ) : (
                                <div className="text-sm font-medium p-2 bg-muted/20 rounded-md border border-transparent">{getCategoryName(formData.categoryId)}</div>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                                <Building2 size={12} /> Floor / Level
                            </Label>
                            {isEditing ? (
                                <Input required value={formData.floor} onChange={(e) => setFormData({ ...formData, floor: e.target.value })} placeholder="e.g. 1st Floor" className="border-input bg-background" />
                            ) : (
                                <div className="text-sm font-medium p-2 bg-muted/20 rounded-md border border-transparent">{formData.floor || "—"}</div>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                                <Users size={12} /> Max Occupancy
                            </Label>
                            {isEditing ? (
                                <Input type="number" required value={formData.maxOccupancy} onChange={(e) => setFormData({ ...formData, maxOccupancy: Number(e.target.value) })} placeholder="e.g. 2" className="border-input bg-background" />
                            ) : (
                                <div className="text-sm font-medium p-2 bg-muted/20 rounded-md border border-transparent">{formData.maxOccupancy} Person(s)</div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs font-medium text-muted-foreground">Status</Label>
                        {isEditing ? (
                            <Select value={formData.status} onValueChange={(val: "Available" | "Occupied" | "Maintenance") => setFormData({ ...formData, status: val })}>
                                <SelectTrigger className="border-input bg-background"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Available">Available</SelectItem>
                                    <SelectItem value="Occupied">Occupied</SelectItem>
                                    <SelectItem value="Maintenance">Maintenance</SelectItem>
                                </SelectContent>
                            </Select>
                        ) : (
                            <div className={`text-sm font-medium p-2 rounded-md border border-transparent inline-block px-3 py-1 ${formData.status === "Available" ? "bg-emerald-500/10 text-emerald-700" :
                                    formData.status === "Maintenance" ? "bg-amber-500/10 text-amber-700" :
                                        "bg-muted text-muted-foreground"
                                }`}>
                                {formData.status || "Unknown"}
                            </div>
                        )}
                    </div>
                </form>

                <DialogFooter className="p-6 bg-muted/40 border-t border-border shrink-0 flex justify-between items-center w-full sm:justify-between">
                    <div></div>
                    <div className="flex gap-3">
                        {isEditing ? (
                            <>
                                <Button type="button" variant="outline" onClick={handleCancel} className="rounded-xl">
                                    Cancel
                                </Button>
                                <Button type="submit" form="room-form" className="rounded-xl bg-primary text-primary-foreground shadow-lg hover:bg-primary/90">
                                    {initialData ? "Save Changes" : "Initialize Unit"}
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">
                                    Close
                                </Button>
                                <Button type="button" onClick={() => setIsEditing(true)} className="rounded-xl bg-primary text-primary-foreground shadow-lg hover:bg-primary/90">
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
