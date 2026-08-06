export type ThemeMode = "light" | "dark" | "system";
export type TabWidth = 2 | 4;
export type LineWidthOption = "readable" | "wide" | "full";

export interface AppearanceSettings {
  theme: ThemeMode;
}

export interface EditorSettings {
  fontSize: number; // 12, 14, 16, 18, 20
  lineWidth: LineWidthOption; // "readable" (768px), "wide" (1024px), "full" (100%)
  spellCheck: boolean;
  tabWidth: TabWidth; // 2 or 4
}

export interface WorkspaceSettings {
  defaultWorkspacePath: string;
  openLastWorkspaceAtStartup: boolean;
  autosaveDelayMs: number; // 500, 1000, 2000, 5000
  autoBackups: boolean;
}

export interface AppSettings {
  schemaVersion: number;
  appearance: AppearanceSettings;
  editor: EditorSettings;
  workspace: WorkspaceSettings;
}

export type SettingsUpdate = {
  appearance?: Partial<AppearanceSettings>;
  editor?: Partial<EditorSettings>;
  workspace?: Partial<WorkspaceSettings>;
};
