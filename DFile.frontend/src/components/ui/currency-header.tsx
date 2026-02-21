import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { TableHead } from "@/components/ui/table";

interface CurrencyHeaderProps extends React.ComponentProps<typeof TableHead> {
    children: React.ReactNode;
    sortKey?: string;
    sortedBy?: string;
    sortDirection?: "asc" | "desc";
    onClick?: () => void;
}

export function CurrencyHeader({ 
  children, 
  sortKey, 
  className,
  sortedBy,
  sortDirection,
  onClick,
  ...props 
}: CurrencyHeaderProps) {
    
    const getSortIcon = () => {
        if (!sortKey) return null;
        if (sortedBy !== sortKey) return <ArrowUpDown size={14} className="ml-2 text-muted-foreground/50" />;
        return sortDirection === "asc" ? <ArrowUp size={14} className="ml-2 text-foreground" /> : <ArrowDown size={14} className="ml-2 text-foreground" />;
    };

    return (
        <TableHead 
            className={cn("px-4 py-3 align-middle text-xs font-medium text-muted-foreground cursor-pointer hover:bg-muted/50 transition-colors", className)}
            onClick={onClick}
            {...props}
        >
             <div className="flex items-center justify-end w-[90px] ml-auto gap-1">
                <span>{children}</span>
                {getSortIcon()}
            </div>
        </TableHead>
    );
}
