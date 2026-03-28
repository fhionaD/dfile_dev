"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { User, UserRole } from "@/types/asset";
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
                const parsedUser = JSON.parse(storedUser);

                // Guard: if localStorage has a stale schema (e.g. role is a
                // label like "Tenant Administrator" instead of "Admin"), clear it
                // and force re-login rather than driving a redirect loop.
                if (!parsedUser.firstName || !VALID_ROLES.includes(parsedUser.role as UserRole)) {
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
                    const { data: freshUser } = await api.get('/api/auth/me');
                    setUser(freshUser);
                    localStorage.setItem('dfile_user', JSON.stringify(freshUser));
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
            const userData = data.user;
            const token = data.token;

            setUser(userData);
            setToken(token);
            setIsLoggedIn(true);
            localStorage.setItem("dfile_user", JSON.stringify(userData));
            localStorage.setItem("dfile_token", token);
        } catch (error: any) {
            const status: number | undefined = error.response?.status;
            if (!error.response) {
                // No response at all — network unreachable or DNS failure
                throw new Error("Network error — cannot reach the server. Please check your connection and try again.");
            } else if (status !== undefined && status >= 500) {
                throw new Error("Internal server error — the server is currently unavailable. Please try again later.");
            } else {
                // 400 / 401 / 403 — invalid credentials or tenant issue
                const message = error.response?.data?.message || "Invalid email or password. Please try again.";
                throw new Error(message);
            }
        }
    };

    const logout = () => {
        setIsLoggingOut(true);
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
