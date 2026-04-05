"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { LoginPage as LoginPageComponent } from "@/components/login-page";
import { useAuth } from "@/contexts/auth-context";
import { getDashboardPath } from "@/lib/role-routing";
import { LoadingScreen } from "@/components/loading-screen";

export default function LoginPage() {
    const { login, isLoggedIn, user, isLoading } = useAuth();
    const router = useRouter();
    // Prevent the background /api/auth/me refresh from triggering a second push.
    const hasRedirectedRef = useRef(false);

    useEffect(() => {
        if (isLoading || hasRedirectedRef.current) return;
        if (!isLoggedIn || !user) return;

        const dest = getDashboardPath(user.role);
        if (dest && dest !== "/login") {
            hasRedirectedRef.current = true;
            router.push(dest);
        }
    }, [isLoading, isLoggedIn, user, router]);

    if (isLoading) return <LoadingScreen message="Checking your session…" />;

    return <LoginPageComponent onLogin={login} />;
}
