"use client";

import { useState, useRef } from "react";
import { LayoutGrid, Plus, Edit3, Save, Archive, RotateCcw, Info, User, Clock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Category, HandlingType } from "@/types/asset";

interface ManageCategoriesModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    categories: Category[];
    onAddCategory: (cat: { id: string; name: string; description: string; handlingType: HandlingType }) => void;
    onUpdateCategory: (id: string, data: Partial<Category>) => void;
    onArchiveCategory: (id: string) => void;
}

export function ManageCategoriesModal({ open, onOpenChange, categories, onAddCategory, onUpdateCategory, onArchiveCategory }: ManageCategoriesModalProps) {
    const [view, setView] = useState<'active' | 'archived' | 'detail'>('active');
    const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const [newCat, setNewCat] = useState<{ name: string; description: string; handlingType: HandlingType }>({
        name: "",
        description: "",
        handlingType: "Fixed"
    });

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingId) {
            onUpdateCategory(editingId, newCat);
            setEditingId(null);
        } else {
            onAddCategory({ ...newCat, id: `cat_${Date.now()}` });
        }
        setNewCat({ name: "", description: "", handlingType: "Fixed" });
        setIsAdding(false);
    };

    const handleEdit = (cat: Category) => {
        setNewCat({ name: cat.name, description: cat.description, handlingType: cat.handlingType || "Fixed" });
        setEditingId(cat.id);
        setIsAdding(true);
        setView('active');
        setTimeout(() => scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' }), 100);
    };

    const handleViewDetail = (cat: Category) => {
        setSelectedCategory(cat);
        setView('detail');
    };

    const handleCancel = () => {
        setIsAdding(false);
        setEditingId(null);
        setNewCat({ name: "", description: "", handlingType: "Fixed" });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl rounded-2xl border-border p-0 overflow-hidden max-h-[85vh] flex flex-col">
                <DialogHeader className="p-6 bg-muted/40 border-b border-border shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-primary/10  text-primary">
                                {view === 'detail' ? <Info size={22} /> : <LayoutGrid size={22} />}
                            </div>
                            <div>
                                <DialogTitle className="text-lg font-semibold text-foreground">
                                    {view === 'active' ? "Physical Asset Categories" : 
                                     view === 'archived' ? "Archived Categories" : 
                                     "Category Details"}
                                </DialogTitle>
                                <DialogDescription className="text-muted-foreground text-xs mt-1">
                                    {view === 'active' ? "Tenant-Level Classification Schema" : 
                                     view === 'archived' ? "Restore or permanently delete archived items" :
                                     `Detailed view of ${selectedCategory?.name}`}
                                </DialogDescription>
                            </div>
                        </div>
                        {view === 'detail' && (
                            <Button variant="ghost" size="sm" onClick={() => setView(selectedCategory?.isArchived ? 'archived' : 'active')}>
                                Back to List
                            </Button>
                        )}
                    </div>
                </DialogHeader>

                <div ref={scrollRef} className="p-6 overflow-y-auto flex-1 space-y-6">
                    {view === 'detail' && selectedCategory ? (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div>
                                        <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">Category Name</Label>
                                        <p className="text-lg font-semibold">{selectedCategory.name}</p>
                                    </div>
                                    <div>
                                        <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">Handling Type</Label>
                                        <div>
                                            <span className={`text-xs font-semibold px-2 py-1 rounded-full border ${
                                                selectedCategory.handlingType === "Fixed" ? "bg-blue-500/10 text-blue-500 border-blue-500/20" :
                                                selectedCategory.handlingType === "Moveable" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                                                "bg-amber-500/10 text-amber-500 border-amber-500/20"
                                            }`}>
                                                {selectedCategory.handlingType}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">Description</Label>
                                        <p className="text-sm text-muted-foreground">{selectedCategory.description || "No description provided."}</p>
                                    </div>
                                    <div>
                                        <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">Active Assets</Label>
                                        <p className="text-sm font-semibold">{selectedCategory.items || 0} Assets registered</p>
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/20 p-4 rounded-xl border border-border">
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 text-xs">
                                        <Clock size={14} className="text-muted-foreground" />
                                        <span className="text-muted-foreground">Created:</span>
                                        <span className="font-medium">{selectedCategory.createdAt ? new Date(selectedCategory.createdAt).toLocaleString() : 'N/A'}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs">
                                        <User size={14} className="text-muted-foreground" />
                                        <span className="text-muted-foreground">Created By:</span>
                                        <span className="font-medium">{selectedCategory.createdBy || 'System'}</span>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 text-xs">
                                        <Clock size={14} className="text-muted-foreground" />
                                        <span className="text-muted-foreground">Last Updated:</span>
                                        <span className="font-medium">{selectedCategory.updatedAt ? new Date(selectedCategory.updatedAt).toLocaleString() : 'N/A'}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs">
                                        <User size={14} className="text-muted-foreground" />
                                        <span className="text-muted-foreground">Updated By:</span>
                                        <span className="font-medium">{selectedCategory.updatedBy || 'System'}</span>
                                    </div>
                                </div>
                            </div>

                            {selectedCategory.isArchived && (
                                <div className="bg-destructive/5 p-4 rounded-xl border border-destructive/20 flex flex-col gap-3">
                                    <div className="flex items-center gap-2 text-xs text-destructive">
                                        <Archive size={14} />
                                        <span className="font-bold uppercase tracking-wider text-[10px]">Archival Information</span>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="flex items-center gap-2 text-xs">
                                            <Clock size={14} className="text-destructive/70" />
                                            <span className="text-muted-foreground">Archived At:</span>
                                            <span className="font-medium">{selectedCategory.archivedAt ? new Date(selectedCategory.archivedAt).toLocaleString() : 'N/A'}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs">
                                            <User size={14} className="text-destructive/70" />
                                            <span className="text-muted-foreground">Archived By:</span>
                                            <span className="font-medium">{selectedCategory.archivedBy || 'N/A'}</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-3 pt-4">
                                {!selectedCategory.isArchived ? (
                                    <>
                                        <Button onClick={() => handleEdit(selectedCategory)} className="flex-1">
                                            <Edit3 size={14} className="mr-2" /> Edit Category
                                        </Button>
                                        <Button 
                                            variant="destructive" 
                                            onClick={() => {
                                                onArchiveCategory(selectedCategory.id);
                                                setView('active');
                                            }} 
                                            className="flex-1"
                                        >
                                            <Archive size={14} className="mr-2" /> Archive
                                        </Button>
                                    </>
                                ) : (
                                    <Button 
                                        onClick={() => {
                                            onArchiveCategory(selectedCategory.id); // This will restore based on page logic
                                            setView('archived');
                                        }} 
                                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                                    >
                                        <RotateCcw size={14} className="mr-2" /> Restore Category
                                    </Button>
                                )}
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Add Trigger / Form - Only in Active View */}
                            {view === 'active' && (
                                !isAdding ? (
                                    <button
                                        onClick={() => {
                                            setEditingId(null);
                                            setNewCat({ name: "", description: "", handlingType: "Fixed" });
                                            setIsAdding(true);
                                        }}
                                        className="w-full py-6 border-2 border-dashed border-border rounded-2xl flex items-center justify-center gap-3 text-muted-foreground hover:text-primary hover:border-primary hover:bg-primary/5 transition-all group"
                                    >
                                        <Plus size={22} className="group-hover:rotate-90 transition-transform duration-300" />
                                        <span className="font-semibold text-xs">Define New Classification</span>
                                    </button>
                                ) : (
                                    <form onSubmit={handleAdd} className="bg-muted/30 p-6 rounded-2xl border border-border space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label className="text-xs font-medium text-muted-foreground">Category Name</Label>
                                                <Input required value={newCat.name} onChange={(e) => setNewCat({ ...newCat, name: e.target.value })} placeholder="e.g. Smart Appliances" className="h-10 border-input bg-background" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-xs font-medium text-muted-foreground">Handling Type</Label>
                                                <Select required value={newCat.handlingType} onValueChange={(val: HandlingType) => setNewCat({ ...newCat, handlingType: val })}>
                                                    <SelectTrigger className="h-10 border-input bg-background w-full">
                                                        <SelectValue placeholder="Select handling type" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="Consumable">Consumable</SelectItem>
                                                        <SelectItem value="Moveable">Moveable</SelectItem>
                                                        <SelectItem value="Fixed">Fixed</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2 md:col-span-2">
                                                <Label className="text-xs font-medium text-muted-foreground">Description</Label>
                                                <Input value={newCat.description} onChange={(e) => setNewCat({ ...newCat, description: e.target.value })} placeholder="Brief scope of assets" className="border-input bg-background" />
                                            </div>
                                        </div>
                                        <div className="flex gap-3 justify-end">
                                            <Button type="button" variant="outline" onClick={handleCancel}>
                                                Cancel
                                            </Button>
                                            <Button type="submit" className=" bg-primary text-primary-foreground shadow-lg hover:bg-primary/90">
                                                <Save size={14} className="mr-2" /> {editingId ? "Save Changes" : "Save Classification"}
                                            </Button>
                                        </div>
                                    </form>
                                )
                            )}

                            {/* Category List */}
                            <div className="grid grid-cols-1 gap-3">
                                {categories.filter(cat => view === 'active' ? (cat.status !== 'Archived' && !cat.isArchived) : (cat.status === 'Archived' || cat.isArchived)).map((cat) => (
                                    <div key={cat.id} className={`group flex items-center justify-between p-5 rounded-2xl border border-border transition-all ${cat.isArchived ? 'bg-muted/30 opacity-60 grayscale' : 'bg-card/50 hover:border-primary/20 hover:bg-card'}`}>
                                        <div className="flex items-center gap-5 flex-1 cursor-pointer" onClick={() => handleViewDetail(cat)}>
                                            <div className="p-3 bg-primary/10  text-primary"><LayoutGrid size={18} /></div>
                                            <div className="flex-1 min-w-0 grid gap-0.5">
                                                <h4 className="text-sm font-bold text-foreground truncate">{cat.name}</h4>
                                                <p className="text-xs font-medium text-muted-foreground truncate">{cat.description}</p>
                                            </div>
                                            <div className="px-4 shrink-0">
                                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap ${
                                                    cat.handlingType === "Fixed" ? "bg-blue-500/10 text-blue-500 border-blue-500/20" :
                                                    cat.handlingType === "Moveable" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                                                    "bg-amber-500/10 text-amber-500 border-amber-500/20"
                                                }`}>
                                                    {cat.handlingType}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4 shrink-0">
                                            <div className="text-right px-4 border-r border-border">
                                                <p className="text-sm font-bold text-foreground">{cat.items ?? 0}</p>
                                                <p className="text-[10px] font-medium text-muted-foreground">Active Assets</p>
                                            </div>
                                            <div className="flex gap-1.5">
                                                <button onClick={() => handleEdit(cat)} disabled={cat.isArchived} className="p-2.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-all disabled:opacity-50"><Edit3 size={16} /></button>
                                                <button onClick={() => onArchiveCategory(cat.id)} className={`p-2.5 rounded-md transition-all ${cat.isArchived ? 'text-primary hover:bg-primary/10' : 'text-destructive/70 hover:text-destructive hover:bg-destructive/10'}`}>
                                                    {cat.isArchived ? <RotateCcw size={16} /> : <Archive size={16} />}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>

                <DialogFooter className="p-6 bg-muted/40 border-t border-border shrink-0 flex justify-between gap-3">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setView(view === 'archived' ? 'active' : 'archived')}
                        className="h-10 text-sm w-[160px] justify-start bg-background"
                        disabled={view === 'detail'}
                    >
                        {view === 'active' ? (
                            <>
                                <Archive size={14} className="mr-2" />
                                Show Archive ({categories.filter(c => c.isArchived || c.status === 'Archived').length})
                            </>
                        ) : (
                            <>
                                <RotateCcw size={14} className="mr-2" />
                                Show Active ({categories.filter(c => !c.isArchived && c.status !== 'Archived').length})
                            </>
                        )}
                    </Button>
                    <Button onClick={() => onOpenChange(false)} className="h-10 text-sm px-4 bg-primary text-primary-foreground shadow-lg hover:bg-primary/90">
                        Finished Configuration
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
