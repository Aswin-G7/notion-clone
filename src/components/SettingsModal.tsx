import React, { useState, useEffect } from "react";
import {
  Sun,
  Moon,
  Monitor,
  Type,
  AlignJustify,
  Check,
  Code2,
  Folder,
  RotateCcw,
  Save,
  Info,
  Database,
  HardDrive,
  X,
  Sliders,
  CheckSquare,
  Sparkles,
  Layers,
  Laptop,
} from "lucide-react";
import { useSettings } from "../hooks/useSettings";
import { notificationService } from "../services/NotificationService";
import { platform, WorkspaceInfo } from "../platform";
import { ThemeMode, LineWidthOption, TabWidth } from "../types/settings";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type SettingsTab = "appearance" | "editor" | "workspace" | "application";

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { settings, updateSettings, resetSettings } = useSettings();
  const [activeTab, setActiveTab] = useState<SettingsTab>("appearance");
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceInfo | null>(null);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (platform.workspace.isSupported) {
        platform.workspace.getActive().then((ws) => {
          if (ws) setActiveWorkspace(ws);
        });
      }
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSetTheme = (theme: ThemeMode) => {
    updateSettings({ appearance: { theme } });
    notificationService.info("Theme Updated", `Switched to ${theme} theme.`);
  };

  const handleSetFontSize = (fontSize: number) => {
    updateSettings({ editor: { fontSize } });
    notificationService.info("Font Size Updated", `${fontSize}px`);
  };

  const handleSetLineWidth = (lineWidth: LineWidthOption) => {
    updateSettings({ editor: { lineWidth } });
    notificationService.info("Line Width Updated", `Layout line width set to ${lineWidth}`);
  };

  const handleSetSpellCheck = (spellCheck: boolean) => {
    updateSettings({ editor: { spellCheck } });
    notificationService.info("Spell Check Updated", spellCheck ? "Enabled" : "Disabled");
  };

  const handleSetTabWidth = (tabWidth: TabWidth) => {
    updateSettings({ editor: { tabWidth } });
    notificationService.info("Tab Width Updated", `${tabWidth} spaces`);
  };

  const handleSetOpenLast = (openLastWorkspaceAtStartup: boolean) => {
    updateSettings({ workspace: { openLastWorkspaceAtStartup } });
    notificationService.info("Startup Preference Saved");
  };

  const handleSetAutosaveDelay = (autosaveDelayMs: number) => {
    updateSettings({ workspace: { autosaveDelayMs } });
    notificationService.info("Autosave Delay Updated", `${autosaveDelayMs}ms`);
  };

  const handleSetAutoBackups = (autoBackups: boolean) => {
    updateSettings({ workspace: { autoBackups } });
    notificationService.info("Auto Backups Updated", autoBackups ? "Enabled" : "Disabled");
  };

  const handlePickDefaultWorkspace = async () => {
    if (!platform.workspace.isSupported) return;
    const selected = await platform.workspace.selectFolder();
    if (selected) {
      updateSettings({ workspace: { defaultWorkspacePath: selected } });
      notificationService.success("Default Workspace Set", selected);
    }
  };

  const handleReset = async () => {
    await resetSettings();
    setResetConfirmOpen(false);
    notificationService.info("Settings Reset", "Restored default configuration.");
  };

  return (
    <div
      id="settings-modal-backdrop"
      className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Settings Modal"
    >
      <div
        id="settings-modal-container"
        className="bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 rounded-xl shadow-2xl border border-stone-200 dark:border-stone-800 w-full max-w-2xl h-[560px] max-h-[90vh] flex flex-col overflow-hidden font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
              <Sliders className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900 dark:text-stone-100 font-display">
                Settings
              </h2>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                Manage global application preferences and workspace options
              </p>
            </div>
          </div>
          <button
            id="settings-modal-close-btn"
            type="button"
            onClick={onClose}
            aria-label="Close settings modal"
            className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body: Sidebar + Content */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Navigation Tabs Sidebar */}
          <div className="w-48 border-r border-stone-200 dark:border-stone-800 p-3 bg-stone-50/50 dark:bg-stone-900/50 space-y-1 shrink-0 font-medium text-xs">
            <button
              id="settings-tab-appearance"
              type="button"
              onClick={() => setActiveTab("appearance")}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors text-left cursor-pointer ${
                activeTab === "appearance"
                  ? "bg-stone-200/70 dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-semibold"
                  : "text-stone-600 dark:text-stone-400 hover:bg-stone-200/40 dark:hover:bg-stone-800/50 hover:text-stone-900 dark:hover:text-stone-200"
              }`}
            >
              <Sun className="h-3.5 w-3.5 shrink-0" />
              <span>Appearance</span>
            </button>

            <button
              id="settings-tab-editor"
              type="button"
              onClick={() => setActiveTab("editor")}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors text-left cursor-pointer ${
                activeTab === "editor"
                  ? "bg-stone-200/70 dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-semibold"
                  : "text-stone-600 dark:text-stone-400 hover:bg-stone-200/40 dark:hover:bg-stone-800/50 hover:text-stone-900 dark:hover:text-stone-200"
              }`}
            >
              <Type className="h-3.5 w-3.5 shrink-0" />
              <span>Editor</span>
            </button>

            <button
              id="settings-tab-workspace"
              type="button"
              onClick={() => setActiveTab("workspace")}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors text-left cursor-pointer ${
                activeTab === "workspace"
                  ? "bg-stone-200/70 dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-semibold"
                  : "text-stone-600 dark:text-stone-400 hover:bg-stone-200/40 dark:hover:bg-stone-800/50 hover:text-stone-900 dark:hover:text-stone-200"
              }`}
            >
              <Folder className="h-3.5 w-3.5 shrink-0" />
              <span>Workspace</span>
            </button>

            <button
              id="settings-tab-application"
              type="button"
              onClick={() => setActiveTab("application")}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors text-left cursor-pointer ${
                activeTab === "application"
                  ? "bg-stone-200/70 dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-semibold"
                  : "text-stone-600 dark:text-stone-400 hover:bg-stone-200/40 dark:hover:bg-stone-800/50 hover:text-stone-900 dark:hover:text-stone-200"
              }`}
            >
              <Info className="h-3.5 w-3.5 shrink-0" />
              <span>Application</span>
            </button>
          </div>

          {/* Content Pane */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* --- APPEARANCE TAB --- */}
            {activeTab === "appearance" && (
              <div className="space-y-6 animate-in fade-in duration-100">
                <div>
                  <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 mb-1">
                    Interface Theme
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mb-4">
                    Customize the look and feel of the workspace UI
                  </p>

                  <div className="grid grid-cols-3 gap-3">
                    {/* Light Theme Card */}
                    <button
                      type="button"
                      onClick={() => handleSetTheme("light")}
                      className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all cursor-pointer ${
                        settings.appearance.theme === "light"
                          ? "border-stone-900 dark:border-stone-100 bg-stone-100/80 dark:bg-stone-800 ring-2 ring-stone-900/10 dark:ring-stone-100/10"
                          : "border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700 bg-white dark:bg-stone-900"
                      }`}
                    >
                      <Sun className="h-5 w-5 mb-2 text-amber-500" />
                      <span className="text-xs font-semibold">Light</span>
                      {settings.appearance.theme === "light" && (
                        <Check className="h-3.5 w-3.5 text-stone-900 dark:text-stone-100 mt-1" />
                      )}
                    </button>

                    {/* Dark Theme Card */}
                    <button
                      type="button"
                      onClick={() => handleSetTheme("dark")}
                      className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all cursor-pointer ${
                        settings.appearance.theme === "dark"
                          ? "border-stone-900 dark:border-stone-100 bg-stone-100/80 dark:bg-stone-800 ring-2 ring-stone-900/10 dark:ring-stone-100/10"
                          : "border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700 bg-white dark:bg-stone-900"
                      }`}
                    >
                      <Moon className="h-5 w-5 mb-2 text-indigo-500 dark:text-indigo-400" />
                      <span className="text-xs font-semibold">Dark</span>
                      {settings.appearance.theme === "dark" && (
                        <Check className="h-3.5 w-3.5 text-stone-900 dark:text-stone-100 mt-1" />
                      )}
                    </button>

                    {/* System Theme Card */}
                    <button
                      type="button"
                      onClick={() => handleSetTheme("system")}
                      className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all cursor-pointer ${
                        settings.appearance.theme === "system"
                          ? "border-stone-900 dark:border-stone-100 bg-stone-100/80 dark:bg-stone-800 ring-2 ring-stone-900/10 dark:ring-stone-100/10"
                          : "border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700 bg-white dark:bg-stone-900"
                      }`}
                    >
                      <Monitor className="h-5 w-5 mb-2 text-stone-500" />
                      <span className="text-xs font-semibold">System</span>
                      {settings.appearance.theme === "system" && (
                        <Check className="h-3.5 w-3.5 text-stone-900 dark:text-stone-100 mt-1" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* --- EDITOR TAB --- */}
            {activeTab === "editor" && (
              <div className="space-y-6 animate-in fade-in duration-100">
                {/* Font Size */}
                <div className="flex items-center justify-between pb-4 border-b border-stone-200 dark:border-stone-800">
                  <div>
                    <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100">Font Size</h4>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400">
                      Adjust base typography scaling across document blocks
                    </p>
                  </div>
                  <div className="flex items-center gap-1 bg-stone-100 dark:bg-stone-800 p-1 rounded-lg border border-stone-200 dark:border-stone-700">
                    {[12, 14, 16, 18, 20].map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => handleSetFontSize(size)}
                        className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                          settings.editor.fontSize === size
                            ? "bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs"
                            : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100"
                        }`}
                      >
                        {size}px
                      </button>
                    ))}
                  </div>
                </div>

                {/* Line Width / Layout Density */}
                <div className="flex items-center justify-between pb-4 border-b border-stone-200 dark:border-stone-800">
                  <div>
                    <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100">Line Width</h4>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400">
                      Control maximum text column width in editor area
                    </p>
                  </div>
                  <div className="flex items-center gap-1 bg-stone-100 dark:bg-stone-800 p-1 rounded-lg border border-stone-200 dark:border-stone-700">
                    {(
                      [
                        { id: "readable", label: "Readable (768px)" },
                        { id: "wide", label: "Wide (1024px)" },
                        { id: "full", label: "Full Width" },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handleSetLineWidth(opt.id)}
                        className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                          settings.editor.lineWidth === opt.id
                            ? "bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs"
                            : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Spell Check */}
                <div className="flex items-center justify-between pb-4 border-b border-stone-200 dark:border-stone-800">
                  <div>
                    <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100">Spell Check</h4>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400">
                      Enable native browser spell checking inside block textareas
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSetSpellCheck(!settings.editor.spellCheck)}
                    className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                      settings.editor.spellCheck
                        ? "bg-stone-900 dark:bg-stone-100"
                        : "bg-stone-300 dark:bg-stone-700"
                    }`}
                  >
                    <div
                      className={`bg-white dark:bg-stone-900 w-4 h-4 rounded-full shadow-md transform transition-transform ${
                        settings.editor.spellCheck ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* Tab Width */}
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100">Tab Indentation</h4>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400">
                      Space width used when indenting code blocks
                    </p>
                  </div>
                  <div className="flex items-center gap-1 bg-stone-100 dark:bg-stone-800 p-1 rounded-lg border border-stone-200 dark:border-stone-700">
                    {[2, 4].map((width) => (
                      <button
                        key={width}
                        type="button"
                        onClick={() => handleSetTabWidth(width as TabWidth)}
                        className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                          settings.editor.tabWidth === width
                            ? "bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs"
                            : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100"
                        }`}
                      >
                        {width} spaces
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* --- WORKSPACE TAB --- */}
            {activeTab === "workspace" && (
              <div className="space-y-6 animate-in fade-in duration-100">
                {/* Default Workspace */}
                <div className="pb-4 border-b border-stone-200 dark:border-stone-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100">
                        Default Workspace Directory
                      </h4>
                      <p className="text-[11px] text-stone-500 dark:text-stone-400">
                        Default directory location used when creating new workspaces
                      </p>
                    </div>
                    {platform.workspace.isSupported && (
                      <button
                        type="button"
                        onClick={handlePickDefaultWorkspace}
                        className="px-2.5 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-xs font-semibold transition-colors cursor-pointer"
                      >
                        Browse Folder
                      </button>
                    )}
                  </div>
                  <div className="p-2.5 bg-stone-100/70 dark:bg-stone-800/60 rounded-lg font-mono text-[11px] text-stone-600 dark:text-stone-300 truncate">
                    {settings.workspace.defaultWorkspacePath ||
                      (activeWorkspace?.path
                        ? activeWorkspace.path
                        : "System Default User Documents")}
                  </div>
                </div>

                {/* Open Last Workspace at Startup */}
                <div className="flex items-center justify-between pb-4 border-b border-stone-200 dark:border-stone-800">
                  <div>
                    <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100">
                      Open Last Workspace on Startup
                    </h4>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400">
                      Automatically resume the most recent workspace upon desktop application launch
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      handleSetOpenLast(!settings.workspace.openLastWorkspaceAtStartup)
                    }
                    className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                      settings.workspace.openLastWorkspaceAtStartup
                        ? "bg-stone-900 dark:bg-stone-100"
                        : "bg-stone-300 dark:bg-stone-700"
                    }`}
                  >
                    <div
                      className={`bg-white dark:bg-stone-900 w-4 h-4 rounded-full shadow-md transform transition-transform ${
                        settings.workspace.openLastWorkspaceAtStartup
                          ? "translate-x-4"
                          : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* Autosave Delay */}
                <div className="flex items-center justify-between pb-4 border-b border-stone-200 dark:border-stone-800">
                  <div>
                    <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100">
                      Autosave Debounce Interval
                    </h4>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400">
                      Idle buffer time before persisting page edits to SQLite
                    </p>
                  </div>
                  <select
                    value={settings.workspace.autosaveDelayMs}
                    onChange={(e) => handleSetAutosaveDelay(Number(e.target.value))}
                    className="px-2.5 py-1 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-100 dark:bg-stone-800 text-xs font-semibold text-stone-800 dark:text-stone-200 outline-hidden cursor-pointer"
                  >
                    <option value={500}>500 ms (Fast)</option>
                    <option value={1000}>1000 ms (Default)</option>
                    <option value={2000}>2000 ms (Balanced)</option>
                    <option value={5000}>5000 ms (Conservative)</option>
                  </select>
                </div>

                {/* Automatic Backups */}
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100">
                      Automatic Database Backups
                    </h4>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400">
                      Create timestamped database snapshot backups before major workspace operations
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSetAutoBackups(!settings.workspace.autoBackups)}
                    className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                      settings.workspace.autoBackups
                        ? "bg-stone-900 dark:bg-stone-100"
                        : "bg-stone-300 dark:bg-stone-700"
                    }`}
                  >
                    <div
                      className={`bg-white dark:bg-stone-900 w-4 h-4 rounded-full shadow-md transform transition-transform ${
                        settings.workspace.autoBackups ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>
            )}

            {/* --- APPLICATION TAB --- */}
            {activeTab === "application" && (
              <div className="space-y-6 animate-in fade-in duration-100">
                {/* About Box */}
                <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-800/40 flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-stone-900 text-white font-bold font-display text-lg flex items-center justify-center shrink-0 shadow-xs">
                    N
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100 font-display">
                        Notion Workspace Desktop
                      </h4>
                      <span className="text-[10px] font-mono bg-stone-200/80 dark:bg-stone-700 px-2 py-0.5 rounded-full text-stone-700 dark:text-stone-300 font-semibold">
                        v1.0.0 (Production)
                      </span>
                    </div>
                    <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                      Production-grade offline-first workspace application featuring native SQLite persistence, full block hierarchy, and multi-workspace support.
                    </p>
                  </div>
                </div>

                {/* System Paths */}
                <div className="space-y-3">
                  <div>
                    <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100 mb-1 flex items-center gap-1.5">
                      <Database className="h-3.5 w-3.5 text-stone-400" />
                      <span>Active SQLite Database Location</span>
                    </h4>
                    <div className="p-2.5 bg-stone-100/70 dark:bg-stone-800/60 rounded-lg font-mono text-[11px] text-stone-600 dark:text-stone-300 truncate">
                      {activeWorkspace?.path
                        ? `${activeWorkspace.path}/workspace.sqlite`
                        : "Browser LocalStorage (Web Sandbox)"}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100 mb-1 flex items-center gap-1.5">
                      <HardDrive className="h-3.5 w-3.5 text-stone-400" />
                      <span>Workspace Root Directory</span>
                    </h4>
                    <div className="p-2.5 bg-stone-100/70 dark:bg-stone-800/60 rounded-lg font-mono text-[11px] text-stone-600 dark:text-stone-300 truncate">
                      {activeWorkspace?.path || "Web Browser Sandbox Environment"}
                    </div>
                  </div>
                </div>

                {/* Reset Settings Section */}
                <div className="pt-4 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100">
                      Reset Application Preferences
                    </h4>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400">
                      Restore all global settings back to default values
                    </p>
                  </div>

                  {resetConfirmOpen ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setResetConfirmOpen(false)}
                        className="px-2.5 py-1 rounded-lg border border-stone-200 dark:border-stone-700 text-xs font-semibold text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleReset}
                        className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-colors cursor-pointer"
                      >
                        Confirm Reset
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setResetConfirmOpen(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span>Reset to Defaults</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/50 flex items-center justify-between shrink-0 text-xs text-stone-500 dark:text-stone-400">
          <span>Settings are auto-saved in real time</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 font-semibold hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
