"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

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
        price: "$29/mo",
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
        price: "$99/mo",
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
    const [requirePasswordReset, setRequirePasswordReset] = useState(true);
    const [emailVerified, setEmailVerified] = useState(true);

    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        // UI-only as requested for mock
        console.log("Submitting Tenant Creation:", {
            tenantName,
            admin: {
                firstName,
                middleName,
                lastName,
                workEmail,
                contactNumber,
                initialPassword,
                requirePasswordReset,
                emailVerified
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
        setRequirePasswordReset(true);
        setEmailVerified(true);
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
                    <Label htmlFor="tenantName">Organization / Tenant Name</Label>
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
                     <Badge variant="secondary" className="text-xs">Initial User</Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="firstName">First Name <span className="text-red-500">*</span></Label>
                        <Input 
                            id="firstName" 
                            placeholder="Data" 
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
                            placeholder="File" 
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            required
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="workEmail">Work Email</Label>
                        <Input 
                            id="workEmail" 
                            type="email" 
                            placeholder="admin@organization.com" 
                            value={workEmail}
                            onChange={(e) => setWorkEmail(e.target.value)}
                            required
                        />
                    </div>
                     <div className="grid gap-2">
                        <Label htmlFor="contactNumber">Contact Number</Label>
                        <Input 
                            id="contactNumber" 
                            placeholder="+1 (555) 000-0000" 
                            value={contactNumber}
                            onChange={(e) => setContactNumber(e.target.value)}
                        />
                    </div>
                </div>

                <div className="grid gap-2 max-w-md">
                    <Label htmlFor="initialPassword">Initial Password</Label>
                    <Input 
                        id="initialPassword" 
                        type="password" 
                        placeholder="Min 6 characters" 
                        value={initialPassword}
                        onChange={(e) => setInitialPassword(e.target.value)}
                        required
                        minLength={6}
                    />
                </div>

                <div className="flex flex-col gap-3 pt-2">
                    <div className="flex items-center space-x-2">
                        <Checkbox 
                            id="requireReset" 
                            checked={requirePasswordReset}
                            onCheckedChange={(c) => setRequirePasswordReset(c as boolean)}
                        />
                        <Label htmlFor="requireReset" className="font-normal cursor-pointer">Require Password Reset on First Login</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Checkbox 
                            id="emailVerified" 
                            checked={emailVerified}
                            onCheckedChange={(c) => setEmailVerified(c as boolean)}
                        />
                        <Label htmlFor="emailVerified" className="font-normal cursor-pointer">Email Verified</Label>
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
                            <CardHeader className="pb-3">
                                <CardTitle className="flex justify-between items-center text-base">
                                    {plan.name}
                                </CardTitle>
                                <CardDescription className="text-2xl font-bold text-primary">
                                    {plan.price}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-2 pt-0">
                                <ul className="text-sm space-y-2">
                                    {plan.features.map((feature, i) => (
                                        <li key={i} className="flex items-start gap-2 text-muted-foreground text-xs">
                                            <Check className="h-3.5 w-3.5 text-green-500 shrink-0 mt-0.5" />
                                            <span>{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>

            {error && (
                <div className="p-3 bg-red-100 border border-red-200 text-red-700 rounded-md text-sm dark:bg-red-900/20 dark:border-red-800 dark:text-red-300">
                    <p className="font-semibold">Error</p>
                    <p>{error}</p>
                </div>
            )}

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
