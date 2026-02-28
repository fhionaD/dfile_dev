"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { LoginPage as LoginPageComponent } from "@/components/login-page";
import { useAuth } from "@/contexts/auth-context";

export default function LoginPage() {
    const { login, isLoggedIn, user, isLoading } = useAuth();
    const router = useRouter();
    const hasRedirected = useRef(false);

    useEffect(() => {
        if (!isLoading && isLoggedIn && user && !hasRedirected.current) {
            hasRedirected.current = true;
            router.replace("/dashboard");
        }
    }, [isLoggedIn, user, isLoading]); // eslint-disable-line react-hooks/exhaustive-deps

    if (isLoading) return null;

    return <LoginPageComponent onLogin={login} />;
}
