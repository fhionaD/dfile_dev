import { ComponentProps } from "react";
import { cn } from "@/lib/utils";

interface CurrencyCellProps extends React.HTMLAttributes<HTMLDivElement> {
    value: number;
}

export function CurrencyCell({ value, className, ...props }: CurrencyCellProps) {
    const formattedValue = new Intl.NumberFormat("en-US", {
        style: "decimal",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value);

    return (
        <div className={cn("inline-flex justify-between items-center w-[90px] font-mono text-xs ml-auto", className)} {...props}>
            <span className="text-muted-foreground mr-1">₱</span>
            <span>{formattedValue}</span>
        </div>
    );
}
