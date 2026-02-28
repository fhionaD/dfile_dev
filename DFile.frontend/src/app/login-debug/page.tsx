"use client";

import React, { useState } from "react";
import api from "@/lib/api";

export default function LoginDebugPage() {
    const [status, setStatus] = useState<string>("Ready");
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    const testLogin = async () => {
        setStatus("Testing...");
        setResult(null);
        setError(null);

        try {
            console.log("[Debug] Testing login with tenantadmin@dfile.com / admin123");
            const response = await api.post("/api/auth/login", {
                email: "tenantadmin@dfile.com",
                password: "admin123"
            });

            setStatus("Success!");
            setResult(response.data);
            console.log("[Debug] Login Success:", response.data);
        } catch (err: any) {
            setStatus("Failed");
            const msg = err.response?.data?.message || err.message || "Unknown error";
            setError(msg);
            setResult(err.response?.data);
            console.error("[Debug] Login Error:", err);
        }
    };

    return (
        <div className="p-10 font-sans">
            <h1 className="text-2xl font-bold mb-4">Login Diagnostic Tool</h1>
            <p className="mb-4 text-slate-600">
                This page tests the login API directly with known good credentials (<code>tenantadmin@dfile.com</code> / <code>admin123</code>).
            </p>

            <button
                onClick={testLogin}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
                Test Login API
            </button>

            <div className="mt-8 space-y-4">
                <div>
                    <strong>Status:</strong> <span className={status === "Success!" ? "text-green-600 font-bold" : status === "Failed" ? "text-red-600 font-bold" : ""}>{status}</span>
                </div>

                {error && (
                    <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded">
                        <strong>Error Message:</strong> {error}
                    </div>
                )}

                {result && (
                    <div className="mt-4">
                        <strong>Response Data:</strong>
                        <pre className="mt-2 p-4 bg-slate-900 text-slate-100 rounded overflow-auto max-h-96 text-xs">
                            {JSON.stringify(result, null, 2)}
                        </pre>
                    </div>
                )}
            </div>
        </div>
    );
}
