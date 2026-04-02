import { useState, useEffect, useCallback } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

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

/**
 * Hybrid hook for maintenance settings management
 * - Loads from localStorage immediately for fast UX
 * - Syncs with backend for persistence
 * - Updates backend when settings change
 */
export function useMaintenanceSettings() {
  const [settings, setSettings] = useState<MaintenanceSettings>(DEFAULT_SETTINGS);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          setSettings({ ...DEFAULT_SETTINGS, ...parsed });
        }
      } catch (error) {
        console.warn('Failed to load settings from localStorage:', error);
      }
    }
    setIsInitialized(true);
  }, []);

  // Fetch settings from backend
  const { data: backendSettings, isLoading: isLoadingBackend } = useQuery({
    queryKey: ['maintenanceSettings'],
    queryFn: async () => {
      try {
        const response = await api.get('/api/users/settings/maintenance');
        return response.data as MaintenanceSettings;
      } catch (error) {
        // If API call fails, silently continue with localStorage
        console.warn('Failed to fetch settings from backend:', error);
        return null;
      }
    },
    enabled: isInitialized,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Merge backend settings with local settings on successful fetch
  useEffect(() => {
    if (backendSettings) {
      setSettings(prev => ({ ...prev, ...backendSettings }));
    }
  }, [backendSettings]);

  // Mutation to save settings to backend
  const saveMutation = useMutation({
    mutationFn: async (newSettings: MaintenanceSettings) => {
      try {
        const response = await api.post('/api/users/settings/maintenance', newSettings);
        return response.data;
      } catch (error) {
        console.warn('Failed to save settings to backend:', error);
        // Don't throw - allow offline-first behavior
        throw error;
      }
    },
  });

  // Update a single setting
  const updateSetting = useCallback(
    async (key: keyof MaintenanceSettings, value: boolean) => {
      const newSettings = { ...settings, [key]: value };
      
      // Always update localStorage immediately for fast UX
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
        } catch (error) {
          console.warn('Failed to save to localStorage:', error);
        }
      }

      // Update local state
      setSettings(newSettings);

      // Sync to backend (don't wait for response - fire and forget)
      // This provides offline-first behavior
      saveMutation.mutate(newSettings);
    },
    [settings, saveMutation]
  );

  // Update multiple settings at once
  const updateSettings = useCallback(
    async (updates: Partial<MaintenanceSettings>) => {
      const newSettings = { ...settings, ...updates };
      
      // Always update localStorage immediately
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
        } catch (error) {
          console.warn('Failed to save to localStorage:', error);
        }
      }

      // Update local state
      setSettings(newSettings);

      // Sync to backend
      saveMutation.mutate(newSettings);
    },
    [settings, saveMutation]
  );

  return {
    settings,
    updateSetting,
    updateSettings,
    isLoading: isLoadingBackend,
    isSaving: saveMutation.isPending,
    error: saveMutation.error,
  };
}
