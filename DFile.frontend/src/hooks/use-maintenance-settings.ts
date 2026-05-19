import { useState, useEffect, useCallback } from 'react';

export interface MaintenanceSettings {
  enableAnimations: boolean;
  enableAutoCost: boolean;
  enableGlint: boolean;
  enableGlassmorphism: boolean;
  enableMinimalUI: boolean;
  enableDataCaching: boolean;
  enableBatchOperations: boolean;
}

const DEFAULT_SETTINGS: MaintenanceSettings = {
  enableAnimations: true,
  enableAutoCost: true,
  enableGlint: true,
  enableGlassmorphism: false,
  enableMinimalUI: false,
  enableDataCaching: false,
  enableBatchOperations: false,
};

const STORAGE_KEY = 'maintenance-settings';

export function useMaintenanceSettings() {
  const [settings, setSettings] = useState<MaintenanceSettings>(DEFAULT_SETTINGS);

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          setSettings({ ...DEFAULT_SETTINGS, ...parsed });
        }
      } catch {
        // ignore
      }
    }
  }, []);

  const persist = useCallback((newSettings: MaintenanceSettings) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
      } catch {
        // ignore
      }
    }
    setSettings(newSettings);
  }, []);

  const updateSetting = useCallback(
    (key: keyof MaintenanceSettings, value: boolean) => {
      persist({ ...settings, [key]: value });
    },
    [settings, persist]
  );

  const updateSettings = useCallback(
    (updates: Partial<MaintenanceSettings>) => {
      persist({ ...settings, ...updates });
    },
    [settings, persist]
  );

  return {
    settings,
    updateSetting,
    updateSettings,
    isLoading: false,
    isSaving: false,
    error: null,
  };
}

