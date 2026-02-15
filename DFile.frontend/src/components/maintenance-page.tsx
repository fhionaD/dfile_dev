import { Construction } from "lucide-react";

interface MaintenancePageProps {
    title: string;
}

export function MaintenancePage({ title }: MaintenancePageProps) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-6">
            <div className="p-6 bg-muted/40 rounded-full border border-border">
                <Construction size={48} className="text-muted-foreground/60" />
            </div>
            <div className="space-y-2">
                <h2 className="text-2xl font-bold text-foreground tracking-tight">
                    {title} Module Under Construction
                </h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                    This feature is currently being developed. Check back soon for updates to the {title} system.
                </p>
            </div>
            <div className="pt-4">
                <div className="h-1 w-24 bg-border rounded-full mx-auto overflow-hidden">
                    <div className="h-full bg-primary/20 w-1/2 animate-[shimmer_2s_infinite]" />
                </div>
            </div>
        </div>
    );
}
