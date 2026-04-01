"use client";

import { useState, useMemo } from "react";
import api from "@/lib/api";
import { 
    Loader2, Check, Eye, EyeOff, Lock, Phone, 
    Mail, User, Building2, ShieldCheck, ChevronRight,
    CircleDashed, Shield
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function EnhancedTenantForm() {
    const [isLoading, setIsLoading] = useState(false);
    const [tenantName, setTenantName] = useState("");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [workEmail, setWorkEmail] = useState("");
    const [contactNumber, setContactNumber] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    // Password Validation Criteria
    const requirements = useMemo(() => [
        { label: "8+ Chars", test: (p: string) => p.length >= 8 },
        { label: "Uppercase", test: (p: string) => /[A-Z]/.test(p) },
        { label: "Number", test: (p: string) => /[0-9]/.test(p) },
        { label: "Special", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
    ], []);

    const metCount = requirements.filter(r => r.test(password)).length;

    return (
        <div className="flex min-h-screen bg-white">
            {/* LEFT SIDE: HERO SECTION */}
            <div className="hidden lg:flex w-1/3 bg-[#0a192f] p-12 flex-col justify-between text-white relative overflow-hidden">
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-12">
                        <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center font-bold">D</div>
                        <span className="text-xl font-bold tracking-tight">DFILE</span>
                    </div>
                    <h1 className="text-4xl font-bold leading-tight mb-6">
                        Manage assets, <br />
                        <span className="text-blue-400">empower teams.</span>
                    </h1>
                    <p className="text-slate-400 text-lg max-w-sm">
                        Create your organization and start tracking your enterprise assets in minutes.
                    </p>
                </div>
                
                <div className="relative z-10 p-6 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm">
                    <p className="text-sm italic text-slate-300">
                        "This platform transformed how we handle our inventory across 50+ locations."
                    </p>
                    <p className="text-xs mt-4 text-slate-500 font-semibold">— ENTERPRISE ASSET MANAGEMENT</p>
                </div>

                {/* Abstract Background Decoration */}
                <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-blue-600/20 rounded-full blur-3xl"></div>
            </div>

            {/* RIGHT SIDE: THE FORM */}
            <div className="flex-1 flex flex-col justify-center items-center p-8 lg:p-20 bg-slate-50/30">
                <div className="w-full max-w-xl">
                    <div className="mb-10">
                        <h2 className="text-3xl font-bold text-slate-900">Create your organization</h2>
                        <p className="text-slate-500 mt-2">Register as a tenant admin to get started.</p>
                        
                        {/* Progress Tracker Mini */}
                        <div className="flex gap-4 mt-6">
                            <div className="flex items-center gap-2 text-blue-600 font-semibold text-sm">
                                <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">1</span>
                                Account
                            </div>
                            <div className="h-[1px] w-8 bg-slate-200 self-center"></div>
                            <div className="text-slate-400 text-sm flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full border border-slate-200 flex items-center justify-center text-[10px]">2</span>
                                Org
                            </div>
                        </div>
                    </div>

                    <form className="space-y-8">
                        {/* Section: Organization */}
                        <div className="space-y-4">
                            <Label className="text-xs uppercase tracking-widest text-slate-500 font-bold">Organization Details</Label>
                            <div className="relative group">
                                <Building2 className="absolute left-3 top-3 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                                <Input 
                                    placeholder="Organization Name" 
                                    className="pl-10 h-12 bg-white border-slate-200 focus:ring-blue-500 shadow-sm"
                                    value={tenantName}
                                    onChange={e => setTenantName(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Section: Admin Account */}
                        <div className="space-y-4">
                            <Label className="text-xs uppercase tracking-widest text-slate-500 font-bold">Admin Account</Label>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <Input placeholder="First Name" className="h-12 bg-white" />
                                <Input placeholder="Last Name" className="h-12 bg-white" />
                            </div>

                            <div className="relative">
                                <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                                <Input placeholder="Work Email" className="pl-10 h-12 bg-white" />
                            </div>

                            {/* Aligned Password Grid */}
                            <div className="grid grid-cols-2 gap-4 items-start">
                                <div className="space-y-2">
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                                        <Input 
                                            type={showPassword ? "text" : "password"}
                                            placeholder="Password" 
                                            className="pl-10 h-12 bg-white"
                                            value={password}
                                            onChange={e => setPassword(e.target.value)}
                                        />
                                        <button 
                                            type="button" 
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                                        >
                                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="relative">
                                        <Shield className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                                        <Input 
                                            type="password"
                                            placeholder="Confirm" 
                                            className={cn(
                                                "pl-10 h-12 bg-white transition-all",
                                                confirmPassword && password !== confirmPassword ? "border-red-300 ring-red-50" : ""
                                            )}
                                            value={confirmPassword}
                                            onChange={e => setConfirmPassword(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Clean Requirements UI */}
                            <div className="p-4 bg-slate-100/50 rounded-xl border border-slate-100">
                                <div className="flex justify-between items-center mb-3">
                                    <span className="text-xs font-semibold text-slate-600 uppercase">Password Security</span>
                                    <span className="text-xs font-bold text-blue-600">{Math.round((metCount / 4) * 100)}%</span>
                                </div>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                                    {requirements.map((req, i) => {
                                        const met = req.test(password);
                                        return (
                                            <div key={i} className="flex items-center gap-2">
                                                <div className={cn(
                                                    "w-4 h-4 rounded-full flex items-center justify-center transition-all",
                                                    met ? "bg-green-500 scale-110" : "bg-slate-200"
                                                )}>
                                                    {met && <Check className="text-white w-2.5 h-2.5" strokeWidth={4} />}
                                                </div>
                                                <span className={cn("text-[11px] font-medium transition-colors", met ? "text-slate-900" : "text-slate-400")}>
                                                    {req.label}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        <Button className="w-full h-12 bg-[#0a192f] hover:bg-[#162d4d] text-white font-bold rounded-xl shadow-lg shadow-blue-900/10 transition-all flex items-center justify-center gap-2">
                            Continue to Organization
                            <ChevronRight size={18} />
                        </Button>

                        <p className="text-center text-sm text-slate-500">
                            Already have an account? <a href="#" className="text-blue-600 font-bold hover:underline">Sign in</a>
                        </p>
                    </form>
                </div>
            </div>
        </div>
    );
}