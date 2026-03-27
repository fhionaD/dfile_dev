import { cn } from "@/lib/utils";

type StatusVariant = "success" | "warning" | "danger" | "info" | "muted";

const variantClasses: Record<StatusVariant, string> = {
    success: "text-emerald-600 dark:text-emerald-400",
    warning: "text-amber-600 dark:text-amber-400",
    danger: "text-red-600 dark:text-red-400",
    info: "text-blue-600 dark:text-blue-400",
    muted: "text-muted-foreground",
};

const dotClasses: Record<StatusVariant, string> = {
    success: "bg-emerald-500",
    warning: "bg-amber-500",
    danger: "bg-red-500",
    info: "bg-blue-500",
    muted: "bg-muted-foreground/50",
};

interface StatusTextProps {
    variant?: StatusVariant;
    children: React.ReactNode;
    className?: string;
}

export function StatusText({ variant = "muted", children, className }: StatusTextProps) {
    return (
        <span className={cn("inline-flex items-center gap-1.5 text-sm font-medium", variantClasses[variant], className)}>
            <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", dotClasses[variant])} />
            {children}
        </span>
    );
}
