"use client";

import Image from "next/image";
import { LoginForm } from "@/components/login-form";


interface LoginPageProps {
    onLogin: (email: string, password: string) => Promise<void>;
}

export function LoginPage({ onLogin }: LoginPageProps) {
    return (
        <div className="min-h-svh">
            <div className="grid min-h-svh lg:grid-cols-2">
                {/* Left Panel: Branding */}
                <div className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-[#182350] p-10 text-white">
                    {/* Decorative Background Elements */}
                    <div className="pointer-events-none absolute inset-0">
                        <div className="absolute top-0 right-0 -mr-24 -mt-24 h-[28rem] w-[28rem] rounded-full bg-white/10 blur-3xl" />
                        <div className="absolute bottom-0 left-0 -ml-24 -mb-24 h-[24rem] w-[24rem] rounded-full bg-white/10 blur-3xl" />
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.14),transparent_55%)]" />
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(99,102,241,0.14),transparent_55%)]" />

                    </div>


                    {/* Center Visual */}
                    <div className="relative z-10 flex items-center justify-center py-10">
                        <div className="relative">
                            <div className="absolute -inset-8 rounded-[2.5rem] bg-white/5 blur-2xl" />
                            <div className="relative p-6">
                                <Image
                                    src="/AMS_dark.svg"
                                    alt="DFile Logo"
                                    width={520}
                                    height={520}
                                    className="w-full max-w-md object-contain drop-shadow-2xl opacity-95"
                                    priority
                                />
                            </div>
                        </div>
                    </div>


                </div>

                {/* Right Panel: Form */}
                <div className="relative flex items-center justify-center bg-white p-6 dark:bg-zinc-950 md:p-10">
                    {/* subtle background */}
                    <div className="pointer-events-none absolute inset-0 overflow-hidden">
                        <div className="absolute -top-[20%] -right-[10%] h-[500px] w-[500px] rounded-full bg-blue-50/50 blur-[100px]" />
                        <div className="absolute -bottom-[20%] -left-[10%] h-[500px] w-[500px] rounded-full bg-indigo-50/50 blur-[100px]" />
                    </div>

                    <div className="relative w-full max-w-sm">
                        {/* Mobile header (since left panel is hidden on mobile) */}
                        <div className="mb-8 flex items-center gap-3 lg:hidden">
                            <div className="grid h-10 w-10 place-items-center  bg-[#182350] text-white shadow-lg shadow-[#182350]/20">
                                <span className="font-black tracking-tight">D</span>
                            </div>
                            <div className="flex flex-col leading-tight">
                                <span className="text-lg font-semibold text-[#182350] dark:text-white">
                                    DFile
                                </span>
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                    Sign in to continue
                                </span>
                            </div>
                        </div>

                        {/* Form card shell */}
                        <div className="relative z-20 rounded-[2.5rem] border border-slate-200/60 bg-white/80 p-8 shadow-[0_30px_80px_rgba(0,0,0,0.1)] backdrop-blur-md dark:border-white/10 dark:bg-zinc-950/50 md:p-10">
                            <LoginForm onLogin={onLogin} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
