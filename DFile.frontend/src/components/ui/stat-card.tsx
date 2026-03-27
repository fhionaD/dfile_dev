import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
    label: string;
    value: string | number;
    sub?: string;
    icon: LucideIcon;
    iconClassName?: string;
    valueClassName?: string;
    className?: string;
}

export function StatCard({
    label,
    value,
    sub,
    icon: Icon,
    iconClassName = "bg-primary/10 text-primary",
    valueClassName = "text-foreground",
    className,
}: StatCardProps) {
    return (
        <Card className={cn("overflow-hidden", className)}>
            <div className="p-6">
                <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1 space-y-3">
                        <p className="text-sm font-medium text-muted-foreground">{label}</p>
                        <p className={cn("text-3xl font-bold tracking-tight", valueClassName)}>{value}</p>
                        {sub && <p className="text-sm text-muted-foreground">{sub}</p>}
                    </div>
                    <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center shrink-0", iconClassName)}>
                        <Icon size={22} strokeWidth={2} />
                    </div>
                </div>
            </div>
        </Card>
    );
}

export function StatCardSkeleton({ className }: { className?: string }) {
    return (
        <Card className={cn("overflow-hidden", className)}>
            <div className="p-6">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-9 w-24" />
                    </div>
                    <Skeleton className="h-12 w-12 rounded-xl shrink-0" />
                </div>
            </div>
        </Card>
    );
}

