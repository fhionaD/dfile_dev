"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { User } from "@/types/asset";
import { buildApiUrl } from "@/lib/api-base-url";

interface AuthContextType {
    user: User | null;
    token: string | null;
    isLoggedIn: boolean;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Persist login state
    // Persist login state and validate session
    useEffect(() => {
        const initAuth = async () => {
            const storedUser = localStorage.getItem("dfile_user");
            const storedToken = localStorage.getItem("dfile_token");

            if (storedUser && storedToken) {
                try {
                    // 1. Optimistically set state
                    const parsedUser = JSON.parse(storedUser);
                    setUser(parsedUser);
                    setToken(storedToken);
                    setIsLoggedIn(true);

                    // 2. Validate with Backend
                    const res = await fetch(buildApiUrl('/api/auth/me'), {
                        headers: { Authorization: `Bearer ${storedToken}` }
                    });

                    if (!res.ok) {
                        console.warn("[Auth] Session invalid, logging out");
                        logout();
                    } else {
                        // Optional: Update user details from backend if changed
                        // const freshUser = await res.json();
                        // setUser(freshUser);
                    }

                } catch (e) {
                    console.error("Failed to restore session", e);
                    logout();
                }
            }
            setIsLoading(false);
        };

        initAuth();
    }, []);

    const login = async (email: string, password: string) => {
        const targetUrl = buildApiUrl('/api/auth/login');

        console.log(`[Auth] Initiating login to: ${targetUrl}`);

        try {
            const response = await fetch(targetUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            console.log(`[Auth] Response status: ${response.status} ${response.statusText}`);

            if (!response.ok) {
                await response.text();
                throw new Error(`Login failed: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            const userData = data.user;
            const token = data.token;

            setUser(userData);
            setToken(token);
            setIsLoggedIn(true);
            localStorage.setItem("dfile_user", JSON.stringify(userData));
            localStorage.setItem("dfile_token", token);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            // Only log if not a 401 (expected auth failure)
            if (!message.includes("401")) {
                console.error(error);
            }
            throw error;
        }
    };

    const logout = () => {
        setUser(null);
        setToken(null);
        setIsLoggedIn(false);
        localStorage.removeItem("dfile_user");
        localStorage.removeItem("dfile_token");
    };

    return (
        <AuthContext.Provider value={{ user, token, isLoggedIn, isLoading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
