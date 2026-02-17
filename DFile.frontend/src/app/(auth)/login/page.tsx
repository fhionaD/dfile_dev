"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoginPage as LoginPageComponent } from "@/components/login-page";
import { useAuth } from "@/contexts/auth-context";

export default function LoginPage() {
    const { login, isLoggedIn, user, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && isLoggedIn && user) {
            router.push("/dashboard");
        }
    }, [isLoggedIn, user, router, isLoading]);

    if (isLoading) return null;

    return <LoginPageComponent onLogin={login} />;
}
