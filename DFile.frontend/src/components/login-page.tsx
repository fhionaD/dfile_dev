"use client";

import { LoginForm } from "@/components/login-form";

interface LoginPageProps {
    onLogin: (email: string, password: string) => Promise<void>;
}

export function LoginPage({ onLogin }: LoginPageProps) {
    return (
        <div className="grid min-h-svh lg:grid-cols-2">
            {/* Left panel — branding */}
            <div className="relative hidden lg:flex flex-col bg-[#0f172a] p-12 text-white">
                {/* Subtle radial glow */}
                <div className="pointer-events-none absolute inset-0 overflow-hidden">
                    <div className="absolute -top-1/4 -left-1/4 h-[600px] w-[600px] rounded-full bg-blue-800/20 blur-[120px]" />
                    <div className="absolute -bottom-1/4 -right-1/4 h-[600px] w-[600px] rounded-full bg-indigo-900/30 blur-[120px]" />
                </div>

                {/* Logo */}
                <div className="relative z-10 flex items-center gap-3">
                    <img src="/AMS_dark.svg" alt="DFile" className="h-10 w-auto" />
                </div>

                {/* Illustration — centered in the negative space */}
                <div className="relative z-10 flex flex-1 items-center justify-center">
                    <img
                        src="/bg_login.svg"
                        alt=""
                        aria-hidden="true"
                        className="w-full max-w-xs xl:max-w-sm object-contain select-none opacity-90"
                    />
                </div>

                {/* Quote */}
                <div className="relative z-10">
                    <blockquote className="space-y-3">
                        <p className="text-lg font-medium leading-relaxed text-white/80">
                            &ldquo;Streamline your fixed asset management with complete visibility, lifecycle tracking, and multi-organizational control.&rdquo;
                        </p>
                        <footer className="text-xs font-semibold uppercase tracking-widest text-white/35">
                            DFile &mdash; Enterprise Asset Management
                        </footer>
                    </blockquote>
                </div>
            </div>

            {/* Right panel — form only, no card border */}
            <div className="flex items-center justify-center bg-background px-8 py-12 md:px-16">
                <div className="w-full max-w-sm">
                    <LoginForm onLogin={onLogin} />
                </div>
            </div>
        </div>
    );
}
