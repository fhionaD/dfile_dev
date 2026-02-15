"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { useAuth } from "@/contexts/auth-context";

export default function LoginPage() {
    const { login, isLoggedIn, user } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (isLoggedIn && user) {
            router.push("/dashboard");
        }
    }, [isLoggedIn, user, router]);

    return (
        <div className="min-h-screen grid items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
            <div className="w-full max-w-md bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl">
                <LoginForm onLogin={(user) => {
                    login(user);
                    // The useEffect will handle the redirect
                }} />
            </div>
        </div>
    );
}
