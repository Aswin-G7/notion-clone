import { ISettingsProvider } from "../interfaces";

const SETTINGS_PREFIX = "notion_setting_";

export class BrowserSettingsProvider implements ISettingsProvider {
  getSetting<T>(key: string, defaultValue: T): T {
    try {
      const raw = localStorage.getItem(`${SETTINGS_PREFIX}${key}`);
      if (raw !== null) {
        return JSON.parse(raw) as T;
      }
    } catch (e) {
      console.error("[BrowserSettingsProvider] Failed to get setting:", e);
    }
    return defaultValue;
  }

  setSetting<T>(key: string, value: T): void {
    try {
      localStorage.setItem(`${SETTINGS_PREFIX}${key}`, JSON.stringify(value));
    } catch (e) {
      console.error("[BrowserSettingsProvider] Failed to set setting:", e);
    }
  }

  removeSetting(key: string): void {
    try {
      localStorage.removeItem(`${SETTINGS_PREFIX}${key}`);
    } catch (e) {
      console.error("[BrowserSettingsProvider] Failed to remove setting:", e);
    }
  }
}
