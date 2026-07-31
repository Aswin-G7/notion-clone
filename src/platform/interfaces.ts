/**
 * Platform Abstraction Interfaces
 * Enables decoupling the application from browser APIs and allows seamless
 * swapping with desktop implementations (e.g., Electron / SQLite) in the future.
 */

export interface IPersistenceProvider {
  getItem(key: string): Promise<string | null> | string | null;
  setItem(key: string, value: string): Promise<void> | void;
  removeItem(key: string): Promise<void> | void;
  clear(): Promise<void> | void;
}

export interface IClipboardProvider {
  writeText(text: string): Promise<boolean>;
  readText(): Promise<string>;
}

export interface ImportedFileResult {
  filename: string;
  content: string;
}

export interface IFileSystemProvider {
  exportFile(filename: string, content: string, mimeType?: string): Promise<boolean>;
  importFile(acceptFilter?: string): Promise<ImportedFileResult | null>;
  readFileAsDataUrl(file: File): Promise<string>;
}

export interface IDialogProvider {
  alert(message: string): Promise<void>;
  confirm(message: string): Promise<boolean>;
}

export interface ISettingsProvider {
  getSetting<T>(key: string, defaultValue: T): Promise<T> | T;
  setSetting<T>(key: string, value: T): Promise<void> | void;
  removeSetting(key: string): Promise<void> | void;
}

export interface PlatformProviders {
  persistence: IPersistenceProvider;
  clipboard: IClipboardProvider;
  fileSystem: IFileSystemProvider;
  dialogs: IDialogProvider;
  settings: ISettingsProvider;
}
