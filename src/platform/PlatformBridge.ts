import {
  PlatformProviders,
  IPersistenceProvider,
  IClipboardProvider,
  IFileSystemProvider,
  IDialogProvider,
  ISettingsProvider,
  IWorkspaceProvider,
} from "./interfaces";
import { BrowserPersistenceProvider } from "./browser/BrowserPersistenceProvider";
import { BrowserClipboardProvider } from "./browser/BrowserClipboardProvider";
import { BrowserFileSystemProvider } from "./browser/BrowserFileSystemProvider";
import { BrowserDialogProvider } from "./browser/BrowserDialogProvider";
import { BrowserSettingsProvider } from "./browser/BrowserSettingsProvider";
import { BrowserWorkspaceProvider } from "./browser/BrowserWorkspaceProvider";
import { ElectronClipboardProvider } from "./electron/ElectronClipboardProvider";
import { ElectronFileSystemProvider } from "./electron/ElectronFileSystemProvider";
import { ElectronDialogProvider } from "./electron/ElectronDialogProvider";
import { SQLitePersistenceProvider } from "./electron/SQLitePersistenceProvider";
import { ElectronWorkspaceProvider } from "./electron/ElectronWorkspaceProvider";

class PlatformBridgeContainer {
  private providers: PlatformProviders;
  public readonly isElectron: boolean;

  constructor() {
    const isElectron = typeof window !== "undefined" && !!window.electronAPI;
    this.isElectron = isElectron;

    this.providers = {
      persistence: isElectron ? new SQLitePersistenceProvider() : new BrowserPersistenceProvider(),
      clipboard: isElectron ? new ElectronClipboardProvider() : new BrowserClipboardProvider(),
      fileSystem: isElectron ? new ElectronFileSystemProvider() : new BrowserFileSystemProvider(),
      dialogs: isElectron ? new ElectronDialogProvider() : new BrowserDialogProvider(),
      settings: new BrowserSettingsProvider(),
      workspace: isElectron ? new ElectronWorkspaceProvider() : new BrowserWorkspaceProvider(),
    };
  }

  public get isDesktop(): boolean {
    return this.isElectron;
  }

  public get isBrowser(): boolean {
    return !this.isElectron;
  }

  public get persistence(): IPersistenceProvider {
    return this.providers.persistence;
  }

  public get clipboard(): IClipboardProvider {
    return this.providers.clipboard;
  }

  public get fileSystem(): IFileSystemProvider {
    return this.providers.fileSystem;
  }

  public get dialogs(): IDialogProvider {
    return this.providers.dialogs;
  }

  public get settings(): ISettingsProvider {
    return this.providers.settings;
  }

  public get workspace(): IWorkspaceProvider {
    return this.providers.workspace;
  }

  /**
   * Overrides one or more platform providers (e.g., when initializing Electron / SQLite bridge).
   */
  public setPlatformProviders(customProviders: Partial<PlatformProviders>): void {
    this.providers = {
      ...this.providers,
      ...customProviders,
    };
  }
}

export const platform = new PlatformBridgeContainer();
