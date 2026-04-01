"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { Loader2, Check, Eye, EyeOff, Phone, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardTitle, CardHeader, CardDescription } from "@/components/ui/card";

enum SubscriptionPlanType {
    Starter = 0,
    Basic = 1,
    Pro = 2,
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
            "Reports: Standard",
        ],
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
            "Reports: Standard",
        ],
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
            "Reports: Able (Advanced)",
        ],
    },
];

const STEPS = ["Account", "Organization", "Plan"] as const;

const EMAIL_LIKE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type AvailabilityResponse = { available: boolean; message?: string };

function parseApiErrorMessage(data: unknown): string {
    if (typeof data === "string") return data;
    if (data && typeof data === "object" && "message" in data) {
        const m = (data as { message?: unknown }).message;
        if (typeof m === "string") return m;
    }
    return "Something went wrong. Please try again.";
}

async function fetchRegisterAvailability(email: string, tenantName?: string): Promise<AvailabilityResponse> {
    const params: Record<string, string> = { email: email.trim() };
    const t = tenantName?.trim();
    if (t) params.tenantName = t;
    const { data } = await api.get<AvailabilityResponse>("/api/Tenants/register/availability", { params });
    return data;
}

export function TenantRegistrationWizard() {
    const [step, setStep] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlanType>(SubscriptionPlanType.Starter);

    const [tenantName, setTenantName] = useState("");
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
    const [checkingAvailability, setCheckingAvailability] = useState(false);
    const [emailHint, setEmailHint] = useState<"idle" | "checking" | "available" | "taken">("idle");

    const handleContactChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        if (value === "") {
            setContactNumber(value);
            return;
        }
        if (!/^\d+$/.test(value)) return;
        if (value.length >= 1 && value[0] !== "0") return;
        if (value.length >= 2 && value[1] !== "9") return;
        if (value.length <= 11) setContactNumber(value);
    };

    const validateStep0 = (): boolean => {
        const next: Record<string, string> = {};
        if (!workEmail.trim()) next.workEmail = "Work email is required";
        if (!initialPassword || initialPassword.length < 6)
            next.initialPassword = "Password must be at least 6 characters";
        if (initialPassword !== confirmPassword) next.confirmPassword = "Passwords do not match";
        setErrors(next);
        return Object.keys(next).length === 0;
    };

    const validateStep1 = (): boolean => {
        const next: Record<string, string> = {};
        if (!tenantName.trim()) next.tenantName = "Organization name is required";
        if (!firstName.trim()) next.firstName = "First name is required";
        if (!lastName.trim()) next.lastName = "Last name is required";
        if (contactNumber && contactNumber.length !== 11)
            next.contactNumber =
                "Contact number must be exactly 11 digits starting with 09 (e.g., 09123456789)";
        setErrors(next);
        return Object.keys(next).length === 0;
    };

    useEffect(() => {
        if (step !== 0) {
            setEmailHint("idle");
            return;
        }
        const trimmed = workEmail.trim();
        if (!trimmed || !EMAIL_LIKE.test(trimmed)) {
            setEmailHint("idle");
            return;
        }

        setEmailHint("checking");
        let ignore = false;
        const id = window.setTimeout(() => {
            void (async () => {
                try {
                    const data = await fetchRegisterAvailability(trimmed);
                    if (ignore) return;
                    if (!data.available) {
                        setEmailHint("taken");
                        setErrors((prev) => ({
                            ...prev,
                            workEmail: data.message ?? "This email cannot be used for a new organization.",
                        }));
                    } else {
                        setEmailHint("available");
                        setErrors((prev) => {
                            if (!prev.workEmail) return prev;
                            const next = { ...prev };
                            delete next.workEmail;
                            return next;
                        });
                    }
                } catch {
                    if (!ignore) setEmailHint("idle");
                }
            })();
        }, 450);

        return () => {
            ignore = true;
            window.clearTimeout(id);
        };
    }, [workEmail, step]);

    const goNext = async () => {
        if (step === 0) {
            setErrors({});
            if (!validateStep0()) return;
            setCheckingAvailability(true);
            try {
                const data = await fetchRegisterAvailability(workEmail);
                if (!data.available) {
                    setErrors({
                        workEmail: data.message ?? "This email cannot be used for a new organization.",
                    });
                    setEmailHint("taken");
                    return;
                }
                setEmailHint("available");
                setStep(1);
            } catch (err: unknown) {
                const data = (err as { response?: { data?: unknown } }).response?.data;
                setErrors({ workEmail: parseApiErrorMessage(data) });
            } finally {
                setCheckingAvailability(false);
            }
            return;
        }

        if (step === 1) {
            setErrors({});
            if (!validateStep1()) return;
            setCheckingAvailability(true);
            try {
                const data = await fetchRegisterAvailability(workEmail, tenantName);
                if (!data.available) {
                    const msg = data.message ?? "Not available.";
                    const lower = msg.toLowerCase();
                    if (lower.includes("email") || lower.includes("sign in")) {
                        setErrors({ workEmail: msg });
                        setStep(0);
                        setEmailHint("taken");
                    } else {
                        setErrors({ tenantName: msg });
                    }
                    return;
                }
                setStep(2);
            } catch (err: unknown) {
                const data = (err as { response?: { data?: unknown } }).response?.data;
                setErrors({ submit: parseApiErrorMessage(data) });
            } finally {
                setCheckingAvailability(false);
            }
            return;
        }

        setStep((s) => Math.min(s + 1, 2));
    };

    const goBack = () => {
        setErrors({});
        setStep((s) => Math.max(s - 1, 0));
    };

    const handleSubmit = async () => {
        if (!validateStep0()) {
            setStep(0);
            return;
        }
        if (!validateStep1()) {
            setStep(1);
            return;
        }
        setIsLoading(true);
        setErrors({});
        try {
            await api.post("/api/Tenants/register", {
                tenantName,
                adminFirstName: firstName,
                adminLastName: lastName,
                adminEmail: workEmail,
                adminPassword: initialPassword,
                subscriptionPlan: selectedPlan,
            });
            setIsLoading(false);
            setSuccess(true);
        } catch (err: unknown) {
            setIsLoading(false);
            const data = (err as { response?: { data?: unknown } })?.response?.data;
            const message = parseApiErrorMessage(data);
            const lower = message.toLowerCase();
            if (lower.includes("email") || lower.includes("sign in")) {
                setErrors({ workEmail: message });
                setStep(0);
                setEmailHint("taken");
            } else if (lower.includes("organization") || lower.includes("name")) {
                setErrors({ tenantName: message });
                setStep(1);
            } else {
                setErrors({ submit: message });
            }
        }
    };

    if (success) {
        return (
            <div className="flex flex-col items-center justify-center space-y-4 rounded-lg border border-green-200 bg-green-50 p-8 text-center dark:border-green-800 dark:bg-green-900/20">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                    <Check className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold text-green-800 dark:text-green-300">Organization created</h3>
                <p className="text-green-700 dark:text-green-400">
                    Your organization and tenant admin account are ready. Sign in with the email and password you chose.
                </p>
                <Button asChild className="mt-2">
                    <Link href="/login">Sign in</Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-2">
                <div className="flex gap-1 sm:gap-2">
                    {STEPS.map((label, i) => (
                        <div key={label} className="flex items-center gap-1 sm:gap-2">
                            <span
                                className={cn(
                                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                                    i === step
                                        ? "bg-primary text-primary-foreground"
                                        : i < step
                                          ? "bg-primary/20 text-primary"
                                          : "bg-muted text-muted-foreground",
                                )}
                            >
                                {i + 1}
                            </span>
                            <span
                                className={cn(
                                    "hidden text-sm font-medium sm:inline",
                                    i === step ? "text-foreground" : "text-muted-foreground",
                                )}
                            >
                                {label}
                            </span>
                            {i < STEPS.length - 1 && (
                                <span className="mx-1 hidden h-px w-4 bg-border sm:inline" aria-hidden />
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {step === 0 && (
                <div className="space-y-4">
                    <div className="border-b pb-2">
                        <h3 className="text-lg font-semibold text-foreground">Account</h3>
                        <p className="text-sm text-muted-foreground">Your work email and password for signing in.</p>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="workEmail">
                            Work email <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            id="workEmail"
                            type="email"
                            autoComplete="email"
                            placeholder="admin@organization.com"
                            value={workEmail}
                            onChange={(e) => {
                                setWorkEmail(e.target.value);
                                setErrors((prev) => {
                                    if (!prev.workEmail) return prev;
                                    const next = { ...prev };
                                    delete next.workEmail;
                                    return next;
                                });
                            }}
                            className={cn(errors.workEmail && "border-destructive")}
                        />
                        {emailHint === "checking" && (
                            <p className="text-xs text-muted-foreground">Checking email…</p>
                        )}
                        {emailHint === "available" && !errors.workEmail && (
                            <p className="text-xs text-green-600 dark:text-green-500">Email is available.</p>
                        )}
                        {errors.workEmail && <p className="text-xs text-destructive">{errors.workEmail}</p>}
                    </div>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="grid gap-2">
                            <Label htmlFor="initialPassword">
                                Password <span className="text-red-500">*</span>
                            </Label>
                            <div className="relative">
                                <Input
                                    id="initialPassword"
                                    type={showPassword ? "text" : "password"}
                                    autoComplete="new-password"
                                    placeholder="Min 6 characters"
                                    value={initialPassword}
                                    onChange={(e) => setInitialPassword(e.target.value)}
                                    minLength={6}
                                    className={cn("pr-10", errors.initialPassword && "border-destructive")}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                                </button>
                            </div>
                            {errors.initialPassword && (
                                <p className="text-xs text-destructive">{errors.initialPassword}</p>
                            )}
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="confirmPassword">
                                Confirm password <span className="text-red-500">*</span>
                            </Label>
                            <div className="relative">
                                <Input
                                    id="confirmPassword"
                                    type={showConfirmPassword ? "text" : "password"}
                                    autoComplete="new-password"
                                    placeholder="Confirm password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className={cn("pr-10", errors.confirmPassword && "border-destructive")}
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
                                <p className="text-xs text-destructive">{errors.confirmPassword}</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {step === 1 && (
                <div className="space-y-4">
                    <div className="border-b pb-2">
                        <h3 className="text-lg font-semibold text-foreground">Organization</h3>
                        <p className="text-sm text-muted-foreground">Name your organization and admin profile.</p>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="tenantName">
                            Organization name <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            id="tenantName"
                            placeholder="e.g. Acme Corporation"
                            value={tenantName}
                            onChange={(e) => setTenantName(e.target.value)}
                            className={cn("h-10", errors.tenantName && "border-destructive")}
                        />
                        {errors.tenantName && <p className="text-xs text-destructive">{errors.tenantName}</p>}
                    </div>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        <div className="grid gap-2">
                            <Label htmlFor="firstName">
                                First name <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="firstName"
                                placeholder="e.g. John"
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                className={cn(errors.firstName && "border-destructive")}
                            />
                            {errors.firstName && <p className="text-xs text-destructive">{errors.firstName}</p>}
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="middleName" className="text-muted-foreground">
                                Middle name <span className="text-xs font-normal">(optional)</span>
                            </Label>
                            <Input
                                id="middleName"
                                value={middleName}
                                onChange={(e) => setMiddleName(e.target.value)}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="lastName">
                                Last name <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="lastName"
                                placeholder="e.g. Doe"
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                className={cn(errors.lastName && "border-destructive")}
                            />
                            {errors.lastName && <p className="text-xs text-destructive">{errors.lastName}</p>}
                        </div>
                    </div>
                    <div className="relative grid gap-2">
                        <Label htmlFor="contactNumber">Contact number</Label>
                        <div className="relative">
                            <Input
                                id="contactNumber"
                                placeholder="(Optional) 09123456789"
                                value={contactNumber}
                                onChange={handleContactChange}
                                className="h-10 pl-10"
                            />
                            <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        </div>
                        <p className="text-right text-[10px] text-muted-foreground">{contactNumber.length}/11</p>
                        {errors.contactNumber && (
                            <p className="text-xs font-medium text-destructive">{errors.contactNumber}</p>
                        )}
                    </div>
                </div>
            )}

            {step === 2 && (
                <div className="space-y-4">
                    <div className="border-b pb-2">
                        <h3 className="text-lg font-semibold text-foreground">Plan</h3>
                        <p className="text-sm text-muted-foreground">Choose a subscription. You can change this later.</p>
                    </div>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        {plans.map((plan) => (
                            <Card
                                key={plan.id}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                        e.preventDefault();
                                        setSelectedPlan(plan.id);
                                    }
                                }}
                                className={cn(
                                    "relative cursor-pointer overflow-hidden border-2 transition-all",
                                    selectedPlan === plan.id
                                        ? "scale-[1.01] border-primary bg-primary/5 shadow-md"
                                        : "border-muted hover:border-primary/50 hover:shadow-sm",
                                )}
                                onClick={() => setSelectedPlan(plan.id)}
                            >
                                {selectedPlan === plan.id && (
                                    <div className="absolute right-0 top-0 z-10 rounded-bl-md bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">
                                        SELECTED
                                    </div>
                                )}
                                <CardHeader className="p-4 pb-2">
                                    <CardTitle className="text-left text-lg font-semibold">{plan.name}</CardTitle>
                                    <CardDescription className="mt-1 text-left text-2xl font-bold text-primary">
                                        {plan.price}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="p-4 pt-0">
                                    <ul className="space-y-2">
                                        {plan.features.map((feature, i) => (
                                            <li
                                                key={i}
                                                className="flex items-start gap-2 text-left text-xs font-normal text-muted-foreground"
                                            >
                                                <Check className="h-4 w-4 shrink-0 text-green-500" />
                                                <span>{feature}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {errors.submit && (
                <p className="text-center text-sm font-medium text-destructive">{errors.submit}</p>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div>
                    {step > 0 && (
                        <Button type="button" variant="ghost" size="sm" onClick={goBack} className="gap-1">
                            <ChevronLeft className="h-4 w-4" />
                            Back
                        </Button>
                    )}
                </div>
                <div className="flex gap-2">
                    {step < 2 ? (
                        <Button
                            type="button"
                            size="lg"
                            onClick={() => void goNext()}
                            disabled={checkingAvailability}
                        >
                            {checkingAvailability ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Checking…
                                </>
                            ) : (
                                "Continue"
                            )}
                        </Button>
                    ) : (
                        <Button type="button" size="lg" disabled={isLoading} className="min-w-[180px]" onClick={handleSubmit}>
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Creating…
                                </>
                            ) : (
                                "Create organization"
                            )}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
