import { contextBridge, ipcRenderer } from "electron";

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

const electronAPI: IElectronAPI = {
  isElectron: true,
  clipboard: {
    writeText: (text: string) => ipcRenderer.invoke("clipboard:writeText", text),
    readText: () => ipcRenderer.invoke("clipboard:readText"),
  },
  fileSystem: {
    exportFile: (filename: string, content: string, mimeType?: string) =>
      ipcRenderer.invoke("file:exportFile", { filename, content, mimeType }),
    importFile: (acceptFilter?: string) =>
      ipcRenderer.invoke("file:importFile", acceptFilter),
  },
  dialogs: {
    alert: (message: string) => ipcRenderer.invoke("dialog:alert", message),
    confirm: (message: string) => ipcRenderer.invoke("dialog:confirm", message),
  },
  app: {
    getVersion: () => ipcRenderer.invoke("app:getVersion"),
  },
  database: {
    getItem: (key: string) => ipcRenderer.sendSync("db:getItemSync", key),
    setItem: (key: string, value: string) => ipcRenderer.invoke("db:setItem", key, value),
    removeItem: (key: string) => ipcRenderer.invoke("db:removeItem", key),
    clear: () => ipcRenderer.invoke("db:clear"),
    migrateLocalStorage: (data: Record<string, string>) => ipcRenderer.invoke("db:migrateLocalStorage", data),
    isMigrated: () => ipcRenderer.sendSync("db:isMigratedSync"),
  },
};

contextBridge.exposeInMainWorld("electronAPI", electronAPI);
