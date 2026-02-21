"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check, Eye, EyeOff, Lock, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardTitle, CardHeader, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

enum SubscriptionPlanType {
    Starter = 0,
    Basic = 1,
    Pro = 2
}

const plans = [
    {
        id: SubscriptionPlanType.Starter,
        name: "Starter",
        price: "Free",
        features: [
            "Max Rooms: 20",
            "Max Personnel: 10",
            "Asset Tracking: Full",
            "Depreciation: Able",
            "Maintenance Module: No",
            "Reports: Standard"
        ]
    },
    {
        id: SubscriptionPlanType.Basic,
        name: "Basic",
        price: "₱1,499/mo",
        features: [
            "Max Rooms: 100",
            "Max Personnel: 30",
            "Asset Tracking: Full",
            "Depreciation: Able",
            "Maintenance Module: Able",
            "Reports: Standard"
        ]
    },
    {
        id: SubscriptionPlanType.Pro,
        name: "Pro",
        price: "₱4,999/mo",
        features: [
            "Max Rooms: 200",
            "Max Personnel: 200",
            "Asset Tracking: Full",
            "Depreciation: Able",
            "Maintenance Module: Able",
            "Reports: Able (Advanced)"
        ]
    }
];

export function TenantRegistrationForm() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlanType>(SubscriptionPlanType.Starter);
    
    // Organization Details
    const [tenantName, setTenantName] = useState("");

    // Admin Details
    const [firstName, setFirstName] = useState("");
    const [middleName, setMiddleName] = useState("");
    const [lastName, setLastName] = useState("");
    const [workEmail, setWorkEmail] = useState("");
    const [contactNumber, setContactNumber] = useState("");
    const [initialPassword, setInitialPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [success, setSuccess] = useState(false);

    const handleContactChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        if (value === "") {
            setContactNumber(value);
            return;
        }

        // Only allow digits
        if (!/^\d+$/.test(value)) return;

        // Strict prefix check: must start with 09
        if (value.length >= 1 && value[0] !== '0') return;
        if (value.length >= 2 && value[1] !== '9') return;

        if (value.length <= 11) {
            setContactNumber(value);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setErrors({});

        const newErrors: Record<string, string> = {};

        if (contactNumber && contactNumber.length !== 11) {
            newErrors.contactNumber = "Contact number must be exactly 11 digits starting with 09 (e.g., 09123456789)";
        }

        if (initialPassword !== confirmPassword) {
            newErrors.confirmPassword = "Passwords do not match";
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            setIsLoading(false);
            return;
        }

        // UI-only as requested for mock
        console.log("Submitting Tenant Creation:", {
            tenantName,
            admin: {
                firstName,
                middleName,
                lastName,
                workEmail,
                contactNumber,
                initialPassword
            },
            plan: selectedPlan
        });

        // Simulate network delay and success
        setTimeout(() => {
            setIsLoading(false);
            setSuccess(true);
            
            // Auto hide success message and reset form after 3 seconds
            setTimeout(() => {
                setSuccess(false);
                resetForm();
            }, 3000);
        }, 1500);
    };

    const resetForm = () => {
        setTenantName("");
        setFirstName("");
        setMiddleName("");
        setLastName("");
        setWorkEmail("");
        setContactNumber("");
        setInitialPassword("");
        setConfirmPassword("");
        setSelectedPlan(SubscriptionPlanType.Starter);
    };

    if (success) {
        return (
            <div className="flex flex-col items-center justify-center p-8 space-y-4 text-center bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                    <Check className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold text-green-800 dark:text-green-300">Tenant Created Successfully</h3>
                <p className="text-green-700 dark:text-green-400">The tenant organization and admin account have been set up.</p>
                <Button onClick={() => setSuccess(false)} variant="outline" className="mt-4">Create Another</Button>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-8">
            {/* Organization Details Section */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b">
                     <h3 className="text-lg font-semibold text-foreground">Organization Details</h3>
                </div>
                
                <div className="grid gap-2">
                    <Label htmlFor="tenantName">Organization / Tenant Name <span className="text-red-500">*</span></Label>
                    <Input 
                        id="tenantName" 
                        placeholder="e.g. Acme Corporation" 
                        value={tenantName}
                        onChange={(e) => setTenantName(e.target.value)}
                        required
                        className="h-10"
                    />
                </div>
            </div>

            {/* Admin User Section */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b pt-4">
                     <h3 className="text-lg font-semibold text-foreground">Tenant Admin Account</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="firstName">First Name <span className="text-red-500">*</span></Label>
                        <Input 
                            id="firstName" 
                            placeholder="e.g. John" 
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            required
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="middleName">Middle Name <span className="text-muted-foreground text-xs font-normal">(Optional)</span></Label>
                        <Input 
                            id="middleName" 
                            placeholder="" 
                            value={middleName}
                            onChange={(e) => setMiddleName(e.target.value)}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="lastName">Last Name <span className="text-red-500">*</span></Label>
                        <Input 
                            id="lastName" 
                            placeholder="e.g. Doe" 
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            required
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                    <div className="grid gap-2">
                        <Label htmlFor="workEmail">Work Email <span className="text-red-500">*</span></Label>
                        <Input 
                            id="workEmail" 
                            type="email" 
                            placeholder="admin@organization.com" 
                            value={workEmail}
                            onChange={(e) => setWorkEmail(e.target.value)}
                            required
                        />
                    </div>
                     <div className="grid gap-2 relative">
                        <Label htmlFor="contactNumber">Contact Number</Label>
                        <div className="relative">
                            <Input 
                                id="contactNumber" 
                                placeholder="(Optional) 0912-345-6789" 
                                value={contactNumber}
                                onChange={handleContactChange}
                                className="pl-10 h-10"
                            />
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        </div>
                        <p className="text-[10px] text-muted-foreground text-right">{contactNumber.length}/11</p>
                        {errors.contactNumber && (
                            <p className="text-xs text-destructive font-medium absolute -bottom-4 right-0">{errors.contactNumber}</p>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="initialPassword">Initial Password <span className="text-red-500">*</span></Label>
                        <div className="relative">
                            <Input 
                                id="initialPassword" 
                                type={showPassword ? "text" : "password"}
                                placeholder="Min 6 characters" 
                                value={initialPassword}
                                onChange={(e) => setInitialPassword(e.target.value)}
                                required
                                minLength={6}
                                className="pr-10"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                        </div>
                    </div>

                    <div className="grid gap-2 relative">
                        <Label htmlFor="confirmPassword">Confirm Password <span className="text-red-500">*</span></Label>
                        <div className="relative">
                            <Input 
                                id="confirmPassword" 
                                type={showConfirmPassword ? "text" : "password"}
                                placeholder="Confirm password" 
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                className="pr-10"
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                                {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                        </div>
                        {errors.confirmPassword && (
                            <p className="text-xs text-destructive font-medium absolute -bottom-5 left-0">{errors.confirmPassword}</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Plan Selection Section */}
            <div className="space-y-4 pt-4">
                 <div className="flex items-center gap-2 pb-2 border-b">
                     <h3 className="text-lg font-semibold text-foreground">Subscription Plan</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {plans.map((plan) => (
                        <Card 
                            key={plan.id}
                            className={cn(
                                "cursor-pointer transition-all border-2 relative overflow-hidden",
                                selectedPlan === plan.id 
                                    ? "border-primary bg-primary/5 shadow-md scale-[1.01]" 
                                    : "border-muted hover:border-primary/50 hover:shadow-sm"
                            )}
                            onClick={() => setSelectedPlan(plan.id)}
                        >
                            {selectedPlan === plan.id && (
                                <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-3 py-1 text-xs font-bold rounded-bl-md z-10">
                                    SELECTED
                                </div>
                            )}
                            <CardHeader className="p-4 pb-2">
                                <CardTitle className="text-lg font-semibold text-left">
                                    {plan.name}
                                </CardTitle>
                                <CardDescription className="text-2xl font-bold text-primary mt-1 text-left">
                                    {plan.price}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-4 pt-0">
                                <ul className="space-y-2">
                                    {plan.features.map((feature, i) => (
                                        <li key={i} className="flex items-start gap-2 text-muted-foreground text-xs font-normal text-left">
                                            <Check className="h-4 w-4 text-green-500 shrink-0" />
                                            <span>{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>

            <div className="flex justify-end pt-4">
                <Button type="submit" size="lg" disabled={isLoading} className="min-w-[150px]">
                    {isLoading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating Tenant...
                        </>
                    ) : (
                        "Create Tenant"
                    )}
                </Button>
            </div>
        </form>
    );
}
