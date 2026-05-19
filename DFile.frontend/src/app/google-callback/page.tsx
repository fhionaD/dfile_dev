"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { LoadingScreen } from "@/components/loading-screen";
import { getDashboardPath } from "@/lib/role-routing";
import { UserRole } from "@/types/asset";
import api from "@/lib/api";

const ROLE_ALIASES: Record<string, string> = {
    "Finance Manager": "Finance",
    "Maintenance Manager": "Maintenance",
};

const ERROR_MESSAGES: Record<string, string> = {
    no_account: "No DFile account found for your Google email. Contact your administrator.",
    pending_activation: "Your account is pending activation. Check your email.",
    tenant_inactive: "Your organization account is inactive. Contact support.",
    google_auth_failed: "Google sign-in was cancelled or denied.",
    invalid_state: "Security check failed. Please try signing in again.",
    google_token_exchange_failed: "Google authentication failed. Please try again.",
    google_userinfo_failed: "Could not retrieve your Google account info. Please try again.",
    google_auth_error: "Google sign-in encountered an error. Please try again.",
    google_token_missing: "Google sign-in failed. Please try again.",
};

export default function GoogleCallbackPage() {
    const router = useRouter();
    const processedRef = useRef(false);

    useEffect(() => {
        if (processedRef.current) return;
        processedRef.current = true;

        const params = new URLSearchParams(window.location.search);
        const token = params.get("token");
        const error = params.get("error");

        if (error || !token) {
            const msg = ERROR_MESSAGES[error ?? ""] ?? "Google sign-in failed. Please try again.";
            router.replace(`/login?error=${encodeURIComponent(msg)}`);
            return;
        }

        localStorage.setItem("dfile_token", token);
        api.get("/api/auth/me")
            .then(({ data }) => {
                const role = (ROLE_ALIASES[data.role as string] ?? (data.role as string) ?? "") as UserRole;
                const userData = { ...data, role };
                localStorage.setItem("dfile_user", JSON.stringify(userData));
                const dest = getDashboardPath(role) ?? "/login";
                window.location.href = dest;
            })
            .catch(() => {
                localStorage.removeItem("dfile_token");
                router.replace("/login?error=" + encodeURIComponent("Google sign-in failed. Please try again."));
            });
    }, [router]);

    return <LoadingScreen message="Completing Google sign-in…" />;
}
