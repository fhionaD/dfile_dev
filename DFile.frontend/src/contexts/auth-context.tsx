"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { User, UserRole } from "@/types/asset";

interface AuthContextType {
    user: User | null;
    isLoggedIn: boolean;
    login: (user: User) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    // Persist login state (optional, for demo purposes using localStorage)
    useEffect(() => {
        const storedUser = localStorage.getItem("dfile_user");
        if (storedUser) {
            try {
                setUser(JSON.parse(storedUser));
                setIsLoggedIn(true);
            } catch (e) {
                console.error("Failed to parse stored user", e);
            }
        }
    }, []);

    const login = (newUser: User) => {
        setUser(newUser);
        setIsLoggedIn(true);
        localStorage.setItem("dfile_user", JSON.stringify(newUser));
    };

    const logout = () => {
        setUser(null);
        setIsLoggedIn(false);
        localStorage.removeItem("dfile_user");
    };

    return (
        <AuthContext.Provider value={{ user, isLoggedIn, login, logout }}>
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
