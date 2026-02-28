"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, Copy } from "lucide-react";
import { useState } from "react";

interface PasswordDisplayModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  password: string;
  onClose: () => void;
}

export function PasswordDisplayModal({ open, onOpenChange, password, onClose }: PasswordDisplayModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl border-border p-0 overflow-hidden flex flex-col">
        <DialogHeader className="p-6 bg-muted/40 border-b border-border">
          <div className="flex items-center gap-3">
            <CheckCircle size={24} className="text-green-500" />
            <DialogTitle className="text-lg font-semibold text-foreground">
              Personnel registered successfully.
            </DialogTitle>
          </div>
          <DialogDescription className="mt-2 text-muted-foreground text-sm">
            Please share this temporary password with the employee. It will not be shown again.
          </DialogDescription>
        </DialogHeader>
        <div className="p-6 flex flex-col items-center gap-4">
          <Label className="text-sm font-medium text-muted-foreground">Temporary Password</Label>
          <div className="flex items-center gap-2 w-full">
            <Input
              value={password}
              readOnly
              className="text-2xl font-mono text-center bg-background border-primary"
            />
            <Button type="button" variant="outline" onClick={handleCopy} className="px-2">
              <Copy size={18} />
              <span className="sr-only">Copy</span>
            </Button>
          </div>
          {copied && <span className="text-green-600 text-xs mt-1">Copied!</span>}
        </div>
        <DialogFooter className="p-6 bg-muted/40 border-t border-border flex justify-end">
          <Button type="button" onClick={onClose} className="h-10 text-sm px-4 bg-primary text-primary-foreground shadow-lg hover:bg-primary/90">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
