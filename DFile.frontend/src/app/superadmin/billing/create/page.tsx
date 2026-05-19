'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCreatePlan } from '@/hooks/use-plans';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Loader2, Building2, Users, Sparkles } from 'lucide-react';

interface FormData {
  name: string;
  description: string;
  monthlyCost: number | string;
  yearlyCost: number | string;
  maxRooms: number | string;
  maxPersonnel: number | string;
}

const initialFormData: FormData = {
  name: '',
  description: '',
  monthlyCost: '',
  yearlyCost: '',
  maxRooms: 10,
  maxPersonnel: 5,
};

function toNum(v: number | string): number {
  return typeof v === 'string' ? (v === '' ? 0 : parseFloat(v)) : v;
}

export default function CreatePlanPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [yearlyOverridden, setYearlyOverridden] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const createMutation = useCreatePlan();

  // Auto-calculate yearly as monthly × 10 when not manually overridden
  useEffect(() => {
    if (yearlyOverridden) return;
    const monthly = toNum(formData.monthlyCost);
    if (monthly > 0) {
      setFormData((prev) => ({ ...prev, yearlyCost: parseFloat((monthly * 10).toFixed(2)) }));
    } else {
      setFormData((prev) => ({ ...prev, yearlyCost: '' }));
    }
  }, [formData.monthlyCost, yearlyOverridden]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    setFieldErrors((prev) => { const next = { ...prev }; delete next[name as keyof FormData]; return next; });

    if (name === 'yearlyCost') {
      setYearlyOverridden(true);
    }

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? (value === '' ? '' : parseFloat(value)) : value,
    }));
  };

  const monthly = toNum(formData.monthlyCost);
  const yearly = toNum(formData.yearlyCost);
  const autoYearly = parseFloat((monthly * 10).toFixed(2));
  const savings = monthly * 12 - yearly;
  const yearlyWarning = yearly > 0 && yearly > monthly * 12;
  const showSavings = yearly > 0 && yearly < monthly * 12 && savings > 0;
  const isYearlyAuto = !yearlyOverridden && yearly === autoYearly;

  const validate = (): boolean => {
    const errs: Partial<Record<keyof FormData, string>> = {};
    if (!formData.name.trim()) errs.name = 'Plan name is required';
    if (toNum(formData.maxRooms) < 1) errs.maxRooms = 'Must be at least 1';
    if (toNum(formData.maxPersonnel) < 1) errs.maxPersonnel = 'Must be at least 1';
    if (yearlyWarning) errs.yearlyCost = 'Yearly cost exceeds monthly × 12 — tenants pay more annually';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const submitData = {
      name: formData.name.trim(),
      description: formData.description.trim(),
      monthlyCost: monthly,
      yearlyCost: yearly,
      maxRooms: toNum(formData.maxRooms),
      maxPersonnel: toNum(formData.maxPersonnel),
      canCreateFinanceManager: true,
      canCreateMaintenanceManager: true,
      assetTracking: true,
      depreciation: true,
      maintenanceModule: true,
      reportsModule: true,
      procurementModule: true,
    };

    try {
      await createMutation.mutateAsync(submitData);
      toast.success('Plan created successfully');
      router.push('/superadmin/billing');
    } catch {
      toast.error('Failed to create plan');
    }
  };

  const previewName = formData.name.trim() || 'Plan Name';
  const previewDesc = formData.description.trim() || 'No description provided.';

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Create New Plan</h1>
        <p className="text-muted-foreground mt-2">Define a new subscription plan with features and limits</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Form */}
        <div className="lg:col-span-2">
          <Card className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">Basic Information</h2>

                <div>
                  <Label htmlFor="name">Plan Name *</Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="e.g., Starter, Professional, Enterprise"
                    className="mt-1"
                  />
                  {fieldErrors.name && <p className="text-xs text-destructive mt-1">{fieldErrors.name}</p>}
                </div>

                <div>
                  <div className="flex justify-between items-center">
                    <Label htmlFor="description">Description</Label>
                    <span className="text-xs text-muted-foreground">{formData.description.length} / 500</span>
                  </div>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    maxLength={500}
                    placeholder="Brief description of this plan"
                    className="mt-1 w-full px-3 py-2 border border-input rounded-md text-sm resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    rows={3}
                  />
                </div>
              </div>

              <Separator />

              {/* Pricing */}
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">Pricing</h2>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="monthlyCost">Monthly Cost (₱)</Label>
                    <Input
                      id="monthlyCost"
                      name="monthlyCost"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.monthlyCost}
                      onChange={handleInputChange}
                      placeholder="0.00"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="yearlyCost">Yearly Cost (₱)</Label>
                      {isYearlyAuto && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Sparkles className="h-3 w-3" /> Auto-calculated
                        </span>
                      )}
                    </div>
                    <Input
                      id="yearlyCost"
                      name="yearlyCost"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.yearlyCost}
                      onChange={handleInputChange}
                      placeholder="0.00"
                      className="mt-1"
                    />
                    {showSavings && (
                      <p className="text-xs text-emerald-600 mt-1">
                        Saves ₱{savings.toLocaleString('en-PH', { minimumFractionDigits: 2 })} vs. monthly (
                        {Math.round((savings / (monthly * 12)) * 100)}% off)
                      </p>
                    )}
                    {yearlyWarning && (
                      <p className="text-xs text-destructive mt-1">{fieldErrors.yearlyCost ?? 'Yearly costs more than monthly × 12'}</p>
                    )}
                    {isYearlyAuto && monthly > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">10× monthly — 2 months free. Edit to override.</p>
                    )}
                  </div>
                </div>
              </div>

              <Separator />

              {/* Capacity Limits */}
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">Capacity Limits</h2>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="maxRooms">Max Rooms</Label>
                    <Input
                      id="maxRooms"
                      name="maxRooms"
                      type="number"
                      min="1"
                      value={formData.maxRooms}
                      onChange={handleInputChange}
                      className="mt-1"
                    />
                    {fieldErrors.maxRooms && <p className="text-xs text-destructive mt-1">{fieldErrors.maxRooms}</p>}
                  </div>

                  <div>
                    <Label htmlFor="maxPersonnel">Max Personnel</Label>
                    <Input
                      id="maxPersonnel"
                      name="maxPersonnel"
                      type="number"
                      min="1"
                      value={formData.maxPersonnel}
                      onChange={handleInputChange}
                      className="mt-1"
                    />
                    {fieldErrors.maxPersonnel && <p className="text-xs text-destructive mt-1">{fieldErrors.maxPersonnel}</p>}
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Plan
                </Button>
                <Button type="button" variant="outline" onClick={() => router.push('/superadmin/billing')}>
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        </div>

        {/* Live Preview */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-muted-foreground font-medium uppercase tracking-wide">Live Preview</CardTitle>
              <p className="text-xs text-muted-foreground">What tenants see at registration</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold">{previewName}</h3>
                  <Badge variant="secondary">Plan</Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{previewDesc}</p>
              </div>

              <Separator />

              <div className="space-y-1">
                {monthly > 0 ? (
                  <>
                    <p className="text-2xl font-bold">₱{monthly.toLocaleString('en-PH', { minimumFractionDigits: 2 })}<span className="text-sm font-normal text-muted-foreground"> / mo</span></p>
                    {yearly > 0 && (
                      <p className="text-sm text-muted-foreground">₱{yearly.toLocaleString('en-PH', { minimumFractionDigits: 2 })} / year</p>
                    )}
                  </>
                ) : (
                  <p className="text-2xl font-bold">Free</p>
                )}
              </div>

              <Separator />

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Building2 className="h-4 w-4 shrink-0" />
                  <span>Up to <span className="font-medium text-foreground">{toNum(formData.maxRooms) || '—'}</span> rooms</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="h-4 w-4 shrink-0" />
                  <span>Up to <span className="font-medium text-foreground">{toNum(formData.maxPersonnel) || '—'}</span> personnel</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
