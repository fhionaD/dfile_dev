"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tag } from "lucide-react";
import { AssetCategory as Category } from "@/types/asset";
import { useUpdateCategory } from "@/hooks/use-categories";

interface EditCategoryModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    category: Category | null;
    onSuccess?: () => void;
}

export function EditCategoryModal({ open, onOpenChange, category, onSuccess }: EditCategoryModalProps) {
    const updateMutation = useUpdateCategory();
    const [form, setForm] = useState({
        categoryName: "",
        description: "",
        handlingType: 0,
    });
    const [hasLinkedAssets, setHasLinkedAssets] = useState(false);

    useEffect(() => {
        if (category && open) {
            setForm({
                categoryName: category.categoryName,
                description: category.description || "",
                handlingType: category.handlingType,
            });
            setHasLinkedAssets((category.assetCount ?? 0) > 0);
        }
    }, [category, open]);

    const handleSave = async () => {
        if (!category) return;
        if (!form.categoryName.trim()) return;

        const payload: any = {
            categoryName: form.categoryName.trim(),
            description: form.description.trim(),
            handlingType: form.handlingType,
            rowVersion: category.rowVersion,
        };

        try {
            await updateMutation.mutateAsync({ id: category.id, payload });
            onOpenChange(false);
            onSuccess?.();
        } catch {
            // Error toast is handled by the mutation's onError callback.
        }
    };

    if (!category) return null;

    const canChangeHandlingType = !hasLinkedAssets;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-primary/10 flex items-center justify-center text-primary rounded-lg">
                            <Tag size={20} />
                        </div>
                        <div>
                            <DialogTitle>Edit Category</DialogTitle>
                            <DialogDescription>Update the category details below.</DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="categoryName">Category Name</Label>
                        <Input
                            id="categoryName"
                            value={form.categoryName}
                            onChange={(e) => setForm(f => ({ ...f, categoryName: e.target.value }))}
                            placeholder="e.g. IT Equipment"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Input
                            id="description"
                            value={form.description}
                            onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                            placeholder="Category description"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="handlingType">Handling Type</Label>
                        <Select
                            value={String(form.handlingType)}
                            onValueChange={(v) => setForm(f => ({ ...f, handlingType: Number(v) }))}
                            disabled={!canChangeHandlingType}
                        >
                            <SelectTrigger id="handlingType">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="0">Fixed</SelectItem>
                                <SelectItem value="1">Consumable</SelectItem>
                                <SelectItem value="2">Movable</SelectItem>
                            </SelectContent>
                        </Select>
                        {!canChangeHandlingType && (
                            <p className="text-xs text-muted-foreground">
                                Cannot change handling type while assets are linked to this category.
                            </p>
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={updateMutation.isPending || !form.categoryName.trim()}
                    >
                        {updateMutation.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
