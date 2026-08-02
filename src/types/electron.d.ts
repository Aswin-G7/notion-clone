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

export interface IElectronAPI {
  isElectron: boolean;
  clipboard: {
    writeText: (text: string) => Promise<boolean>;
    readText: () => Promise<string>;
  };
  fileSystem: {
    exportFile: (filename: string, content: string, mimeType?: string) => Promise<boolean>;
    importFile: (acceptFilter?: string) => Promise<{ filename: string; content: string } | null>;
  };
  dialogs: {
    alert: (message: string) => Promise<void>;
    confirm: (message: string) => Promise<boolean>;
  };
  app: {
    getVersion: () => Promise<string>;
  };
  database: {
    getItem: (key: string) => string | null;
    setItem: (key: string, value: string) => Promise<boolean>;
    removeItem: (key: string) => Promise<boolean>;
    clear: () => Promise<boolean>;
    migrateLocalStorage: (data: Record<string, string>) => Promise<boolean>;
    isMigrated: () => boolean;
  };
  workspace?: {
    getActive: () => Promise<WorkspaceInfo | null>;
    selectFolder: () => Promise<string | null>;
    create: (folderPath?: string, name?: string) => Promise<WorkspaceInfo | null>;
    open: (folderPath?: string) => Promise<WorkspaceInfo | null>;
    switch: (folderPath: string) => Promise<WorkspaceInfo | null>;
    close: () => Promise<boolean>;
    getRecents: () => Promise<RecentWorkspace[]>;
    removeRecent: (folderPath: string) => Promise<boolean>;
    delete: (folderPath: string) => Promise<boolean>;
  };
}

declare global {
  interface Window {
    electronAPI?: IElectronAPI;
  }
}
