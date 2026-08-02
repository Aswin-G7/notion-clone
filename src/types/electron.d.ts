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
}

declare global {
  interface Window {
    electronAPI?: IElectronAPI;
  }
}
