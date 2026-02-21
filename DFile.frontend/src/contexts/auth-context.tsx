"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { User } from "@/types/asset";

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
                    let apiBase = process.env.NEXT_PUBLIC_API_URL || '';
                    const res = await fetch(`${apiBase}/api/auth/me`, {
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
        // Use relative paths when API_URL is empty (backend serves frontend and API)
        // For separate deployment, set NEXT_PUBLIC_API_URL to backend origin
        // Fallback for local development if environment variable is missing
        let apiBase = process.env.NEXT_PUBLIC_API_URL;
        if (!apiBase && typeof window !== 'undefined' && window.location.hostname === 'localhost') {
             apiBase = 'http://localhost:5090'; // Default backend port
        }
        apiBase = apiBase || '';
        
        const targetUrl = `${apiBase}/api/auth/login`.replace(/([^:]\/)\/+/g, "$1"); // Remove double slashes

        console.log(`[Auth] Initiating login to: ${targetUrl}`);

        try {
            const response = await fetch(targetUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            console.log(`[Auth] Response status: ${response.status} ${response.statusText}`);

            if (!response.ok) {
                // Try to parse error message
                let errorMessage = `Login failed: ${response.status} ${response.statusText}`;
                try {
                    const errorJson = await response.json();
                    if (errorJson && errorJson.message) {
                        errorMessage = errorJson.message;
                    }
                } catch (e) { } // Ignore JSON parse error
                
                throw new Error(errorMessage);
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
            console.error(message);
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
