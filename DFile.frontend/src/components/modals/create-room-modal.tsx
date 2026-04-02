"use client";

import { useState, useEffect, useMemo } from "react";
import { DoorOpen, Building2, Layers } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { Room, RoomSubCategory } from "@/types/asset";
import { cn } from "@/lib/utils";

interface RoomCategory {
    id: string;
    name: string;
    maxOccupancy?: number;
    status?: "Active" | "Archived";
    archived?: boolean;
}

interface RoomModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    roomCategories: RoomCategory[];
    subCategories?: RoomSubCategory[];
    onSave: (room: Room) => void;
    initialData?: Room | null;
    defaultEditing?: boolean;
}

export function RoomModal({ open, onOpenChange, roomCategories, subCategories = [], onSave, initialData, defaultEditing = false }: RoomModalProps) {
    const [formData, setFormData] = useState<Partial<Room>>({ unitId: "", name: "", categoryId: "", subCategoryId: "", floor: "", maxOccupancy: 0, status: "Available" });
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        if (open) {
            if (initialData) {
                setFormData({ ...initialData });
                setIsEditing(defaultEditing);
            } else {
                setFormData({ unitId: "", name: "", categoryId: "", subCategoryId: "", floor: "", maxOccupancy: 0, status: "Available" });
                setIsEditing(true); 
            }
        }
    }, [open, initialData, defaultEditing]);

    // Filter sub-categories based on selected category
    const filteredSubCategories = useMemo(() => {
        if (!formData.categoryId) return [];
        return subCategories.filter(sc => sc.roomCategoryId === formData.categoryId && !sc.isArchived);
    }, [formData.categoryId, subCategories]);

    const handleCategoryChange = (value: string) => {
        const category = roomCategories.find((c) => c.id === value);
        setFormData({ ...formData, categoryId: value, subCategoryId: "", maxOccupancy: category?.maxOccupancy || 0 });
    };

    const handleSubCategoryChange = (value: string) => {
        setFormData({ ...formData, subCategoryId: value === "__none__" ? "" : value });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const roomToSave: Room = {
            id: initialData?.id || `rm_${Date.now()}`,
            unitId: formData.unitId || `U-${Date.now().toString().slice(-4)}`,
            name: formData.name || "",
            categoryId: formData.categoryId || "",
            subCategoryId: formData.subCategoryId || undefined,
            floor: formData.floor || "",
            maxOccupancy: 0,
            status: (formData.status as "Available" | "Occupied" | "Maintenance" | "Deactivated") || "Available"
        };
        
        onSave(roomToSave);
        if (!initialData) {
            onOpenChange(false);
        } else {
            setIsEditing(false);
        }
    };

    const handleCancel = () => {
        if (defaultEditing) {
             onOpenChange(false);
             return;
        }

        if (initialData && isEditing) {
            setIsEditing(false);
            setFormData({ ...initialData });
        } else {
            onOpenChange(false);
        }
    };

    const getSubCategoryName = (id?: string) => {
        if (!id) return "—";
        return subCategories.find(sc => sc.id === id)?.name || "—";
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className={cn(
                    "!gap-0 flex max-h-[min(85vh,720px)] w-full max-w-xl flex-col overflow-hidden rounded-2xl border-border p-0",
                )}
            >
                <DialogHeader className="shrink-0 space-y-0 border-b border-border bg-muted/40 p-4">
                    <div className="flex items-start gap-3 pr-8">
                        <div className="shrink-0 rounded-lg bg-primary/10 p-2.5 text-primary">
                            <DoorOpen size={18} />
                        </div>
                        <div className="min-w-0">
                            <DialogTitle className="text-base font-semibold leading-tight text-foreground">
                                {isEditing ? (initialData ? "Edit room details" : "Create room unit") : "Room details"}
                            </DialogTitle>
                            <DialogDescription className="mt-1 text-xs text-muted-foreground">
                                {isEditing ? "Update room information" : "Room number, category, sub-category, and floor"}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <form
                    id="room-form"
                    onSubmit={handleSubmit}
                    className={cn(
                        "overflow-y-auto bg-background p-4",
                        isEditing ? "max-h-[min(65vh,480px)] space-y-5" : "space-y-3",
                    )}
                >
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
                                            {cat.archived && <span className="ml-2 text-xs text-destructive">(Archived)</span>}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        ) : (
                            <div className="text-sm font-medium p-2 bg-muted/20 rounded-md border border-transparent">
                                {(() => {
                                    const cat = roomCategories.find(c => c.id === formData.categoryId);
                                    return cat ? cat.name : formData.categoryId || "—";
                                })()}
                            </div>
                        )}
                    </div>

                    {/* Sub-Category Selection */}
                    <div className="space-y-2">
                        <Label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                            <Layers size={12} /> Sub-Category
                        </Label>
                        {isEditing ? (
                            <Select 
                                value={formData.subCategoryId || "__none__"} 
                                onValueChange={handleSubCategoryChange}
                                disabled={!formData.categoryId || filteredSubCategories.length === 0}
                            >
                                <SelectTrigger className="w-full h-10 bg-background px-3 text-sm truncate [&>span]:truncate">
                                    <SelectValue placeholder={!formData.categoryId ? "Select a category first" : filteredSubCategories.length === 0 ? "No sub-categories available" : "Select Sub-Category..."} />
                                </SelectTrigger>
                                <SelectContent className="max-h-[200px]">
                                    <SelectItem value="__none__" className="cursor-pointer text-muted-foreground">None</SelectItem>
                                    {filteredSubCategories.map((sc) => (
                                        <SelectItem key={sc.id} value={sc.id} className="cursor-pointer">
                                            <span className="font-medium text-foreground">{sc.name}</span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        ) : (
                            <div className="text-sm font-medium p-2 bg-muted/20 rounded-md border border-transparent">
                                {getSubCategoryName(formData.subCategoryId)}
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
                </form>

                <DialogFooter className="shrink-0 gap-2 border-t border-border bg-muted/40 p-4 sm:justify-end">
                    {isEditing ? (
                        <>
                            <Button type="button" variant="outline" size="sm" onClick={handleCancel}>
                                Cancel
                            </Button>
                            <Button type="submit" form="room-form" size="sm" className="bg-primary text-primary-foreground shadow-sm hover:bg-primary/90">
                                {initialData ? "Save changes" : "Initialize unit"}
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                                Close
                            </Button>
                            <Button type="button" size="sm" onClick={() => setIsEditing(true)} className="bg-primary text-primary-foreground shadow-sm hover:bg-primary/90">
                                Edit details
                            </Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
