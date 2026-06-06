"use client";

import { useState, useEffect } from "react";
import { UserPlus, Phone, Mail, ShieldCheck, CalendarClock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Employee } from "@/types/asset";

interface AddEmployeeModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onAddEmployee?: (employee: Employee) => void;
    initialData?: Employee | null;
}

const AVAILABLE_ROLES = [
    { value: "Finance Manager", label: "Finance Manager" },
    { value: "Maintenance Manager", label: "Maintenance Manager" },
];

export function AddEmployeeModal({ open, onOpenChange, onAddEmployee, initialData }: AddEmployeeModalProps) {
    const [formData, setFormData] = useState({
        firstName: "",
        middleName: "",
        lastName: "",
        email: "",
        contactNumber: "",
        address: "",
        role: "",
        hireDate: "",
    });
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (!open) return;

        if (initialData) {
            setFormData({
                firstName: initialData.firstName,
                middleName: initialData.middleName || "",
                lastName: initialData.lastName,
                email: initialData.email,
                contactNumber: initialData.contactNumber,
                address: "",
                role: initialData.role || "",
                hireDate: initialData.hireDate ? new Date(initialData.hireDate).toISOString().slice(0, 10) : "",
            });
        } else {
            setFormData({
                firstName: "",
                middleName: "",
                lastName: "",
                email: "",
                contactNumber: "",
                address: "",
                role: "",
                hireDate: "",
            });
        }
        setErrors({});
    }, [open, initialData]);

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        setErrors({});

        const newErrors: Record<string, string> = {};
        if (!formData.role) {
            newErrors.role = "Please select an account type.";
        }
        if (formData.contactNumber && formData.contactNumber.length !== 11) {
            newErrors.contactNumber = "Contact number must be exactly 11 digits (e.g., 09123456789)";
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        const employeeData: Employee = {
            id: initialData ? initialData.id : `EMP-${Date.now().toString().slice(-6)}`,
            firstName: formData.firstName,
            middleName: formData.middleName || undefined,
            lastName: formData.lastName,
            email: formData.email,
            contactNumber: formData.contactNumber,
            address: formData.address || undefined,
            role: formData.role,
            hireDate: formData.hireDate,
            status: initialData ? initialData.status : "Active",
        };

        onAddEmployee?.(employeeData);
        onOpenChange(false);
    };

    const isEditMode = !!initialData;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl rounded-2xl border-border p-0 overflow-hidden flex flex-col max-h-[90vh]">
                <DialogHeader className="p-6 bg-muted/40 border-b border-border shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary/10 text-primary rounded-xl">
                            <UserPlus size={24} />
                        </div>
                        <div>
                            <DialogTitle className="text-lg font-semibold text-foreground">
                                {isEditMode ? "Update Personnel" : "Register Personnel"}
                            </DialogTitle>
                            <DialogDescription className="text-muted-foreground text-xs mt-1">
                                {isEditMode ? `Editing record for ${initialData.id}` : "An activation email will be sent to the user to set their password."}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <form id="employee-form" onSubmit={handleSubmit} className="p-6 space-y-6 flex-1 overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-medium text-muted-foreground">First Name <span className="text-destructive">*</span></Label>
                            <Input required value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} placeholder="Juan" className="h-10 bg-background text-sm" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-medium text-muted-foreground">Middle Name</Label>
                            <Input value={formData.middleName} onChange={(e) => setFormData({ ...formData, middleName: e.target.value })} placeholder="Santos" className="h-10 bg-background text-sm" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-medium text-muted-foreground">Last Name <span className="text-destructive">*</span></Label>
                            <Input required value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} placeholder="Dela Cruz" className="h-10 bg-background text-sm" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                                <Mail size={12} /> Email <span className="text-destructive">*</span>
                            </Label>
                            <Input type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="employee@company.com" className="h-10 bg-background text-sm" />
                        </div>
                        <div className="space-y-2 relative">
                            <Label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                                <Phone size={12} /> Contact Number <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                type="text"
                                required
                                value={formData.contactNumber}
                                onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                                placeholder="09123456789"
                                maxLength={11}
                                className={`h-10 bg-background text-sm ${errors.contactNumber ? "border-destructive focus-visible:ring-destructive" : ""}`}
                            />
                            {errors.contactNumber && <p className="text-xs text-destructive mt-1">{errors.contactNumber}</p>}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2 md:col-span-2">
                            <Label className="text-xs font-medium text-muted-foreground">Address</Label>
                            <Input value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} placeholder="123 Main Street, Quezon City" className="h-10 bg-background text-sm" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2 md:col-span-2">
                            <Label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                                <ShieldCheck size={12} /> Account Type <span className="text-destructive">*</span>
                            </Label>
                            <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                                <SelectTrigger className={`h-10 bg-background text-sm ${errors.role ? "border-destructive focus:ring-destructive" : ""}`}>
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                    {AVAILABLE_ROLES.map((role) => (
                                        <SelectItem key={role.value} value={role.value}>
                                            {role.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.role && <p className="text-xs text-destructive mt-1">{errors.role}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                                <CalendarClock size={12} /> Hire Date <span className="text-destructive">*</span>
                            </Label>
                            <Input type="date" required value={formData.hireDate} onChange={(e) => setFormData({ ...formData, hireDate: e.target.value })} className="h-10 bg-background text-sm" />
                        </div>
                    </div>
                </form>

                <DialogFooter className="p-6 bg-muted/40 border-t border-border shrink-0 flex justify-end gap-3">
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button type="submit" form="employee-form" className="h-10 text-sm px-4 bg-primary text-primary-foreground shadow-lg hover:bg-primary/90">
                        {isEditMode ? "Save Changes" : "Create & Send Invite"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}