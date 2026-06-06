"use client";

import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Rule {
    label: string;
    test: (p: string) => boolean;
}

const RULES: Rule[] = [
    { label: "At least 15 characters",        test: (p) => p.length >= 15 },
    { label: "One uppercase letter (A–Z)",     test: (p) => /[A-Z]/.test(p) },
    { label: "One lowercase letter (a–z)",     test: (p) => /[a-z]/.test(p) },
    { label: "One number (0–9)",               test: (p) => /\d/.test(p) },
    { label: "One special character (!@#…)",   test: (p) => /[^a-zA-Z0-9]/.test(p) },
];

export function passwordMeetsPolicy(password: string): boolean {
    return RULES.every((r) => r.test(password));
}

interface PasswordRequirementsProps {
    password: string;
    className?: string;
}

export function PasswordRequirements({ password, className }: PasswordRequirementsProps) {
    return (
        <ul className={cn("space-y-1.5 mt-2", className)}>
            {RULES.map((rule) => {
                const met = password.length > 0 && rule.test(password);
                const untouched = password.length === 0;
                return (
                    <li key={rule.label} className="flex items-center gap-2 text-xs">
                        <span
                            className={cn(
                                "flex h-4 w-4 shrink-0 items-center justify-center rounded-full",
                                untouched
                                    ? "bg-muted text-muted-foreground"
                                    : met
                                    ? "bg-green-500/15 text-green-600 dark:text-green-400"
                                    : "bg-destructive/15 text-destructive"
                            )}
                        >
                            {met ? <Check size={10} strokeWidth={3} /> : <X size={10} strokeWidth={3} />}
                        </span>
                        <span
                            className={cn(
                                untouched
                                    ? "text-muted-foreground"
                                    : met
                                    ? "text-green-600 dark:text-green-400"
                                    : "text-destructive"
                            )}
                        >
                            {rule.label}
                        </span>
                    </li>
                );
            })}
        </ul>
    );
}
