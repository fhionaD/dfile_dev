"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { User } from "@/types/asset";
import api from "@/lib/api"; // Centralized API client

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

                    // 2. Validate with Backend using our centralized API client
                    await api.get('/api/auth/me');

                    // If we reach here, the token is valid (status 200-299)
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
        try {
            console.log(`[Auth] Initiating login via API client`);

            const response = await api.post('/api/auth/login', { email, password });
            
            console.log(`[Auth] Response status: ${response.status} ${response.statusText}`);

            const data = response.data;
            const userData = data.user;
            const token = data.token;

            setUser(userData);
            setToken(token);
            setIsLoggedIn(true);
            localStorage.setItem("dfile_user", JSON.stringify(userData));
            localStorage.setItem("dfile_token", token);
        } catch (error: any) {
            // Handle Axios error structure
            const message = error.response?.data?.message || error.message || "Login failed";
            console.error(`[Auth] Login error: ${message}`);
            throw new Error(message);
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
