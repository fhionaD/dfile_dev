"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Package, Upload, Layers, FileText, ChevronDown, ChevronRight, Camera, Trash2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

import { Asset, Category, ReplacementRegistrationContext } from "@/types/asset";
import { cn } from "@/lib/utils";

interface AddAssetFormProps {
    categories: Category[];
    existingSerialNumbers?: string[];
    onCancel?: () => void;
    onSuccess?: () => void;
    onAddAsset?: (asset: Asset) => void;
    isModal?: boolean;
    initialData?: Asset;
    replacementContext?: ReplacementRegistrationContext | null;
}

export function AddAssetForm({
    categories,
    existingSerialNumbers = [],
    onCancel,
    onSuccess,
    onAddAsset,
    isModal = false,
    initialData,
    replacementContext,
}: AddAssetFormProps) {
    const isCreating = !initialData;

    const [previewUrl, setPreviewUrl] = useState<string | null>(initialData?.image || null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [assetName, setAssetName] = useState(initialData?.desc ?? "");
    const [warrantyExpiryValue, setWarrantyExpiryValue] = useState(
        initialData?.warrantyExpiry ? new Date(initialData.warrantyExpiry).toISOString().split("T")[0] : ""
    );

    const getHandlingTypeLabel = (handlingType: number) => (
        handlingType === 0 ? "Fixed" : handlingType === 1 ? "Consumable" : "Movable"
    );

    const [isManufacturerOpen, setIsManufacturerOpen] = useState(true);
    const [isGenInfoOpen, setIsGenInfoOpen] = useState(true);
    const [isDocOpen, setIsDocOpen] = useState(true);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const initialCategoryId = initialData ? categories.find(c => c.id === initialData.categoryId)?.id : undefined;
    const [selectedCategoryId, setSelectedCategoryId] = useState<string>(initialCategoryId ?? "");
    const [isSalvageOverride, setIsSalvageOverride] = useState(initialData?.isSalvageOverride ?? false);
    const [manualSalvagePctStr, setManualSalvagePctStr] = useState<string>(String(initialData?.salvagePercentage ?? ""));
    const [costInput, setCostInput] = useState<number>(initialData?.purchasePrice ?? 0);

    const selectedCategory = useMemo(() => categories.find(c => c.id === selectedCategoryId), [categories, selectedCategoryId]);
    const categorySalvagePct = selectedCategory?.salvagePercentage ?? 10;
    const manualSalvagePct = Number(manualSalvagePctStr) || 0;
    const effectiveSalvagePct = isSalvageOverride ? manualSalvagePct : categorySalvagePct;
    const computedSalvageValue = costInput > 0 ? Math.round(costInput * effectiveSalvagePct / 100 * 100) / 100 : 0;

    /* Required-field gate */
    const isFormValid = useMemo(() => {
        const base =
            assetName.trim().length > 0 && selectedCategoryId.length > 0 && warrantyExpiryValue.length > 0;
        if (!isCreating) return base;
        return base && costInput > 0;
    }, [assetName, selectedCategoryId, warrantyExpiryValue, costInput, isCreating]);

    const canSubmit = !isSubmitting && isFormValid;

    useEffect(() => {
        if (!isSalvageOverride) {
            setManualSalvagePctStr(String(categorySalvagePct));
        }
    }, [selectedCategoryId, categorySalvagePct, isSalvageOverride]);

    useEffect(() => {
        if (!initialData) return;
        const resolved = categories.find(c => c.id === initialData.categoryId)?.id ?? "";
        setSelectedCategoryId(resolved);
    }, [initialData, categories]);

    const todayStr = new Date().toISOString().split("T")[0];

    const handleCalculate = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (isSubmitting) {
            toast.error("Request already in progress. Please wait.");
            return;
        }
        if (!warrantyExpiryValue) {
            toast.error("Warranty expiry date is required.");
            return;
        }

        const form = e.currentTarget;
        const formData = new FormData(form);
        const catId = selectedCategoryId || (formData.get("category") as string);
        if (!catId) {
            toast.error("Category is required.");
            return;
        }
        const category = categories.find(c => c.id === catId);

        const purchaseDateStr = formData.get("purchaseDate") as string;
        if (purchaseDateStr && new Date(purchaseDateStr) > new Date()) {
            toast.error("Purchase date cannot be in the future.");
            return;
        }

        const serialNumber = String(formData.get("serialNumber") ?? "").trim();
        if (serialNumber) {
            const currentSerial = (initialData?.serialNumber ?? "").trim().toLowerCase();
            const exists = existingSerialNumbers.some(s => s.trim().toLowerCase() === serialNumber.toLowerCase() && s.trim().toLowerCase() !== currentSerial);
            if (exists) {
                toast.error("Serial Number already exists. Please use a unique Serial Number.");
                return;
            }
        }

        if (onAddAsset) {
            const purchasePrice = Number(formData.get("purchasePrice")) || 0;
            const usefulLifeYears = Number(formData.get("usefulLifeYears")) || 0;
            
            // Validate UsefulLifeYears
            if (usefulLifeYears <= 0) {
                toast.error("Useful life must be at least 1 year.");
                return;
            }
            
            const currentEffectivePct = isSalvageOverride ? manualSalvagePct : (category?.salvagePercentage ?? 10);
            const newAsset: Asset = {
                id: initialData?.id || (formData.get("assetId") as string || `AST-${Date.now().toString().slice(-6)}`),
                desc: formData.get("name") as string,
                rowVersion: initialData?.rowVersion,
                categoryId: catId,
                categoryName: category?.categoryName || "Unknown",
                status: initialData ? initialData.status : "Available",
                room: "—",
                image: previewUrl || undefined,
                manufacturer: formData.get("manufacturer") as string,
                model: formData.get("model") as string,
                serialNumber: serialNumber,
                purchaseDate: formData.get("purchaseDate") as string,
                vendor: formData.get("vendor") as string,
                warrantyExpiry: warrantyExpiryValue,
                nextMaintenance: formData.get("nextMaintenance") as string,
                notes: formData.get("notes") as string,
                value: purchasePrice,
                purchasePrice: purchasePrice,
                usefulLifeYears: usefulLifeYears > 0 ? usefulLifeYears : undefined,
                salvagePercentage: currentEffectivePct,
                isSalvageOverride: isSalvageOverride,
            };
            try {
                setIsSubmitting(true);
                await onAddAsset(newAsset);
                if (onSuccess) onSuccess();
            } catch {
                // Mutation-level toast is already shown; keep modal open for correction/retry.
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    const scrollToSection = (id: string) => {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
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
        <form onSubmit={handleCalculate} className={isModal ? "flex flex-col flex-1 min-h-0 bg-background/50" : "space-y-8"}>
            <div className="flex-1 overflow-y-auto px-1">
                <div className="p-6 space-y-10">
                    {replacementContext && isCreating && (
                        <div
                            role="status"
                            className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-foreground"
                        >
                            <p className="font-semibold text-amber-900 dark:text-amber-100">Replacement registration</p>
                            <p className="mt-1 text-muted-foreground">
                                Request{" "}
                                <span className="font-mono text-foreground">
                                    {replacementContext.requestLabel || replacementContext.maintenanceRecordId}
                                </span>
                                {" · "}Replacing{" "}
                                <span className="font-medium text-foreground">
                                    {replacementContext.originalAssetName || replacementContext.originalAssetId}
                                </span>
                                {replacementContext.originalAssetCode ? (
                                    <>
                                        {" "}
                                        (<span className="font-mono">{replacementContext.originalAssetCode}</span>)
                                    </>
                                ) : null}
                            </p>
                        </div>
                    )}

                    {isModal && isCreating && (
                        <div className="flex flex-wrap gap-2 pb-2 border-b border-border/60">
                            <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={() => scrollToSection("asset-section-overview")}>
                                Overview &amp; cost
                            </Button>
                            <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={() => scrollToSection("asset-section-docs")}>
                                Documentation
                            </Button>
                            <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={() => scrollToSection("asset-section-mfr")}>
                                Manufacturer &amp; warranty
                            </Button>
                        </div>
                    )}

                    {/* Section 1: General Information */}
                    <div id="asset-section-overview" className="border rounded-lg bg-card shadow-sm scroll-mt-4">
                        <Collapsible open={isGenInfoOpen} onOpenChange={setIsGenInfoOpen}>
                            <CollapsibleTrigger asChild>
                                <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors rounded-t-lg group">
                                    <div className="flex items-center gap-2">
                                        <Layers className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                        <h3 className="font-semibold text-sm tracking-wide uppercase text-muted-foreground group-hover:text-foreground transition-colors">General Information</h3>
                                    </div>
                                    <div className={`p-1 rounded-full transition-colors ${isGenInfoOpen ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                                        {isGenInfoOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                    </div>
                                </div>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                                <Separator />
                                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-muted/10">

                                    {/* Asset Name */}
                                    <div className="space-y-2.5">
                                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                            Asset Name <span className="text-destructive">*</span>
                                        </Label>
                                        <Input
                                            name="name"
                                            value={assetName}
                                            onChange={e => setAssetName(e.target.value)}
                                            required
                                            placeholder="e.g. Executive Desk"
                                            className="h-10 w-full"
                                        />
                                    </div>

                                    {/* Category */}
                                    <div className="space-y-2.5">
                                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                            Category <span className="text-destructive">*</span>
                                        </Label>
                                        <input type="hidden" name="category" value={selectedCategoryId} readOnly />
                                        <SearchableSelect
                                            value={selectedCategoryId}
                                            onValueChange={setSelectedCategoryId}
                                            options={categories.map((c) => ({
                                                value: c.id,
                                                label: `${c.categoryName} – ${getHandlingTypeLabel(c.handlingType)}`,
                                                keywords: `${c.categoryName} ${c.description ?? ""}`,
                                            }))}
                                            placeholder="Search category…"
                                            searchPlaceholder="Filter categories…"
                                            emptyMessage="No categories match."
                                            aria-label="Asset category"
                                            aria-required
                                            className="bg-background"
                                        />
                                    </div>

                                    {/* Handling type follows the selected category (no separate asset-subcategory entity in this product). */}
                                    <div className="space-y-2.5">
                                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                            Category handling type
                                        </Label>
                                        <Input
                                            readOnly
                                            tabIndex={-1}
                                            value={selectedCategory ? getHandlingTypeLabel(selectedCategory.handlingType) : "—"}
                                            className="h-10 w-full bg-muted cursor-default"
                                            aria-label="Handling type for selected category"
                                        />
                                    </div>

                                    {/* Serial Number */}
                                    <div className="space-y-2.5">
                                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Serial Number</Label>
                                        <Input name="serialNumber" defaultValue={initialData?.serialNumber} placeholder="SN-12345678" className="h-10 w-full font-mono text-sm" />
                                    </div>

                                    {/* Purchase Date */}
                                    <div className="space-y-2.5">
                                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Purchase Date</Label>
                                        <Input name="purchaseDate" defaultValue={initialData?.purchaseDate ? new Date(initialData.purchaseDate).toISOString().split("T")[0] : ""} type="date" max={todayStr} className="h-10 w-full" />
                                    </div>

                                    {/* Cost */}
                                    <div className="space-y-2.5">
                                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                            Cost <span className="text-destructive">*</span>
                                        </Label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-2.5 text-muted-foreground font-semibold">₱</span>
                                            <Input
                                                name="purchasePrice"
                                                defaultValue={initialData?.purchasePrice}
                                                type="number"
                                                placeholder="0.00"
                                                className="pl-7 h-10 w-full font-mono"
                                                onChange={e => setCostInput(Number(e.target.value) || 0)}
                                            />
                                        </div>
                                    </div>

                                    {/* Useful Life */}
                                    <div className="space-y-2.5">
                                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Useful Life (Years) <span className="text-red-500">*</span></Label>
                                        <Input name="usefulLifeYears" defaultValue={initialData?.usefulLifeYears} type="number" placeholder="e.g. 5" className="h-10 w-full" required min="1" />
                                    </div>

                                    {/* Salvage Value – plain grid cell, no border box */}
                                    <div className="space-y-2.5">
                                        <div className="flex items-center justify-between gap-2">
                                            <Label htmlFor="salvagePctInput" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                                Salvage Value (%)
                                            </Label>
                                            {selectedCategory && (
                                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                                    Default: <strong className="text-foreground">{categorySalvagePct}%</strong>
                                                </span>
                                            )}
                                        </div>
                                        <div className="relative">
                                            <Input
                                                id="salvagePctInput"
                                                type="number"
                                                min={0}
                                                max={100}
                                                step={0.01}
                                                inputMode="decimal"
                                                value={isSalvageOverride ? manualSalvagePctStr : String(categorySalvagePct)}
                                                onChange={e => { if (isSalvageOverride) setManualSalvagePctStr(e.target.value); }}
                                                onBlur={() => {
                                                    if (!isSalvageOverride) return;
                                                    const n = Number(manualSalvagePctStr);
                                                    if (manualSalvagePctStr === "" || isNaN(n)) return;
                                                    setManualSalvagePctStr(String(Math.min(100, Math.max(0, n))));
                                                }}
                                                readOnly={!isSalvageOverride}
                                                tabIndex={isSalvageOverride ? 0 : -1}
                                                aria-readonly={!isSalvageOverride}
                                                aria-label="Salvage value percentage"
                                                className={cn(
                                                    "h-10 w-full pr-8 font-mono text-foreground opacity-100",
                                                    !isSalvageOverride && "bg-muted cursor-not-allowed pointer-events-none select-none",
                                                    isSalvageOverride && "bg-background",
                                                )}
                                            />
                                            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground" aria-hidden>%</span>
                                        </div>
                                        <div className="flex items-center gap-2 pt-0.5">
                                            <Checkbox
                                                id="salvageOverride"
                                                checked={isSalvageOverride}
                                                onCheckedChange={checked => {
                                                    const on = checked === true;
                                                    setIsSalvageOverride(on);
                                                    if (!on) setManualSalvagePctStr(String(categorySalvagePct));
                                                    else if (!manualSalvagePctStr.trim() || Number.isNaN(Number(manualSalvagePctStr))) {
                                                        setManualSalvagePctStr(String(categorySalvagePct));
                                                    }
                                                }}
                                            />
                                            <Label htmlFor="salvageOverride" className="text-xs font-medium cursor-pointer text-muted-foreground">
                                                Enable Manual Salvage Value
                                            </Label>
                                        </div>
                                    </div>

                                    {/* Estimated Salvage – second column of the salvage row */}
                                    <div className="flex flex-col justify-end pb-0.5">
                                        {costInput > 0 && (
                                            <div className="space-y-0.5">
                                                <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Estimated Salvage Value</p>
                                                <p className="font-semibold font-mono text-primary text-lg">
                                                    ₱{computedSalvageValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {effectiveSalvagePct}% of ₱{costInput.toLocaleString()}
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                </div>
                            </CollapsibleContent>
                        </Collapsible>
                    </div>

                    {/* Section 2: Image & Notes */}
                    <div id="asset-section-docs" className="border rounded-lg bg-card shadow-sm scroll-mt-4">
                        <Collapsible open={isDocOpen} onOpenChange={setIsDocOpen}>
                            <CollapsibleTrigger asChild>
                                <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors rounded-t-lg group">
                                    <div className="flex items-center gap-2">
                                        <FileText className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                        <h3 className="font-semibold text-sm tracking-wide uppercase text-muted-foreground group-hover:text-foreground transition-colors">Documentation & Visuals</h3>
                                    </div>
                                    <div className={`p-1 rounded-full transition-colors ${isDocOpen ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                                        {isDocOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                    </div>
                                </div>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                                <Separator />
                                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8 bg-muted/10">
                                    {/* Asset Image – required */}
                                    <div className="space-y-2.5">
                                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                            Asset Image
                                        </Label>
                                        <div
                                            className="group relative border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50 aspect-square w-full max-w-[360px] flex flex-col items-center justify-center p-4 transition-all duration-200 cursor-pointer overflow-hidden bg-background"
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
                                            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                                        </div>
                                        {previewUrl && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="w-full mt-2 text-destructive hover:text-destructive hover:bg-destructive/10 h-8"
                                                onClick={e => {
                                                    e.stopPropagation();
                                                    setPreviewUrl(null);
                                                    if (fileInputRef.current) fileInputRef.current.value = "";
                                                }}
                                            >
                                                <Trash2 size={14} className="mr-2" /> Remove Image
                                            </Button>
                                        )}
                                    </div>

                                    {/* Notes */}
                                    <div className="space-y-2.5">
                                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Notes & Description</Label>
                                        <Textarea
                                            name="notes"
                                            defaultValue={initialData?.notes}
                                            placeholder="Enter detailed description, condition notes, or location specifics..."
                                            className="resize-none h-24 w-full font-sans leading-relaxed"
                                        />
                                    </div>
                                </div>
                            </CollapsibleContent>
                        </Collapsible>
                    </div>

                    {/* Section 3: Manufacturer & Warranty */}
                    <div id="asset-section-mfr" className="border rounded-lg bg-card shadow-sm scroll-mt-4">
                        <Collapsible open={isManufacturerOpen} onOpenChange={setIsManufacturerOpen}>
                            <CollapsibleTrigger asChild>
                                <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors rounded-t-lg group">
                                    <div className="flex items-center gap-2">
                                        <Package className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                        <h3 className="font-semibold text-sm tracking-wide uppercase text-muted-foreground group-hover:text-foreground transition-colors">Manufacturer & Warranty</h3>
                                    </div>
                                    <div className={`p-1 rounded-full transition-colors ${isManufacturerOpen ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                                        {isManufacturerOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                    </div>
                                </div>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                                <Separator />
                                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-muted/10">
                                    <div className="space-y-2.5">
                                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Manufacturer</Label>
                                        <Input name="manufacturer" defaultValue={initialData?.manufacturer} placeholder="e.g. Herman Miller" className="h-10 w-full bg-background" />
                                    </div>
                                    <div className="space-y-2.5">
                                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Model Number</Label>
                                        <Input name="model" defaultValue={initialData?.model} placeholder="Model X" className="h-10 w-full bg-background" />
                                    </div>
                                    <div className="space-y-2.5">
                                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Vendor</Label>
                                        <Input name="vendor" defaultValue={initialData?.vendor} placeholder="Vendor Inc." className="h-10 w-full bg-background" />
                                    </div>
                                    {/* Warranty Expiry – required */}
                                    <div className="space-y-2.5">
                                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                            Warranty Expiry <span className="text-destructive">*</span>
                                        </Label>
                                        <Input
                                            name="warrantyExpiry"
                                            value={warrantyExpiryValue}
                                            onChange={e => setWarrantyExpiryValue(e.target.value)}
                                            required
                                            type="date"
                                            className="h-10 w-full bg-background"
                                        />
                                    </div>
                                </div>
                            </CollapsibleContent>
                        </Collapsible>
                    </div>

                </div>
            </div>

            {/* Footer */}
            <div className="p-4 px-6 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center justify-between mt-auto z-10">
                <div className="text-xs text-muted-foreground max-w-[min(100%,28rem)]">
                    {!isFormValid && isCreating && (
                        <span>
                            Fill required fields <span className="text-destructive font-bold">*</span>
                            {costInput <= 0 ? " and enter a cost greater than zero." : " to enable registration."}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-3">
                    {onCancel && (
                        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                            Cancel
                        </Button>
                    )}
                    <Button type="submit" className="h-10 text-sm px-8 shadow-sm" disabled={!canSubmit}>
                        {isSubmitting ? "Saving..." : initialData ? "Update Asset" : "Register Asset"}
                    </Button>
                </div>
            </div>
        </form>
    );
}
