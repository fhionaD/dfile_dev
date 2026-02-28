"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { User, TenantSubscription } from "@/types/asset";
import api from "@/lib/api"; // Centralized API client

interface AuthContextType {
    user: User | null;
    token: string | null;
    tenant: TenantSubscription | null;
    isLoggedIn: boolean;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
    refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [tenant, setTenant] = useState<TenantSubscription | null>(null);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const logout = () => {
        setUser(null);
        setToken(null);
        setTenant(null);
        setIsLoggedIn(false);
        localStorage.removeItem("dfile_user");
        localStorage.removeItem("dfile_token");
        localStorage.removeItem("dfile_tenant");
    };

    const refreshSession = async () => {
        const storedToken = localStorage.getItem("dfile_token");
        if (!storedToken) return;

        try {
            const response = await api.get('/api/auth/me');
            // The /api/auth/me endpoint returns the user properties at the root level
            // but the Login endpoint returns them inside a 'user' property.
            // We'll normalize this here.
            const updatedUserData = {
                id: response.data.id,
                name: response.data.name,
                email: response.data.email,
                role: response.data.role,
                roleLabel: response.data.roleLabel,
                tenantId: response.data.tenantId,
                mustChangePassword: response.data.mustChangePassword
            };

            setUser(updatedUserData);
            localStorage.setItem("dfile_user", JSON.stringify(updatedUserData));

            if (response.data.tenant) {
                setTenant(response.data.tenant);
                localStorage.setItem("dfile_tenant", JSON.stringify(response.data.tenant));
            }
        } catch (e) {
            console.error("Failed to refresh session", e);
            logout();
        }
    };

    // Listen for session-expired events from the Axios 401 interceptor
    useEffect(() => {
        const handleExpired = () => {
            console.warn("[Auth] Session expired — logging out");
            setUser(null);
            setToken(null);
            setTenant(null);
            setIsLoggedIn(false);
        };
        window.addEventListener("auth:session-expired", handleExpired);
        return () => window.removeEventListener("auth:session-expired", handleExpired);
    }, []);

    // Persist login state and validate session
    useEffect(() => {
        const initAuth = async () => {
            const storedUser = localStorage.getItem("dfile_user");
            const storedToken = localStorage.getItem("dfile_token");
            const storedTenant = localStorage.getItem("dfile_tenant");

            if (storedUser && storedToken) {
                try {
                    // 1. Optimistically set state
                    const parsedUser = JSON.parse(storedUser);
                    setUser(parsedUser);
                    setToken(storedToken);
                    setIsLoggedIn(true);
                    if (storedTenant) {
                        setTenant(JSON.parse(storedTenant));
                    }

                    // 2. Validate with Backend using our centralized API client
                    const response = await api.get('/api/auth/me');

                    // Update user data with latest from server (including mustChangePassword)
                    const updatedUser = { ...parsedUser, mustChangePassword: response.data.mustChangePassword };
                    setUser(updatedUser);
                    localStorage.setItem("dfile_user", JSON.stringify(updatedUser));

                    // Update tenant data from server (in case limits changed)
                    if (response.data.tenant) {
                        setTenant(response.data.tenant);
                        localStorage.setItem("dfile_tenant", JSON.stringify(response.data.tenant));
                    }

                    // If we reach here, the token is valid (status 200-299)
                } catch (e: any) {
                    // 401 is expected when the stored token has expired — just log out quietly
                    if (e?.response?.status === 401) {
                        console.info("[Auth] Stored token expired — logging out");
                    } else {
                        console.error("[Auth] Failed to restore session", e);
                    }
                    logout();
                }
            }
            setIsLoading(false);
        };

        initAuth();
    }, []);

    const login = async (email: string, password: string) => {
        try {
            console.log(`[Auth] Initiating login via API client`);

            const response = await api.post('/api/auth/login', { email, password });

            console.log(`[Auth] Response status: ${response.status} ${response.statusText}`);

            const data = response.data;
            const userData = { ...data.user, mustChangePassword: data.mustChangePassword };
            const tokenValue = data.token;
            const tenantData = data.tenant;

            setUser(userData);
            setToken(tokenValue);
            setTenant(tenantData || null);
            setIsLoggedIn(true);

            console.log(`[Auth] Login Successful: ${userData.email}, MustChangePassword: ${userData.mustChangePassword}`);

            localStorage.setItem("dfile_user", JSON.stringify(userData));
            localStorage.setItem("dfile_token", tokenValue);
            if (tenantData) {
                localStorage.setItem("dfile_tenant", JSON.stringify(tenantData));
            } else {
                localStorage.removeItem("dfile_tenant");
            }
        } catch (error: any) {
            // Handle Axios error structure
            const message = error.response?.data?.message || error.message || "Login failed";
            console.error(`[Auth] Login error: ${message}`);
            throw new Error(message);
        }
    };

    return (
        <AuthContext.Provider value={{ user, token, tenant, isLoggedIn, isLoading, login, logout, refreshSession }}>
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
