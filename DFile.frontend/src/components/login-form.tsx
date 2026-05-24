"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Loader2, Eye, EyeOff, ShieldAlert, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import api from "@/lib/api";
import { getDashboardPath } from "@/lib/role-routing";
import { UserRole } from "@/types/asset";

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    google?: any;
  }
}

const ROLE_ALIASES: Record<string, string> = {
  "Finance Manager": "Finance",
  "Maintenance Manager": "Maintenance",
};

interface LoginFormProps extends React.ComponentProps<"div"> {
  onLogin?: (email: string, password: string) => Promise<{ attemptsLeft?: number; cooldownSeconds?: number; isSuspicious?: boolean; securityAlertSent?: boolean } | void>;
}

export function LoginForm({ className, onLogin, ...props }: LoginFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [isSuspicious, setIsSuspicious] = useState(false);
  const [securityAlertSent, setSecurityAlertSent] = useState(false);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const msg = params.get("error") || params.get("message");
    if (msg) setError(decodeURIComponent(msg));
  }, []);

  useEffect(() => {
    if (cooldownSeconds <= 0) {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
      return;
    }

    countdownRef.current = setInterval(() => {
      setCooldownSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(countdownRef.current!);
          countdownRef.current = null;
          setError(null);
          setAttemptsLeft(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [cooldownSeconds]);

  const isLocked = cooldownSeconds > 0;

  const formatCountdown = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
    return () => { script.remove(); };
  }, []);

  const handleGoogleSignIn = () => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) {
      setError("Google sign-in is not configured.");
      return;
    }
    setError(null);
    window.google?.accounts.id.initialize({
      client_id: clientId,
      callback: async (response: { credential: string }) => {
        setIsGoogleLoading(true);
        try {
          const { data } = await api.post<{ token: string }>("/api/auth/google/token", {
            credential: response.credential,
          });
          localStorage.setItem("dfile_token", data.token);
          const meResponse = await api.get("/api/auth/me");
          const meData = meResponse.data;
          const role = (ROLE_ALIASES[meData.role as string] ?? (meData.role as string) ?? "") as UserRole;
          localStorage.setItem("dfile_user", JSON.stringify({ ...meData, role }));
          window.location.href = getDashboardPath(role) ?? "/login";
        } catch (err: unknown) {
          const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
          setError(msg ?? "Google sign-in failed. Please try again.");
          setIsGoogleLoading(false);
        }
      },
    });
    window.google?.accounts.id.prompt();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) return;
    setIsLoading(true);
    setError(null);
    setIsSuspicious(false);
    setSecurityAlertSent(false);

    if (onLogin) {
      try {
        const result = await onLogin(email, password);
        if (result) {
          if (result.cooldownSeconds && result.cooldownSeconds > 0) {
            setCooldownSeconds(result.cooldownSeconds);
          }
          if (result.attemptsLeft !== undefined && result.attemptsLeft !== null) {
            setAttemptsLeft(result.attemptsLeft);
          }
          if (result.isSuspicious) {
            setIsSuspicious(true);
          }
          if (result.securityAlertSent) {
            setSecurityAlertSent(true);
          }
        }
      } catch (err: unknown) {
        const errObj = err as { message?: string; attemptsLeft?: number; cooldownSeconds?: number; isSuspicious?: boolean; securityAlertSent?: boolean } | undefined;
        setError(errObj?.message ?? "An unexpected error occurred. Please try again.");
        if (errObj?.cooldownSeconds && errObj.cooldownSeconds > 0) {
          setCooldownSeconds(errObj.cooldownSeconds);
        }
        if (errObj?.attemptsLeft !== undefined && errObj.attemptsLeft !== null) {
          setAttemptsLeft(errObj.attemptsLeft);
        }
        if (errObj?.isSuspicious) setIsSuspicious(true);
        if (errObj?.securityAlertSent) setSecurityAlertSent(true);
      } finally {
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-10", className)} {...props}>
      <div className="space-y-4 text-center lg:text-left">
        {/* Logo — hidden on desktop because left panel shows it */}
        <div className="flex justify-center lg:justify-start mb-4 lg:hidden">
          <img src="/AMS.svg" alt="AMS Logo" className="h-16 w-auto dark:hidden" />
          <img src="/AMS_dark.svg" alt="AMS Logo" className="h-16 w-auto hidden dark:block" />
        </div>
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-primary">
            Welcome back
          </h2>
          <p className="text-sm text-muted-foreground">
            Sign in to manage assets with speed and clarity.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mb-4 space-y-8">
        <div className="space-y-5">
          {/* Email */}
          <div className="space-y-2 group">
            <Label
              htmlFor="email"
              className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70 group-focus-within:text-primary transition-colors pl-1"
            >
              Email Address
            </Label>

            <div className="relative">
              <Input
                id="email"
                type="email"
                placeholder="name@company.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 border-0 border-b-2 border-border bg-muted/50 hover:bg-muted/80 focus:bg-background rounded-t-lg px-4 focus-visible:ring-0 focus-visible:border-primary transition-all placeholder:text-muted-foreground/40 shadow-sm"
              />
              <div className="pointer-events-none absolute inset-x-0 -bottom-[2px] h-[2px] scale-x-0 bg-primary transition-transform duration-300 group-focus-within:scale-x-100" />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-2 group">
            <Label
              htmlFor="password"
              className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70 group-focus-within:text-primary transition-colors pl-1"
            >
              Password
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 border-0 border-b-2 border-border bg-muted/50 hover:bg-muted/80 focus:bg-background rounded-t-lg px-4 pr-12 focus-visible:ring-0 focus-visible:border-primary transition-all shadow-sm"
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-1 top-1/2 -translate-y-1/2 inline-flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>

              <div className="pointer-events-none absolute inset-x-0 -bottom-[2px] h-[2px] scale-x-0 bg-primary transition-transform duration-300 group-focus-within:scale-x-100" />
            </div>
          </div>
        </div>

        {/* Security banners */}
        {isLocked && (
          <div className="flex flex-col gap-1 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-800 p-3 text-sm text-red-700 dark:text-red-400">
            <div className="flex items-center gap-2 font-semibold">
              <ShieldAlert className="h-4 w-4 flex-shrink-0" />
              Account temporarily locked
            </div>
            <p className="text-xs">Too many unsuccessful login attempts. Please try again after the cooldown.</p>
            <p className="text-xs font-mono font-bold mt-1">
              Try again in: {formatCountdown(cooldownSeconds)}
            </p>
          </div>
        )}

        {!isLocked && isSuspicious && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-3 text-sm text-amber-700 dark:text-amber-400">
            <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Suspicious login activity detected.</p>
              {securityAlertSent && <p className="text-xs mt-0.5">A security email has been sent to your account.</p>}
            </div>
          </div>
        )}

        {!isLocked && !isSuspicious && error && (
          <div className="text-red-500 text-sm font-medium text-center">{error}</div>
        )}

        {!isLocked && attemptsLeft !== null && attemptsLeft > 0 && (
          <p className="text-center text-xs text-amber-600 dark:text-amber-400 font-medium">
            Attempts remaining: {attemptsLeft} of 5
          </p>
        )}

        {/* Actions */}
        <div className="pt-4">
          <Button
            type="submit"
            className="w-full h-12 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground hover:to-primary hover:shadow-lg hover:-translate-y-0.5 font-bold tracking-wide shadow-md shadow-primary/20 transition-all duration-300 active:scale-[0.98]"
            disabled={isLoading || isLocked}
          >
            {isLoading ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Signing in...
              </span>
            ) : isLocked ? (
              <span className="inline-flex items-center gap-2">
                <ShieldAlert className="h-4 w-4" />
                Locked — {formatCountdown(cooldownSeconds)}
              </span>
            ) : (
              "Login"
            )}
          </Button>

          <div className="relative my-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">or</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full h-12 font-medium gap-3"
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading}
          >
            {isGoogleLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
            )}
            Continue with Google
          </Button>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link href="/register" className="font-semibold text-primary hover:underline">
                Create organization
              </Link>
            </p>
            <p className="mt-3 text-sm">
              <Link href="/forgot-password" className="text-muted-foreground hover:text-primary hover:underline transition-colors">
                Forgot your password?
              </Link>
            </p>
          </div>

          <p className="mt-6 text-center text-[10px] font-medium uppercase tracking-widest text-muted-foreground/60">
            Protected by DFile Security
          </p>
        </div>
      </form>
    </div>
  );
}
