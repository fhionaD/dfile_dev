import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { TableHead } from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface SortableTableHeadProps extends React.ComponentProps<"th"> {
    sorted?: "asc" | "desc" | false;
    onSort?: () => void;
}

/**
 * Drop-in replacement for <TableHead> that adds click-to-sort.
 * When `onSort` is undefined the cell renders as a plain TableHead.
 */
export function SortableTableHead({
    children,
    sorted,
    onSort,
    className,
    ...props
}: SortableTableHeadProps) {
    if (!onSort) {
        return (
            <TableHead className={className} {...props}>
                {children}
            </TableHead>
        );
    }

    return (
        <TableHead
            className={cn("cursor-pointer select-none", className)}
            onClick={onSort}
            {...props}
        >
            <div className="flex items-center gap-1.5 group">
                <span>{children}</span>
                <span className="text-muted-foreground/50 group-hover:text-muted-foreground transition-colors shrink-0">
                    {sorted === "asc" ? (
                        <ArrowUp size={13} className="text-primary" />
                    ) : sorted === "desc" ? (
                        <ArrowDown size={13} className="text-primary" />
                    ) : (
                        <ArrowUpDown size={13} />
                    )}
                </span>
            </div>
        </TableHead>
    );
}
