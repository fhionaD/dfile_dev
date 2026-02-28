"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Eye, EyeOff, Save, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/auth-context";
import api from "@/lib/api";

export default function ChangePasswordPage() {
    const { user, logout, refreshSession } = useAuth();
    const router = useRouter();
    const [formData, setFormData] = useState({
        oldPassword: "",
        newPassword: "",
        confirmPassword: ""
    });
    const [showOldPassword, setShowOldPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (formData.newPassword !== formData.confirmPassword) {
            setError("New passwords do not match");
            return;
        }

        if (formData.newPassword.length < 6) {
            setError("New password must be at least 6 characters long");
            return;
        }

        setIsLoading(true);
        try {
            await api.post("/api/auth/change-password", {
                oldPassword: formData.oldPassword,
                newPassword: formData.newPassword
            });
            await refreshSession();
            setSuccess(true);
            // Wait 2 seconds then redirect to dashboard
            setTimeout(() => {
                router.push("/dashboard");
            }, 2000);
        } catch (err: any) {
            console.error("[ChangePassword] Error:", err.response?.data || err);
            setError(err.response?.data?.message || err.message || "Failed to change password");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-md mx-auto mt-10">
            <div className="bg-card border border-border rounded-2xl p-8 shadow-sm">
                <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 bg-primary/10 text-primary rounded-xl">
                        <Lock size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-foreground">Set Secure Password</h1>
                        <p className="text-sm text-muted-foreground">
                            {user?.mustChangePassword
                                ? "This is your first login. Please update your password."
                                : "Update your account security settings."}
                        </p>
                    </div>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg flex items-center gap-3">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <div className="text-sm font-medium">{error}</div>
                    </div>
                )}

                {success && (
                    <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 rounded-lg flex items-center gap-3">
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                        <div className="text-sm font-medium">Password updated successfully. Redirecting...</div>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Current Password</Label>
                        <div className="relative">
                            <Input
                                type={showOldPassword ? "text" : "password"}
                                required
                                value={formData.oldPassword}
                                onChange={(e) => setFormData({ ...formData, oldPassword: e.target.value })}
                                placeholder="Enter current password"
                                className="h-11 bg-background pr-10"
                                disabled={isLoading || success}
                            />
                            <button
                                type="button"
                                onClick={() => setShowOldPassword(!showOldPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                                {showOldPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">New Password</Label>
                        <div className="relative">
                            <Input
                                type={showNewPassword ? "text" : "password"}
                                required
                                value={formData.newPassword}
                                onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                                placeholder="At least 6 characters"
                                className="h-11 bg-background pr-10"
                                disabled={isLoading || success}
                            />
                            <button
                                type="button"
                                onClick={() => setShowNewPassword(!showNewPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                                {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Confirm New Password</Label>
                        <Input
                            type="password"
                            required
                            value={formData.confirmPassword}
                            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                            placeholder="Repeat new password"
                            className="h-11 bg-background"
                            disabled={isLoading || success}
                        />
                    </div>

                    <Button
                        type="submit"
                        className="w-full h-11 mt-4 bg-primary text-primary-foreground font-semibold shadow-lg hover:shadow-primary/20 transition-all"
                        disabled={isLoading || success}
                    >
                        {isLoading ? "Updating..." : (
                            <>
                                <Save size={18} className="mr-2" /> Update Security Credentials
                            </>
                        )}
                    </Button>
                </form>
            </div>
        </div>
    );
}
