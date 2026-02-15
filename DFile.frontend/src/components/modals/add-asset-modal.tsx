"use client";

import { Package } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AddAssetForm } from "@/components/forms/add-asset-form";

import { Asset, Category } from "@/types/asset";

interface AddAssetModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    categories: Category[];
    onAddAsset?: (asset: Asset) => void;
}

export function AddAssetModal({ open, onOpenChange, categories, onAddAsset }: AddAssetModalProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl rounded-2xl border-border p-0 overflow-hidden">
                <DialogHeader className="p-6 bg-muted/40 border-b border-border">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary/10 rounded-xl text-primary"><Package size={20} /></div>
                        <div>
                            <DialogTitle className="text-lg font-semibold text-foreground">Register New Asset</DialogTitle>
                            <DialogDescription className="text-muted-foreground text-xs mt-1">Physical Asset Intake Protocol</DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <AddAssetForm
                    categories={categories}
                    onCancel={() => onOpenChange(false)}
                    onSuccess={() => onOpenChange(false)}
                    onAddAsset={onAddAsset}
                    isModal={true}
                />
            </DialogContent>
        </Dialog>
    );
}
