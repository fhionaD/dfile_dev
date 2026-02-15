"use client";

import { useState, useEffect } from "react";
import { UserPlus, Phone, Mail, Lock, Building2, ShieldCheck, CalendarClock, Eye, EyeOff, Save } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Employee } from "@/types/asset";

interface AddEmployeeModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    departments: { id: string; name: string }[];
    roles: { id: string; designation: string }[];
    onAddEmployee?: (employee: Employee) => void;
    initialData?: Employee | null;
}

export function AddEmployeeModal({ open, onOpenChange, departments, roles, onAddEmployee, initialData }: AddEmployeeModalProps) {
    const [formData, setFormData] = useState({
        firstName: "",
        middleName: "",
        lastName: "",
        email: "",
        contactNumber: "",
        department: "",
        role: "",
        hireDate: "",
        password: ""
    });
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState("");

    // Effect to populate form when editing
    useEffect(() => {
        if (open) {
            if (initialData) {
                // Find ID for dept and role if possible, else use name
                const deptId = departments.find(d => d.name === initialData.department)?.id || initialData.department;
                const roleId = roles.find(r => r.designation === initialData.role)?.id || initialData.role;

                setFormData({
                    firstName: initialData.firstName,
                    middleName: initialData.middleName || "",
                    lastName: initialData.lastName,
                    email: initialData.email,
                    contactNumber: initialData.contactNumber,
                    department: deptId,
                    role: roleId,
                    hireDate: initialData.hireDate,
                    password: "" // Don't pre-fill password
                });
            } else {
                // Reset for new entry
                setFormData({
                    firstName: "",
                    middleName: "",
                    lastName: "",
                    email: "",
                    contactNumber: "",
                    department: "",
                    role: "",
                    hireDate: "",
                    password: ""
                });
            }
            setConfirmPassword("");
            setError("");
        }
    }, [open, initialData, departments, roles]);

    const handleContactChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        if (value === "" || (/^\d+$/.test(value) && value.length <= 12)) {
            setFormData({ ...formData, contactNumber: value });
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        // Password validation only for new users or if password field is touched
        if (!initialData && !formData.password) {
            setError("Password is required for new users");
            return;
        }

        if (formData.password && formData.password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        const deptName = departments.find(d => d.id === formData.department)?.name || formData.department;
        const roleName = roles.find(r => r.id === formData.role)?.designation || formData.role;

        const employeeData: Employee = {
            id: initialData ? initialData.id : `EMP-${Date.now().toString().slice(-6)}`,
            firstName: formData.firstName,
            middleName: formData.middleName || undefined,
            lastName: formData.lastName,
            email: formData.email,
            contactNumber: formData.contactNumber,
            department: deptName,
            role: roleName,
            hireDate: formData.hireDate,
            status: initialData ? initialData.status : "Active",
        };

        if (onAddEmployee) {
            onAddEmployee(employeeData);
        }

        onOpenChange(false);
    };

    const isEditMode = !!initialData;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl rounded-2xl border-border p-0 overflow-hidden flex flex-col max-h-[90vh]">
                <DialogHeader className="p-6 bg-muted/40 border-b border-border shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary/10 rounded-xl text-primary">
                            {isEditMode ? <UserPlus size={20} /> : <UserPlus size={20} />}
                        </div>
                        <div>
                            <DialogTitle className="text-lg font-semibold text-foreground">
                                {isEditMode ? "Update Personnel" : "Register Personnel"}
                            </DialogTitle>
                            <DialogDescription className="text-muted-foreground text-xs mt-1">
                                {isEditMode ? `Editing record for ${initialData.id}` : "Employee Node Initialization"}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <form id="employee-form" onSubmit={handleSubmit} className="p-6 space-y-6 flex-1 overflow-y-auto">
                    {/* Name */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-medium text-muted-foreground">First Name</Label>
                            <Input required value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} placeholder="e.g. John" className="border-input bg-background" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-medium text-muted-foreground">Middle Name</Label>
                            <Input value={formData.middleName} onChange={(e) => setFormData({ ...formData, middleName: e.target.value })} placeholder="Optional" className="border-input bg-background" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-medium text-muted-foreground">Last Name</Label>
                            <Input required value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} placeholder="e.g. Smith" className="border-input bg-background" />
                        </div>
                    </div>

                    {/* Contact */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                                <Mail size={12} /> Email
                            </Label>
                            <Input type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="employee@company.com" className="border-input bg-background" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                                <Phone size={12} /> Contact Number
                            </Label>
                            <Input
                                type="text"
                                inputMode="numeric"
                                required
                                value={formData.contactNumber}
                                onChange={handleContactChange}
                                placeholder="12 digits max"
                                className="border-input bg-background"
                            />
                            <p className="text-[10px] text-muted-foreground text-right">{formData.contactNumber.length}/12</p>
                        </div>
                    </div>

                    {/* Department & Role */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                                <Building2 size={12} /> Department
                            </Label>
                            <Select value={formData.department} onValueChange={(val) => setFormData({ ...formData, department: val })}>
                                <SelectTrigger className="w-full border-input bg-background">
                                    <SelectValue placeholder="Select Department" />
                                </SelectTrigger>
                                <SelectContent>
                                    {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                                <ShieldCheck size={12} /> Role
                            </Label>
                            <Select value={formData.role} onValueChange={(val) => setFormData({ ...formData, role: val })}>
                                <SelectTrigger className="w-full border-input bg-background">
                                    <SelectValue placeholder="Select Role" />
                                </SelectTrigger>
                                <SelectContent>
                                    {roles.map((r) => <SelectItem key={r.id} value={r.id}>{r.designation}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Hire Date & Password */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                                <CalendarClock size={12} /> Hire Date
                            </Label>
                            <Input type="date" required value={formData.hireDate} onChange={(e) => setFormData({ ...formData, hireDate: e.target.value })} className="border-input bg-background" />
                        </div>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                                    <Lock size={12} /> {isEditMode ? "Reset Password (Optional)" : "Initial Password"}
                                </Label>
                                <div className="relative">
                                    <Input
                                        type={showPassword ? "text" : "password"}
                                        required={!isEditMode}
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        placeholder="••••••••"
                                        className="border-input bg-background pr-9"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    >
                                        {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                                    </button>
                                </div>
                            </div>
                            {formData.password && (
                                <div className="space-y-2">
                                    <Label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                                        <Lock size={12} /> Confirm Password
                                    </Label>
                                    <div className="relative">
                                        <Input
                                            type={showConfirmPassword ? "text" : "password"}
                                            required
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder="••••••••"
                                            className={`border-input bg-background pr-9 ${error ? "border-destructive focus-visible:ring-destructive" : ""}`}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                        >
                                            {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                                        </button>
                                    </div>
                                    {error && <p className="text-[10px] text-destructive font-medium">{error}</p>}
                                </div>
                            )}
                        </div>
                    </div>
                </form>

                <DialogFooter className="p-6 bg-muted/40 border-t border-border shrink-0 gap-3">
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1 rounded-xl">
                        Cancel
                    </Button>
                    <Button type="submit" form="employee-form" className="flex-2 rounded-xl bg-primary text-primary-foreground shadow-lg hover:bg-primary/90">
                        {isEditMode ? (
                            <>
                                <Save size={16} className="mr-2" /> Save Changes
                            </>
                        ) : (
                            "Deploy Personnel"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
