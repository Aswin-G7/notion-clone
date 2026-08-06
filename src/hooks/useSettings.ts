import { useState, useEffect, useCallback } from "react";
import { settingsService } from "../services/SettingsService";
import { AppSettings, SettingsUpdate } from "../types/settings";

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(() => settingsService.getSettings());

  useEffect(() => {
    // Initial load call
    settingsService.load().then((loaded) => setSettings(loaded));

    // Subscribe to real-time changes
    const unsubscribe = settingsService.subscribe((updatedSettings) => {
      setSettings(updatedSettings);
    });

    return unsubscribe;
  }, []);

  const updateSettings = useCallback(async (updates: SettingsUpdate) => {
    return await settingsService.updateSettings(updates);
  }, []);

  const resetSettings = useCallback(async () => {
    return await settingsService.resetToDefaults();
  }, []);

  return {
    settings,
    updateSettings,
    resetSettings,
  };
}
