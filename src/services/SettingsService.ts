import { platform } from "../platform";
import {
  AppSettings,
  SettingsUpdate,
  ThemeMode,
  LineWidthOption,
  TabWidth,
} from "../types/settings";

export const CURRENT_SETTINGS_SCHEMA_VERSION = 1;
const GLOBAL_SETTINGS_KEY = "app_global_settings_v1";

export const DEFAULT_SETTINGS: AppSettings = {
  schemaVersion: CURRENT_SETTINGS_SCHEMA_VERSION,
  appearance: {
    theme: "light",
  },
  editor: {
    fontSize: 16,
    lineWidth: "readable",
    spellCheck: true,
    tabWidth: 2,
  },
  workspace: {
    defaultWorkspacePath: "",
    openLastWorkspaceAtStartup: true,
    autosaveDelayMs: 1000,
    autoBackups: true,
  },
};

type SettingsListener = (settings: AppSettings) => void;

export class SettingsService {
  private currentSettings: AppSettings;
  private listeners: Set<SettingsListener> = new Set();
  private isLoaded: boolean = false;
  private systemThemeMediaQuery: MediaQueryList | null = null;

  constructor() {
    this.currentSettings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    this.initSystemThemeListener();
  }

  /**
   * Initializes and loads global application settings from platform storage.
   */
  public async load(): Promise<AppSettings> {
    try {
      const stored = await platform.settings.getSetting<AppSettings | null>(
        GLOBAL_SETTINGS_KEY,
        null
      );

      if (stored) {
        this.currentSettings = this.validateAndMigrate(stored);
      } else {
        this.currentSettings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
      }
    } catch (error) {
      console.error("[SettingsService] Failed to load settings, using defaults:", error);
      this.currentSettings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    }

    this.isLoaded = true;
    this.applyTheme(this.currentSettings.appearance.theme);
    this.notifyListeners();
    return this.currentSettings;
  }

  /**
   * Synchronously returns current cached settings.
   */
  public getSettings(): AppSettings {
    return this.currentSettings;
  }

  /**
   * Updates partial settings, persists them, and notifies all subscribers.
   */
  public async updateSettings(updates: SettingsUpdate): Promise<AppSettings> {
    const next: AppSettings = {
      ...this.currentSettings,
      appearance: {
        ...this.currentSettings.appearance,
        ...(updates.appearance || {}),
      },
      editor: {
        ...this.currentSettings.editor,
        ...(updates.editor || {}),
      },
      workspace: {
        ...this.currentSettings.workspace,
        ...(updates.workspace || {}),
      },
    };

    const validated = this.validateAndMigrate(next);
    this.currentSettings = validated;

    try {
      await platform.settings.setSetting(GLOBAL_SETTINGS_KEY, validated);
    } catch (error) {
      console.error("[SettingsService] Failed to persist settings:", error);
    }

    if (updates.appearance?.theme) {
      this.applyTheme(validated.appearance.theme);
    }

    this.notifyListeners();
    return this.currentSettings;
  }

  /**
   * Resets settings back to factory defaults.
   */
  public async resetToDefaults(): Promise<AppSettings> {
    this.currentSettings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    try {
      await platform.settings.setSetting(GLOBAL_SETTINGS_KEY, this.currentSettings);
    } catch (error) {
      console.error("[SettingsService] Failed to reset settings storage:", error);
    }

    this.applyTheme(this.currentSettings.appearance.theme);
    this.notifyListeners();
    return this.currentSettings;
  }

  /**
   * Subscribe to settings changes.
   */
  public subscribe(listener: SettingsListener): () => void {
    this.listeners.add(listener);
    // Immediately call listener with current state
    if (this.isLoaded) {
      listener(this.currentSettings);
    }
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Validates and migrates raw setting objects to guarantee clean schema & bounds.
   */
  private validateAndMigrate(raw: any): AppSettings {
    const defaults = JSON.parse(JSON.stringify(DEFAULT_SETTINGS)) as AppSettings;
    if (!raw || typeof raw !== "object") return defaults;

    // Appearance validation
    const validThemes: ThemeMode[] = ["light", "dark", "system"];
    const theme: ThemeMode = validThemes.includes(raw.appearance?.theme)
      ? raw.appearance.theme
      : defaults.appearance.theme;

    // Editor validation
    const fontSizeNum = Number(raw.editor?.fontSize);
    const fontSize = !isNaN(fontSizeNum) && fontSizeNum >= 10 && fontSizeNum <= 32
      ? fontSizeNum
      : defaults.editor.fontSize;

    const validLineWidths: LineWidthOption[] = ["readable", "wide", "full"];
    const lineWidth: LineWidthOption = validLineWidths.includes(raw.editor?.lineWidth)
      ? raw.editor.lineWidth
      : defaults.editor.lineWidth;

    const spellCheck = typeof raw.editor?.spellCheck === "boolean"
      ? raw.editor.spellCheck
      : defaults.editor.spellCheck;

    const tabWidthNum = Number(raw.editor?.tabWidth);
    const tabWidth: TabWidth = (tabWidthNum === 2 || tabWidthNum === 4)
      ? (tabWidthNum as TabWidth)
      : defaults.editor.tabWidth;

    // Workspace validation
    const defaultWorkspacePath = typeof raw.workspace?.defaultWorkspacePath === "string"
      ? raw.workspace.defaultWorkspacePath
      : defaults.workspace.defaultWorkspacePath;

    const openLastWorkspaceAtStartup = typeof raw.workspace?.openLastWorkspaceAtStartup === "boolean"
      ? raw.workspace.openLastWorkspaceAtStartup
      : defaults.workspace.openLastWorkspaceAtStartup;

    const validDelays = [500, 1000, 2000, 5000];
    const delayNum = Number(raw.workspace?.autosaveDelayMs);
    const autosaveDelayMs = validDelays.includes(delayNum)
      ? delayNum
      : defaults.workspace.autosaveDelayMs;

    const autoBackups = typeof raw.workspace?.autoBackups === "boolean"
      ? raw.workspace.autoBackups
      : defaults.workspace.autoBackups;

    return {
      schemaVersion: CURRENT_SETTINGS_SCHEMA_VERSION,
      appearance: { theme },
      editor: { fontSize, lineWidth, spellCheck, tabWidth },
      workspace: { defaultWorkspacePath, openLastWorkspaceAtStartup, autosaveDelayMs, autoBackups },
    };
  }

  /**
   * Applies dark/light mode class to HTML document root element.
   */
  public applyTheme(theme: ThemeMode): void {
    if (typeof document === "undefined") return;

    const root = document.documentElement;
    let isDark = false;

    if (theme === "dark") {
      isDark = true;
    } else if (theme === "light") {
      isDark = false;
    } else if (theme === "system") {
      isDark = typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
    }

    if (isDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }

  private initSystemThemeListener(): void {
    if (typeof window === "undefined" || !window.matchMedia) return;

    this.systemThemeMediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      if (this.currentSettings.appearance.theme === "system") {
        this.applyTheme("system");
      }
    };

    if (typeof this.systemThemeMediaQuery.addEventListener === "function") {
      this.systemThemeMediaQuery.addEventListener("change", handleChange);
    } else if (typeof this.systemThemeMediaQuery.addListener === "function") {
      this.systemThemeMediaQuery.addListener(handleChange);
    }
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      try {
        listener(this.currentSettings);
      } catch (err) {
        console.error("[SettingsService] Error in settings listener:", err);
      }
    }
  }
}

export const settingsService = new SettingsService();
