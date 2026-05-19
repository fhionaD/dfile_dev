"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Mail, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import api from "@/lib/api";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);
        try {
            await api.post("/api/auth/forgot-password", { email: email.trim() }, { suppressGlobalError: true });
        } catch {
            // Silently swallow — always show the success state to prevent enumeration
        } finally {
            setIsLoading(false);
            setSubmitted(true);
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
                    <h1 className="text-2xl font-semibold tracking-tight">Forgot your password?</h1>
                    <p className="text-muted-foreground text-sm">
                        Enter your email and we&apos;ll send you a reset link.
                    </p>
                </div>

                {submitted ? (
                    <div className="rounded-lg border border-border bg-muted/40 px-6 py-8 text-center space-y-3">
                        <Mail className="mx-auto h-10 w-10 text-primary" />
                        <p className="font-medium text-sm">Check your inbox</p>
                        <p className="text-muted-foreground text-sm">
                            If that email is registered, a password reset link has been sent. The link expires in 1 hour.
                        </p>
                        <Link href="/login" className="mt-2 block text-sm font-medium text-primary hover:underline">
                            Back to sign in
                        </Link>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-sm font-medium">
                                Email address
                            </Label>
                            <Input
                                id="email"
                                type="email"
                                required
                                autoFocus
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="name@company.com"
                                className="h-11"
                            />
                        </div>

                        {error && (
                            <p className="text-sm text-destructive font-medium">{error}</p>
                        )}

                        <Button type="submit" className="w-full h-11" disabled={isLoading || !email.trim()}>
                            {isLoading ? (
                                <span className="flex items-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Sending…
                                </span>
                            ) : (
                                "Send reset link"
                            )}
                        </Button>

                        <p className="text-center text-sm text-muted-foreground">
                            Remember your password?{" "}
                            <Link href="/login" className="font-medium text-primary hover:underline">
                                Sign in
                            </Link>
                        </p>
                    </form>
                )}
            </div>
        </div>
    );
}
