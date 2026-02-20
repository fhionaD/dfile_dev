"use client";

import { useState } from "react";
import { Package, DollarSign, Tag, Calendar, Upload, Layers, FileText, ChevronDown, ChevronRight, Camera, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";

import { Asset, Category } from "@/types/asset";

interface AddAssetFormProps {
    categories: Category[];
    onCancel?: () => void;
    onSuccess?: () => void;
    onAddAsset?: (asset: Asset) => void;
    isModal?: boolean;
}

export function AddAssetForm({ categories, onCancel, onSuccess, onAddAsset, isModal = false }: AddAssetFormProps) {
    const [depreciationResult, setDepreciationResult] = useState<{ bookValue: number; monthlyDep: number } | null>(null);
    const [isCalculating, setIsCalculating] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [selectedType, setSelectedType] = useState<string>("Tangible");

    // Section visibility states
    const [isManufacturerOpen, setIsManufacturerOpen] = useState(true);

    const handleCalculate = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = e.currentTarget;
        const formData = new FormData(form);
        const catId = formData.get("category") as string;
        const category = categories.find(c => c.id === catId);

        // If simple registration (no API call needed for basic demo unless strictly required)
        if (onAddAsset) {
            const purchasePrice = Number(formData.get("purchasePrice")) || 0;
            const usefulLifeYears = Number(formData.get("usefulLifeYears")) || 0;
            const newAsset: Asset = {
                id: formData.get("assetId") as string || `AST-${Date.now().toString().slice(-6)}`,
                desc: formData.get("name") as string,
                cat: category?.name || "Unknown",
                status: formData.get("status") as string || "Available",
                room: "—",
                image: previewUrl || undefined,
                manufacturer: formData.get("manufacturer") as string,
                model: formData.get("model") as string,
                serialNumber: formData.get("serialNumber") as string,
                purchaseDate: formData.get("purchaseDate") as string,
                vendor: formData.get("vendor") as string,
                warrantyExpiry: formData.get("warrantyExpiry") as string,
                nextMaintenance: formData.get("nextMaintenance") as string,
                notes: formData.get("notes") as string,
                value: purchasePrice,
                purchasePrice: purchasePrice,
                usefulLifeYears: usefulLifeYears > 0 ? usefulLifeYears : undefined,
            };
            onAddAsset(newAsset);
            if (onSuccess) onSuccess();
            return;
        }

        // Fallback to calculation if standalone
        setIsCalculating(true);
        // ... calculation logic ...
        setIsCalculating(false);
    };

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
        }
    };

    return (
        <form onSubmit={handleCalculate} className={isModal ? "flex flex-col h-[80vh]" : "space-y-6"}>
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {/* Top Section: Details & Image */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Asset Details */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold border-b border-border/50 pb-2 w-full">Asset details</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                            <div className="space-y-1.5 align-top">
                                <Label className="text-xs font-semibold text-foreground">Asset Name *</Label>
                                <Input name="name" required placeholder="e.g. Executive Desk" className="h-10 text-sm" />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-foreground">Category *</Label>
                                <Select name="category" onValueChange={(val) => {
                                    const cat = categories.find(c => c.id === val);
                                    if (cat) {
                                        // Auto-select type based on category
                                        const typeSelect = document.querySelector('button[name="type"]') as HTMLButtonElement; // Hacky if not controlled
                                        // Better: Control the Type state
                                        setSelectedType(cat.type);
                                    }
                                }}>
                                    <SelectTrigger className="h-10 text-sm"><SelectValue placeholder="Select..." /></SelectTrigger>
                                    <SelectContent>
                                        {categories.map((c) => (
                                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-foreground">Asset Type *</Label>
                                <Select name="type" value={selectedType} onValueChange={setSelectedType}>
                                    <SelectTrigger className="h-10 text-sm"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {/* Dynamic types from categories + defaults */}
                                        {Array.from(new Set([...categories.map(c => c.type), "Tangible", "Intangible"])).map(t => (
                                            <SelectItem key={t} value={t}>{t}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-foreground">Status *</Label>
                                <Select name="status" defaultValue="Available">
                                    <SelectTrigger className="h-10 text-sm"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Available">Available</SelectItem>
                                        <SelectItem value="In Use">In Use</SelectItem>
                                        <SelectItem value="Maintenance">Maintenance</SelectItem>
                                        <SelectItem value="Disposed">Disposed</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-foreground">Serial Number</Label>
                                <Input name="serialNumber" className="h-10 text-sm" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-foreground">Purchase Date</Label>
                                <Input name="purchaseDate" type="date" className="h-10 text-sm" />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-foreground">Cost</Label>
                                <Input name="purchasePrice" type="number" placeholder="0.00" className="h-10 text-sm" />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-foreground">Useful Life (Years)</Label>
                                <Input name="usefulLifeYears" type="number" placeholder="e.g. 5" className="h-10 text-sm" />
                            </div>

                            <div className="col-span-1 md:col-span-2 space-y-1.5">
                                <Label className="text-xs font-semibold text-foreground">Notes</Label>
                                <Textarea name="notes" placeholder="Additional details..." className="resize-none h-20 text-sm" />
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Image */}
                    <div className="space-y-4">
                        <div className="border rounded-xl overflow-hidden bg-muted/20 h-56 relative flex items-center justify-center group">
                            {previewUrl ? (
                                <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                            ) : (
                                <div className="text-center text-muted-foreground p-4">
                                    <Camera size={48} className="mx-auto mb-2 opacity-20" />
                                    <p className="text-xs">No image selected</p>
                                </div>
                            )}
                            <div className="absolute inset-x-0 bottom-0 p-2 bg-black/60 flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-white hover:bg-white/20" type="button" onClick={() => document.getElementById('image-upload')?.click()}>
                                    <Camera size={16} />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-white hover:bg-white/20 hover:text-red-400" type="button" onClick={() => setPreviewUrl(null)}>
                                    <Trash2 size={16} />
                                </Button>
                            </div>
                            <input id="image-upload" type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                        </div>

                        <div className="border rounded-xl p-4 bg-muted/10 border-dashed">
                            <div className="flex items-center gap-2 text-muted-foreground mb-2">
                                <Plus size={16} />
                                <span className="text-xs font-medium">Attachments</span>
                            </div>
                            <div className="text-center p-4 border border-dashed rounded-lg bg-card/50 text-xs text-muted-foreground cursor-pointer hover:bg-muted/50 transition-colors">
                                Drag and drop files to upload
                            </div>
                        </div>
                    </div>
                </div>

                {/* Collapsible Section: Manufacturer */}
                <Collapsible open={isManufacturerOpen} onOpenChange={setIsManufacturerOpen} className="border rounded-xl overflow-hidden bg-white dark:bg-card">
                    <div className="flex items-center justify-between p-4 bg-muted/10 cursor-pointer" onClick={() => setIsManufacturerOpen(!isManufacturerOpen)}>
                        <h4 className="font-semibold text-sm">Asset Manufacturer Details</h4>
                        {isManufacturerOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </div>
                    <CollapsibleContent>
                        <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-border/50">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-muted-foreground">Manufacturer</Label>
                                <Input name="manufacturer" className="h-10 text-sm" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-muted-foreground">Model</Label>
                                <Input name="model" className="h-10 text-sm" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-muted-foreground">Vendor Name</Label>
                                <Input name="vendor" className="h-10 text-sm" />
                            </div>
                            <div className="col-span-1 md:col-span-3 space-y-1.5">
                                <Label className="text-xs font-semibold text-muted-foreground">Warranty Terms / Remarks</Label>
                                <Input name="warranty" className="h-10 text-sm" />
                            </div>
                        </div>
                    </CollapsibleContent>
                </Collapsible>
            </div>

            <div className={`p-6 border-t bg-muted/40 flex items-center gap-3 ${isModal ? "sticky bottom-0 z-10" : ""}`}>
                {onCancel && (
                    <Button type="button" variant="outline" onClick={onCancel} className="flex-1 rounded-xl">
                        Cancel
                    </Button>
                )}
                <Button type="submit" className="flex-[2] rounded-xl bg-primary text-primary-foreground shadow-lg hover:bg-primary/90">
                    Register Asset
                </Button>
            </div>
        </form>
    );
}
