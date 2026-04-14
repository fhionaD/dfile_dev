"use client";

import { Package } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AddAssetForm } from "@/components/forms/add-asset-form";

import { Asset, Category, ReplacementRegistrationContext } from "@/types/asset";

interface AddAssetModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    categories: Category[];
    existingSerialNumbers?: string[];
    onAddAsset?: (asset: Asset) => void;
    initialData?: Asset;
    mode?: "create" | "edit";
    /** When set, modal copy and form banner reflect maintenance replacement registration. */
    replacementContext?: ReplacementRegistrationContext | null;
}

export function AddAssetModal({
    open,
    onOpenChange,
    categories,
    existingSerialNumbers = [],
    onAddAsset,
    initialData,
    mode = "create",
    replacementContext = null,
}: AddAssetModalProps) {
    const isReplacement = !!replacementContext && mode === "create";
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[72rem] w-[95vw] rounded-2xl border-border p-0 overflow-hidden h-[90vh] flex flex-col">
                <DialogHeader className="p-6 bg-muted/40 border-b border-border shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary/10  text-primary"><Package size={20} /></div>
                        <div>
                            <DialogTitle className="text-lg font-semibold text-foreground">
                                {mode === "edit" ? "Edit Asset Details" : isReplacement ? "Register replacement asset" : "Register New Asset"}
                            </DialogTitle>
                            <DialogDescription className="text-muted-foreground text-xs mt-1">
                                {mode === "edit"
                                    ? "Modify existing asset record"
                                    : isReplacement
                                      ? "This asset replaces the original linked to the approved maintenance request. Fields are the same as standard registration."
                                      : "Physical Asset Intake Protocol"}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <AddAssetForm
                    categories={categories}
                    existingSerialNumbers={existingSerialNumbers}
                    onCancel={() => onOpenChange(false)}
                    onSuccess={() => onOpenChange(false)}
                    onAddAsset={onAddAsset}
                    isModal={true}
                    initialData={initialData}
                    replacementContext={replacementContext ?? undefined}
                />
            </DialogContent>
        </Dialog>
    );
}
