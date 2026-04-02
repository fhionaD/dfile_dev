"use client";

import { useState, useEffect, useMemo } from "react";
import { Wrench, AlertTriangle, FileText, Calendar, PhilippinePeso, Layers, RefreshCw } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Asset, MaintenanceRecord } from "@/types/asset";
import { useAssets } from "@/hooks/use-assets";
import { useMaintenanceRecords, useAddMaintenanceRecord, useUpdateMaintenanceRecord } from "@/hooks/use-maintenance";

interface CreateMaintenanceModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initialData?: MaintenanceRecord | null;
    defaultAssetId?: string | null;
    enableAutoCost?: boolean;
    enableGlassmorphism?: boolean;
}

export function CreateMaintenanceModal({ open, onOpenChange, initialData, defaultAssetId, enableAutoCost = true, enableGlassmorphism = false }: CreateMaintenanceModalProps) {
    const { data: assets = [] } = useAssets();
    const { data: records = [] } = useMaintenanceRecords();
    const addRecordMutation = useAddMaintenanceRecord();
    const updateRecordMutation = useUpdateMaintenanceRecord();
    const [validationError, setValidationError] = useState<string | null>(null);

    const [formData, setFormData] = useState<Partial<MaintenanceRecord>>({
        assetId: "",
        description: "",
        priority: "Medium",
        type: "Corrective",
        frequency: "One-time",
        status: "Open",
        startDate: "",
        endDate: "",
        cost: 0
    });

    const selectedAsset = useMemo(() => 
        assets.find(a => a.id === formData.assetId),
        [assets, formData.assetId]
    );

    // Function to calculate estimated cost
    const calculateEstimatedCost = (categoryName: string, maintenanceType: string) => {
        const category = categoryName.toLowerCase();
        let estimatedCost = 0;

        // Base cost ranges by category
        if (category.includes('hvac')) {
            estimatedCost = Math.floor(Math.random() * (25000 - 10000 + 1)) + 10000;
        } else if (category.includes('heavy machinery')) {
            estimatedCost = Math.floor(Math.random() * (50000 - 20000 + 1)) + 20000;
        } else if (category.includes('vehicle')) {
            estimatedCost = Math.floor(Math.random() * (30000 - 15000 + 1)) + 15000;
        } else if (category.includes('medical device')) {
            estimatedCost = Math.floor(Math.random() * (40000 - 15000 + 1)) + 15000;
        } else if (category.includes('laboratory equipment')) {
            estimatedCost = Math.floor(Math.random() * (35000 - 12000 + 1)) + 12000;
        } else if (category.includes('security system')) {
            estimatedCost = Math.floor(Math.random() * (20000 - 8000 + 1)) + 8000;
        } else if (category.includes('electrical component')) {
            estimatedCost = Math.floor(Math.random() * (15000 - 5000 + 1)) + 5000;
        } else if (category.includes('it equipment')) {
            estimatedCost = Math.floor(Math.random() * (18000 - 5000 + 1)) + 5000;
        } else if (category.includes('av equipment')) {
            estimatedCost = Math.floor(Math.random() * (15000 - 4000 + 1)) + 4000;
        } else if (category.includes('appliance')) {
            estimatedCost = Math.floor(Math.random() * (12000 - 3000 + 1)) + 3000;
        } else if (category.includes('furniture')) {
            estimatedCost = Math.floor(Math.random() * (8000 - 2000 + 1)) + 2000;
        } else if (category.includes('safety equipment')) {
            estimatedCost = Math.floor(Math.random() * (10000 - 3000 + 1)) + 3000;
        } else if (category.includes('cleaning equipment')) {
            estimatedCost = Math.floor(Math.random() * (8000 - 2000 + 1)) + 2000;
        } else if (category.includes('gadget')) {
            estimatedCost = Math.floor(Math.random() * (5000 - 1000 + 1)) + 1000;
        } else if (category.includes('hand tool')) {
            estimatedCost = Math.floor(Math.random() * (3000 - 500 + 1)) + 500;
        } else if (category.includes('office supplies')) {
            estimatedCost = Math.floor(Math.random() * (2000 - 300 + 1)) + 300;
        } else if (category.includes('packaging material')) {
            estimatedCost = Math.floor(Math.random() * (1500 - 200 + 1)) + 200;
        } else {
            estimatedCost = Math.floor(Math.random() * (7000 - 2000 + 1)) + 2000;
        }

        // Adjust based on maintenance type
        if (maintenanceType === 'Preventive') {
            estimatedCost = Math.floor(estimatedCost * 0.6);
        } else if (maintenanceType === 'Upgrade') {
            estimatedCost = Math.floor(estimatedCost * 1.5);
        } else if (maintenanceType === 'Inspection') {
            estimatedCost = Math.floor(estimatedCost * 0.3);
        }

        return estimatedCost;
    };

    // Auto-estimate cost based on asset category
    useEffect(() => {
        if (!enableAutoCost || !selectedAsset || formData.cost > 0 || initialData) return;

        const categoryName = selectedAsset.categoryName || '';
        const estimatedCost = calculateEstimatedCost(categoryName, formData.type as string);
        setFormData(prev => ({ ...prev, cost: estimatedCost }));
    }, [enableAutoCost, selectedAsset?.id, selectedAsset?.categoryName, formData.type, formData.cost, initialData?.id]);

    useEffect(() => {
        if (open) {
            setValidationError(null);
            if (initialData) {
                setFormData({
                    assetId: initialData.assetId || "",
                    description: initialData.description || "",
                    priority: initialData.priority || "Medium",
                    type: initialData.type || "Corrective",
                    frequency: initialData.frequency || "One-time",
                    status: initialData.status,
                    startDate: initialData.startDate || "",
                    endDate: initialData.endDate || "",
                    cost: initialData.cost || 0
                });
            } else {
                const today = new Date().toISOString().split('T')[0];
                setFormData({
                    assetId: defaultAssetId || "",
                    description: "",
                    priority: "Medium",
                    type: "Corrective",
                    frequency: "One-time",
                    status: "Open",
                    startDate: today,
                    endDate: "",
                    cost: 0
                });
            }
        }
    }, [open, initialData, defaultAssetId]);

    // Auto-calculate end date based on frequency
    useEffect(() => {
        if (!formData.startDate || !formData.frequency) {
            return;
        }

        // Clear end date for one-time
        if (formData.frequency === "One-time") {
            setFormData(prev => ({ ...prev, endDate: "" }));
            return;
        }

        const startDate = new Date(formData.startDate);
        let endDate = new Date(startDate);

        switch (formData.frequency) {
            case "Daily":
                endDate.setDate(endDate.getDate() + 14); // 2 weeks
                break;
            case "Weekly":
                endDate.setDate(endDate.getDate() + 7); // 1 week
                break;
            case "Monthly":
                endDate.setMonth(endDate.getMonth() + 1); // 1 month
                break;
            case "Quarterly":
                endDate.setMonth(endDate.getMonth() + 3); // 3 months
                break;
            case "Yearly":
                endDate.setFullYear(endDate.getFullYear() + 1); // 1 year
                break;
        }

        setFormData(prev => ({
            ...prev,
            endDate: endDate.toISOString().split('T')[0]
        }));
    }, [formData.startDate, formData.frequency]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setValidationError(null);

        // Validate frequency-specific requirements
        if (formData.frequency === "One-time") {
            if (!formData.startDate) {
                setValidationError("Start date is required for one-time maintenance.");
                return;
            }
        } else if (formData.frequency && formData.frequency !== "One-time") {
            // Recurring frequencies require both start and end dates
            if (!formData.startDate) {
                setValidationError("Start date is required for recurring maintenance schedules.");
                return;
            }
            if (!formData.endDate) {
                setValidationError("End date is required for recurring maintenance schedules.");
                return;
            }
            if (new Date(formData.endDate) <= new Date(formData.startDate)) {
                setValidationError("End date must be after start date for recurring schedules.");
                return;
            }
        }

        if (initialData) {
            await updateRecordMutation.mutateAsync({
                id: initialData.id,
                payload: {
                    assetId: formData.assetId || initialData.assetId,
                    description: formData.description || "No description provided",
                    priority: formData.priority as string,
                    type: formData.type as string,
                    frequency: formData.frequency as string,
                    status: formData.status as string,
                    startDate: formData.startDate,
                    endDate: formData.frequency === "One-time" ? undefined : formData.endDate,
                    cost: Number(formData.cost),
                    dateReported: initialData.dateReported,
                },
            });
        } else if (formData.assetId) {
            await addRecordMutation.mutateAsync({
                assetId: formData.assetId,
                description: formData.description || "No description provided",
                priority: formData.priority as string || "Medium",
                status: "Pending",
                type: formData.type as string || "Corrective",
                frequency: formData.frequency as string || "One-time",
                startDate: formData.startDate || new Date().toISOString().split('T')[0],
                endDate: formData.frequency === "One-time" ? undefined : formData.endDate,
                cost: Number(formData.cost),
            });
        }

        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className={`max-w-[95vw] lg:max-w-[1400px] rounded-2xl border-border p-0 overflow-hidden flex flex-col max-h-[90vh] ${
                enableGlassmorphism ? 'border border-white/20 bg-white/10 dark:bg-black/10 backdrop-blur-2xl ring-1 ring-white/10' : ''
            }`}>
                <DialogHeader className="p-6 bg-muted/40 border-b border-border shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary/10  text-primary"><Wrench size={20} /></div>
                        <div>
                            <DialogTitle className="text-lg font-semibold text-foreground">
                                {initialData ? "Edit Maintenance Record" : "New Maintenance Record"}
                            </DialogTitle>
                            <DialogDescription className="text-muted-foreground text-xs mt-1">
                                {initialData ? "Update maintenance details and status" : "Schedule maintenance or report an issue"}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <form id="maintenance-form" onSubmit={handleSubmit} className="p-6 space-y-6 flex-1 overflow-y-auto">
                    
                    {validationError && (
                        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm flex items-start gap-2">
                            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                            <span>{validationError}</span>
                        </div>
                    )}

                    <div className="flex flex-col lg:flex-row gap-6">
                        {/* Left Side - Asset Preview (Desktop: Sidebar, Mobile: Top) */}
                        <div className={`transition-all duration-500 ease-in-out ${
                            selectedAsset 
                                ? 'opacity-100 translate-x-0' 
                                : 'opacity-0 overflow-hidden'
                        } ${
                            selectedAsset 
                                ? 'lg:w-80' 
                                : 'lg:w-0 -translate-x-4'
                        }`}>
                            {selectedAsset && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-500">
                                    {/* Asset Image */}
                                    <div className="relative aspect-square lg:aspect-square rounded-xl overflow-hidden bg-muted border border-border shadow-sm max-w-[200px] lg:max-w-none mx-auto lg:mx-0">
                                        {selectedAsset.image ? (
                                            <img 
                                                src={selectedAsset.image} 
                                                alt={selectedAsset.desc || 'Asset'}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <Layers className="h-16 w-16 text-muted-foreground/30" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Asset Details - Desktop Only */}
                                    <div className="hidden lg:block space-y-3 p-4 rounded-lg bg-muted/30 border border-border/50">
                                        <div>
                                            <p className="text-xs font-medium text-muted-foreground mb-1">Asset Name</p>
                                            <p className="text-sm font-semibold text-foreground">
                                                {selectedAsset.desc || 'Unnamed Asset'}
                                            </p>
                                        </div>
                                        
                                        {selectedAsset.assetCode && (
                                            <div>
                                                <p className="text-xs font-medium text-muted-foreground mb-1">Asset Code</p>
                                                <p className="text-sm font-mono text-foreground">{selectedAsset.assetCode}</p>
                                            </div>
                                        )}
                                        
                                        {selectedAsset.tagNumber && (
                                            <div>
                                                <p className="text-xs font-medium text-muted-foreground mb-1">Tag Number</p>
                                                <p className="text-sm font-mono text-foreground">{selectedAsset.tagNumber}</p>
                                            </div>
                                        )}
                                        
                                        {selectedAsset.categoryName && (
                                            <div>
                                                <p className="text-xs font-medium text-muted-foreground mb-1">Category</p>
                                                <p className="text-sm text-foreground">{selectedAsset.categoryName}</p>
                                            </div>
                                        )}
                                        
                                        {selectedAsset.currentCondition && (
                                            <div>
                                                <p className="text-xs font-medium text-muted-foreground mb-1">Condition</p>
                                                <p className="text-sm text-foreground">{selectedAsset.currentCondition}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Right Side - Form Fields */}
                        <div className="flex-1 space-y-4">
                        <div className="space-y-2">
                             <Label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                                <Layers size={12} /> Asset to Maintain <span className="text-destructive">*</span>
                            </Label>
                            <Select value={formData.assetId || ""} onValueChange={(v) => setFormData({ ...formData, assetId: v })}>
                                <SelectTrigger className="w-full h-10 bg-background px-3 text-sm"><SelectValue placeholder="Select asset..." /></SelectTrigger>
                                <SelectContent>
                                    {assets.map((asset) => (
                                        <SelectItem key={asset.id} value={asset.id}>{asset.desc}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                                    <Wrench size={12} /> Type
                                </Label>
                                <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v as any })}>
                                    <SelectTrigger className="w-full h-10 bg-background px-3 text-sm"><SelectValue placeholder="Select type" /></SelectTrigger>
                                    <SelectContent>
                                        {["Preventive", "Corrective", "Upgrade", "Inspection"].map(t => (
                                            <SelectItem key={t} value={t}>{t}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                             <div className="space-y-2">
                                <Label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                                    <AlertTriangle size={12} /> Priority
                                </Label>
                                <div className="relative">
                                    <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v as any })}>
                                        <SelectTrigger className={`w-full h-10 px-3 text-sm transition-all duration-300 ${
                                            formData.priority === "High" 
                                                ? "bg-red-50 dark:bg-red-950/20 border-red-300 dark:border-red-800 text-red-700 dark:text-red-400 animate-pulse" 
                                                : formData.priority === "Medium" 
                                                ? "bg-amber-50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-400" 
                                                : "bg-blue-50 dark:bg-blue-950/20 border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-400"
                                        }`}>
                                            <SelectValue placeholder="Select priority" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {["Low", "Medium", "High"].map(p => (
                                                <SelectItem key={p} value={p}>
                                                    <span className={`${
                                                        p === "High" ? "text-red-600 dark:text-red-400 font-semibold" :
                                                        p === "Medium" ? "text-amber-600 dark:text-amber-400 font-medium" :
                                                        "text-blue-600 dark:text-blue-400"
                                                    }`}>
                                                        {p}
                                                    </span>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {formData.priority === "High" && (
                                        <div className="absolute inset-0 rounded-md pointer-events-none overflow-hidden">
                                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-red-200/50 to-transparent animate-shimmer" 
                                                 style={{ animation: 'shimmer 2s infinite' }} />
                                        </div>
                                    )}
                                </div>
                                <style jsx>{`
                                    @keyframes shimmer {
                                        0% { transform: translateX(-100%); }
                                        100% { transform: translateX(100%); }
                                    }
                                `}</style>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                                    <Calendar size={12} /> Frequency
                                </Label>
                                <Select value={formData.frequency} onValueChange={(v) => setFormData({ ...formData, frequency: v as any })}>
                                    <SelectTrigger className="w-full h-10 bg-background px-3 text-sm"><SelectValue placeholder="Select frequency" /></SelectTrigger>
                                    <SelectContent>
                                        {["One-time", "Daily", "Weekly", "Monthly", "Yearly"].map(f => (
                                            <SelectItem key={f} value={f}>{f}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                                    <PhilippinePeso size={12} /> Expected Cost
                                </Label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <Input 
                                            type="number" 
                                            placeholder="0.00" 
                                            value={formData.cost || ''} 
                                            onChange={(e) => setFormData({ ...formData, cost: e.target.value ? Number(e.target.value) : 0 })} 
                                            step="0.01"
                                            min="0"
                                            className={`h-10 text-sm transition-all duration-300 ${
                                                (formData.cost || 0) >= 50000 
                                                    ? "bg-red-50 dark:bg-red-950/20 border-red-300 dark:border-red-800 text-red-700 dark:text-red-400 font-semibold" 
                                                    : (formData.cost || 0) >= 10000 
                                                    ? "bg-amber-50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-400 font-medium" 
                                                    : (formData.cost || 0) > 0
                                                    ? "bg-green-50 dark:bg-green-950/20 border-green-300 dark:border-green-800 text-green-700 dark:text-green-400"
                                                    : "bg-background"
                                            }`}
                                        />
                                        {(formData.cost || 0) >= 50000 && (
                                            <div className="absolute inset-0 rounded-md pointer-events-none overflow-hidden">
                                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-red-200/50 to-transparent" 
                                                     style={{ animation: 'shimmer 2s infinite' }} />
                                            </div>
                                        )}
                                    </div>
                                    {selectedAsset && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            className="h-10 w-10 shrink-0"
                                            onClick={() => {
                                                const categoryName = selectedAsset.categoryName || '';
                                                const newCost = calculateEstimatedCost(categoryName, formData.type as string);
                                                setFormData(prev => ({ ...prev, cost: newCost }));
                                            }}
                                            title="Refresh cost estimate"
                                        >
                                            <RefreshCw className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                                {(formData.cost || 0) > 0 && (
                                    <p className={`text-xs font-medium ${
                                        (formData.cost || 0) >= 50000 ? "text-red-600 dark:text-red-400" :
                                        (formData.cost || 0) >= 10000 ? "text-amber-600 dark:text-amber-400" :
                                        "text-green-600 dark:text-green-400"
                                    }`}>
                                        {(formData.cost || 0) >= 50000 ? "High Cost" :
                                         (formData.cost || 0) >= 10000 ? "Moderate Cost" :
                                         "Low Cost"}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                                    <Calendar size={12} /> Start Date
                                </Label>
                                <Input 
                                    type="date" 
                                    value={formData.startDate} 
                                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} 
                                    min={new Date().toISOString().split('T')[0]}
                                    className="h-10 bg-background text-sm" 
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                                    <Calendar size={12} /> End Date {formData.frequency && formData.frequency !== "One-time" && <span className="text-destructive">*</span>}
                                </Label>
                                <Input 
                                    type="date" 
                                    value={formData.endDate} 
                                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} 
                                    min={formData.startDate || new Date().toISOString().split('T')[0]}
                                    disabled={formData.frequency === "One-time"}
                                    className="h-10 bg-background text-sm" 
                                />
                                {formData.frequency === "One-time" && (
                                    <p className="text-xs text-muted-foreground">End date not needed for one-time maintenance</p>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                                <FileText size={12} /> Description
                            </Label>
                            <Textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Describe the issue or plan in detail..."
                                className="min-h-[100px] bg-background text-sm resize-none"
                            />
                        </div>
                        </div>
                    </div>
                </form>

                <DialogFooter className="p-6 bg-muted/40 border-t border-border shrink-0 flex justify-end gap-3 w-full">
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-10 text-sm">
                        Cancel
                    </Button>
                    <Button type="submit" form="maintenance-form" className="h-10 text-sm px-4 bg-primary text-primary-foreground shadow-lg hover:bg-primary/90">
                        {initialData ? "Save Changes" : "Submit Record"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
