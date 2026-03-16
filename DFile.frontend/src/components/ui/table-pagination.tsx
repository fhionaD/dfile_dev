"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface TablePaginationProps {
    totalItems: number;
    pageSize: number;
    pageIndex: number;
    onPageChange: (pageIndex: number) => void;
    onPageSizeChange: (pageSize: number) => void;
    pageSizeOptions?: number[];
}

export function TablePagination({
    totalItems,
    pageSize,
    pageIndex,
    onPageChange,
    onPageSizeChange,
    pageSizeOptions = [5, 10, 20, 50],
}: TablePaginationProps) {
    const [pageInput, setPageInput] = useState("");
    const pageCount = Math.max(1, Math.ceil(totalItems / pageSize));
    const canPrev = pageIndex > 0;
    const canNext = pageIndex < pageCount - 1;

    const startItem = totalItems === 0 ? 0 : pageIndex * pageSize + 1;
    const endItem = Math.min((pageIndex + 1) * pageSize, totalItems);

    const handlePageInputSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            const page = Number(pageInput);
            if (page >= 1 && page <= pageCount) {
                onPageChange(page - 1);
            }
            setPageInput("");
        }
    };

    return (
        <div className="px-6 py-4 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-4 bg-muted/20">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="font-medium">
                    {totalItems === 0
                        ? "No results"
                        : `${startItem}–${endItem} of ${totalItems}`}
                </span>
                <div className="flex items-center gap-2">
                    <span>Rows:</span>
                    <Select
                        value={String(pageSize)}
                        onValueChange={(v) => {
                            onPageSizeChange(Number(v));
                            onPageChange(0);
                        }}
                    >
                        <SelectTrigger className="h-8 w-[68px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {pageSizeOptions.map((s) => (
                                <SelectItem key={s} value={String(s)}>
                                    {s}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground font-medium">
                    Page {pageIndex + 1} of {pageCount}
                </span>
                <Input
                    placeholder="Go to"
                    value={pageInput}
                    onChange={(e) => setPageInput(e.target.value)}
                    onKeyDown={handlePageInputSubmit}
                    className="h-8 w-16 text-center"
                    aria-label="Go to page"
                />
                <div className="flex items-center gap-1">
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onPageChange(0)} disabled={!canPrev} aria-label="First page">
                        <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onPageChange(pageIndex - 1)} disabled={!canPrev} aria-label="Previous page">
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onPageChange(pageIndex + 1)} disabled={!canNext} aria-label="Next page">
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onPageChange(pageCount - 1)} disabled={!canNext} aria-label="Last page">
                        <ChevronsRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}

/** Paginate an array client-side. Returns the slice for the current page. */
export function paginateData<T>(data: T[], pageIndex: number, pageSize: number): T[] {
    const start = pageIndex * pageSize;
    return data.slice(start, start + pageSize);
}
