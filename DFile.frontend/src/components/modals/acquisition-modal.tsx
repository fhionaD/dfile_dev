"use client";

import { useState } from "react";
import { ShoppingCart, DollarSign, Tag, Calendar, Upload, Layers, FileText } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PurchaseOrder, Asset } from "@/types/asset";
import { useCategories } from "@/hooks/use-categories";
import { useCreateOrder } from "@/hooks/use-procurement";

interface AcquisitionModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    replacementAsset?: Asset | null;
}

export function AcquisitionModal({ open, onOpenChange, replacementAsset }: AcquisitionModalProps) {
    const { data: categories = [] } = useCategories();
    const createOrderMutation = useCreateOrder();

    const [depreciationResult, setDepreciationResult] = useState<{ bookValue: number; monthlyDep: number } | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string>(replacementAsset?.cat || "");

    const handleFieldChange = (form: HTMLFormElement) => {
        const formData = new FormData(form);
        const price = Number(formData.get("purchasePrice")) || 0;
        const life = Number(formData.get("usefulLife")) || 0;
        const dateStr = formData.get("purchaseDate") as string;

        if (price > 0 && life > 0) {
            const monthlyDep = price / (life * 12);
            let ageMonths = 0;
            if (dateStr) {
                const pd = new Date(dateStr);
                const now = new Date();
                ageMonths = Math.max(0, (now.getFullYear() - pd.getFullYear()) * 12 + (now.getMonth() - pd.getMonth()));
            }
            const totalDep = Math.min(monthlyDep * ageMonths, price);
            setDepreciationResult({ bookValue: Math.max(price - totalDep, 0), monthlyDep });
        } else {
            setDepreciationResult(null);
        }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = e.currentTarget;
        const formData = new FormData(form);

        const purchasePrice = Number(formData.get("purchasePrice")) || 0;
        const usefulLifeYears = Number(formData.get("usefulLife")) || 0;
        const purchaseDate = formData.get("purchaseDate") as string;
        const assetName = formData.get("assetName") as string;
        const manufacturer = formData.get("manufacturer") as string;
        const model = formData.get("model") as string;
        const serialNumber = formData.get("serialNumber") as string;
        const vendor = formData.get("vendor") as string;
        const category = categories.find(c => c.name === selectedCategory);

        const assetId = `AST-${Date.now().toString().slice(-6)}`;
        const orderId = `PO-${Date.now().toString().slice(-6)}`;

        // Calculate depreciation
        const monthlyDepreciation = usefulLifeYears > 0 ? purchasePrice / (usefulLifeYears * 12) : 0;
        let ageMonths = 0;
        if (purchaseDate) {
            const pd = new Date(purchaseDate);
            const now = new Date();
            ageMonths = Math.max(0, (now.getFullYear() - pd.getFullYear()) * 12 + (now.getMonth() - pd.getMonth()));
        }
        const totalDep = Math.min(monthlyDepreciation * ageMonths, purchasePrice);

        const newAsset: Asset = {
            id: assetId,
            desc: assetName,
            cat: category?.name || "Unknown",
            status: "Available",
            room: "—",
            manufacturer,
            model,
            serialNumber,
            purchaseDate,
            vendor,
            value: purchasePrice,
            purchasePrice,
            usefulLifeYears: usefulLifeYears > 0 ? usefulLifeYears : undefined,
            monthlyDepreciation: monthlyDepreciation > 0 ? monthlyDepreciation : undefined,
            currentBookValue: Math.max(purchasePrice - totalDep, 0),
        };

        const newOrder: PurchaseOrder = {
            id: orderId,
            assetName,
            category: category?.name || "Unknown",
            vendor,
            manufacturer,
            model,
            serialNumber,
            purchasePrice,
            purchaseDate,
            usefulLifeYears,
            status: "Approved",
            requestedBy: "Alex Thompson",
            createdAt: new Date().toISOString().split("T")[0],
            assetId,
        };

        await createOrderMutation.mutateAsync({ order: newOrder, asset: newAsset });

        setDepreciationResult(null);
        setSelectedCategory("");
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader className="p-6 bg-muted/40 border-b border-border shrink-0">
                    <DialogTitle className="flex items-center gap-2">
                        <ShoppingCart className="h-5 w-5" />
                        {replacementAsset ? `Request Replacement for ${replacementAsset.desc}` : "New Asset Acquisition"}
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground text-xs mt-1">
                        Create a purchase order for {replacementAsset ? "a replacement" : "new"} equipment.
                    </DialogDescription>
                </DialogHeader>

                <form id="acquisition-form" onSubmit={handleSubmit} onChange={(e) => handleFieldChange(e.currentTarget)} className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 hover:bg-muted/50 transition-colors cursor-pointer">
                        <Upload size={32} className="mx-auto text-muted-foreground mb-2" />
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Click to upload asset image</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                                <Tag size={12} /> Asset Name
                            </Label>
                            <Input name="assetName" required placeholder="e.g. Industrial Washer Unit" className="border-input bg-background" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                                <Layers size={12} /> Classification
                            </Label>
                            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                                <SelectTrigger className="border-input bg-background">
                                    <SelectValue placeholder="Select Category" />
                                </SelectTrigger>
                                <SelectContent>
                                    {categories.map((c) => (
                                        <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-medium text-muted-foreground">Vendor</Label>
                            <Input name="vendor" placeholder="e.g. TechSupply Co." className="border-input bg-background" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-medium text-muted-foreground">Manufacturer</Label>
                            <Input name="manufacturer" placeholder="e.g. Samsung" className="border-input bg-background" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-medium text-muted-foreground">Model</Label>
                            <Input name="model" placeholder="e.g. QN90C" className="border-input bg-background" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-medium text-muted-foreground">Serial Number</Label>
                            <Input name="serialNumber" placeholder="e.g. SN-123456789" className="border-input bg-background" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                                <DollarSign size={12} /> Purchase Price
                            </Label>
                            <Input name="purchasePrice" type="number" step="0.01" required placeholder="0.00" className="border-input bg-background" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                                <Calendar size={12} /> Purchase Date
                            </Label>
                            <Input name="purchaseDate" type="date" required className="border-input bg-background" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                                <FileText size={12} /> Useful Life (Years)
                            </Label>
                            <Input name="usefulLife" type="number" required placeholder="5" className="border-input bg-background" />
                        </div>
                    </div>

                    {depreciationResult && (
                        <div className="bg-muted/50 rounded-xl p-5 border border-border">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Depreciation Preview (Straight-Line)</p>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xl font-semibold text-foreground">${depreciationResult.bookValue.toFixed(2)}</p>
                                    <p className="text-xs text-muted-foreground">Current Book Value</p>
                                </div>
                                <div>
                                    <p className="text-xl font-semibold text-foreground">${depreciationResult.monthlyDep.toFixed(2)}</p>
                                    <p className="text-xs text-muted-foreground">Monthly Depreciation</p>
                                </div>
                            </div>
                        </div>
                    )}
                </form>

                <DialogFooter className="gap-3 p-6 bg-muted/40 border-t border-border shrink-0">
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1 rounded-xl">
                        Cancel
                    </Button>
                    <Button type="submit" form="acquisition-form" className="flex-2 rounded-xl bg-primary text-primary-foreground shadow-lg hover:bg-primary/90">
                        Initiate Procurement
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
