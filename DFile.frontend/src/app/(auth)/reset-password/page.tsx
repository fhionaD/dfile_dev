"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, ShieldCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordRequirements, passwordMeetsPolicy } from "@/components/password-requirements";
import api from "@/lib/api";
import { toast } from "sonner";

function ResetPasswordForm() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const token = searchParams.get("token") ?? "";
    const email = searchParams.get("email") ?? "";

    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    if (!token || !email) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background p-4">
                <div className="max-w-md w-full text-center space-y-4">
                    <ShieldCheck className="mx-auto h-12 w-12 text-destructive opacity-60" />
                    <h1 className="text-xl font-semibold">Invalid Reset Link</h1>
                    <p className="text-muted-foreground text-sm">
                        This link is missing required parameters. Please request a new password reset.
                    </p>
                </div>
            </div>
        );
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const errs: Record<string, string> = {};

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
            await api.post("/api/auth/reset-password", { email, token, newPassword }, { suppressGlobalError: true });
            toast.success("Password reset successfully. You can now sign in.");
            router.push("/login");
        } catch (err: unknown) {
            const msg =
                (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
                "Failed to reset password. The link may have expired.";
            toast.error(msg);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <div className="w-full max-w-md space-y-8">
                <div className="text-center space-y-2">
                    <div className="flex justify-center">
                        <div className="p-3 bg-primary/10 rounded-xl">
                            <ShieldCheck className="h-8 w-8 text-primary" />
                        </div>
                    </div>
                    <h1 className="text-2xl font-semibold tracking-tight">Set a new password</h1>
                    <p className="text-muted-foreground text-sm">
                        Resetting password for <span className="font-medium text-foreground">{email}</span>
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-2">
                        <Label htmlFor="new-password" className="text-sm font-medium flex items-center gap-1.5">
                            <Lock size={13} /> New Password <span className="text-destructive">*</span>
                        </Label>
                        <div className="relative">
                            <Input
                                id="new-password"
                                type={showNew ? "text" : "password"}
                                required
                                autoFocus
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Create a strong password"
                                className={`h-11 pr-10 ${fieldErrors.newPassword ? "border-destructive focus-visible:ring-destructive" : ""}`}
                            />
                            <button
                                type="button"
                                onClick={() => setShowNew(!showNew)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                tabIndex={-1}
                            >
                                {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                            </button>
                        </div>
                        {fieldErrors.newPassword && (
                            <p className="text-[11px] text-destructive font-medium">{fieldErrors.newPassword}</p>
                        )}
                        <PasswordRequirements password={newPassword} />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="confirm-password" className="text-sm font-medium flex items-center gap-1.5">
                            <Lock size={13} /> Confirm Password <span className="text-destructive">*</span>
                        </Label>
                        <div className="relative">
                            <Input
                                id="confirm-password"
                                type={showConfirm ? "text" : "password"}
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Re-enter your password"
                                className={`h-11 pr-10 ${fieldErrors.confirmPassword ? "border-destructive focus-visible:ring-destructive" : ""}`}
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirm(!showConfirm)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                tabIndex={-1}
                            >
                                {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                            </button>
                        </div>
                        {fieldErrors.confirmPassword && (
                            <p className="text-[11px] text-destructive font-medium">{fieldErrors.confirmPassword}</p>
                        )}
                    </div>

                    <Button
                        type="submit"
                        className="w-full h-11"
                        disabled={isLoading || !passwordMeetsPolicy(newPassword) || newPassword !== confirmPassword}
                    >
                        {isLoading ? (
                            <span className="flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Resetting…
                            </span>
                        ) : (
                            "Reset Password"
                        )}
                    </Button>
                </form>
            </div>
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen flex items-center justify-center bg-background">
                    <div className="text-muted-foreground text-sm">Loading…</div>
                </div>
            }
        >
            <ResetPasswordForm />
        </Suspense>
    );
}
