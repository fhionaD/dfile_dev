"use client";

import { useState } from "react";
import { Eye, EyeOff, Lock, Loader2 } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordRequirements, passwordMeetsPolicy } from "@/components/password-requirements";
import api from "@/lib/api";
import { toast } from "sonner";

interface ChangePasswordModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ChangePasswordModal({ open, onOpenChange }: ChangePasswordModalProps) {
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    const reset = () => {
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setShowCurrent(false);
        setShowNew(false);
        setShowConfirm(false);
        setFieldErrors({});
    };

    const handleClose = (val: boolean) => {
        if (!isLoading) {
            reset();
            onOpenChange(val);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const errs: Record<string, string> = {};

        if (!currentPassword) {
            errs.currentPassword = "Current password is required.";
        }
        if (!passwordMeetsPolicy(newPassword)) {
            errs.newPassword = "Password does not meet the requirements below.";
        }
        if (newPassword !== confirmPassword) {
            errs.confirmPassword = "Passwords do not match.";
        }
        if (Object.keys(errs).length > 0) {
            setFieldErrors(errs);
            return;
        }
        setFieldErrors({});
        setIsLoading(true);
        try {
            await api.post("/api/auth/change-password", { currentPassword, newPassword }, { suppressGlobalError: true });
            toast.success("Password changed successfully.");
            handleClose(false);
        } catch (err: unknown) {
            const msg =
                (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
                "Failed to change password. Please try again.";
            if (msg.toLowerCase().includes("current")) {
                setFieldErrors({ currentPassword: msg });
            } else {
                toast.error(msg);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const canSubmit =
        currentPassword.length > 0 &&
        passwordMeetsPolicy(newPassword) &&
        newPassword === confirmPassword &&
        !isLoading;

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-lg">
                        <Lock size={18} className="text-primary" />
                        Change Password
                    </DialogTitle>
                    <DialogDescription>
                        Enter your current password and choose a new one.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-2">
                    {/* Current password */}
                    <div className="space-y-1.5">
                        <Label htmlFor="cp-current" className="text-sm font-medium">
                            Current Password <span className="text-destructive">*</span>
                        </Label>
                        <div className="relative">
                            <Input
                                id="cp-current"
                                type={showCurrent ? "text" : "password"}
                                required
                                autoFocus
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                placeholder="Your current password"
                                className={`h-10 pr-10 ${fieldErrors.currentPassword ? "border-destructive focus-visible:ring-destructive" : ""}`}
                            />
                            <button
                                type="button"
                                tabIndex={-1}
                                onClick={() => setShowCurrent(!showCurrent)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                                {showCurrent ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                        </div>
                        {fieldErrors.currentPassword && (
                            <p className="text-[11px] text-destructive font-medium">{fieldErrors.currentPassword}</p>
                        )}
                    </div>

                    {/* New password */}
                    <div className="space-y-1.5">
                        <Label htmlFor="cp-new" className="text-sm font-medium">
                            New Password <span className="text-destructive">*</span>
                        </Label>
                        <div className="relative">
                            <Input
                                id="cp-new"
                                type={showNew ? "text" : "password"}
                                required
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Create a strong password"
                                className={`h-10 pr-10 ${fieldErrors.newPassword ? "border-destructive focus-visible:ring-destructive" : ""}`}
                            />
                            <button
                                type="button"
                                tabIndex={-1}
                                onClick={() => setShowNew(!showNew)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                                {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                        </div>
                        {fieldErrors.newPassword && (
                            <p className="text-[11px] text-destructive font-medium">{fieldErrors.newPassword}</p>
                        )}
                        <PasswordRequirements password={newPassword} />
                    </div>

                    {/* Confirm password */}
                    <div className="space-y-1.5">
                        <Label htmlFor="cp-confirm" className="text-sm font-medium">
                            Confirm New Password <span className="text-destructive">*</span>
                        </Label>
                        <div className="relative">
                            <Input
                                id="cp-confirm"
                                type={showConfirm ? "text" : "password"}
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Re-enter your new password"
                                className={`h-10 pr-10 ${fieldErrors.confirmPassword ? "border-destructive focus-visible:ring-destructive" : ""}`}
                            />
                            <button
                                type="button"
                                tabIndex={-1}
                                onClick={() => setShowConfirm(!showConfirm)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                                {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                        </div>
                        {fieldErrors.confirmPassword && (
                            <p className="text-[11px] text-destructive font-medium">{fieldErrors.confirmPassword}</p>
                        )}
                    </div>

                    <DialogFooter className="mt-2 gap-2 sm:gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => handleClose(false)}
                            disabled={isLoading}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={!canSubmit}>
                            {isLoading ? (
                                <span className="flex items-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Saving…
                                </span>
                            ) : (
                                "Change Password"
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
