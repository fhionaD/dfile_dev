"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface LoginFormProps extends React.ComponentProps<"div"> {
  onLogin?: (email: string, password: string) => Promise<void>;
}

export function LoginForm({ className, onLogin, ...props }: LoginFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (onLogin) {
      try {
        await onLogin(email, password);
      } catch (err: unknown) {
        const error = err as { message?: string } | undefined;
        setError(error?.message ?? "An unexpected error occurred. Please try again.");
      } finally {
        // Always clear loading — success path relies on navigation away; if redirect fails or the
        // request times out, the button must recover (prevents endless "Signing in…").
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

        {error && (
          <div className="text-red-500 text-sm font-medium text-center">{error}</div>
        )}

        {/* Actions */}
        <div className="pt-4">
          <Button
            type="submit"
            className="w-full h-12 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground hover:to-primary hover:shadow-lg hover:-translate-y-0.5 font-bold tracking-wide shadow-md shadow-primary/20 transition-all duration-300 active:scale-[0.98]"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Signing in...
              </span>
            ) : (
              "Login"
            )}
          </Button>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link href="/register" className="font-semibold text-primary hover:underline">
                Create organization
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
