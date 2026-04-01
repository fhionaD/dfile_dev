"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TenantRegistrationWizard } from "@/components/forms/tenant-registration-wizard";
import { useAuth } from "@/contexts/auth-context";
import { getDashboardPath } from "@/lib/role-routing";
import { LoadingScreen } from "@/components/loading-screen";

export default function RegisterOrganizationPage() {
    const { isLoggedIn, user, isLoading } = useAuth();
    const router = useRouter();
    const hasRedirectedRef = useRef(false);

    useEffect(() => {
        if (isLoading || hasRedirectedRef.current) return;
        if (isLoggedIn && user) {
            const dest = getDashboardPath(user.role);
            if (dest && dest !== "/login") {
                hasRedirectedRef.current = true;
                router.replace(dest);
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isLoggedIn, isLoading]);

    if (isLoading) return <LoadingScreen message="Checking your session…" />;

    return (
        <div className="grid min-h-svh lg:grid-cols-2 lg:h-svh lg:min-h-0">
            <div className="relative hidden lg:flex flex-col bg-[#0f172a] p-12 text-white lg:min-h-0 lg:overflow-hidden">
                <div className="pointer-events-none absolute inset-0 overflow-hidden">
                    <div className="absolute -top-1/4 -left-1/4 h-[600px] w-[600px] rounded-full bg-blue-800/20 blur-[120px]" />
                    <div className="absolute -bottom-1/4 -right-1/4 h-[600px] w-[600px] rounded-full bg-indigo-900/30 blur-[120px]" />
                </div>
                <div className="relative z-10 flex shrink-0 items-center gap-3">
                    <img src="/AMS_dark.svg" alt="DFile" className="h-10 w-auto" />
                </div>
                <div className="relative z-10 flex min-h-0 flex-1 items-center justify-center py-8">
                    <img
                        src="/bg_login.svg"
                        alt="Background illustration"
                        aria-hidden="false"
                        className="w-full max-w-xs xl:max-w-sm object-contain select-none opacity-90"
                    />
                </div>
                <div className="relative z-10 shrink-0">
                    <blockquote className="space-y-3">
                        <p className="text-lg font-medium leading-relaxed text-white/80">
                            &ldquo;Create your organization, then sign in as tenant admin to manage assets, billing, and
                            your team.&rdquo;
                        </p>
                        <footer className="text-xs font-semibold uppercase tracking-widest text-white/35">
                            DFile &mdash; Enterprise Asset Management
                        </footer>
                    </blockquote>
                </div>
            </div>

            <div className="flex min-h-svh flex-col bg-background lg:h-svh lg:min-h-0">
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
                    <div className="mx-auto flex w-full max-w-xl flex-col gap-5 px-6 py-6 sm:px-10 sm:py-8 lg:px-16 lg:py-10">
                        <div className="flex items-center justify-end">
                            <p className="text-center text-sm text-muted-foreground">
                                Already have an account?{" "}
                                <Link href="/login" className="font-semibold text-primary hover:underline">
                                    Sign in
                                </Link>
                            </p>
                        </div>

                        <div className="flex justify-center lg:justify-start lg:hidden">
                            <img src="/AMS.svg" alt="DFile Logo" className="h-14 w-auto dark:hidden" />
                            <img src="/AMS_dark.svg" alt="DFile Logo" className="hidden h-14 w-auto dark:block" />
                        </div>

                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-primary">Create your organization</h1>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Register as tenant admin. You will sign in on the next screen with your work email and
                                password.
                            </p>
                        </div>

                        <TenantRegistrationWizard />
                    </div>
                </div>
            </div>
        </div>
    );
}
