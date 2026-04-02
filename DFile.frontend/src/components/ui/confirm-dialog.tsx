"use client";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ConfirmDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description: string;
    confirmLabel?: string;
    cancelLabel?: string;
    confirmVariant?: "default" | "destructive" | "outline";
    /** May return a Promise (e.g. react-query mutateAsync); rejections are contained so UI handlers/toasts are not doubled by unhandled rejections. */
    onConfirm: () => void | Promise<void>;
    isLoading?: boolean;
}

export function ConfirmDialog({
    open,
    onOpenChange,
    title,
    description,
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    confirmVariant = "default",
    onConfirm,
    isLoading = false,
}: ConfirmDialogProps) {
    const handleConfirm = () => {
        try {
            const result = onConfirm();
            if (result != null && typeof (result as PromiseLike<void>).then === "function") {
                void Promise.resolve(result).catch(() => {
                    /* Async errors: callers use mutation onError / toasts */
                });
            }
        } catch {
            /* Sync throw from onConfirm */
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                        {description}
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="mt-2 gap-2">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isLoading}
                        className="flex-1 sm:flex-none"
                    >
                        {cancelLabel}
                    </Button>
                    <Button
                        variant={confirmVariant}
                        type="button"
                        onClick={handleConfirm}
                        disabled={isLoading}
                        className="flex-1 sm:flex-none"
                    >
                        {isLoading ? "Please wait…" : confirmLabel}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
