"use client";

import { useState, useRef } from "react";
import { LayoutGrid, Plus, Edit3, Save, Archive, RotateCcw } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Category, AssetType } from "@/types/asset";

interface ManageCategoriesModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    categories: Category[];
    onAddCategory: (cat: { id: string; name: string; description: string; type: AssetType }) => void;
    onUpdateCategory: (id: string, data: Partial<Category>) => void;
    onArchiveCategory: (id: string) => void;
}

export function ManageCategoriesModal({ open, onOpenChange, categories, onAddCategory, onUpdateCategory, onArchiveCategory }: ManageCategoriesModalProps) {
    const [view, setView] = useState<'active' | 'archived'>('active');
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const [newCat, setNewCat] = useState<{ name: string; description: string; type: AssetType }>({
        name: "",
        description: "",
        type: "Moveable"
    });

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingId) {
            onUpdateCategory(editingId, newCat);
            setEditingId(null);
        } else {
            onAddCategory({ ...newCat, id: `cat_${Date.now()}` });
        }
        setNewCat({ name: "", description: "", type: "Moveable" });
        setIsAdding(false);
    };

    const handleEdit = (cat: Category) => {
        setNewCat({ name: cat.name, description: cat.description, type: cat.type });
        setEditingId(cat.id);
        setIsAdding(true);
        setTimeout(() => scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' }), 100);
    };

    const handleCancel = () => {
        setIsAdding(false);
        setEditingId(null);
        setNewCat({ name: "", description: "", type: "Moveable" });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl rounded-2xl border-border p-0 overflow-hidden max-h-[85vh] flex flex-col">
                <DialogHeader className="p-6 bg-muted/40 border-b border-border shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-primary/10 rounded-xl text-primary"><LayoutGrid size={22} /></div>
                            <div>
                                <DialogTitle className="text-lg font-semibold text-foreground">
                                    {view === 'active' ? "Physical Asset Categories" : "Archived Categories"}
                                </DialogTitle>
                                <DialogDescription className="text-muted-foreground text-xs mt-1">
                                    {view === 'active' ? "Tenant-Level Classification Schema" : "Restore or permanently delete archived items"}
                                </DialogDescription>
                            </div>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setView(view === 'active' ? 'archived' : 'active')}
                            className="text-sm h-10 bg-background"
                        >
                            {view === 'active' ? (
                                <>
                                    <Archive size={14} className="mr-2" />
                                    View Archived ({categories.filter(c => c.status === 'Archived').length})
                                </>
                            ) : (
                                <>Back to Active</>
                            )}
                        </Button>
                    </div>
                </DialogHeader>

                <div ref={scrollRef} className="p-6 overflow-y-auto flex-1 space-y-6">
                    {/* Add Trigger / Form - Only in Active View */}
                    {view === 'active' && (
                        !isAdding ? (
                            <button
                                onClick={() => {
                                    setEditingId(null);
                                    setNewCat({ name: "", description: "", type: "Moveable" });
                                    setIsAdding(true);
                                }}
                                className="w-full py-6 border-2 border-dashed border-border rounded-2xl flex items-center justify-center gap-3 text-muted-foreground hover:text-primary hover:border-primary hover:bg-primary/5 transition-all group"
                            >
                                <Plus size={22} className="group-hover:rotate-90 transition-transform duration-300" />
                                <span className="font-semibold text-xs">Define New Classification</span>
                            </button>
                        ) : (
                            <form onSubmit={handleAdd} className="bg-muted/30 p-6 rounded-2xl border border-border space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-2 md:col-span-2">
                                        <Label className="text-xs font-medium text-muted-foreground">Category Name</Label>
                                        <Input required value={newCat.name} onChange={(e) => setNewCat({ ...newCat, name: e.target.value })} placeholder="e.g. Smart Appliances" className="border-input bg-background" />
                                    </div>
                                    <div className="space-y-2 md:col-span-1">
                                        <Label className="text-xs font-medium text-muted-foreground">Asset Type</Label>
                                        <Input required value={newCat.type} onChange={(e) => setNewCat({ ...newCat, type: e.target.value })} placeholder="e.g. Moveable" className="border-input bg-background" />
                                    </div>
                                    <div className="space-y-2 md:col-span-3">
                                        <Label className="text-xs font-medium text-muted-foreground">Description</Label>
                                        <Input value={newCat.description} onChange={(e) => setNewCat({ ...newCat, description: e.target.value })} placeholder="Brief scope of assets" className="border-input bg-background" />
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <Button type="submit" className="flex-1 rounded-xl bg-primary text-primary-foreground shadow-lg hover:bg-primary/90">
                                        <Save size={14} className="mr-2" /> {editingId ? "Save Changes" : "Save Classification"}
                                    </Button>
                                    <Button type="button" variant="outline" onClick={handleCancel} className="px-6 rounded-xl">
                                        Cancel
                                    </Button>
                                </div>
                            </form>
                        )
                    )}

                    {/* Category List */}
                    <div className="grid grid-cols-1 gap-3">
                        {categories.filter(cat => view === 'active' ? cat.status !== 'Archived' : cat.status === 'Archived').map((cat) => (
                            <div key={cat.id} className={`group flex items-center justify-between p-5 rounded-2xl border border-border transition-all ${cat.status === 'Archived' ? 'bg-muted/30 opacity-60 grayscale' : 'bg-card/50 hover:border-primary/20 hover:bg-card'}`}>
                                <div className="flex items-center gap-5">
                                    <div className="p-3 bg-primary/10 rounded-xl text-primary"><LayoutGrid size={18} /></div>
                                    <div className="flex-1 min-w-0 grid gap-0.5">
                                        <h4 className="text-sm font-bold text-foreground truncate">{cat.name}</h4>
                                        <p className="text-xs font-medium text-muted-foreground truncate">{cat.description}</p>
                                    </div>
                                    <div className="px-4 shrink-0">
                                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap ${cat.type === "Fixed" ? "bg-blue-500/10 text-blue-500 border-blue-500/20" :
                                            cat.type === "Moveable" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                                                "bg-amber-500/10 text-amber-500 border-amber-500/20"
                                            }`}>
                                            {cat.type}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 shrink-0">
                                    <div className="text-right px-4 border-r border-border">
                                        <p className="text-sm font-bold text-foreground">{cat.items ?? 0}</p>
                                        <p className="text-[10px] font-medium text-muted-foreground">Active Assets</p>
                                    </div>
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
                    <Button onClick={() => onOpenChange(false)} className="px-8 rounded-xl bg-primary text-primary-foreground shadow-lg hover:bg-primary/90">
                        Finished Configuration
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
