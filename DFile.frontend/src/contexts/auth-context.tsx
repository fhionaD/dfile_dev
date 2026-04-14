"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { User, UserRole } from "@/types/asset";
import axios from "axios";
import api from "@/lib/api"; // Centralized API client

interface AuthContextType {
    user: User | null;
    token: string | null;
    isLoggedIn: boolean;
    isLoading: boolean;
    isLoggingOut: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
}

const VALID_ROLES: UserRole[] = ["Super Admin", "Admin", "Finance", "Maintenance"];

/** Map legacy / display role names from the API to the canonical UserRole used for routing. */
const ROLE_ALIASES: Record<string, UserRole> = {
    "Finance Manager": "Finance",
    "Maintenance Manager": "Maintenance",
};

function toCanonicalUserRole(role: unknown): UserRole | null {
    if (typeof role !== "string") return null;
    const aliased = ROLE_ALIASES[role];
    if (aliased) return aliased;
    return VALID_ROLES.includes(role as UserRole) ? (role as UserRole) : null;
}

function normalizeStoredUser(raw: Record<string, unknown>): User | null {
    const role = toCanonicalUserRole(raw.role);
    if (!role) return null;
    return { ...(raw as unknown as User), role };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    // Persist login state
    // Persist login state and validate session
    useEffect(() => {
        const initAuth = async () => {
            const storedUser = localStorage.getItem("dfile_user");
            const storedToken = localStorage.getItem("dfile_token");

            if (storedUser && storedToken) {
                // 1. Restore from localStorage immediately — this makes the page
                //    render instantly without waiting for a network round-trip.
                const parsed = JSON.parse(storedUser) as Record<string, unknown>;
                const parsedUser = normalizeStoredUser(parsed);

                // Guard: if localStorage has a stale schema (e.g. unknown role), clear it
                // and force re-login rather than driving a redirect loop.
                if (!parsed.firstName || !parsedUser) {
                    localStorage.removeItem("dfile_user");
                    localStorage.removeItem("dfile_token");
                    setIsLoading(false);
                    return;
                }

                setUser(parsedUser);
                setToken(storedToken);
                setIsLoggedIn(true);
                setIsLoading(false); // ← unblock rendering NOW

                // 2. Background re-validation: refresh user from backend.
                //    Runs silently after the page is already visible.
                try {
                    const { data: freshRaw } = await api.get<User>('/api/auth/me');
                    const freshUser = normalizeStoredUser({ ...freshRaw } as Record<string, unknown>);
                    if (freshUser) {
                        setUser(freshUser);
                        localStorage.setItem('dfile_user', JSON.stringify(freshUser));
                    }
                } catch (error: any) {
                    const status: number | undefined = error?.response?.status;
                    if (status === 401 || status === 403) {
                        // Token is genuinely invalid or expired — force re-login
                        logout();
                    }
                    // Any other error (network, 5xx, timeout) → keep optimistic session
                }
            } else {
                setIsLoading(false);
            }
        };

        initAuth();
    }, []);

    const login = async (email: string, password: string) => {
        try {
            const response = await api.post(
                "/api/auth/login",
                { email, password },
                { skipAuthHeader: true, suppressGlobalError: true }
            );
            const data = response.data;
            const userData = normalizeStoredUser(data.user as Record<string, unknown>);
            const token = data.token;

            if (!userData) {
                throw new Error("Invalid account role. Please contact support.");
            }

            setUser(userData);
            setToken(token);
            setIsLoggedIn(true);
            localStorage.setItem("dfile_user", JSON.stringify(userData));
            localStorage.setItem("dfile_token", token);
        } catch (error: unknown) {
            // Thrown above (e.g. invalid role) is a normal Error — not an Axios failure; do not map to "cannot reach API".
            if (!axios.isAxiosError(error)) {
                throw error instanceof Error
                    ? error
                    : new Error("Sign-in failed. Please try again.");
            }
            if (error.code === "ECONNABORTED" || String(error.message || "").toLowerCase().includes("timeout")) {
                throw new Error(
                    "Request timed out — the API or database may be slow or unreachable. Check that dotnet run is up and SQL Server is running, then try again."
                );
            }
            const status: number | undefined = error.response?.status;
            if (!error.response) {
                // No response at all — wrong API URL, backend down, mixed content (https page → http API), or firewall
                throw new Error(
                    "Could not reach the API. Run `dotnet run` in DFile.backend (listening on http://127.0.0.1:5090). " +
                    "With `npm run dev`, /api is proxied to that address. Check DevTools → Network for /api/auth/login."
                );
            } else if (status !== undefined && status >= 500) {
                throw new Error("Internal server error — the server is currently unavailable. Please try again later.");
            } else {
                // 400 / 401 / 403 — invalid credentials or tenant issue
                const data = error.response?.data as { message?: string } | undefined;
                const message = (typeof data?.message === "string" && data.message) || "Invalid email or password. Please try again.";
                throw new Error(message);
            }
        }
    };

    const logout = () => {
        setIsLoggingOut(true);
        // Clear all cached queries immediately to prevent stale data being used after logout
        try {
            // Get the global query client from the window object if available
            const queryClient = (window as any).__queryClient;
            if (queryClient?.clear) {
                queryClient.clear();
            }
        } catch (e) {
            // Fallback: clear localStorage caches manually
            if (typeof window !== "undefined") {
                Object.keys(localStorage).forEach((key) => {
                    if (key.startsWith("dfile_")) {
                        localStorage.removeItem(key);
                    }
                });
            }
        }
        
        // Brief delay so the loading screen is visible before state wipes
        setTimeout(() => {
            setUser(null);
            setToken(null);
            setIsLoggedIn(false);
            setIsLoggingOut(false);
            localStorage.removeItem("dfile_user");
            localStorage.removeItem("dfile_token");
        }, 800);
    };

    return (
        <AuthContext.Provider value={{ user, token, isLoggedIn, isLoading, isLoggingOut, login, logout }}>
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
