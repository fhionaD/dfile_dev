"use client";

import { useState, useRef } from "react";
import { Layers, Plus, Edit3, Save, DoorOpen, Users, PhilippinePeso, Archive, RotateCcw } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const AMENITY_TIERS = ["Standard", "Premium", "Luxury"];

interface RoomCategory {
    id: string;
    name: string;
    subCategory: string; // Added subCategory
    description: string;
    baseRate: number;
    maxOccupancy?: number;
    status?: "Active" | "Archived";
    archived?: boolean;
}

interface ManageRoomCategoriesModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    roomCategories: RoomCategory[];
    onAddCategory: (data: { name: string; subCategory: string; description: string; baseRate: number; maxOccupancy?: number }) => void;
    onUpdateCategory: (id: string, data: Partial<RoomCategory>) => void;
    onArchiveCategory: (id: string) => void;
}

export function ManageRoomCategoriesModal({ open, onOpenChange, roomCategories, onAddCategory, onUpdateCategory, onArchiveCategory }: ManageRoomCategoriesModalProps) {
    const [mode, setMode] = useState<"list" | "add" | "edit">("list");
    const [view, setView] = useState<"active" | "archived">("active");
    const [editId, setEditId] = useState<string | null>(null);
    const [formData, setFormData] = useState({ name: "", subCategory: "", description: "" });
    const scrollRef = useRef<HTMLDivElement>(null);

    const resetForm = () => { setFormData({ name: "", subCategory: "", description: "" }); setMode("list"); setEditId(null); };

    const handleAdd = (e: React.FormEvent) => { e.preventDefault(); onAddCategory({ ...formData, baseRate: 0, maxOccupancy: 0 }); resetForm(); };
    const handleEdit = (cat: RoomCategory) => { 
        setFormData({ name: cat.name, subCategory: cat.subCategory || "", description: cat.description }); 
        setEditId(cat.id); 
        setMode("edit"); 
        scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    };
    const handleUpdate = (e: React.FormEvent) => { e.preventDefault(); if (editId) onUpdateCategory(editId, formData); resetForm(); };

    const renderForm = (onSubmit: (e: React.FormEvent) => void, submitLabel: string) => (
        <form onSubmit={onSubmit} className="bg-muted/30 p-6 rounded-2xl border border-border space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground flex items-center gap-2"><DoorOpen size={12} /> Category Name</Label>
                    <Input required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Deluxe Suite" className="border-input bg-background" />
                </div>
                <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground flex items-center gap-2"><Layers size={12} /> Sub-Category</Label>
                    <Input required value={formData.subCategory} onChange={(e) => setFormData({ ...formData, subCategory: e.target.value })} placeholder="e.g. Double Bed / Ocean View" className="border-input bg-background" />
                </div>
            </div>
            
            <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">Description</Label>
                <Textarea rows={2} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Category description..." className="border-input bg-background resize-none" />
            </div>
            <div className="flex gap-3">
                <Button type="submit" className="flex-1 rounded-xl bg-primary text-primary-foreground shadow-lg hover:bg-primary/90"><Save size={14} className="mr-2" /> {submitLabel}</Button>
                <Button type="button" variant="outline" onClick={resetForm} className="px-6 rounded-xl">Cancel</Button>
            </div>
        </form>
    );

    return (
        <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) resetForm(); }}>
            <DialogContent className="max-w-3xl rounded-2xl border-border p-0 overflow-hidden max-h-[85vh] flex flex-col">
                <DialogHeader className="p-6 bg-muted/40 border-b border-border shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary/10 rounded-xl text-primary"><Layers size={22} /></div>
                        <div className="flex-1">
                            <DialogTitle className="text-lg font-semibold text-foreground">
                                {view === 'active' ? "Room Categories" : "Archived Room Categories"}
                            </DialogTitle>
                            <DialogDescription className="text-muted-foreground text-xs mt-1">
                                {view === 'active' ? "Room Classification Configuration" : "Restore archived room categories"}
                            </DialogDescription>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            className="text-xs font-medium"
                            onClick={() => setView(view === 'active' ? 'archived' : 'active')}
                        >
                            {view === 'active' ? (
                                <>
                                    <Archive size={14} className="mr-2" />
                                    View Archived ({roomCategories.filter(c => c.status === 'Archived').length})
                                </>
                            ) : (
                                <>
                                    <RotateCcw size={14} className="mr-2" />
                                    View Active ({roomCategories.filter(c => c.status !== 'Archived').length})
                                </>
                            )}
                        </Button>
                    </div>
                </DialogHeader>

                <div ref={scrollRef} className="p-6 overflow-y-auto flex-1 space-y-6">
                    {mode === "list" && (
                        <button onClick={() => setMode("add")} className="w-full py-6 border-2 border-dashed border-border rounded-2xl flex items-center justify-center gap-3 text-muted-foreground hover:text-primary hover:border-primary hover:bg-primary/5 transition-all group">
                            <Plus size={22} className="group-hover:rotate-90 transition-transform duration-300" />
                            <span className="font-semibold text-xs">Add Room Category</span>
                        </button>
                    )}
                    {mode === "add" && renderForm(handleAdd, "Save Category")}
                    {mode === "edit" && renderForm(handleUpdate, "Update Category")}

                    <div className="grid grid-cols-1 gap-3">
                        {roomCategories.filter(cat => view === 'active' ? cat.status !== 'Archived' : cat.status === 'Archived').map((cat) => (
                            <div key={cat.id} className={`group flex items-center justify-between p-5 rounded-2xl border border-border transition-all ${cat.status === 'Archived' ? 'bg-muted/30 opacity-60 grayscale' : 'bg-card/50 hover:border-primary/20 hover:bg-card'}`}>
                                <div className="flex items-center gap-5">
                                    <div className="p-3 bg-primary/10 rounded-xl text-primary"><DoorOpen size={18} /></div>
                                    <div>
                                        <h4 className="text-sm font-bold text-foreground">
                                            {cat.name}
                                            {cat.subCategory && <span className="text-muted-foreground font-normal ml-1">• {cat.subCategory}</span>}
                                        </h4>
                                        <p className="text-xs font-medium text-muted-foreground">{cat.description || "No description"}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="flex gap-1.5">
                                        <button onClick={() => handleEdit(cat)} disabled={cat.status === 'Archived'} className="p-2.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all disabled:opacity-50"><Edit3 size={16} /></button>
                                        <button onClick={() => onArchiveCategory(cat.id)} className={`p-2.5 rounded-lg transition-all ${cat.status === 'Archived' ? 'text-primary hover:bg-primary/10' : 'text-destructive/70 hover:text-destructive hover:bg-destructive/10'}`}>
                                            {cat.status === 'Archived' ? <RotateCcw size={16} /> : <Archive size={16} />}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <DialogFooter className="p-6 bg-muted/40 border-t border-border shrink-0">
                    <Button onClick={() => onOpenChange(false)} className="px-8 rounded-xl bg-primary text-primary-foreground shadow-lg hover:bg-primary/90">Done</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
