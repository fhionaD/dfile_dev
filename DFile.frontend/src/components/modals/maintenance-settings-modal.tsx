"use client";

import { useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Settings, AlertTriangle, Zap, Database, Boxes } from "lucide-react";
import { MaintenanceSettings } from "@/hooks/use-maintenance-settings";
import { useMaintenanceContext } from "@/contexts/maintenance-context";
import { toast } from "sonner";

interface MaintenanceSettingsModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function MaintenanceSettingsModal({ open, onOpenChange }: MaintenanceSettingsModalProps) {
    const { enableAnimations, enableAutoCost, enableGlint, enableGlassmorphism, enableMinimalUI, enableDataCaching, enableBatchOperations, updateSetting, isSaving } = useMaintenanceContext();
    
    const settings = {
        enableAnimations,
        enableAutoCost,
        enableGlint,
        enableGlassmorphism,
        enableMinimalUI,
        enableDataCaching,
        enableBatchOperations,
    };

    const handleSettingChange = useCallback((settingName: string, key: string) => {
        const typedKey = key as keyof MaintenanceSettings;
        const newValue = !settings[typedKey];
        updateSetting(typedKey, newValue as boolean);
        toast.success('Setting saved successfully', {
            description: `${settingName} has been ${newValue ? 'enabled' : 'disabled'}`,
            duration: 2000,
        });
    }, [settings, updateSetting]);

    const handleGlassmorphismChange = useCallback(() => {
        const newValue = !enableGlassmorphism;
        updateSetting('enableGlassmorphism', newValue);
        
        if (newValue) {
            toast.warning('Performance Notice', {
                description: 'Glassmorphism effect increases CPU/GPU usage. Disable if experiencing performance issues.',
                duration: 4000,
            });
        } else {
            toast.success('Setting saved successfully', {
                description: 'Glassmorphism Effect has been disabled',
                duration: 2000,
            });
        }
    }, [enableGlassmorphism, updateSetting]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl rounded-2xl border-border p-0 overflow-hidden flex flex-col max-h-[90vh]">
                <DialogHeader className="p-6 bg-muted/40 border-b border-border shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-primary/10 flex items-center justify-center text-primary rounded-lg">
                            <Settings size={20} />
                        </div>
                        <div>
                            <DialogTitle className="text-lg font-semibold">Maintenance Settings</DialogTitle>
                            <DialogDescription className="text-sm text-muted-foreground mt-1">
                                Global settings applied to all maintenance pages
                            </DialogDescription>
                        </div>
                        {isSaving && (
                            <Badge variant="secondary" className="ml-auto animate-pulse">
                                Syncing...
                            </Badge>
                        )}
                    </div>
                </DialogHeader>

                <div className="p-6 space-y-6 flex-1 overflow-y-auto">
                    {/* Display Settings Section */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-4">
                            <Zap className="h-4 w-4 text-primary" />
                            <h3 className="text-sm font-semibold">Display Settings</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {/* Tab Animations */}
                            <div className="flex flex-col justify-between p-4 rounded-lg border border-border transition-all shadow-sm bg-card hover:bg-muted/50">
                                <div className="mb-3">
                                    <p className="text-sm font-medium">Tab Animations</p>
                                    <p className="text-xs text-muted-foreground">Enable smooth transitions between tabs</p>
                                </div>
                                <button
                                    onClick={() => handleSettingChange('Tab Animations', 'enableAnimations')}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                        settings.enableAnimations ? 'bg-primary' : 'bg-muted-foreground/30'
                                    }`}
                                >
                                    <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                                            settings.enableAnimations ? 'translate-x-6' : 'translate-x-1'
                                        }`}
                                    />
                                </button>
                            </div>

                            {/* Auto Cost Estimation */}
                            <div className="flex flex-col justify-between p-4 rounded-lg border border-border transition-all shadow-sm bg-card hover:bg-muted/50">
                                <div className="mb-3">
                                    <p className="text-sm font-medium">Auto Cost Estimation</p>
                                    <p className="text-xs text-muted-foreground">Automatically estimate costs</p>
                                </div>
                                <button
                                    onClick={() => handleSettingChange('Auto Cost Estimation', 'enableAutoCost')}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                        settings.enableAutoCost ? 'bg-primary' : 'bg-muted-foreground/30'
                                    }`}
                                >
                                    <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                                            settings.enableAutoCost ? 'translate-x-6' : 'translate-x-1'
                                        }`}
                                    />
                                </button>
                            </div>

                            {/* Completion Glint Effect */}
                            <div className="flex flex-col justify-between p-4 rounded-lg border border-border transition-all shadow-sm bg-card hover:bg-muted/50">
                                <div className="mb-3">
                                    <p className="text-sm font-medium">Completion Glint Effect</p>
                                    <p className="text-xs text-muted-foreground">Show shimmer when tasks complete</p>
                                </div>
                                <button
                                    onClick={() => handleSettingChange('Completion Glint Effect', 'enableGlint')}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                        settings.enableGlint ? 'bg-primary' : 'bg-muted-foreground/30'
                                    }`}
                                >
                                    <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                                            settings.enableGlint ? 'translate-x-6' : 'translate-x-1'
                                        }`}
                                    />
                                </button>
                            </div>

                            {/* Glassmorphism Effect */}
                            <div className="flex flex-col justify-between p-4 rounded-lg border border-border transition-all shadow-sm bg-card hover:bg-muted/50">
                                <div className="mb-3">
                                    <p className="text-sm font-medium">Glassmorphism Effect</p>
                                    <p className="text-xs text-muted-foreground">Apply frosted glass to modals • ⚠️ Increases usage</p>
                                </div>
                                <button
                                    onClick={handleGlassmorphismChange}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                        settings.enableGlassmorphism ? 'bg-primary' : 'bg-muted-foreground/30'
                                    }`}
                                >
                                    <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                                            settings.enableGlassmorphism ? 'translate-x-6' : 'translate-x-1'
                                        }`}
                                    />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Optimization Settings Section */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-4">
                            <Database className="h-4 w-4 text-primary" />
                            <h3 className="text-sm font-semibold">Optimization Settings</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {/* Minimal UI */}
                            <div className="flex flex-col justify-between p-4 rounded-lg border border-border transition-all shadow-sm bg-card hover:bg-muted/50">
                                <div className="mb-3">
                                    <p className="text-sm font-medium">Minimal UI</p>
                                    <p className="text-xs text-muted-foreground">Hide decorative elements for faster loading</p>
                                </div>
                                <button
                                    onClick={() => handleSettingChange('Minimal UI', 'enableMinimalUI')}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                        settings.enableMinimalUI ? 'bg-primary' : 'bg-muted-foreground/30'
                                    }`}
                                >
                                    <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                                            settings.enableMinimalUI ? 'translate-x-6' : 'translate-x-1'
                                        }`}
                                    />
                                </button>
                            </div>

                            {/* Data Caching */}
                            <div className="flex flex-col justify-between p-4 rounded-lg border border-border transition-all shadow-sm bg-card hover:bg-muted/50">
                                <div className="mb-3">
                                    <p className="text-sm font-medium">Data Caching</p>
                                    <p className="text-xs text-muted-foreground">Cache records locally for offline access</p>
                                </div>
                                <button
                                    onClick={() => handleSettingChange('Data Caching', 'enableDataCaching')}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                        settings.enableDataCaching ? 'bg-primary' : 'bg-muted-foreground/30'
                                    }`}
                                >
                                    <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                                            settings.enableDataCaching ? 'translate-x-6' : 'translate-x-1'
                                        }`}
                                    />
                                </button>
                            </div>

                            {/* Batch Operations */}
                            <div className="flex flex-col justify-between p-4 rounded-lg border border-border transition-all shadow-sm bg-card hover:bg-muted/50">
                                <div className="mb-3">
                                    <p className="text-sm font-medium">Batch Operations</p>
                                    <p className="text-xs text-muted-foreground">Group updates for improved performance</p>
                                </div>
                                <button
                                    onClick={() => handleSettingChange('Batch Operations', 'enableBatchOperations')}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                        settings.enableBatchOperations ? 'bg-primary' : 'bg-muted-foreground/30'
                                    }`}
                                >
                                    <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                                            settings.enableBatchOperations ? 'translate-x-6' : 'translate-x-1'
                                        }`}
                                    />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Note */}
                    <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                        <div className="flex gap-3">
                            <AlertTriangle className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                            <div className="text-sm text-blue-700 dark:text-blue-400">
                                <p className="font-semibold mb-1">Testing Mode Active</p>
                                <p className="text-blue-600/80 dark:text-blue-400/70">These settings are in testing phase. Some features may not work as expected. Please report any issues.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-muted/40 border-t border-border shrink-0 flex justify-end gap-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Close
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
