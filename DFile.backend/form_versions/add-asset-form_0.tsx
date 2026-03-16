"use client";

import { useState, useRef } from "react";
import { Package, Upload, Layers, FileText, ChevronDown, ChevronRight, Camera, Trash2, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

import { Asset, Category, CreateAssetPayload } from "@/types/asset";

const HANDLING_TYPE_LABELS: Record<number, string> = { 0: "Fixed", 1: "Consumable", 2: "Movable" };

interface AddAssetFormProps {
    categories: Category[];
    onCancel?: () => void;
    onSuccess?: () => void;
    onAddAsset?: (payload: CreateAssetPayload, id?: string) => void;
    isModal?: boolean;
    initialData?: Asset;
}

export function AddAssetForm({ categories, onCancel, onSuccess, onAddAsset, isModal = false, initialData }: AddAssetFormProps) {
    const [previewUrl, setPreviewUrl] = useState<string | null>(initialData?.image || null);
    const [selectedCategoryId, setSelectedCategoryId] = useState<string>(
        initialData?.categoryId || ""
    );
    const [purchaseDate, setPurchaseDate] = useState<Date | undefined>(
        initialData?.purchaseDate ? new Date(initialData.purchaseDate) : undefined
    );
    const [warrantyExpiry, setWarrantyExpiry] = useState<Date | undefined>(
        initialData?.warrantyExpiry ? new Date(initialData.warrantyExpiry) : undefined
    );
    const [isManufacturerOpen, setIsManufacturerOpen] = useState(!!initialData?.manufacturer);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const selectedCategory = categories.find(c => c.id === selectedCategoryId);
    const handlingTypeLabel = selectedCategory
        ? HANDLING_TYPE_LABELS[selectedCategory.handlingType] || "—"
        : "—";

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = e.currentTarget;
        const formData = new FormData(form);

        if (!onAddAsset) return;
        if (!selectedCategoryId) return;

        const purchasePrice = Number(formData.get("purchasePrice")) || 0;
        const usefulLifeYears = Number(formData.get("usefulLifeYears")) || 0;

        const payload: CreateAssetPayload = {
            tagNumber: formData.get("tagNumber") as string || `TAG-${Date.now().toString().slice(-8)}`,
            desc: formData.get("name") as string,
            categoryId: selectedCategoryId,
            status: formData.get("status") as string || "Available",
            room: initialData?.room || undefined,
            image: previewUrl || undefined,
            manufacturer: formData.get("manufacturer") as string || undefined,
            model: formData.get("model") as string || undefined,
            serialNumber: formData.get("serialNumber") as string || undefined,
            purchaseDate: purchaseDate ? format(purchaseDate, "yyyy-MM-dd") : undefined,
            vendor: formData.get("vendor") as string || undefined,
            warrantyExpiry: warrantyExpiry ? format(warrantyExpiry, "yyyy-MM-dd") : undefined,
            notes: formData.get("notes") as string || undefined,
            value: purchasePrice,
            purchasePrice: purchasePrice,
            usefulLifeYears: usefulLifeYears > 0 ? usefulLifeYears : undefined,
        };

        onAddAsset(payload, initialData?.id);
        if (onSuccess) onSuccess();
    };

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setPreviewUrl(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    return (
        <form onSubmit={handleSubmit} className={isModal ? "flex flex-col flex-1 min-h-0 bg-background/50" : "space-y-8"}>
            <div className="flex-1 overflow-y-auto px-1">
                <div className="p-6 space-y-10">

                    {/* Section 1: General Details */}
                    <div>
                        <div className="flex items-center gap-2 mb-6 pb-2 border-b">
                            <Layers className="w-4 h-4 text-primary" />
                            <h3 className="font-semibold text-sm tracking-wide text-foreground uppercase">General Information</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2.5">
                                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Asset Name <span className="text-destructive">*</span></Label>
                                <Input name="name" defaultValue={initialData?.desc} required placeholder="e.g. Executive Desk" className="h-10" />
                            </div>

                            <div className="space-y-2.5">
                                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tag Number <span className="text-destructive">*</span></Label>
                                <Input name="tagNumber" defaultValue={initialData?.tagNumber} required placeholder="e.g. AST-2025-001" className="h-10 font-mono text-sm" />
                            </div>

                            <div className="space-y-2.5">
                                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Category <span className="text-destructive">*</span></Label>
                                <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                                    <SelectTrigger className="h-10 w-full"><SelectValue placeholder="Select Category..." /></SelectTrigger>
                                    <SelectContent position="popper" className="max-h-[200px] w-[var(--radix-select-trigger-width)]">
                                        {categories.length === 0 && (
                                            <div className="px-3 py-4 text-sm text-muted-foreground text-center">No categories available</div>
                                        )}
                                        {categories.map((c) => (
                                            <SelectItem key={c.id} value={c.id}>{c.categoryName}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2.5">
                                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Handling Type</Label>
                                <Input
                                    value={handlingTypeLabel}
                                    disabled
                                    readOnly
                                    className="h-10 bg-muted cursor-not-allowed"
                                    tabIndex={-1}
                                />
                                <p className="text-[10px] text-muted-foreground">Derived from category — cannot be changed manually</p>
                            </div>

                            <div className="space-y-2.5">
                                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</Label>
                                <Select name="status" defaultValue={initialData?.status || "Available"}>
                                    <SelectTrigger className="h-10 border-input w-full"><SelectValue /></SelectTrigger>
                                    <SelectContent position="popper" className="max-h-[200px] w-[var(--radix-select-trigger-width)]">
                                        <SelectItem value="Available"><span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500"/>Available</span></SelectItem>
                                        <SelectItem value="In Use"><span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500"/>In Use</span></SelectItem>
                                        <SelectItem value="Maintenance"><span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-amber-500"/>Maintenance</span></SelectItem>
                                        <SelectItem value="Disposed"><span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-muted-foreground"/>Disposed</span></SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2.5">
                                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Serial Number</Label>
                                <Input name="serialNumber" defaultValue={initialData?.serialNumber} placeholder="SN-12345678" className="h-10 font-mono text-sm" />
                            </div>

                            {/* Purchase Date — shadcn Calendar Popover */}
                            <div className="space-y-2.5">
                                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Purchase Date</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className={`h-10 w-full justify-start text-left font-normal ${!purchaseDate ? "text-muted-foreground" : ""}`}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {purchaseDate ? format(purchaseDate, "yyyy-MM-dd") : "Select date..."}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={purchaseDate}
                                            onSelect={setPurchaseDate}
                                            disabled={(date) => date > new Date()}
                                            autoFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>

                            <div className="space-y-2.5">
                                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Cost</Label>
                                <div className="relative">
                                    <span className="absolute left-3 top-2.5 text-muted-foreground font-semibold">₱</span>
                                    <Input name="purchasePrice" defaultValue={initialData?.purchasePrice} type="number" placeholder="0.00" className="pl-7 h-10 font-mono" />
                                </div>
                            </div>

                            <div className="space-y-2.5">
                                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Useful Life (Years)</Label>
                                <Input name="usefulLifeYears" defaultValue={initialData?.usefulLifeYears} type="number" placeholder="e.g. 5" className="h-10" />
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Image & Notes */}
                    <div>
                        <div className="flex items-center gap-2 mb-6 pb-2 border-b mt-2">
                             <FileText className="w-4 h-4 text-primary" />
                             <h3 className="font-semibold text-sm tracking-wide text-foreground uppercase">Documentation & Visuals</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="md:col-span-1 space-y-2.5">
                                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Asset Image</Label>
                                <div
                                    className="group relative border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50 h-[200px] flex flex-col items-center justify-center p-4 transition-all duration-200 cursor-pointer overflow-hidden bg-background"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    {previewUrl ? (
                                        <>
                                            <img src={previewUrl} alt="Preview" className="w-full h-full object-cover rounded-lg shadow-sm" />
                                            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 backdrop-blur-[2px]">
                                                <Camera className="w-8 h-8 text-white mb-2" />
                                                <p className="text-white text-xs font-medium tracking-wide uppercase">Change Image</p>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="flex flex-col items-center text-center p-2">
                                            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-200">
                                                <Upload className="h-6 w-6 text-primary" />
                                            </div>
                                            <p className="text-sm font-medium text-foreground">Click to upload image</p>
                                            <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 5MB</p>
                                        </div>
                                    )}
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleImageSelect}
                                    />
                                </div>
                                {previewUrl && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="w-full mt-2 text-destructive hover:text-destructive hover:bg-destructive/10 h-8"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setPreviewUrl(null);
                                            if (fileInputRef.current) fileInputRef.current.value = "";
                                        }}
                                    >
                                        <Trash2 size={14} className="mr-2" /> Remove Image
                                    </Button>
                                )}
                            </div>

                            <div className="md:col-span-2 space-y-2.5">
                                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Notes & Description</Label>
                                <Textarea
                                    name="notes"
                                    defaultValue={initialData?.notes}
                                    placeholder="Enter detailed description, condition notes, or location specifics..."
                                    className="resize-none h-[200px] font-sans leading-relaxed"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Section 3: Manufacturer Details */}
                    <div className="border rounded-lg bg-card shadow-sm">
                        <Collapsible open={isManufacturerOpen} onOpenChange={setIsManufacturerOpen}>
                            <CollapsibleTrigger asChild>
                                <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors rounded-t-lg group">
                                    <div className="flex items-center gap-2">
                                        <Package className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                        <h3 className="font-semibold text-sm tracking-wide uppercase text-muted-foreground group-hover:text-foreground transition-colors">Manufacturer & Warranty</h3>
                                    </div>
                                    <div className={`p-1 rounded-full transition-colors ${isManufacturerOpen ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                                        {isManufacturerOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                    </div>
                                </div>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                                <Separator />
                                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-muted/10">
                                    <div className="space-y-2.5">
                                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide truncate block" title="Manufacturer">Manufacturer</Label>
                                        <Input name="manufacturer" defaultValue={initialData?.manufacturer} placeholder="e.g. Herman Miller" className="h-9 bg-background" />
                                    </div>
                                    <div className="space-y-2.5">
                                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide truncate block" title="Model Number">Model Number</Label>
                                        <Input name="model" defaultValue={initialData?.model} placeholder="Model X" className="h-9 bg-background" />
                                    </div>
                                    <div className="space-y-2.5">
                                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide truncate block" title="Vendor">Vendor</Label>
                                        <Input name="vendor" defaultValue={initialData?.vendor} placeholder="Vendor Inc." className="h-9 bg-background" />
                                    </div>
                                    <div className="space-y-2.5">
                                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide truncate block" title="Warranty Expiry">Warranty Expiry</Label>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    className={`h-9 w-full justify-start text-left font-normal bg-background ${!warrantyExpiry ? "text-muted-foreground" : ""}`}
                                                >
                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                    {warrantyExpiry ? format(warrantyExpiry, "yyyy-MM-dd") : "Select date..."}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={warrantyExpiry}
                                                    onSelect={setWarrantyExpiry}
                                                    autoFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                </div>
                            </CollapsibleContent>
                        </Collapsible>
                    </div>
                </div>
            </div>

            <div className="p-4 px-6 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center justify-between mt-auto z-10">
                <div />
                <div className="flex items-center gap-3">
                    {onCancel && (
                        <Button type="button" variant="outline" onClick={onCancel}>
                            Cancel
                        </Button>
                    )}
                    <Button type="submit" disabled={!selectedCategoryId} className="h-10 text-sm px-8 shadow-sm">
                        {initialData ? "Update Asset" : "Register Asset"}
                    </Button>
                </div>
            </div>
        </form>
    );
}
