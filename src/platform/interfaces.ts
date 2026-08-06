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
  content: string | Uint8Array;
}

export interface IFileSystemProvider {
  exportFile(filename: string, content: string | Uint8Array, mimeType?: string): Promise<boolean>;
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

export interface WorkspaceInfo {
  path: string;
  name: string;
  createdAt?: number;
  updatedAt?: number;
}

export interface RecentWorkspace {
  path: string;
  name: string;
  lastOpenedAt: number;
}

export interface IWorkspaceProvider {
  isSupported: boolean;
  getActive(): Promise<WorkspaceInfo | null>;
  selectFolder(): Promise<string | null>;
  create(folderPath?: string, name?: string): Promise<WorkspaceInfo | null>;
  open(folderPath?: string): Promise<WorkspaceInfo | null>;
  switch(folderPath: string): Promise<WorkspaceInfo | null>;
  close(): Promise<boolean>;
  getRecents(): Promise<RecentWorkspace[]>;
  removeRecent(folderPath: string): Promise<boolean>;
  delete(folderPath: string): Promise<boolean>;
}

export interface MenuState {
  hasActivePage: boolean;
  selectedBlockId: string | null;
  sidebarOpen: boolean;
  isFullWidth: boolean;
  favoritePages: { id: string; title: string; icon?: string | null }[];
  recentPages: { id: string; title: string; icon?: string | null }[];
}

export interface IMenuProvider {
  isSupported: boolean;
  onAction(callback: (action: string, payload?: any) => void): () => void;
  updateState(state: MenuState): void;
}

export interface PlatformProviders {
  persistence: IPersistenceProvider;
  clipboard: IClipboardProvider;
  fileSystem: IFileSystemProvider;
  dialogs: IDialogProvider;
  settings: ISettingsProvider;
  workspace: IWorkspaceProvider;
  menu: IMenuProvider;
}
