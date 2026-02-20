"use client";

import { useState, useEffect } from "react";
import { Wrench, AlertTriangle, FileText, Calendar, DollarSign, Layers } from "lucide-react";
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
}

export function CreateMaintenanceModal({ open, onOpenChange, initialData, defaultAssetId }: CreateMaintenanceModalProps) {
    const { data: assets = [] } = useAssets();
    const { data: records = [] } = useMaintenanceRecords();
    const addRecordMutation = useAddMaintenanceRecord();
    const updateRecordMutation = useUpdateMaintenanceRecord();

    const [formData, setFormData] = useState<Partial<MaintenanceRecord>>({
        assetId: "",
        description: "",
        priority: "Medium",
        type: "Corrective",
        frequency: "One-time",
        status: "Pending",
        startDate: "",
        endDate: "",
        cost: 0
    });

    useEffect(() => {
        if (open) {
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
                setFormData({
                    assetId: defaultAssetId || "",
                    description: "",
                    priority: "Medium",
                    type: "Corrective",
                    frequency: "One-time",
                    status: "Pending",
                    startDate: "",
                    endDate: "",
                    cost: 0
                });
            }
        }
    }, [open, initialData, defaultAssetId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (initialData) {
            await updateRecordMutation.mutateAsync({
                ...initialData,
                assetId: formData.assetId || initialData.assetId,
                description: formData.description || "No description provided",
                priority: formData.priority as "Low" | "Medium" | "High",
                type: formData.type as "Preventive" | "Corrective" | "Upgrade",
                frequency: formData.frequency as any,
                startDate: formData.startDate,
                endDate: formData.endDate,
                cost: Number(formData.cost),
            } as MaintenanceRecord);
        } else if (formData.assetId) {
            await addRecordMutation.mutateAsync({
                assetId: formData.assetId,
                description: formData.description || "No description provided",
                priority: (formData.priority as "Low" | "Medium" | "High") || "Medium",
                status: "Pending",
                type: (formData.type as "Preventive" | "Corrective" | "Upgrade") || "Corrective",
                frequency: (formData.frequency as any) || "One-time",
                startDate: formData.startDate || new Date().toISOString().split('T')[0],
                endDate: formData.endDate,
                cost: Number(formData.cost),
                dateReported: new Date().toISOString().split('T')[0]
            });
        }

        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl rounded-2xl border-border p-0 overflow-hidden flex flex-col max-h-[90vh]">
                <DialogHeader className="p-6 bg-muted/40 border-b border-border shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary/10 rounded-xl text-primary"><Wrench size={20} /></div>
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
                    
                    <div className="flex flex-col space-y-4">
                        <div className="space-y-2">
                             <Label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                                <Layers size={12} /> Asset to Maintain
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
                                <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v as any })}>
                                    <SelectTrigger className="w-full h-10 bg-background px-3 text-sm"><SelectValue placeholder="Select priority" /></SelectTrigger>
                                    <SelectContent>
                                        {["Low", "Medium", "High"].map(p => (
                                            <SelectItem key={p} value={p}>{p}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
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
                                    <DollarSign size={12} /> Expected Cost
                                </Label>
                                <Input type="number" placeholder="0.00" value={formData.cost} onChange={(e) => setFormData({ ...formData, cost: Number(e.target.value) })} className="h-10 bg-background text-sm" />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                                    <Calendar size={12} /> Start Date
                                </Label>
                                <Input type="date" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} className="h-10 bg-background text-sm" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                                    <Calendar size={12} /> End Date
                                </Label>
                                <Input type="date" value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} className="h-10 bg-background text-sm" />
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
                </form>

                <DialogFooter className="p-6 bg-muted/40 border-t border-border shrink-0 flex justify-end gap-3 w-full">
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">
                        Cancel
                    </Button>
                    <Button type="submit" form="maintenance-form" className="rounded-xl bg-primary text-primary-foreground shadow-lg hover:bg-primary/90">
                        {initialData ? "Save Changes" : "Submit Record"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}