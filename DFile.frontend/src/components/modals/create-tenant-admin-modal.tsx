"use client";

import { useState } from "react";
import { UserPlus, Mail, Phone, Shield, Lock, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CreateTenantAdminModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function CreateTenantAdminModal({ open, onOpenChange }: CreateTenantAdminModalProps) {
    const [contactNumber, setContactNumber] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const handleContactChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        if (value === "") {
            setContactNumber(value);
            return;
        }

        if (!/^\d+$/.test(value)) return;
        if (value.length >= 1 && value[0] !== '0') return;
        if (value.length >= 2 && value[1] !== '9') return;

        if (value.length <= 11) {
            setContactNumber(value);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({});

        const newErrors: Record<string, string> = {};

        if (contactNumber && contactNumber.length !== 11) {
            newErrors.contactNumber = "Contact number must be exactly 11 digits (e.g., 09123456789)";
        }

        if (password !== confirmPassword) {
            newErrors.confirmPassword = "Passwords do not match";
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-xl rounded-2xl border-border p-0 overflow-hidden flex flex-col">
                <DialogHeader className="p-6 bg-muted/40 border-b border-border shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary/10  text-primary"><UserPlus size={20} /></div>
                        <div>
                            <DialogTitle className="text-lg font-semibold text-foreground">Create Tenant Admin</DialogTitle>
                            <DialogDescription className="text-muted-foreground text-xs mt-1">Administrative Node Registration</DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <form id="tenant-admin-form" onSubmit={handleSubmit} className="p-6 space-y-6 flex-1 overflow-y-auto">
                    {/* Identity */}
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <Shield size={14} className="text-primary" />
                            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">Identity Profile</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {["First Name", "Middle Name", "Surname"].map((label) => (
                                <div key={label} className="space-y-2">
                                    <Label className="text-xs font-medium text-muted-foreground">
                                        {label} {label !== "Middle Name" && <span className="text-destructive">*</span>}
                                    </Label>
                                    <Input required={label !== "Middle Name"} placeholder={label === "Middle Name" ? "Optional" : `e.g. ${label === "First Name" ? "John" : "Doe"}`} className="h-10 bg-background text-sm" />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Contact */}
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <Mail size={14} className="text-primary" />
                            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">Communications</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-medium text-muted-foreground">Email Address <span className="text-destructive">*</span></Label>
                                <Input type="email" required placeholder="admin@tenant.com" className="h-10 bg-background text-sm" />
                            </div>
                            <div className="space-y-2 relative">
                                <Label className="text-xs font-medium text-muted-foreground">Contact Number</Label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                                    <Input 
                                        type="tel" 
                                        placeholder="(Optional) 0912-345-6789" 
                                        className={`pl-10 h-10 bg-background text-sm ${errors.contactNumber ? "border-destructive focus-visible:ring-destructive" : ""}`}
                                        value={contactNumber}
                                        onChange={handleContactChange} 
                                    />
                                </div>
                                <p className="text-[10px] text-muted-foreground text-right">{contactNumber.length}/11</p>
                                {errors.contactNumber && <p className="text-[10px] text-destructive font-medium absolute -bottom-2 left-0">{errors.contactNumber}</p>}
                            </div>
                        </div>
                    </div>

                    {/* Password */}
                    <div className="pt-4 border-t border-border">
                        <div className="flex items-center gap-2 mb-3">
                            <Lock size={14} className="text-primary" />
                            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">Security Credentials</h3>
                        </div>
                        <div className="space-y-4 max-w-md">
                            <div className="space-y-2">
                                <Label className="text-xs font-medium text-muted-foreground flex items-center gap-2">System Access Password <span className="text-destructive">*</span></Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                                    <Input 
                                        type={showPassword ? "text" : "password"}
                                        required 
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••••••" 
                                        className="pl-10 h-10 bg-background text-sm pr-9" 
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    >
                                        {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                                    </button>
                                </div>
                                <p className="text-[10px] text-muted-foreground font-medium ml-1">Super Admin must assign a secure initial password.</p>
                            </div>

                            <div className="space-y-2 relative">
                                <Label className="text-xs font-medium text-muted-foreground flex items-center gap-2">Confirm Password <span className="text-destructive">*</span></Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                                    <Input
                                        type={showConfirmPassword ? "text" : "password"}
                                        required
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="••••••••••••"
                                        className={`pl-10 h-10 bg-background text-sm pr-9 ${errors.confirmPassword ? "border-destructive focus-visible:ring-destructive" : ""}`}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    >
                                        {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                                    </button>
                                </div>
                                {errors.confirmPassword && <p className="text-[10px] text-destructive font-medium absolute -bottom-4 left-0">{errors.confirmPassword}</p>}
                            </div>
                        </div>
                    </div>
                </form>

                <DialogFooter className="p-6 bg-muted/40 border-t border-border shrink-0 flex justify-end gap-3">
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-10 text-sm">
                        Cancel
                    </Button>
                    <Button type="submit" form="tenant-admin-form" className="h-10 text-sm px-4 bg-primary text-primary-foreground shadow-lg hover:bg-primary/90">
                        Finalize Admin Creation
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
