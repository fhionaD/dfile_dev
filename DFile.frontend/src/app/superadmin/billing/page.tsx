'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePlans, useArchivePlan, useActivatePlan } from '@/hooks/use-plans';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Loader2, MoreHorizontal } from 'lucide-react';

export default function BillingPlansPage() {
  const { data: plans = [], isLoading, error } = usePlans(false);
  const [showArchived, setShowArchived] = useState(false);
  const allPlans = usePlans(true);
  const archiveMutation = useArchivePlan();
  const activateMutation = useActivatePlan();

  const [confirmArchiveId, setConfirmArchiveId] = useState<number | null>(null);
  const [confirmArchiveName, setConfirmArchiveName] = useState('');

  const displayPlans = showArchived
    ? (allPlans.data ?? []).filter((p) => p.isArchived)
    : plans;

  const requestArchive = (id: number, name: string) => {
    setConfirmArchiveId(id);
    setConfirmArchiveName(name);
  };

  const handleArchiveConfirmed = async () => {
    if (confirmArchiveId === null) return;
    try {
      await archiveMutation.mutateAsync(confirmArchiveId);
      toast.success('Plan archived successfully');
    } catch {
      toast.error('Failed to archive plan');
    } finally {
      setConfirmArchiveId(null);
    }
  };

  const handleActivate = async (id: number) => {
    try {
      await activateMutation.mutateAsync(id);
      toast.success('Plan activated successfully');
    } catch {
      toast.error('Failed to activate plan');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <p className="text-red-500">Error loading plans. Please try again.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Billing & Plans</h1>
          <p className="text-muted-foreground mt-2">Manage subscription plans and features</p>
        </div>
        <Link href="/superadmin/billing/create">
          <Button>Create New Plan</Button>
        </Link>
      </div>

      <div className="flex gap-2">
        <Button
          variant={!showArchived ? 'default' : 'outline'}
          onClick={() => setShowArchived(false)}
        >
          Active Plans
        </Button>
        <Button
          variant={showArchived ? 'default' : 'outline'}
          onClick={() => setShowArchived(true)}
        >
          Archived Plans
        </Button>
      </div>

      {displayPlans.length === 0 ? (
        <Card className="p-6 text-center">
          <p className="text-muted-foreground">
            {showArchived ? 'No archived plans' : 'No active plans'}
          </p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plan Name</TableHead>
                <TableHead>Monthly Cost</TableHead>
                <TableHead>Yearly Cost</TableHead>
                <TableHead>Max Rooms</TableHead>
                <TableHead>Max Personnel</TableHead>
                <TableHead>Finance Mgr</TableHead>
                <TableHead>Maintenance Mgr</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayPlans.map((plan) => (
                <TableRow key={plan.id}>
                  <TableCell className="font-medium">{plan.name}</TableCell>
                  <TableCell>₱{plan.monthlyCost.toFixed(2)}</TableCell>
                  <TableCell>₱{plan.yearlyCost.toFixed(2)}</TableCell>
                  <TableCell>{plan.maxRooms}</TableCell>
                  <TableCell>{plan.maxPersonnel}</TableCell>
                  <TableCell>
                    <Badge variant={plan.canCreateFinanceManager ? 'default' : 'secondary'}>
                      {plan.canCreateFinanceManager ? 'Yes' : 'No'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={plan.canCreateMaintenanceManager ? 'default' : 'secondary'}>
                      {plan.canCreateMaintenanceManager ? 'Yes' : 'No'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={plan.isActive && !plan.isArchived ? 'default' : 'destructive'}>
                      {plan.isArchived ? 'Archived' : plan.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/superadmin/billing/edit?id=${plan.id}`}>Edit</Link>
                        </DropdownMenuItem>
                        {!plan.isArchived ? (
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => requestArchive(plan.id, plan.name)}
                          >
                            Archive
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onClick={() => handleActivate(plan.id)}
                            disabled={activateMutation.isPending}
                          >
                            Activate
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <AlertDialog
        open={confirmArchiveId !== null}
        onOpenChange={(open) => { if (!open) setConfirmArchiveId(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive &ldquo;{confirmArchiveName}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              This plan will be hidden from new registrations and tenant upgrades. Existing tenants on this plan are unaffected. You can reactivate it at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleArchiveConfirmed}
              disabled={archiveMutation.isPending}
            >
              {archiveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Archive'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
