"use client";

import React, { useState } from "react";
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
      } catch (err) {
        // console.warn("Login failed (expected for invalid credentials)");
        setError("Invalid email or password. Please try again.");
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-10", className)} {...props}>
      <div className="space-y-4 text-center lg:text-left">
        <div className="flex justify-center lg:justify-start mb-4">
          <img src="/AMS.svg" alt="AMS Logo" className="h-16 w-auto dark:hidden" />
          <img src="/AMS_dark.svg" alt="AMS Logo" className="h-16 w-auto hidden dark:block" />
        </div>
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-[#182350] dark:text-white">
            Welcome back
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
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
              className="text-[11px] font-bold uppercase tracking-wider text-slate-400 group-focus-within:text-[#182350] transition-colors pl-1"
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
                className="h-12 border-0 border-b-2 border-slate-100 bg-slate-50/50 hover:bg-slate-50/80 focus:bg-white rounded-t-lg px-4 focus-visible:ring-0 focus-visible:border-[#182350] transition-all placeholder:text-slate-300 shadow-sm"
              />
              <div className="pointer-events-none absolute inset-x-0 -bottom-[2px] h-[2px] scale-x-0 bg-[#182350] transition-transform duration-300 group-focus-within:scale-x-100" />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-2 group">
            <Label
              htmlFor="password"
              className="text-[11px] font-bold uppercase tracking-wider text-slate-400 group-focus-within:text-[#182350] transition-colors pl-1"
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
                className="h-12 border-0 border-b-2 border-slate-100 bg-slate-50/50 hover:bg-slate-50/80 focus:bg-white rounded-t-lg px-4 pr-12 focus-visible:ring-0 focus-visible:border-[#182350] transition-all shadow-sm"
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-1 top-1/2 -translate-y-1/2 inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-400 hover:text-[#182350] hover:bg-slate-100 transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>

              <div className="pointer-events-none absolute inset-x-0 -bottom-[2px] h-[2px] scale-x-0 bg-[#182350] transition-transform duration-300 group-focus-within:scale-x-100" />
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
            className="w-full h-12 rounded-xl bg-gradient-to-r from-[#182350] to-[#243575] text-white hover:to-[#182350] hover:shadow-lg hover:-translate-y-0.5 font-bold tracking-wide shadow-md shadow-[#182350]/20 transition-all duration-300 active:scale-[0.98]"
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

          <p className="mt-6 text-center text-[10px] font-medium uppercase tracking-widest text-slate-400 dark:text-slate-500">
            Protected by DFile Security
          </p>
        </div>
      </form>
    </div>
  );
}
