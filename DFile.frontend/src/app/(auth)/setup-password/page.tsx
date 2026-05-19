"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import api from "@/lib/api";
import { toast } from "sonner";

function SetupPasswordForm() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const token = searchParams.get("token") ?? "";
    const email = searchParams.get("email") ?? "";

    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({});

        const newErrors: Record<string, string> = {};

        if (newPassword.length < 8) {
            newErrors.newPassword = "Password must be at least 8 characters.";
        }
        if (newPassword !== confirmPassword) {
            newErrors.confirmPassword = "Passwords do not match.";
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        if (!token || !email) {
            toast.error("Invalid activation link. Please request a new one from your administrator.");
            return;
        }

        setIsLoading(true);
        try {
            await api.post("/api/auth/setup-password", {
                email,
                token,
                newPassword,
            });
            toast.success("Account activated! You can now log in.");
            router.push("/login");
        } catch (err: unknown) {
            const msg =
                (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
                "Failed to activate account. The link may have expired.";
            toast.error(msg);
        } finally {
            setIsLoading(false);
        }
    };

    if (!token || !email) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background p-4">
                <div className="max-w-md w-full text-center space-y-4">
                    <ShieldCheck className="mx-auto h-12 w-12 text-destructive opacity-60" />
                    <h1 className="text-xl font-semibold">Invalid Activation Link</h1>
                    <p className="text-muted-foreground text-sm">This link is missing required parameters. Please request a new invitation from your administrator.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <div className="max-w-md w-full space-y-8">
                <div className="text-center space-y-2">
                    <div className="flex justify-center">
                        <div className="p-3 bg-primary/10 rounded-xl">
                            <ShieldCheck className="h-8 w-8 text-primary" />
                        </div>
                    </div>
                    <h1 className="text-2xl font-semibold tracking-tight">Activate Your Account</h1>
                    <p className="text-muted-foreground text-sm">
                        Set a password for <span className="font-medium text-foreground">{email}</span>
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-2 relative">
                        <Label className="text-sm font-medium flex items-center gap-2">
                            <Lock size={13} /> New Password <span className="text-destructive">*</span>
                        </Label>
                        <div className="relative">
                            <Input
                                type={showNew ? "text" : "password"}
                                required
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Minimum 8 characters"
                                className={`h-11 pr-10 ${errors.newPassword ? "border-destructive focus-visible:ring-destructive" : ""}`}
                            />
                            <button
                                type="button"
                                onClick={() => setShowNew(!showNew)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                                {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                        </div>
                        {errors.newPassword && (
                            <p className="text-[11px] text-destructive font-medium">{errors.newPassword}</p>
                        )}
                    </div>

                    <div className="space-y-2 relative">
                        <Label className="text-sm font-medium flex items-center gap-2">
                            <Lock size={13} /> Confirm Password <span className="text-destructive">*</span>
                        </Label>
                        <div className="relative">
                            <Input
                                type={showConfirm ? "text" : "password"}
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Re-enter your password"
                                className={`h-11 pr-10 ${errors.confirmPassword ? "border-destructive focus-visible:ring-destructive" : ""}`}
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirm(!showConfirm)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                                {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                        </div>
                        {errors.confirmPassword && (
                            <p className="text-[11px] text-destructive font-medium">{errors.confirmPassword}</p>
                        )}
                    </div>

                    <Button type="submit" className="w-full h-11" disabled={isLoading}>
                        {isLoading ? "Activating..." : "Set Password & Activate Account"}
                    </Button>
                </form>
            </div>
        </div>
    );
}

export default function SetupPasswordPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="text-muted-foreground text-sm">Loading...</div>
            </div>
        }>
            <SetupPasswordForm />
        </Suspense>
    );
}
